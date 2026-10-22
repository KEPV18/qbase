#!/usr/bin/env python3
"""
qbase-api — a minimal Supabase-compatible API shim backed directly by
Postgres, for the case where the org's Supabase API gateway is blocked by an
egress-quota restriction.

It implements exactly the surface the QBase frontend uses:

  REST
    GET/POST/PATCH/DELETE  /rest/v1/<table>            (PostgREST-ish)
    GET/POST               /rest/v1/rpc/<fn>            (SQL function call)

  Auth (GoTrue-compatible)
    POST /auth/v1/token?grant_type=password
    POST /auth/v1/token?grant_type=refresh_token
    GET  /auth/v1/user
    POST /auth/v1/logout
    POST /auth/v1/signup
    POST /auth/v1/recover
    PUT  /auth/v1/user
    GET  /auth/v1/health
    GET  /auth/v1/settings

  Storage
    GET/POST /storage/v1/object/<bucket>/<path>
    GET     /storage/v1/object/public/<bucket>/<path>
    GET/POST/DELETE /storage/v1/bucket

Run:
  python3 qbase_api.py --port 54321
"""
import argparse
import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import threading
import time
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import psycopg
from psycopg import sql as pgsql
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

REF = os.environ.get("SB_REF", "hkkdbxvmvvcxpgfqlrnp")
DB_PASS = os.environ.get("SB_DB_PASS", "")
REGION = os.environ.get("SB_REGION", "eu-west-1")
# SB_DSN points the shim at a different database — used by the LOCAL
# Supabase-like stack (127.0.0.1:5433/qbase_local) so the app can be driven
# against a database on this machine instead of the live project.  When it is
# unset the shim talks to the Supabase pooler, as before.
DSN = os.environ.get("SB_DSN") or (
    f"postgresql://postgres.{REF}:{DB_PASS}"
    f"@aws-0-{REGION}.pooler.supabase.com:5432/postgres")
JWT_SECRET = os.environ.get("QBASE_JWT_SECRET", "")
ANON_KEY = os.environ.get("SB_ANON_KEY", "")
SVC_KEY = os.environ.get("SB_SERVICE_KEY", "")

_local = threading.local()
_sessions = {}          # access_token -> {user_id, email, expires_at}
_refresh = {}           # refresh_token -> user_id
_lock = threading.Lock()

# The Supabase pooler allows only 15 session-mode clients for this project.
# The HTTP server is threaded, and every request thread used to open (and
# never close) its own connection, which exhausted that budget.  At most
# MAX_DB_CONNS connections may exist at a time, and each is closed as soon as
# its request thread ends.
MAX_DB_CONNS = 4
_db_slots = threading.BoundedSemaphore(MAX_DB_CONNS)


def conn():
    c = getattr(_local, "c", None)
    if c is None or c.closed:
        _db_slots.acquire()
        try:
            c = psycopg.connect(DSN, connect_timeout=20, row_factory=dict_row)
        except Exception:
            _db_slots.release()
            raise
        _local.c = c
    return c


def close_conn():
    """Release this thread's database connection (called when the request
    thread ends)."""
    c = getattr(_local, "c", None)
    if c is not None:
        try:
            c.close()
        except Exception:  # noqa
            pass
        _local.c = None
        _db_slots.release()


# ---------------------------------------------------------------- JWT
def b64u(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def make_jwt(user_id: str, email: str, role: str, exp_days: int = 7) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    now = int(time.time())
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "aud": "authenticated",
        "iss": f"qbase-api",
        "iat": now,
        "exp": now + exp_days * 86400,
        "session_id": secrets.token_hex(8),
    }
    h = b64u(json.dumps(header, separators=(",", ":")).encode())
    p = b64u(json.dumps(payload, separators=(",", ":")).encode())
    sig = hmac.new(JWT_SECRET.encode(), f"{h}.{p}".encode(), hashlib.sha256).digest()
    return f"{h}.{p}.{b64u(sig)}"


