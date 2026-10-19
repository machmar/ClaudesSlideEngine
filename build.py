"""Pack a slide-engine deck into one self-contained HTML file.

    python build.py path/to/deck.html [-o out.html] [--link-media]

Inlines engine.css / engine.js (and any other local stylesheet or script the deck links) and embeds every local
image, video and font the slides reference (src, poster, data-video, url(...)) as data URIs, so the result can be
copied anywhere and opened offline. Web fonts linked from fonts.googleapis.com stay links (they need internet).
--link-media keeps media as relative paths instead (small file, but the media must travel with it).
"""
import argparse
import base64
import mimetypes
import os
import re
import sys

MIME = {".mp4": "video/mp4", ".webm": "video/webm", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
        ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".woff": "font/woff",
        ".ttf": "font/ttf", ".otf": "font/otf"}


def local(base, ref):
    if re.match(r"^(?:[a-z]+:|//|#)", ref, re.I):
        return None
    path = os.path.normpath(os.path.join(base, ref.split("?")[0].split("#")[0]))
    return path if os.path.isfile(path) else None


def data_uri(path):
    ext = os.path.splitext(path)[1].lower()
    mime = MIME.get(ext) or mimetypes.guess_type(path)[0] or "application/octet-stream"
    return f"data:{mime};base64," + base64.b64encode(open(path, "rb").read()).decode()


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("deck")
    ap.add_argument("-o", "--out")
    ap.add_argument("--link-media", action="store_true")
    a = ap.parse_args()
    base = os.path.dirname(os.path.abspath(a.deck))
    out = a.out or os.path.splitext(a.deck)[0] + "-built.html"
    html = open(a.deck, encoding="utf-8").read()
    missing, scripts = [], []

    def css(m):
        path = local(base, m.group(1))
        if not path:
            return m.group(0)
        text = open(path, encoding="utf-8").read()
        if not a.link_media:
            cbase = os.path.dirname(path)
            text = re.sub(r"url\(['\"]?([^'\")]+)['\"]?\)", lambda u: f"url({data_uri(local(cbase, u.group(1)))})" if local(cbase, u.group(1)) else u.group(0), text)
        return f"<style>\n{text}\n</style>"
    html = re.sub(r'<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>', css, html)

    def js(m):
        path = local(base, m.group(1))
        if not path:
            return m.group(0)
        scripts.append(open(path, encoding="utf-8").read().replace("</script", "<\\/script"))
        return ""
    html = re.sub(r'<script\b[^>]*src="([^"]+)"[^>]*>\s*</script>', js, html)

    if not a.link_media:
        def media(m):
            ref = m.group(2)
            path = local(base, ref)
            if not path:
                if not re.match(r"^(?:[a-z]+:|//|#)", ref, re.I):
                    missing.append(ref)
                return m.group(0)
            return f'{m.group(1)}="{data_uri(path)}"'
        html = re.sub(r'\b(src|poster|data-video)="([^"]+)"', media, html)
        html = re.sub(r"url\((['\"]?)([^'\")]+)\1\)", lambda u: f"url({data_uri(local(base, u.group(2)))})" if local(base, u.group(2)) else u.group(0), html)

    inline = "".join(f"<script>\n{s}\n</script>\n" for s in scripts)
    html = html.replace("</body>", inline + "</body>") if "</body>" in html else html + inline
    open(out, "w", encoding="utf-8").write(html)
    print(f"{out}: {os.path.getsize(out) // 1024} KB")
    for ref in missing:
        print("  missing file:", ref, file=sys.stderr)


if __name__ == "__main__":
    main()
