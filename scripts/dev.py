"""Serve dashboard routes on the first available local development port."""
import argparse
import errno
import json
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent.parent
ROUTES = frozenset(json.loads((ROOT / 'dashboard/routes.json').read_text()).values())


class DashboardHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def send_head(self):
        if 'If-Modified-Since' in self.headers:
            del self.headers['If-Modified-Since']
        url = urlsplit(self.path)
        path = url.path
        canonical = path.removesuffix('/index.html').rstrip('/')
        if path in ('/', '/dashboard/index.html'):
            canonical = '/dashboard'
        if canonical in ROUTES:
            if path != canonical:
                self.send_response(308)
                self.send_header('Location', canonical + ('?' + url.query if url.query else ''))
                self.send_header('Content-Length', '0')
                self.end_headers()
                return None
            self.path = '/dashboard/index.html'
        return super().send_head()


def create_server(start_port: int, strict_port: bool = False) -> ThreadingHTTPServer:
    handler = partial(DashboardHandler, directory=str(ROOT))
    attempts = 1 if strict_port else 10
    for port in range(start_port, min(start_port + attempts, 65536)):
        try:
            return ThreadingHTTPServer(('127.0.0.1', port), handler)
        except OSError as error:
            if error.errno != errno.EADDRINUSE:
                raise
    raise OSError(errno.EADDRINUSE, 'No available development port; choose another with --port.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=5500, help='Preferred port; tries up to 10 ports.')
    parser.add_argument('--strict-port', action='store_true', help='Fail if the selected port is occupied.')
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error('--port must be between 1 and 65535')
    try:
        server = create_server(args.port, args.strict_port)
    except OSError as error:
        parser.exit(1, f'Unable to start dashboard server: {error}\n')
    with server:
        port = server.server_address[1]
        if port != args.port:
            print(f'Port {args.port} is unavailable; using {port}.', flush=True)
        print(f'Dashboard: http://127.0.0.1:{port}/dashboard', flush=True)
        print('Press Ctrl+C to stop. Rebuild TypeScript changes with bun run build.', flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print('\nDashboard server stopped.', flush=True)


if __name__ == '__main__':
    main()