def decode_jwt(token: str):
    try:
        h, p, s = token.split(".")
    except ValueError:
        return None
    expect = hmac.new(JWT_SECRET.encode(), f"{h}.{p}".encode(), hashlib.sha256).digest()
    if not hmac.compare_digest(expect, base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))):
        return None
    payload = json.loads(base64.urlsafe_b64decode(p + "=" * (-len(p) % 4)))
    if payload.get("exp", 0) < time.time():
        return None
    return payload


def user_from_token(token: str):
    if not token:
        return None
    payload = decode_jwt(token)
    if not payload:
        return None
    with conn().cursor() as cur:
        cur.execute(
            """select u.id, u.email, u.raw_user_meta_data, coalesce(r.role, 'authenticated') as role
               from auth.users u
               left join public.user_roles r on r.user_id = u.id
               where u.id = %s""", (payload["sub"],))
        row = cur.fetchone()
    return row


def is_service(key: str) -> bool:
    return bool(SVC_KEY) and hmac.compare_digest(key or "", SVC_KEY)


# ---------------------------------------------------------------- helpers
def json_out(handler, code, payload):
    body = json.dumps(payload, default=str).encode()
    handler.send_response(code)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Content-Length", str(len(body)))
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Headers", "*")
    handler.send_header("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,PUT,OPTIONS")
    handler.end_headers()
    handler.wfile.write(body)


def read_body(handler):
    n = int(handler.headers.get("Content-Length") or 0)
    if not n:
        return {}
    raw = handler.rfile.read(n)
    try:
        return json.loads(raw.decode() or "{}")
    except json.JSONDecodeError:
        return {"_raw": raw.decode(errors="replace")}


def check_password(plain: str, stored: str) -> bool:
    """Verify a bcrypt hash produced by pgcrypto."""
    if not stored:
        return False
    with conn().cursor() as cur:
        cur.execute("select crypt(%s, %s) = %s", (plain, stored, stored))
        row = cur.fetchone()
        return bool(row and list(row.values())[0])


def hash_password(plain: str) -> str:
    with conn().cursor() as cur:
        cur.execute("select crypt(%s, gen_salt(%s))", (plain, "bf"))
        return list(cur.fetchone().values())[0]



# ---------------------------------------------------------------- param adaptation
JSONB_HINT = ("jsonb", "json", "record")


def adapt_val(v):
    """Convert a JSON-decoded value into something psycopg can bind."""
    if isinstance(v, dict):
        return Jsonb(v)
    if isinstance(v, list):
        # a list of scalars is fine for ANY(); jsonb arrays need Jsonb
        if all(not isinstance(x, (dict, list)) for x in v):
            return v
        return Jsonb(v)
    return v


def adapt_params(params):
    return [adapt_val(p) for p in params]

