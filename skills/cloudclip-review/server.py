"""CloudClip review server: serves the review page, the media file (with Range for seeking), and saves comments.

Usage: python3 server.py <media> <comments.json>
"""
import json, mimetypes, os, re, sys
from urllib.parse import quote
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler

if len(sys.argv) != 3:
    sys.exit(__doc__)
VIDEO, COMMENTS = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
if not os.path.isfile(VIDEO):
    sys.exit(f"not a file: {VIDEO}")
APP = os.path.join(os.path.dirname(os.path.abspath(__file__)), "app")
STATIC = {"/": "index.html", "/app.js": "app.js", "/theme.js": "theme.js", "/style.css": "style.css"}  # fixed list, so no path traversal
TYPES = {".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css"}


class H(BaseHTTPRequestHandler):
    def _send(self, code, body, ctype):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = self.path.split("?")[0]
        if path in STATIC:
            name = STATIC[path]
            with open(os.path.join(APP, name), "rb") as f:
                return self._send(200, f.read(), TYPES[os.path.splitext(name)[1]])
        if path == "/comments":
            data = open(COMMENTS, "rb").read() if os.path.exists(COMMENTS) else b"[]"
            return self._send(200, data, "application/json")
        if path.startswith("/media/"):
            return self._video()
        self._send(404, b"not found", "text/plain")

    def _video(self):
        size = os.path.getsize(VIDEO)
        start, end = 0, size - 1
        m = re.match(r"bytes=(\d*)-(\d*)", self.headers.get("Range", ""))
        if m:
            s, e = m.groups()
            if s:
                start, end = int(s), int(e) if e else size - 1
            elif e:
                start = size - int(e)
            end = min(end, size - 1)
            if start > end:
                self.send_response(416)
                self.send_header("Content-Range", f"bytes */{size}")
                return self.end_headers()
            self.send_response(206)
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        else:
            self.send_response(200)
        self.send_header("Content-Type", mimetypes.guess_type(VIDEO)[0] or "application/octet-stream")
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(end - start + 1))
        self.end_headers()
        try:
            with open(VIDEO, "rb") as f:
                f.seek(start)
                left = end - start + 1
                while left > 0:
                    chunk = f.read(min(1 << 20, left))
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    left -= len(chunk)
        except (BrokenPipeError, ConnectionResetError):
            pass  # browser cancels range requests while seeking

    def do_POST(self):
        if self.path != "/comments":
            return self._send(404, b"not found", "text/plain")
        raw = self.rfile.read(int(self.headers.get("Content-Length", 0)))
        try:
            data = json.loads(raw)
        except ValueError:
            data = None
        if not isinstance(data, list):
            return self._send(400, b"bad json", "text/plain")
        tmp = COMMENTS + ".tmp"
        with open(tmp, "w") as f:
            json.dump(data, f, indent=2)
        os.replace(tmp, COMMENTS)  # atomic so a crash never leaves a half-written file
        self._send(200, b"ok", "text/plain")

    def log_message(self, *a):
        pass


server = ThreadingHTTPServer(("127.0.0.1", 0), H)  # port 0: the OS picks a free port
print(f"http://127.0.0.1:{server.server_port}/?src=/media/{quote(os.path.basename(VIDEO))}", flush=True)
server.serve_forever()
