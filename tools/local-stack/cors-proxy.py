#!/usr/bin/env python3
"""
Reverse proxy in front of the qbase-api shim.

The Vite dev server and the browser both need a single origin for the
Supabase API, and the browser must not see a "mixed content" warning. This
proxy serves the shim under the same host:port the app is served from, and
forwards /auth/*, /rest/*, /storage/* to the shim.

Run:  python3 proxy.py --listen 54321 --upstream 127.0.0.1:54326

THE ALLOW-LIST (ALLOWED_ORIGIN)
-------------------------------
A Vercel preview is served over HTTPS, so the browser has to reach the
local API — which lives on 127.0.0.1 — from a public origin.  That is a
"private network request", and Chrome refuses it until the server opts in
with `Access-Control-Allow-Private-Network: true`.

The opt-in is a door, so it is opened to one origin only.  ALLOWED_ORIGIN
is a comma-separated list of origins; a single `*` inside one matches
anything.  A request from an origin that is not on the list is refused
outright (403) and never reaches the database — so no other site can use
this browser to read or write the local data.

    ALLOWED_ORIGIN='https://qbase-*.vercel.app' python3 cors-proxy.py \
        --listen 54352 --upstream 127.0.0.1:54350

With ALLOWED_ORIGIN unset the proxy behaves as it always has: every
origin is allowed, which is what the local SPA on 127.0.0.1:5210 needs.
"""
import argparse
import http.server
import os
import re
import socketserver
import urllib.error
import urllib.request

UPSTREAM = "127.0.0.1:54326"
LISTEN = 54321

# The origins allowed to make private-network requests.  Empty means
# "every origin", which is the local SPA's case.
ALLOWED_ORIGINS = [o.strip() for o in os.environ.get("ALLOWED_ORIGIN", "").split(",") if o.strip()]


def origin_allowed(origin):
    """Is this request's origin on the allow-list?

    A request with no Origin header (curl, a server-side call) is not a
    browser asking for a private resource, so it is allowed through."""
    if not ALLOWED_ORIGINS:
        return True
    if not origin:
        return True
    for pat in ALLOWED_ORIGINS:
        if pat == origin:
            return True
        if "*" in pat:
            if re.fullmatch("^" + re.escape(pat).replace(r"\*", ".*") + "$", origin):
                return True
    return False


class Proxy(http.server.BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):
        if os.environ.get("PROXY_VERBOSE"):
            print(f"  {self.command} {self.path}", flush=True)

    def _cors(self):
        """Always answer with the CORS headers — including on error
        responses.  Without them the browser reports a CORS failure and hides
        the real status/body of the failing request."""
        origin = self.headers.get("Origin")
        if origin and not origin_allowed(origin):
            # No Access-Control-Allow-Origin: the browser will not hand
            # the response to the page.  And no private-network opt-in
            # either, so the request never leaves the browser.
            return
        if ALLOWED_ORIGINS and origin:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        else:
            self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,PUT,OPTIONS")
        self.send_header("Access-Control-Expose-Headers", "Content-Range")
        # Chrome's Private Network Access.  A page served from a PUBLIC
        # origin (a Vercel preview is https://…) asking a LOOPBACK
        # address (127.0.0.1 is where the local API lives) is a private
        # network request, and Chrome refuses to send it until the
        # server opts in:
        #
        #   Access to fetch at 'http://127.0.0.1:54351/rest/v1/...'
        #   from origin 'https://qbase-....vercel.app' has been blocked
        #   by CORS policy: Permission was denied for this request to
        #   access the `loopback` address space.
        #
        # The header has to be on the preflight too, or the preflight
        # fails and the real request is never sent.
        self.send_header("Access-Control-Allow-Private-Network", "true")

    def _refused(self):
        """The request comes from an origin that is not allowed to reach
        the local API.  Say so plainly, and send nothing to the database."""
        body = b'{"message":"origin not allowed"}'
        self.send_response(403)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _proxy(self, method):
        if not origin_allowed(self.headers.get("Origin")):
            self._refused()
            return
        length = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(length) if length else None

        url = f"http://{UPSTREAM}{self.path}"
        headers = {}
        for k in ("apikey", "Authorization", "Content-Type", "Accept",
                  "Prefer", "Range", "X-Client-Info", "X-Supabase-Api-Version"):
            v = self.headers.get(k)
            if v:
                headers[k] = v
        if not headers.get("Authorization") and self.headers.get("apikey"):
            headers["Authorization"] = f"Bearer {self.headers.get('apikey')}"

        req = urllib.request.Request(url, data=body, method=method, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                data = r.read()
                if os.environ.get("PROXY_VERBOSE"):
                    print(f"  -> {r.status} {len(data)}B {self.path[:110]}", flush=True)
                self.send_response(r.status)
                for k, v in r.headers.items():
                    if k.lower() in ("content-length", "transfer-encoding",
                                     "connection", "content-encoding"):
                        continue
                    self.send_header(k, v)
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)
        except urllib.error.HTTPError as e:
            data = e.read()
            if os.environ.get("PROXY_VERBOSE"):
                print(f"  -> ERR {e.code} {self.path[:110]} {data[:200]!r}", flush=True)
            self.send_response(e.code)
            self.send_header("Content-Type", "application/json")
            self._cors()
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        except Exception as e:  # noqa
            data = str(e).encode()
            self.send_response(502)
            self._cors()
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

    def do_GET(self):
        self._proxy("GET")

    def do_POST(self):
        self._proxy("POST")

    def do_PATCH(self):
        self._proxy("PATCH")

    def do_PUT(self):
        self._proxy("PUT")

    def do_DELETE(self):
        self._proxy("DELETE")

    def do_OPTIONS(self):
        self.send_response(204)
        # The preflight has to carry the same opt-in as the real
        # response, or Chrome stops at the preflight and never sends
        # the request it was asking permission for.  And an origin that
        # is not on the allow-list gets no opt-in at all.
        if origin_allowed(self.headers.get("Origin")):
            self._cors()
        self.end_headers()


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--listen", type=int, default=54321)
    ap.add_argument("--upstream", default="127.0.0.1:54326")
    a = ap.parse_args()
    UPSTREAM = a.upstream
    LISTEN = a.listen
    print(f"proxy {LISTEN} -> {UPSTREAM}")
    Server(("127.0.0.1", LISTEN), Proxy).serve_forever()
