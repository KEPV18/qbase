# Password Reset Runbook — Shared Supabase Project

**Scope:** how password-recovery emails get redirected, why one wrong value
breaks the QBase login flow, and the exact commands to inspect and repair it.

## 1. Topology: one Supabase project, two applications

The QBase repository (`KEPV18/qbase`) and the QMS Forge repository **share the
same Supabase project**:

| Item | Value |
|---|---|
| Supabase project ref | `iouuikteroixnsqazznc` |
| QBase production origin | `https://qbase-sable.vercel.app` |
| QMS Forge origin | `https://qms-forge.vercel.app` |

Because the project is shared, a change made for one application is a change
made for **both**. There is no per-app auth configuration.

> ⚠️ **Both origins must stay in `uri_allow_list`.**
> Removing `https://qms-forge.vercel.app/**` silently breaks QMS Forge login and
> password recovery. Removing `https://qbase-sable.vercel.app/**` silently
> breaks QBase the same way. Editing this list is always a two-app decision.

### `site_url` vs `uri_allow_list`

- **`site_url`** — the default landing origin. Recovery and confirmation links
  are generated against it unless a specific redirect is supplied. If it points
  at the other application, every recovery link lands on the **wrong app**.
- **`uri_allow_list`** — the allow-list of redirect targets. A redirect to an
  origin missing from this list is **rejected** by Supabase.

So an auth-redirect misconfiguration has two failure modes: wrong destination
(`site_url`) or rejected destination (`uri_allow_list`). Either one looks like
"the reset link does not work" to the end user.

### Expected correct state

```
site_url        = https://qbase-sable.vercel.app
uri_allow_list  = https://qbase-sable.vercel.app/**,https://qms-forge.vercel.app/**,http://localhost:5173/**,http://localhost:8080/**
```

The two localhost entries exist for local development only.

## 2. Inspect the configuration (GET, read-only)

Needs a Supabase **Management API** token (`sbp_...`) in the environment — never
committed to the repository:

```bash
export SUPABASE_ACCESS_TOKEN="sbp_..."   # do NOT hard-code or commit this

curl -sS -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  "https://api.supabase.com/v1/projects/iouuikteroixnsqazznc/config/auth" \
  | python3 -m json.tool | grep -E '"site_url"|"uri_allow_list"'
```

## 3. Repair the configuration (PATCH — planned change only)

Use **only** when the inspection above shows a wrong value. Always send the
**full** `uri_allow_list`, including the other application's origin:

```bash
curl -sS -X PATCH \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "site_url": "https://qbase-sable.vercel.app",
    "uri_allow_list": "https://qbase-sable.vercel.app/**,https://qms-forge.vercel.app/**,http://localhost:5173/**,http://localhost:8080/**"
  }' \
  "https://api.supabase.com/v1/projects/iouuikteroixnsqazznc/config/auth"
```

Then re-run section 2 and the smoke check in section 5. Patching auth config is
a production change: get approval first, and never run it during an audit.

## 4. The `/reset-password` route contract

- Route path: **`/reset-password`**.
- It must be a **public route, mounted OUTSIDE `RequireAuth`**. A recovery link
  arrives on a session-less browser; behind the auth guard the user is bounced
  to login and the recovery token is lost.
- It reads the recovery token from the URL (Supabase places it in the fragment,
  e.g. `#access_token=...&type=recovery`), calls `updateUser` to set the new
  password, then redirects to the login page.
- The origin generating the email (`site_url`) and the origin serving
  `/reset-password` must be the same application — exactly what the smoke check
  below protects.

## 5. Run the smoke check

```bash
cd /home/kepv/.qwenpaw/workspaces/qms/qbase-work

# Expected production URL (default) — expect PASS / exit 0
SUPABASE_ACCESS_TOKEN=sbp_... ./scripts/check-auth-redirect.sh

# Negative control / staging check — expect FAIL / non-zero exit
EXPECTED_SITE_URL=https://wrong.example.com \
  SUPABASE_ACCESS_TOKEN=sbp_... ./scripts/check-auth-redirect.sh
```

The script is **GET-only**: it never sends email, never mutates remote state,
and never hard-codes the token. It asserts two things and prints one line:

1. `site_url` equals the expected QBase origin.
2. the expected QBase origin appears in `uri_allow_list`.

Exit codes: `0` = PASS, `1` = misconfiguration, `2` = environment/tooling
problem (missing token, no `curl`, no `python3`).

**Run this after any Supabase auth change, and whenever a password-recovery link
misbehaves.** A non-zero exit is a real defect, not a warning.
