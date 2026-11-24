"""CloudClip review server: serves the review page, the media (with Range for seeking), and saves comments.

Usage: python3 server.py <media> <comments.json>
<media> is a video or image, an .html deck, or a folder of slide PNGs.
Prints the URL on start and "done" when the user clicks Finished, then exits.
"""
import json, mimetypes, os, re, sys, threading
from urllib.parse import quote, unquote
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler

if len(sys.argv) != 3:
    sys.exit(__doc__)
MEDIA, COMMENTS = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
SLIDES = []
if os.path.isdir(MEDIA):
    # Numbers sort as numbers: PowerPoint exports Slide1.PNG ... Slide10.PNG without padding.
    SLIDES = [os.path.join(MEDIA, n) for n in sorted(
        (n for n in os.listdir(MEDIA) if n.lower().endswith(".png")),
        key=lambda n: [int(p) if p.isdecimal() else p for p in re.split(r"(\d+)", n.lower())])]
    if not SLIDES:
        sys.exit(f"no .png slides in {MEDIA}")
elif not os.path.isfile(MEDIA):
    sys.exit(f"not a file: {MEDIA}")
HTML = not SLIDES and MEDIA.lower().endswith((".html", ".htm"))
APP = os.path.join(os.path.dirname(os.path.abspath(__file__)), "app")
STATIC = {"/": "index.html", "/app.js": "app.js", "/theme.js": "theme.js", "/style.css": "style.css"}  # fixed list, so no path traversal
TYPES = {".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css"}
# A deck's own assets. Plain fetch() is left out on purpose, as it is on file://, so a deck can't read its neighbours.
ASSETS = {"image", "style", "script", "font", "video", "audio", "track"}


class Base(BaseHTTPRequestHandler):
    def _send(self, code, body, ctype):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _trusted(self):
        # Host blocks DNS rebinding; Origin blocks other sites posting fake comments into the agent's input.
        origin = self.headers.get("Origin")
        if self.headers.get("Host") in self.server.hosts and (origin is None or origin in self.server.origins):
            return True
        self._send(403, b"forbidden", "text/plain")

    def _file(self, path):
        size = os.path.getsize(path)
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
        self.send_header("Content-Type", TYPES.get(os.path.splitext(path)[1].lower()) or mimetypes.guess_type(path)[0] or "application/octet-stream")
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(end - start + 1))
        self.end_headers()
        try:
            with open(path, "rb") as f:
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

    def log_message(self, *a):
        pass


class H(Base):
    def do_GET(self):
        if not self._trusted():
            return
        path = self.path.split("?")[0]
        if path in STATIC:
            name = STATIC[path]
            with open(os.path.join(APP, name), "rb") as f:
                return self._send(200, f.read(), TYPES[os.path.splitext(name)[1]])
        if path == "/comments":
            data = open(COMMENTS, "rb").read() if os.path.exists(COMMENTS) else b"[]"
            return self._send(200, data, "application/json")
        # An HTML deck is never served here: on this origin its scripts could post comments.
        if path.startswith("/media/") and not HTML:
            if SLIDES:
                n = path[len("/media/"):]
                if not (re.fullmatch(r"[0-9]{1,6}", n) and 1 <= int(n) <= len(SLIDES)):
                    return self._send(404, b"not found", "text/plain")
                return self._file(SLIDES[int(n) - 1])
            return self._file(MEDIA)
        self._send(404, b"not found", "text/plain")

    def do_POST(self):
        if not self._trusted():
            return
        if self.path == "/done":  # the page's Finished button: exit so the agent sees the process end
            self._send(200, b"ok", "text/plain")
            print("done", flush=True)
            os._exit(0)  # comments are already saved atomically, so nothing is lost
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


class Deck(Base):
    """Serves an HTML deck on its own port, so its scripts are cross-origin and can't read or post comments."""

    def do_GET(self):
        if not self._trusted():
            return
        path = unquote(self.path.split("?")[0])
        if path == "/__cloudclip.js":
            return self._file(os.path.join(APP, "bridge.js"))
        root = os.path.dirname(MEDIA)
        if path == "/" + os.path.basename(MEDIA):
            with open(MEDIA, "rb") as f:
                return self._send(200, *inject(f.read()))
        full = os.path.realpath(os.path.join(root, path.lstrip("/")))
        allowed = (
            self.headers.get("Sec-Fetch-Dest") in ASSETS
            and self.headers.get("Sec-Fetch-Site") == "same-origin"
            and not any(part.startswith(".") for part in re.split(r"[/\\]", path))
            and full.startswith(os.path.join(os.path.realpath(root), ""))  # join adds the trailing slash
            and os.path.isfile(full)
        )
        if not allowed:
            return self._send(404, b"not found", "text/plain")
        self._file(full)


PREAMBLE = re.compile(rb"(?:\xef\xbb\xbf)?(?:\s|<!--.*?-->|<!doctype[^>]*>|<html(?:\s[^>]*)?>|<head(?:\s[^>]*)?>)*", re.I | re.S)


def inject(html):
    """Add the bridge right after the opening tags: before any CSP meta tag, after the doctype (so no quirks mode)."""
    at = PREAMBLE.match(html).end()
    ctype = "text/html" if b"charset" in html[:1024].lower() else "text/html; charset=utf-8"
    return html[:at] + b'<script src="/__cloudclip.js"></script>' + html[at:], ctype


def listen(handler):
    s = ThreadingHTTPServer(("127.0.0.1", 0), handler)  # port 0: the OS picks a free port
    s.hosts = {f"127.0.0.1:{s.server_port}", f"localhost:{s.server_port}"}
    s.origins = {"http://" + h for h in s.hosts}
    return s


server = listen(H)
name = quote(os.path.basename(MEDIA))
if HTML:
    deck = listen(Deck)
    threading.Thread(target=deck.serve_forever, daemon=True).start()
    query = "html=" + quote(f"http://127.0.0.1:{deck.server_port}/{name}", safe=":/")  # quoted twice: the page decodes it once
elif SLIDES:
    query = f"src=/media/&slides={len(SLIDES)}"
else:
    query = f"src=/media/{name}"
print(f"http://127.0.0.1:{server.server_port}/?{query}", flush=True)
server.serve_forever()
