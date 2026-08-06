import json
import os
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


HOST = os.environ.get("HOST", "127.0.0.1")
PORT = int(os.environ.get("PORT", "8000"))
PUBLIC_ROOT = Path(__file__).parent / "src" / "app"

ROUTES = {
    "/": "/login/page.html",
    "/login": "/login/page.html",
    "/admin": "/admin/page.html",
    "/avisos": "/avisos/page.html",
}


class FansRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self) -> None:
        if self._send_health_check():
            return

        self._apply_route()
        super().do_GET()

    def do_HEAD(self) -> None:
        if self._send_health_check(include_body=False):
            return

        self._apply_route()
        super().do_HEAD()

    def _apply_route(self) -> None:
        parsed = urlsplit(self.path)
        target = ROUTES.get(parsed.path)

        if target:
            self.path = target

    def _send_health_check(self, include_body: bool = True) -> bool:
        if urlsplit(self.path).path != "/health":
            return False

        payload = json.dumps({"status": "ok", "service": "fans"}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()

        if include_body:
            self.wfile.write(payload)

        return True


def main() -> None:
    handler = partial(FansRequestHandler, directory=PUBLIC_ROOT)
    server = ThreadingHTTPServer((HOST, PORT), handler)

    print(f"FANS rodando em http://{HOST}:{PORT}", flush=True)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor encerrado.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
