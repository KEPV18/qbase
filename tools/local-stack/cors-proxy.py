#!/usr/bin/env python3
"""
Reverse proxy in front of the qbase-api shim.

The Vite dev server and the browser both need a single origin for the
Supabase API, and the browser must not see a "mixed content" warning. This
proxy serves the shim under the same host:port the app is served from, and
forwards /auth/*, /rest/*, /storage/* to the shim.

Run:  python3 proxy.py --listen 54321 --upstream 127.0.0.1:54326
"""
import argparse
import http.server
import os
import socketserver
import urllib.error
import urllib.request

UPSTREAM = "127.0.0.1:54326"
LISTEN = 54321


class Proxy(http.server.BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):
        if os.environ.get("PROXY_VERBOSE"):
            print(f"  {self.command} {self.path}", flush=True)

    def _cors(self):
        """Always answer with the CORS headers — including on error
        responses.  Without them the browser reports a CORS failure and hides
        the real status/body of the failing request."""
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,PUT,OPTIONS")
        self.send_header("Access-Control-Expose-Headers", "Content-Range")

    def _proxy(self, method):
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
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,PUT,OPTIONS")
        self.send_header("Access-Control-Expose-Headers", "Content-Range")
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
