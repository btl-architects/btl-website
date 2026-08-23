#!/usr/bin/env python3
"""Bundle the projects page into ONE self-contained .html file.

For sending to the client: no server, no folder, no unzipping — open the file
and everything works, including the expanding cards.

    python3 site/standalone.py

Two things make this more than a copy of projects.html. The page normally
fetches each project's page to get its photographs, which cannot work from a
file:// URL, so every rail is inlined into a <template> and the script reads
from those instead. And every asset — stylesheets, script, font, photographs —
is embedded, because a single file that quietly depends on a folder next to it
is not a single file.
"""
from __future__ import annotations

import base64
import mimetypes
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT.parent / "btl-projects.html"

# One width per photograph rather than a srcset. Big enough for a laptop
# review, small enough that the file stays sendable by email.
PREFERRED = 768   # a review copy: sharp on a laptop, quick to open


def data_uri(path: Path) -> str:
    mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    return f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode()}"


def pick(srcset: str) -> Path | None:
    """Choose one candidate from a srcset, nearest PREFERRED without going under."""
    best, best_w = None, None
    for part in srcset.split(","):
        bits = part.strip().split()
        if len(bits) != 2:
            continue
        rel, w = bits[0], int(bits[1].rstrip("w"))
        p = (ROOT / rel.split("?")[0].lstrip("./")).resolve()
        if not p.exists():
            continue
        better = (best_w is None
                  or (best_w < PREFERRED and w > best_w)
                  or (w >= PREFERRED and w < best_w))
        if better:
            best, best_w = p, w
    return best


def embed_images(html: str) -> str:
    def one(m: re.Match) -> str:
        tag = m.group(0)
        ss = re.search(r'srcset="([^"]+)"', tag)
        src = re.search(r'src="([^"]+)"', tag)
        chosen = pick(ss.group(1)) if ss else None
        if chosen is None and src:
            p = (ROOT / src.group(1).split("?")[0].lstrip("./")).resolve()
            chosen = p if p.exists() else None
        if chosen is None:
            return tag
        tag = re.sub(r'\ssrcset="[^"]*"', "", tag)
        tag = re.sub(r'\ssizes="[^"]*"', "", tag)
        tag = re.sub(r'src="[^"]*"', f'src="{data_uri(chosen)}"', tag)
        return tag
    return re.sub(r"<img\b[^>]*>", one, html)


def main() -> None:
    page = (ROOT / "projects.html").read_text()

    # --- stylesheets, with the font embedded inside them -------------------
    css = "\n".join((ROOT / f"styles/{n}.css").read_text()
                    for n in ("tokens", "base", "components"))
    font = data_uri(ROOT / "assets/fonts/Satoshi-Variable.woff2")
    css = re.sub(r'url\(["\']?[^)"\']*Satoshi-Variable\.woff2["\']?\)', f'url("{font}")', css)
    page = re.sub(r'<link rel="stylesheet"[^>]*>\s*', "", page, count=3)
    # the font is embedded in the CSS below, so the preload would be a second
    # request to a folder that will not be there
    page = re.sub(r'<link rel="preload"[^>]*woff2[^>]*>\s*', "", page)
    page = page.replace("</head>", f"<style>\n{css}\n</style>\n</head>")

    # --- every project's rail, so nothing has to be fetched ----------------
    rails = []
    for pj in sorted((ROOT / "projects").glob("*.html")):
        m = re.search(r'(<div class="rail"[^>]*data-rail.*?</div>\s*</div>)',
                      pj.read_text(), re.S)
        if not m:
            continue
        rail = m.group(1).replace('src="../assets/', 'src="assets/') \
                         .replace('srcset="../assets/', 'srcset="assets/') \
                         .replace('../assets/', 'assets/')
        slug = re.search(r'data-slug="([^"]+)"', rail).group(1)
        rails.append(f'<template data-rail-for="{slug}">{rail}</template>')

    # --- the script, reading those templates instead of the network --------
    js = (ROOT / "scripts/site.js").read_text()
    js = js.replace(
        '''    function fetchRail(slug) {
      if (railCache[slug]) return Promise.resolve(railCache[slug]);
      return fetch(hrefBySlug[slug], { credentials: "same-origin" })
        .then(function (r) {
          if (!r.ok) throw new Error(r.status);
          return r.text();
        })
        .then(function (html) {
          var rail = new DOMParser().parseFromString(html, "text/html")
                       .querySelector("[data-rail]");''',
        '''    function fetchRail(slug) {
      if (railCache[slug]) return Promise.resolve(railCache[slug]);
      /* Standalone build: the rails are inlined as <template>s, because a
         file:// page is not allowed to fetch its neighbours. */
      return Promise.resolve().then(function () {
          var tpl = document.querySelector('[data-rail-for="' + slug + '"]');
          var rail = tpl && tpl.content.querySelector("[data-rail]").cloneNode(true);''')
    page = re.sub(r'<script src="[^"]*"[^>]*></script>', "", page)
    page = page.replace("</body>", "\n".join(rails) + f"\n<script>\n{js}\n</script>\n</body>")

    # --- paint as it parses ------------------------------------------------
    # The cards carry the scroll-reveal class, which keeps them clipped until
    # the script runs — and in one file the script is at the end of several
    # megabytes. That means the header appears at once and the work stays
    # invisible until the whole document has parsed, which reads as a broken
    # page. A review copy wants its content on screen as soon as the parser
    # reaches it, so the reveal comes off.
    page = page.replace('class="pcard rvc"', 'class="pcard"')

    # --- links that lead nowhere in a single file --------------------------
    # The nav and footer point at the site's other pages. In a one-file review
    # copy those do not exist, and a client clicking HOME into a 404 is a bad
    # way to open a presentation. They stay visible — they are part of the
    # design being reviewed — but they do not navigate.
    def inert(m: re.Match) -> str:
        tag, href = m.group(0), m.group(1)
        # Including links back to projects.html — the review copy is not called
        # that, so even the self-references would land on a 404.
        return tag.replace(f'href="{href}"', 'href="#" data-inert')
    page = re.sub(r'<a\b[^>]*?href="((?!data:|https?:|#|mailto:|tel:)[^"]*\.html[^"]*)"[^>]*>', inert, page)
    page += """
<script>
  /* review copy: the other pages are not in this file */
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[data-inert]");
    if (a) e.preventDefault();
  });
</script>
"""

    # --- and finally the photographs ---------------------------------------
    page = embed_images(page)

    # nothing may still point at the folder this was built from
    leftovers = re.findall(r'(?:src|href)="(?!data:|https?:|mailto:|tel:|#)([^"]+)"', page)
    leftovers = [l for l in leftovers if not l.endswith(".html")]

    OUT.write_text(page)
    mb = OUT.stat().st_size / 1e6
    print(f"{OUT.name} — {mb:.1f} MB · {len(rails)} projects inlined")
    print("unembedded assets remaining:", leftovers or "none")


if __name__ == "__main__":
    main()
