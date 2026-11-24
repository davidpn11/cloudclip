import http.client
import os
import subprocess
import sys
import tempfile
import unittest
from urllib.parse import parse_qs, urlsplit

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SERVER = os.path.join(ROOT, "skills", "cloudclip-review", "server.py")
BRIDGE = b'<script src="/__cloudclip.js"></script>'
GOOD = {"Sec-Fetch-Dest": "image", "Sec-Fetch-Site": "same-origin"}


def request(port, path, method="GET", headers=None, body=None):
    conn = http.client.HTTPConnection("127.0.0.1", port, timeout=5)
    try:
        conn.request(method, path, body, headers or {})
        r = conn.getresponse()
        return r.status, r, r.read()
    finally:
        conn.close()


class ServerCase(unittest.TestCase):
    def setUp(self):
        td = tempfile.TemporaryDirectory()
        self.addCleanup(td.cleanup)
        self.tmp = td.name

    def write(self, rel, data=b""):
        path = os.path.join(self.tmp, rel)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "wb") as f:
            f.write(data)
        return path

    def start(self, media):
        p = subprocess.Popen([sys.executable, "-B", SERVER, media, os.path.join(self.tmp, "c.json")],
                             stdout=subprocess.PIPE, stderr=subprocess.PIPE, universal_newlines=True)

        def close():
            p.kill()
            p.wait()
            p.stdout.close()
            p.stderr.close()
        self.addCleanup(close)
        self.proc = p
        self.url = p.stdout.readline().strip()
        self.assertTrue(self.url.startswith("http://127.0.0.1:"), self.url)
        self.port = urlsplit(self.url).port
        self.query = parse_qs(urlsplit(self.url).query)  # decodes once, like URLSearchParams
        return p

    def deck(self, name, html=b"<p>x</p>"):
        self.start(self.write(name, html))
        deck_url = urlsplit(self.query["html"][0])
        self.deck_port, self.deck_path = deck_url.port, deck_url.path
        self.assertNotEqual(self.deck_port, self.port)

    def injected(self, html):
        self.deck("d.html", html)
        status, r, body = request(self.deck_port, self.deck_path)
        self.assertEqual(status, 200)
        return body, r.getheader("Content-Type")


class FileMode(ServerCase):
    def setUp(self):
        super().setUp()
        self.start(self.write("a.bin", b"0123456789"))

    def test_media_and_range(self):
        status, _, body = request(self.port, "/media/a.bin")
        self.assertEqual((status, body), (200, b"0123456789"))
        status, r, body = request(self.port, "/media/a.bin", headers={"Range": "bytes=2-4"})
        self.assertEqual((status, body, r.getheader("Content-Range")), (206, b"234", "bytes 2-4/10"))

    def test_foreign_origin_rejected(self):
        status, _, _ = request(self.port, "/comments", "POST", {"Origin": "http://evil.example"}, "[]")
        self.assertEqual(status, 403)

    def test_done_prints_and_exits(self):
        status, _, _ = request(self.port, "/done", "POST")
        self.assertEqual(status, 200)
        self.assertEqual(self.proc.stdout.readline().strip(), "done")
        self.assertEqual(self.proc.wait(timeout=5), 0)


class SlidesMode(ServerCase):
    def test_slides(self):
        self.write("s/b.png", b"B")
        self.write("s/a.png", b"A")
        self.write("s/notes.txt", b"N")
        self.start(os.path.join(self.tmp, "s"))
        self.assertEqual(self.query["slides"], ["2"])
        self.assertEqual(request(self.port, "/media/1")[::2], (200, b"A"))
        self.assertEqual(request(self.port, "/media/2")[::2], (200, b"B"))
        for p in ("/media/0", "/media/3", "/media/x", "/media/../x"):
            self.assertEqual(request(self.port, p)[0], 404, p)

    def test_unpadded_numbers_sort_as_numbers(self):
        for n in (10, 2, 1):
            self.write(f"s/Slide{n}.PNG", str(n).encode())
        self.start(os.path.join(self.tmp, "s"))
        self.assertEqual([request(self.port, f"/media/{i}")[2] for i in (1, 2, 3)], [b"1", b"2", b"10"])

    def test_empty_folder_exits_nonzero(self):
        os.mkdir(os.path.join(self.tmp, "empty"))
        r = subprocess.run([sys.executable, "-B", SERVER, os.path.join(self.tmp, "empty"), "c.json"],
                           stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=10)
        self.assertNotEqual(r.returncode, 0)


