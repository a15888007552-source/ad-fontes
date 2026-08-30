#!/usr/bin/env python3
"""Loopback-only static preview with optional /ad-fontes prefix and real 404s.

Both / and /ad-fontes (plus the configured prefix) map to the repository root. Missing resources
serve the repository's 404.html with HTTP 404, never a 200 SPA fallback.
"""

from __future__ import annotations

import argparse
from contextlib import contextmanager
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
from urllib.parse import unquote, urlsplit, urlunsplit


ROOT = Path(__file__).resolve().parents[1]


class SiteHandler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json"}

    def __init__(self, *args, directory, prefix="/ad-fontes", verbose=False, **kwargs):
        self.site_root = Path(directory).resolve()
        self.site_prefix = "/" + prefix.strip("/") if prefix.strip("/") else ""
        self.verbose = verbose
        super().__init__(*args, directory=str(self.site_root), **kwargs)

    def log_message(self, format, *args):
        if self.verbose:
            super().log_message(format, *args)

    def target_path(self):
        path = unquote(urlsplit(self.path).path)
        for prefix in sorted({"/ad-fontes", self.site_prefix}, key=len, reverse=True):
            if prefix and (path == prefix or path.startswith(prefix + "/")):
                path = path[len(prefix):]
                break
        if "\\" in path or "\x00" in path or ".." in path.split("/"):
            return None
        candidate = (self.site_root / path.lstrip("/")).resolve()
        try:
            candidate.relative_to(self.site_root)
        except ValueError:
            return None
        return candidate

    def file_response(self, target, status):
        try:
            source = target.open("rb")
        except OSError:
            self.send_error(status if status != 200 else 404, "File not found")
            return None
        self.send_response(status)
        self.send_header("Content-Type", self.guess_type(str(target)))
        self.send_header("Content-Length", str(target.stat().st_size))
        self.send_header("Last-Modified", self.date_time_string(target.stat().st_mtime))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        return source

    def send_head(self):
        target = self.target_path()
        if target and target.is_dir():
            parts = urlsplit(self.path)
            if not parts.path.endswith("/"):
                self.send_response(301)
                self.send_header("Location", urlunsplit(parts._replace(path=parts.path + "/")))
                self.send_header("Content-Length", "0")
                self.end_headers()
                return None
            target = target / "index.html"
        if target and target.is_file():
            target = target.resolve()
            if target.is_relative_to(self.site_root):
                return self.file_response(target, 200)
        fallback = (self.site_root / "404.html").resolve()
        if fallback.is_relative_to(self.site_root) and fallback.is_file():
            return self.file_response(fallback, 404)
        self.send_error(404, "File not found")
        return None


@contextmanager
def preview_server(root=ROOT, *, prefix="/ad-fontes", port=0, verbose=False):
    root = Path(root).resolve()
    if not root.is_dir():
        raise ValueError(f"Preview root does not exist: {root}")
    handler = partial(SiteHandler, directory=root, prefix=prefix, verbose=verbose)
    server = ThreadingHTTPServer(("127.0.0.1", port), handler)
    thread = threading.Thread(target=server.serve_forever, name="ad-fontes-preview", daemon=True)
    thread.start()
    suffix = "/" + prefix.strip("/") + "/" if prefix.strip("/") else "/"
    try:
        yield f"http://127.0.0.1:{server.server_port}{suffix}"
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--prefix", default="/ad-fontes", help="Use an empty string for root-only preview URLs")
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args()
    with preview_server(args.root, prefix=args.prefix, port=args.port, verbose=args.verbose) as url:
        print(f"Preview: {url}", flush=True)
        try:
            threading.Event().wait()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
