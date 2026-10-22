#!/usr/bin/env python3
"""
Launch the local Supabase-compatible shim with the same environment an
already-running shim instance uses (read from /proc/<pid>/environ), so the
credentials never appear in argv, on disk, or in a transcript.

The source instance is found automatically: the first running process whose
command line mentions `qbase_api.py` and whose environment carries `SB_REF`.
Override it with SHIM_SRC_PID=<pid> when needed.

Usage: python3 run-shim.py <script> [args...]
"""
import os
import sys

KEYS = ("SB_REF", "SB_REGION", "SB_DB_PASS", "SB_ANON_KEY", "SB_SERVICE_KEY",
        "QBASE_JWT_SECRET")
PYTHON = "/home/kepv/.local/share/pipx/venvs/qwenpaw/bin/python3"


def find_source_pid():
    explicit = os.environ.get("SHIM_SRC_PID")
    if explicit and os.path.isdir(f"/proc/{explicit}"):
        return explicit
    for entry in os.listdir("/proc"):
        if not entry.isdigit():
            continue
        try:
            with open(f"/proc/{entry}/cmdline", "rb") as fh:
                cmdline = fh.read().decode(errors="replace")
            if "qbase_api.py" not in cmdline:
                continue
            with open(f"/proc/{entry}/environ", "rb") as fh:
                env = fh.read()
            if b"SB_REF=" in env:
                return entry
        except OSError:
            continue
    return None


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: run-shim.py <script> [args...]", file=sys.stderr)
        return 2
    env = dict(os.environ)
    src = find_source_pid()
    if src is None:
        print("refusing to start: no running shim instance to inherit the "
              "credentials from (set SB_* / QBASE_JWT_SECRET yourself)",
              file=sys.stderr)
        return 1
    with open(f"/proc/{src}/environ", "rb") as fh:
        for chunk in fh.read().split(b"\0"):
            if b"=" not in chunk:
                continue
            k, v = chunk.split(b"=", 1)
            key = k.decode()
            if key in KEYS:
                env[key] = v.decode()
    missing = [k for k in ("SB_REF", "SB_DB_PASS") if k not in env]
    if missing:
        print(f"refusing to start: {', '.join(missing)} not found in the source env",
              file=sys.stderr)
        return 1
    env.setdefault("SB_REGION", "eu-west-1")
    argv = sys.argv[1:]
    if not os.access(argv[0], os.X_OK):
        # not executable -> run it with the interpreter that has psycopg
        argv = [PYTHON, *argv]
    os.execve(argv[0], argv, env)
    return 0  # unreachable


if __name__ == "__main__":
    raise SystemExit(main())