class HtmlInject(ServerCase):
    def test_after_head_once_ignoring_later_head_string(self):
        body, ctype = self.injected(b"<!doctype html><html><head><title>t</title></head><script>x='<head>'</script>")
        self.assertTrue(body.startswith(b"<!doctype html><html><head>" + BRIDGE + b"<title>"))
        self.assertEqual(body.count(BRIDGE), 1)

    def test_after_doctype_only(self):
        body, _ = self.injected(b"<!doctype html><p>hi<script>x='<head>'</script>")
        self.assertTrue(body.startswith(b"<!doctype html>" + BRIDGE + b"<p>"))

    def test_no_preamble(self):
        body, _ = self.injected(b"<p>hi</p><script>x='<head>'</script>")
        self.assertTrue(body.startswith(BRIDGE + b"<p>"))

    def test_header_is_not_head(self):
        body, _ = self.injected(b"<!doctype html><header>h</header>")
        self.assertTrue(body.startswith(b"<!doctype html>" + BRIDGE + b"<header>"))

    def test_charset_only_when_absent(self):
        self.assertEqual(self.injected(b"<p>x</p>")[1], "text/html; charset=utf-8")
        self.assertEqual(self.injected(b'<meta charset="utf-8"><p>x</p>')[1], "text/html")

    def test_awkward_filename_round_trips(self):
        self.deck("a b#c%d.html", b"<p>x</p>")
        self.assertEqual(self.deck_path, "/a%20b%23c%25d.html")
        status, _, body = request(self.deck_port, self.deck_path)
        self.assertEqual(status, 200)
        self.assertIn(BRIDGE, body)

    def test_bridge_served(self):
        self.deck("d.html")
        with open(os.path.join(ROOT, "skills", "cloudclip-review", "app", "bridge.js"), "rb") as f:
            expected = f.read()
        self.assertEqual(request(self.deck_port, "/__cloudclip.js")[::2], (200, expected))


class HtmlSecurity(ServerCase):
    def setUp(self):
        super().setUp()
        self.write("secret.png", b"SECRET")
        self.write("deck/pic.png", b"PIC")
        self.write("deck/.env", b"KEY=1")
        os.symlink(os.path.join(self.tmp, "secret.png"), os.path.join(self.tmp, "deck", "link.png"))
        self.deck("deck/d.html")

    def get(self, path, headers):
        return request(self.deck_port, path, headers=headers)[0]

    def test_sibling_asset_needs_fetch_metadata(self):
        self.assertEqual(request(self.deck_port, "/pic.png", headers=GOOD)[::2], (200, b"PIC"))
        for headers in ({**GOOD, "Sec-Fetch-Dest": ""}, {**GOOD, "Sec-Fetch-Site": "cross-site"}, {}):
            self.assertEqual(self.get("/pic.png", headers), 404, headers)

    def test_escapes_are_404_even_with_good_headers(self):
        for p in ("/../secret.png", "/%2e%2e/secret.png", "/.env", "/link.png"):
            self.assertEqual(self.get(p, GOOD), 404, p)

    def test_deck_origin_cannot_post_comments(self):
        origin = "http://127.0.0.1:%d" % self.deck_port
        self.assertEqual(request(self.port, "/comments", "POST", {"Origin": origin}, "[]")[0], 403)

    def test_review_port_does_not_serve_deck(self):
        self.assertEqual(request(self.port, "/media/d.html")[0], 404)

    def test_bad_host(self):
        self.assertEqual(request(self.deck_port, "/d.html", headers={"Host": "evil.example"})[0], 403)
        self.assertEqual(request(self.port, "/", headers={"Host": "evil.example"})[0], 403)


if __name__ == "__main__":
    unittest.main()