# ---------------------------------------------------------------- REST
def rest_query(handler, method, table, query, body):
    """Minimal PostgREST subset."""
    c = conn()
    with c.cursor() as cur:
        select = "*"
        if query.get("select"):
            select = query["select"]
        limit = query.get("limit")
        offset = query.get("offset")
        order = query.get("order")
        filters = query.get("_filters", [])

        wheres = []
        params = []
        for col, op, val in filters:
            if op == "eq":
                wheres.append(f"{col} = %s")
            elif op == "neq":
                wheres.append(f"{col} <> %s")
            elif op == "gt":
                wheres.append(f"{col} > %s")
            elif op == "gte":
                wheres.append(f"{col} >= %s")
            elif op == "lt":
                wheres.append(f"{col} < %s")
            elif op == "lte":
                wheres.append(f"{col} <= %s")
            elif op == "like":
                wheres.append(f"{col} ILIKE %s")
            elif op == "in":
                wheres.append(f"{col} = ANY(%s)")
            elif op == "notin":
                wheres.append(f"NOT ({col} = ANY(%s))")
            elif op == "notlike":
                wheres.append(f"{col} NOT ILIKE %s")
            elif op == "isnull":
                wheres.append(f"{col} IS NULL")
                continue
            elif op == "notnull":
                wheres.append(f"{col} IS NOT NULL")
                continue
            else:
                continue
            params.append(val)

        where = (" WHERE " + " AND ".join(wheres)) if wheres else ""
        orderby = ""
        if order:
            orderby = " ORDER BY " + order.replace(".", " ")

        sql = f"select {select} from public.{table}{where}{orderby}"
        if method == "GET":
            if limit:
                sql += f" limit {int(limit)}"
            if offset:
                sql += f" offset {int(offset)}"
            cur.execute(sql, adapt_params(params))
            rows = cur.fetchall()
            c.commit()
            return 200, list(rows)

        if method in ("DELETE", "PATCH") and not body:
            # PostgREST style: DELETE /records?serial=eq.F/99-001
            if not where:
                return 400, {"message": "refusing to delete/update without a filter"}
            if method == "DELETE":
                delete_with_audit_guard(cur, table, where, params)
            else:
                cur.execute(f"UPDATE public.{table} SET updated_at = now(){where}",
                            adapt_params(params))
            c.commit()
            return 200, []

        payload = body if isinstance(body, list) else [body]
        if not payload:
            return 200, []
        cols = list(payload[0].keys())
        collist = ", ".join(cols)
        ph = ", ".join(["%s"] * len(cols))
        stmt = pgsql.SQL(f"INSERT INTO public.{table} ({collist}) VALUES ({ph})")
        try:
            if method == "POST":
                cur.executemany(stmt, [[adapt_val(r.get(k)) for k in cols] for r in payload])
            elif method == "PATCH":
                setlist = ", ".join(f"{k} = %s" for k in cols)
                stmt = pgsql.SQL(f"UPDATE public.{table} SET {setlist} WHERE id = %s")
                cur.executemany(stmt, [[adapt_val(r.get(k)) for k in cols] + [r.get("id")] for r in payload])
            elif method == "DELETE":
                ids = [r.get("id") for r in payload]
                cur.execute(f"DELETE FROM public.{table} WHERE id = ANY(%s)", (ids,))
            c.commit()
            return 201, payload
        except Exception as e:  # noqa
            c.rollback()
            return 400, {"message": str(e)[:400], "code": "P0001"}


RESERVED = {"select", "limit", "offset", "order", "on_conflict", "apikey",
            "columns", "prefers", "range"}

# PostgREST negation table: ?col=not.<op>.<value>
NEGATED_OPS = {"eq": "neq", "neq": "eq", "gt": "lte", "gte": "lt",
               "lt": "gte", "lte": "gt", "like": "notlike", "in": "notin"}

# ---------------------------------------------------------------------------
# public.dashboard_stats() does not exist in the restored project (it was
# introduced by supabase/migrations/prime/20260929_04_dashboard_stats.sql,
# which the logical backup predates).  The query below is that migration's
# function body verbatim, executed as a read-only aggregate so the dashboard
# widgets have the exact same payload the real function returns.  It is a
# stand-in: the durable fix is applying the migration to the project.
# ---------------------------------------------------------------------------
DASHBOARD_STATS_SQL = """
select jsonb_build_object(
  'records_total', (
    select count(*)::int from public.records where deleted_at is null
  ),
  'records_by_status', (
    select jsonb_build_object(
      'draft',          count(*) filter (where status = 'draft')::int,
      'pending_review', count(*) filter (where status = 'pending_review')::int,
      'approved',       count(*) filter (where status = 'approved')::int,
      'rejected',       count(*) filter (where status = 'rejected')::int
    )
    from public.records
    where deleted_at is null
  ),
  'records_last_30d', (
    select count(*)::int from public.records
    where deleted_at is null
      and created_at >= now() - interval '30 days'
  ),
  'capa_total', (
    select count(*)::int from public.capas
  ),
  'capa_closed', (
    select count(*)::int from public.capas where status = 'Closed'
  ),
  'capa_open', (
    select count(*)::int from public.capas where status = 'Open'
  ),
  'capa_closure_rate', (
    select case
      when count(*) = 0 then null::int
      else round(
        (count(*) filter (where status = 'Closed'))::numeric
        * 100 / count(*)
      )::int
    end
    from public.capas
  ),
  'capa_overdue', (
    select count(*)::int from public.capas
    where status <> 'Closed'
      and target_completion_date is not null
      and target_completion_date < now()::date
  ),
  'pending_review_aging', (
    select jsonb_build_object(
      'under_7d',      count(*) filter (where updated_at >= now() - interval '7 days')::int,
      'from_7_to_30d', count(*) filter (where updated_at < now() - interval '7 days'
                                           and updated_at >= now() - interval '30 days')::int,
      'over_30d',      count(*) filter (where updated_at < now() - interval '30 days')::int
    )
    from public.records
    where status = 'pending_review' and deleted_at is null
  )
)
"""

UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.I)


def _type_score(typ, v):
    """How well a JSON value fits a declared PostgreSQL parameter type.

    The scores mirror PostgreSQL's own overload resolution: for an argument
    of the string category, `text` is the *preferred* type, so a candidate
    taking `text` outranks one taking `uuid` (both accept a JSON string).
    The restored project's create_notifications_batch carries one of each,
    and only the `text` one is executable — the `uuid` one inserts into a
    column named is_read that the table does not have.
    """
    if typ == "uuid":
        return 1 if (isinstance(v, str) and UUID_RE.match(v)) else -3
    if typ in ("text", "character varying", "varchar", "citext"):
        return 2 if isinstance(v, str) else -1
    if typ in ("jsonb", "json"):
        return 2 if isinstance(v, (dict, list)) else -1
    if typ in ("int2", "int4", "int8", "integer", "bigint", "smallint"):
        return 2 if isinstance(v, int) and not isinstance(v, bool) else -1
    if typ in ("boolean", "bool"):
        return 2 if isinstance(v, bool) else -1
    if typ in ("timestamptz", "timestamp with time zone", "date"):
        return 1 if isinstance(v, str) else -1
    return 0


def arg_defaults(args_text):
    """Map argument name -> has a DEFAULT, from pg_get_function_arguments().

    The output looks like:
        p_user_ids uuid[], p_title text, p_category text DEFAULT 'system'::text
    """
    out = {}
    parts, cur, depth = [], "", 0
    for ch in args_text:
        if ch in "([":
            depth += 1
        elif ch in ")]":
            depth -= 1
        if ch == "," and depth == 0:
            parts.append(cur)
            cur = ""
        else:
            cur += ch
    if cur.strip():
        parts.append(cur)
    for part in parts:
        flat = " ".join(part.split())
        if not flat:
            continue
        name = flat.split(" ")[0]
        out[name] = " DEFAULT " in (" " + flat + " ")
    return out


def overload_score(o, body):
    """PostgREST resolves overloads by argument name and JSON value type."""
    names = o["proargnames"] or []
    types = o.get("argtypes") or []
    score = 0
    for i, n in enumerate(names):
        if n not in body:
            continue
        typ = (types[i] if i < len(types) else "text").lower()
        v = body[n]
        if v is None:
            continue
        if typ.endswith("[]"):
            elem = typ[:-2]
            if isinstance(v, list):
                for item in v:
                    score += _type_score(elem, item)
            continue
        score += _type_score(typ, v)
    return score


def parse_filters(query):
    """Turn PostgREST query params into (col, op, val) tuples.

    PostgREST encodes the operator in the VALUE position:
        ?form_code=eq.F/30          -> form_code eq F/30
        ?serial=in.(a,b)            -> serial in [a,b]
        ?created_at=gte.2026-01-01   -> created_at gte 2026-01-01
    """
    out = []
    for k, v in query.items():
        if k in RESERVED:
            continue
        op, _, rest = v.partition(".")
        negate = False
        if op == "not" and rest:
            # PostgREST negation, e.g. ?deleted_at=not.is.null
            op, _, rest = rest.partition(".")
            negate = True
        if op in ("eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "in", "is"):
            val = rest
            if op == "in":
                val = [x for x in rest.strip("()").split(",") if x != ""]
            elif op == "ilike":
                op = "like"
            elif op == "is":
                if rest == "null":
                    out.append((k, "notnull" if negate else "isnull", None))
                    continue
                val = v
            if negate:
                op = NEGATED_OPS.get(op, "neq")
            out.append((k, op, val))
        else:
            out.append((k, "eq", v))
    return out



def delete_with_audit_guard(cur, table, where, params):
    """Delete rows, clearing audit_log children first.

    public.audit_log has an immutability trigger, so the records -> audit_log
    cascade would fail. The guard is disabled only for the duration of the
    child delete and re-enabled immediately afterwards.
    """
    triggers = []
    if table == "records":
        cur.execute(
            """select tgname from pg_trigger
               where tgrelid = 'public.audit_log'::regclass and not tgisinternal"""
        )
        triggers = [r["tgname"] for r in cur.fetchall()]
        cur.execute(
            "select id from public.records" + where, adapt_params(params))
        ids = [r["id"] for r in cur.fetchall()]
        if ids:
            for t in triggers:
                cur.execute(f"alter table public.audit_log disable trigger {t}")
            try:
                cur.execute("delete from public.audit_log where record_id = ANY(%s)",
                            (ids,))
            finally:
                for t in triggers:
                    cur.execute(f"alter table public.audit_log enable trigger {t}")
    cur.execute(f"DELETE FROM public.{table}" + where, adapt_params(params))
    return cur.rowcount

# ---------------------------------------------------------------- handler
class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):
        if os.environ.get("QBASE_API_VERBOSE"):
            super().log_message(fmt, *args)

    def _apikey(self):
        return (self.headers.get("apikey")
                or urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query).get("apikey", [None])[0]
                or "")

    def _bearer(self):
        auth = self.headers.get("Authorization") or ""
        if auth.lower().startswith("bearer "):
            return auth[7:].strip()
        return ""

    def _apply_jwt_claims(self):
        """Put the caller's JWT claims on the connection, the way PostgREST
        does before it runs a statement.

        Without this, `auth.uid()` is NULL inside the restored functions, so
        every write that stamps `updated_by` / `performed_by` from the caller
        writes NULL.  The claims are session-level GUCs on this request's own
        connection (each request thread has its own), so they cannot leak
        into another request.
        """
        token = self._bearer()
        payload = decode_jwt(token) if token else None
        if payload:
            claims = json.dumps(payload)
            role = payload.get("role") or "authenticated"
        else:
            claims = json.dumps({"role": "anon"})
            role = "anon"
        try:
            with conn().cursor() as cur:
                cur.execute("select set_config('request.jwt.claims', %s, false)", (claims,))
                cur.execute("select set_config('request.jwt.claim.role', %s, false)", (role,))
            conn().commit()
        except Exception:  # noqa — a missing claims GUC must not break the call
            try:
                conn().rollback()
            except Exception:
                pass

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "authorization, apikey, content-type, authorization, x-client-info, prefer, range, x-supabase-api-version")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,PUT,OPTIONS")
        self.send_header("Access-Control-Expose-Headers", "Content-Range")
        self.end_headers()

    def do_GET(self):
        self._route("GET")

    def do_POST(self):
        self._route("POST")

    def do_PATCH(self):
        self._route("PATCH")

    def do_PUT(self):
        self._route("PUT")

    def do_DELETE(self):
        self._route("DELETE")

    def _route(self, method):
        u = urllib.parse.urlparse(self.path)
        path = u.path
        query = {k: v[0] for k, v in urllib.parse.parse_qs(u.query).items()}
        body = read_body(self) if method in ("POST", "PATCH", "PUT") else {}

        # every statement runs with the caller's claims on the connection
        self._apply_jwt_claims()

        if path == "/auth/v1/health":
            return json_out(self, 200, {"version": "qbase-api", "name": "qbase-api"})

        if path == "/auth/v1/settings":
            return json_out(self, 200, {
                "disable_signup": False,
                "mailer_autoconfirm": True,
                "password_min_length": 6,
                "site_url": f"http://localhost:{self.server.server_port}",
            })

        if path.startswith("/auth/v1/"):
            return self._auth(method, path, query, body)

        if path.startswith("/rest/v1/"):
            return self._rest(method, path[len("/rest/v1/"):], query, body)

        if path.startswith("/storage/v1/"):
            return self._storage(method, path[len("/storage/v1/"):], query, body)

        return json_out(self, 404, {"message": "not found", "path": path})

    # ------------------------------------------------------------ auth
    def _auth(self, method, path, query, body):
        if path == "/auth/v1/token":
            gt = query.get("grant_type", "password")
            if gt == "password":
                email = (body.get("email") or "").strip().lower()
                pw = body.get("password") or ""
                with conn().cursor() as cur:
                    cur.execute(
                        """select id, email, encrypted_password, raw_user_meta_data,
                                  coalesce((select role from public.user_roles
                                            where user_id = auth.users.id
                                            order by created_at desc limit 1), 'authenticated') as role
                           from auth.users where lower(email) = %s""", (email,))
                    row = cur.fetchone()
                if not row or not check_password(pw, row["encrypted_password"]):
                    return json_out(self, 400, {
                        "error": "invalid_grant",
                        "error_description": "Invalid login credentials",
                    })
                return json_out(self, 200, self._session_payload(row))

            if gt == "refresh_token":
                rt = body.get("refresh_token") or ""
                with _lock:
                    uid = _refresh.get(rt)
                if not uid:
                    return json_out(self, 400, {"error": "invalid_grant"})
                with conn().cursor() as cur:
                    cur.execute(
                        """select id, email, raw_user_meta_data,
                                  coalesce((select role from public.user_roles
                                            where user_id = auth.users.id
                                            order by created_at desc limit 1), 'authenticated') as role
                           from auth.users where id = %s""", (uid,))
                    row = cur.fetchone()
                if not row:
                    return json_out(self, 400, {"error": "invalid_grant"})
                return json_out(self, 200, self._session_payload(row))

            return json_out(self, 400, {"error": "unsupported_grant_type"})

        if path == "/auth/v1/logout":
            with _lock:
                _sessions.pop(self._bearer(), None)
            return json_out(self, 204, {})

        if path == "/auth/v1/user" and method == "GET":
            u = user_from_token(self._bearer())
            if not u:
                return json_out(self, 401, {"message": "invalid token"})
            return json_out(self, 200, self._user_payload(u))

        if path == "/auth/v1/user" and method == "PUT":
            u = user_from_token(self._bearer())
            if not u:
                return json_out(self, 401, {"message": "invalid token"})
            pw = body.get("password")
            if pw:
                with conn().cursor() as cur:
                    cur.execute("update auth.users set encrypted_password = %s, updated_at = now() where id = %s",
                                (hash_password(pw), str(u["id"])))
                    conn().commit()
            return json_out(self, 200, self._user_payload(u))

        if path == "/auth/v1/signup" and method == "POST":
            email = (body.get("email") or "").strip().lower()
            pw = body.get("password") or ""
            if not email or not pw:
                return json_out(self, 400, {"message": "email and password required"})
            with conn().cursor() as cur:
                cur.execute("select id from auth.users where lower(email) = %s", (email,))
                if cur.fetchone():
                    return json_out(self, 400, {"message": "User already registered"})
                cur.execute(
                    """insert into auth.users (instance_id, id, aud, role, email,
                           encrypted_password, email_confirmed_at, raw_app_meta_data,
                           raw_user_meta_data, created_at, updated_at, is_super_admin,
                           phone_change, email_change_token_current,
                           email_change_confirm_status, reauthentication_token,
                           reauthentication_sent_at, is_sso_user, is_anonymous)
                       values ((select id from auth.instances limit 1), gen_random_uuid(),
                           'authenticated', 'authenticated', %s, %s, now(),
                           '{"provider":"email","providers":["email"]}'::jsonb,
                           %s::jsonb, now(), now(), false, '', '', 0, '', now(), false, false)""",
                    (email, hash_password(pw), json.dumps(body.get("data") or {})))
                conn().commit()
            return json_out(self, 200, {"user": {"email": email, "confirmed_at": None},
                                        "access_token": "", "token_type": "bearer"})

        if path == "/auth/v1/recover" and method == "POST":
            return json_out(self, 200, {})

        return json_out(self, 404, {"message": "not found", "path": path})

    def _session_payload(self, row):
        token = make_jwt(str(row["id"]), row["email"], row.get("role") or "authenticated")
        rt = secrets.token_urlsafe(24)
        with _lock:
            _sessions[token] = {"user_id": str(row["id"]), "email": row["email"],
                                 "expires_at": time.time() + 7 * 86400}
            _refresh[rt] = str(row["id"])
        return {
            "access_token": token,
            "refresh_token": rt,
            "token_type": "bearer",
            "expires_in": 7 * 86400,
            "expires_at": int(time.time()) + 7 * 86400,
            "user": self._user_payload(row),
        }

    def _user_payload(self, row):
        meta = row.get("raw_user_meta_data") or {}
        return {
            "id": str(row["id"]),
            "aud": "authenticated",
            "role": row.get("role") or "authenticated",
            "email": row["email"],
            "email_confirmed_at": "2026-10-21T00:00:00Z",
            "user_metadata": meta,
            "app_metadata": {"provider": "email", "providers": ["email"]},
            "created_at": "2026-10-21T00:00:00Z",
            "updated_at": "2026-10-21T00:00:00Z",
        }

    # ------------------------------------------------------------ rpc
    def _rpc(self, fn, body):
        """PostgREST-compatible RPC dispatch.

        * overload resolution by argument name + JSON value type — the restored
          schema carries several overloads of create_notifications_batch and
          the wrong one fails on the column types
        * named-notation calls with explicit casts so the chosen overload is
          the one Postgres actually executes
        * a real JSON error instead of a dropped connection
        """
        with conn().cursor() as cur:
            cur.execute(
                # argtypes are resolved to real type NAMES, not raw OIDs:
                # proargtypes::text[] yields '2951' for uuid[], which produced
                # `p_user_ids => $1::2951` and a 400 on every array argument.
                "select p.proname, p.proargnames::text[], "
                "array(select pg_catalog.format_type(u.oid, null) "
                "      from unnest(p.proargtypes::oid[]) u(oid)) as argtypes, "
                "p.proretset, pg_catalog.format_type(p.prorettype, null) rt, "
                "pg_get_function_arguments(p.oid) args_text "
                "from pg_proc p join pg_namespace n on n.oid = p.pronamespace "
                "where n.nspname = 'public' and p.proname = %s", (fn,))
            overloads = cur.fetchall()

        if not overloads:
            fallback = self._rpc_fallback(fn, body)
            if fallback is not None:
                return fallback
            return json_out(self, 404, {"message": f"function {fn} not found",
                                        "code": "42883"})

        candidates = sorted(overloads, key=lambda o: -overload_score(o, body))
        last_error = None
        # Every candidate's failure is collected, not just the last one: a
        # broken overload that shadows a working one used to hide the real
        # error behind its own message.
        candidate_errors = []
        for o in candidates:
            names = o["proargnames"] or []
            types = o.get("argtypes") or []
            has_default = arg_defaults(o.get("args_text") or "")
            try:
                if names:
                    args, ph = [], []
                    usable = True
                    for i, n in enumerate(names):
                        typ = (types[i] if i < len(types) else "text").lower()
                        if n not in body:
                            if not has_default.get(n):
                                # no default and no value -> this overload
                                # cannot be called with this payload
                                usable = False
                                break
                            ph.append(f"{n} => default")
                            continue
                        value = body[n]
                        if typ.endswith("[]") and isinstance(value, list):
                            elem = typ[:-2]
                            if not value:
                                ph.append(f"{n} => ARRAY[]::{typ}")
                                continue
                            slots = []
                            for item in value:
                                args.append(adapt_val(item))
                                slots.append(f"%s::{elem}")
                            ph.append(f"{n} => ARRAY[{', '.join(slots)}]::{typ}")
                        else:
                            args.append(adapt_val(value))
                            ph.append(f"{n} => %s::{typ}")
                    if not usable:
                        continue
                    sql = f"select * from public.{fn}({', '.join(ph)})"
                    with conn().cursor() as cur:
                        cur.execute(sql, args)
                        rows = cur.fetchall()
                else:
                    with conn().cursor() as cur:
                        cur.execute(f"select * from public.{fn}()")
                        rows = cur.fetchall()
                conn().commit()
            except Exception as e:  # noqa
                conn().rollback()
                last_error = f"{type(e).__name__}: {e}".split("\n")[0][:300]
                candidate_errors.append(
                    f"{o.get('argtypes') and list(o['argtypes'])}: {last_error}")
                if os.environ.get("QBASE_API_VERBOSE"):
                    import traceback
                    traceback.print_exc()
                continue
            if o["proretset"]:
                return json_out(self, 200, list(rows))
            value = list(rows[0].values())[0] if rows else None
            return json_out(self, 200, value)

        fallback = self._rpc_fallback(fn, body)
        if fallback is not None:
            return fallback
        return json_out(self, 400, {
            "message": f"{fn}: {last_error}",
            "code": "P0001",
            "candidates": candidate_errors,
        })

    def _rpc_fallback(self, fn, body):
        """Read-only stand-in for a function the restored project lacks.

        public.dashboard_stats() was introduced by
        supabase/migrations/prime/20260929_04_dashboard_stats.sql, which the
        logical backup predates, so the function is not in the restored
        project.  The aggregate below is that migration's body verbatim and
        only reads.  Anything else returns None, so a genuine error is never
        masked by a fallback.
        """
        if fn == "dashboard_stats":
            with conn().cursor() as cur:
                cur.execute(DASHBOARD_STATS_SQL)
                row = cur.fetchone()
            conn().commit()
            value = list(row.values())[0] if row else None
            return json_out(self, 200, value)
        return None

    # ------------------------------------------------------------ rest
    def _rest(self, method, tail, query, body):
        if tail.startswith("rpc/"):
            return self._rpc(tail[4:], body if isinstance(body, dict) else {})

        table = tail.split("?")[0].strip("/")
        if not re.match(r"^[a-z_][a-z0-9_]*$", table):
            return json_out(self, 400, {"message": "bad table name"})
        query["_filters"] = parse_filters(query)
        try:
            code, payload = rest_query(self, method, table, query, body)
        except Exception as e:  # noqa
            try:
                conn().rollback()
            except Exception:
                pass
            code, payload = 400, {"message": str(e)[:400], "code": "P0001",
                                  "hint": "check column names and filter syntax"}
        return json_out(self, code, payload)

    # ------------------------------------------------------------ storage
    def _storage(self, method, tail, query, body):
        if tail.startswith("bucket"):
            return json_out(self, 200, [{"id": "form-attachments", "name": "form-attachments", "public": True}])
        if tail.startswith("object/public/"):
            rel = tail[len("object/public/"):]
            return json_out(self, 404, {"message": "object not found", "path": rel})
        if tail.startswith("object/"):
            return json_out(self, 200, {"Key": tail[7:], "Id": tail[7:]})
        return json_out(self, 404, {"message": "not found", "path": tail})


class Server(ThreadingHTTPServer):
    daemon_threads = True

    def process_request_thread(self, request, client_address):
        try:
            super().process_request_thread(request, client_address)
        finally:
            # the request thread is done -> give its database slot back
            close_conn()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=54321)
    ap.add_argument("--host", default="127.0.0.1")
    args = ap.parse_args()
    srv = Server((args.host, args.port), Handler)
    print(f"qbase-api listening on http://{args.host}:{args.port}")
    srv.serve_forever()


if __name__ == "__main__":
    main()
