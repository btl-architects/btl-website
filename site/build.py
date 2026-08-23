#!/usr/bin/env python3
"""btl architects — reference site build.

Renders static HTML from content/*.json. Nothing about a project lives in a
template: adding a fifth project means adding an entry to projects.json and
re-running this. That is the same separation Astro + Sanity will enforce later,
proved here without either.

    python3 site/build.py
"""
from __future__ import annotations

import html
import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
SRC_IMAGES = REPO / "references and inspirations"
FONT_SRC = REPO / "_claude-design-upload/fonts/Satoshi-Variable.woff2"
LOGO_SRC = REPO / "_claude-design-upload/logos"
ASSETS = ROOT / "assets"

# Width ladder — §26. Filtered per use so we never ship 2560 to a phone.
LADDER = [640, 1024, 1536, 2048]
COVER_LADDER = [768, 1280, 1920]
PORTRAIT_LADDER = [480, 768, 1200]

# The real vector, lifted from 002 Element files/002 Short/PDF/S001.pdf
LINE_PATH = (
    "M0 132.345L0 102.571L221.624 102.568C311.591 102.568 398.81 1.025 399.682 0"
    "L423.631 17.564C404.409 48.058 397.644 71.776 404.58 84.353C414.633 102.568"
    " 454.428 102.568 471.422 102.568L653.617 102.568L653.617 132.342L471.543"
    " 132.342C447.283 132.342 397.055 132.342 378.512 98.735C373.474 89.605"
    " 371.383 79.225 372.255 67.489C334.636 98.262 279.832 132.342 221.624 132.342Z"
)


# Cache-bust styles and scripts on every build — otherwise a CSS change is
# invisible behind the browser cache and you debug a stale stylesheet.
BUILD = str(int(__import__("time").time()))


def e(s) -> str:
    return html.escape(str(s), quote=True)


def line_svg() -> str:
    # line__fig is not decoration: the height, the fill and the draw animation
    # all hang off it. Without the class the real vector renders unsized.
    return ('<svg class="line__fig" viewBox="190 0 300 132.35" aria-hidden="true">'
            f'<path d="{LINE_PATH}"/></svg>')


# ---------------------------------------------------------------------------
# images
# ---------------------------------------------------------------------------

MANIFEST = ASSETS / "manifest.json"
_manifest: dict[str, dict] = {}
if MANIFEST.exists():
    try:
        _manifest = json.loads(MANIFEST.read_text())
    except Exception:
        _manifest = {}


def emit(src: Path, key: str, ladder: list[int], quality: int = 76,
         crop: str | None = None) -> dict:
    """Write a webp ladder for one source image; return its manifest entry."""
    cached = _manifest.get(key)
    # The cache is keyed by slot, so it MUST also record which source filled
    # that slot. Folding the cover into the sequence shifted every key by one:
    # 01–06 kept the photographs they had cached under the old numbering and
    # the new 07 re-encoded the source 06 was already showing, so every project
    # ended with the same picture twice. Compare the source, not just the key.
    if (cached and cached.get("src") == str(src)
            and all((ASSETS / z["file"]).exists() for z in cached["sizes"])):
        return cached          # same source, already encoded
    from PIL import Image

    im = Image.open(src)
    has_alpha = im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info)
    im = im.convert("RGBA" if has_alpha else "RGB")
    if crop:
        cw, ch = (int(x) for x in crop.split(":"))
        want = cw / ch
        w, h = im.size
        if w / h > want:                      # too wide — trim the sides
            nw = round(h * want)
            im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
        else:                                 # too tall — keep the head, trim below
            nh = round(w / want)
            top = round((h - nh) * 0.18)
            im = im.crop((0, top, w, top + nh))
    w0, h0 = im.size
    out = {"src": str(src), "w": w0, "h": h0, "ratio": round(w0 / h0, 4), "sizes": []}
    for w in ladder:
        if w > w0 * 1.1:
            continue
        h = round(h0 * w / w0)
        name = f"{key}-{w}.webp"
        dest = ASSETS / "img" / name
        if not dest.exists():
            im.resize((w, h), Image.LANCZOS).save(
                dest, "WEBP", quality=quality, method=5, lossless=has_alpha)
        out["sizes"].append({"w": w, "file": f"img/{name}"})
    if not out["sizes"]:  # source smaller than the smallest rung
        w = min(w0, ladder[0])
        h = round(h0 * w / w0)
        name = f"{key}-{w}.webp"
        dest = ASSETS / "img" / name
        if not dest.exists():
            im.resize((w, h), Image.LANCZOS).save(
                dest, "WEBP", quality=quality, method=5, lossless=has_alpha)
        out["sizes"].append({"w": w, "file": f"img/{name}"})
    _manifest[key] = out
    return out


def picture(entry: dict, alt: str, sizes: str, *, prefix: str, cls: str = "",
            priority: bool = False, eager: bool = False, style: str = "") -> str:
    """One <img>. Nothing else in the codebase renders one. §23.

    priority — the single LCP candidate on the route: eager + fetchpriority high.
    eager    — above the fold but not the LCP (the logo): eager, normal priority.
               Two high-priority images on one route is one too many.
    """
    srcset = ", ".join(f"{prefix}{s['file']} {s['w']}w" for s in entry["sizes"])
    fallback = prefix + entry["sizes"][len(entry["sizes"]) // 2]["file"]
    if priority:
        loading, fetch = "", ' fetchpriority="high" decoding="async"'
    elif eager:
        loading, fetch = ' decoding="async"', ""
    else:
        loading, fetch = ' loading="lazy" decoding="async"', ""
    c = f' class="{cls}"' if cls else ""
    st = f' style="{style}"' if style else ""
    return (
        f'<img{c}{st} src="{e(fallback)}" srcset="{e(srcset)}" sizes="{e(sizes)}" '
        f'width="{entry["w"]}" height="{entry["h"]}" alt="{e(alt)}"{loading}{fetch}>'
    )





def cards_for(items, prefix):
    """One card per line: a wide, shallow photograph with the name on it.

    The card is the project. Opening does not summon a second element — the
    card grows and its own strip starts scrolling, with the cover
    photograph staying exactly where it is and un-cropping itself as its
    siblings arrive. Nothing is replaced, so there is nothing to replace it
    with, and the document only ever grows on open."""
    out_ = []
    for i, pj in enumerate(items):
        # Several frames, not one. A single photograph across the full
        # width of a shallow card is a 5:1 crop, which ruins most
        # architectural images and makes every card the same flat
        # letterbox. Six are rendered and the card clips whatever runs past
        # its edge: three fill a laptop, six fill a maximised window, and
        # the clipped frame is the affordance saying it continues.
        # Order is never reversed here: even cards mirror via `direction:
        # rtl` on the strip, which flips the layout AND moves the scroll
        # origin to the right edge, so the hook lands on the right for free.
        frames = pj["_seq"][:6]
        peek = "".join(
            f'<figure class="rail__f pcard__peek">'
            f'{picture(entry, alt, "(min-width:52rem) 40vw, 80vw", prefix=prefix + "assets/", priority=(i == 0 and k == 0))}'
            f'</figure>'
            for k, (entry, alt) in enumerate(frames))
        out_.append(f"""      <article class="pcard rvc" data-card="{e(pj['slug'])}">
    <div class="pcard__strip" data-strip>
      {peek}
    </div>
    <div class="pcard__nav" data-nav hidden>
      <span class="pcard__pos" data-pos>01 / {len(pj['_seq']):02d}</span>
      <span class="pcard__bar"><i data-bar></i></span>
    </div>
    <a class="pcard__t" href="{prefix}projects/{e(pj['slug'])}.html" data-project="{e(pj['slug'])}" aria-expanded="false">
      <span class="pcard__n">{i + 1:02d}</span>
      <span class="pcard__name">{e(pj['title'])}</span>
      <span class="pcard__place">{e(pj['location'])}</span>
    </a>
  </article>""")
    return chr(10).join(out_)


def project_rail(pj, prefix: str, *, priority: bool = False) -> str:
    """The horizontal rail: one project's writeup, then its photographs.

    Rendered once, into the project's own page. The index panel does not
    duplicate it — it fetches that page and lifts this element out. One source
    of truth, the page works with JavaScript off, and an index of two hundred
    projects ships no project markup at all until something is opened. P7:
    right is the room.
    """
    cr = pj["credits"]
    # Title and location are dropped: the index row above the rail already
    # carries both, and repeating them was the loudest thing in the panel.
    # Architect is dropped too — it is btl on every project, so it says nothing.
    meta = [("Year", pj.get("year")), ("Photograph", cr.get("photographer"))]
    rows = "".join(
        f'<div class="rail__m"><dt>{e(k)}</dt><dd>{e(v)}</dd></div>'
        for k, v in meta if v)

    slides = "".join(
        f'<figure class="rail__f">'
        f'{picture(entry, alt, "(min-width:52rem) 56vw, 88vw", prefix=prefix, priority=(priority and j == 0))}'
        f'{f"<figcaption>{e(cap)}</figcaption>" if (cap := pj["_seqmeta"][j].get("caption")) else ""}'
        f'</figure>'
        for j, (entry, alt) in enumerate(pj["_seq"]))

    # The note travels INSIDE the strip rather than sitting in a fixed column
    # beside it, so it scrolls away with the photographs instead of holding the
    # screen for the whole project.
    return f"""<div class="rail" data-rail data-slug="{e(pj['slug'])}" data-title="{e(pj['title'])}">
      <div class="rail__note">
        <h2 class="rail__title">{e(pj['title'])}</h2>
        <p class="rail__text">{e(pj['description'])}</p>
        <dl class="rail__meta">{rows}</dl>
      </div>
      {slides}
    </div>"""


def press_index(site, *, count=None, prefix="") -> str:
    """Press is a typographic index, not a simulated magazine.

    Simulating spreads out of project photography was the wrong idea twice
    over: it read as decoration rather than evidence, and the 'pages' were
    never pages. What a press page is actually for is the mastheads — so the
    mastheads are the composition. Publication set at display scale, the
    headline underneath it, the year alone in the margin. When real scans
    arrive they become the hover state; nothing here has to move."""
    items = site["press"][:count] if count else site["press"]
    rows = []
    for i, item in enumerate(items):
        pub = item["publication"]
        placeholder = pub == "PLACEHOLDER"
        year = item.get("date", "").split()[-1] if item.get("date") else "—"
        live = item.get("url") and item["url"] != "#"
        rows.append(f"""    <li class="pi__row rv" data-delay="{i % 4}">
      <{'a' if live else 'div'} class="pi__link"{f''' href="{e(item["url"])}" rel="noopener" target="_blank"''' if live else ''}>
        <span class="pi__n">{i + 1:02d}</span>
        <span class="pi__body">
          <span class="pi__pub{' pi__pub--tbc' if placeholder else ''}">{e('Publication to come' if placeholder else pub)}</span>
          <span class="pi__t">{e(item["title"])}</span>
        </span>
        <span class="pi__yr">{e(year)}</span>
      </{'a' if live else 'div'}>
    </li>""")
    return "\n".join(rows)


# ---------------------------------------------------------------------------
# chrome
# ---------------------------------------------------------------------------

def head(title: str, desc: str, prefix: str, ground: str = "dark") -> str:
    return f"""<!doctype html>
<html lang="en-IN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<meta name="theme-color" content="#050505">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:type" content="website">
<link rel="preload" href="{prefix}assets/fonts/Satoshi-Variable.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="{prefix}styles/tokens.css?v={BUILD}">
<link rel="stylesheet" href="{prefix}styles/base.css?v={BUILD}">
<link rel="stylesheet" href="{prefix}styles/components.css?v={BUILD}">
</head>
<body id="top">
<a class="skip" href="#main">Skip to content</a>
"""


def header(site: dict, prefix: str, current: str, logo_w, logo_d) -> str:
    """The nav always navigates to a page — never to an anchor on the home
    page. A menu item that scrolls you somewhere instead of taking you where
    it says it goes reads as a broken link, not as a clever one-pager. The
    home page is still a one-pager: you scroll it, but the nav is navigation."""
    items, menu_items = [], []
    for n in site["nav"]:
        href = f'{prefix}{n["href"]}.html'
        cur = ' aria-current="page"' if n["href"] == current else ""
        items.append(f'<li><a class="nav__link" href="{e(href)}"{cur}>{e(n["label"])}</a></li>')
        menu_items.append(
            f'<li><a class="menu__link" href="{e(href)}"{cur}>{e(n["label"])}</a></li>')
    c = site["contact"]
    addr = "<br>".join(e(x) for x in c["address"])
    rail = "".join(
        f'<a class="srail__i" href="{e(x["url"])}" rel="noopener" target="_blank">{e(x["label"])}</a>'
        for x in site["social"])

    return f"""<nav class="srail" aria-label="btl architects elsewhere">{rail}</nav>
<header class="header" data-over="media">
  <div class="header__inner">
    <a class="header__logo" href="{prefix}index.html" aria-label="btl architects — home">
      {picture(logo_w, "btl architects", "(min-width: 48rem) 4.4rem, 3.1rem", prefix=prefix + "assets/", eager=True)}
    </a>
    <nav aria-label="Primary">
      <ul class="nav">{''.join(items)}<span class="nav__ind" aria-hidden="true"></span></ul>
    </nav>
    <button class="burger" type="button" data-menu-open aria-expanded="false" aria-controls="menu">
      Menu
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 8h16M4 16h16"/></svg>
    </button>
  </div>
</header>

<div class="menu" id="menu" data-open="false" role="dialog" aria-modal="true" aria-label="Menu">
  <div class="menu__top">
    {picture(logo_w, "btl architects", "3.4rem", prefix=prefix + "assets/")}
    <button class="burger" type="button" data-menu-close>
      Close
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 6l12 12M18 6L6 18"/></svg>
    </button>
  </div>
  <ul class="menu__list">{''.join(menu_items)}</ul>
  <div class="menu__media">__MENU_IMG__</div>
  <div class="menu__foot">
    <address style="font-style:normal">{addr}</address>
    <a class="tl" href="tel:{e(c['phoneHref'])}">{e(c['phone'])}</a>
  </div>
</div>
"""


def footer(site: dict, prefix: str) -> str:
    """Deliberately thin. The address, email and phone belong to Contact — a
    footer that repeats them in full makes every page end twice."""
    c = site["contact"]
    social = " · ".join(
        f'<a class="tl" href="{e(s_["url"])}" rel="noopener">{e(s_["label"])}</a>' for s_ in site["social"]
    )
    return f"""<footer class="footer" data-ground="dark">
  <div class="container">
    <div class="footer__row">
      <a class="footer__cta t-h2" href="{prefix}contact.html">Let's build something that lasts.</a>
      <p class="footer__social">{social}</p>
    </div>
    <div class="footer__base">
      <span>© 2026 btl architects</span>
      <span>Kozhikode, Kerala</span>
      <span>GSTIN {e(c['gstin'])}</span>
      <span>{e(site['domain'])}</span>
    </div>
  </div>
</footer>
<script src="{prefix}scripts/site.js?v={BUILD}" defer></script>
</body>
</html>
"""


# ---------------------------------------------------------------------------
# pages
# ---------------------------------------------------------------------------

def build() -> None:
    (ASSETS / "img").mkdir(parents=True, exist_ok=True)
    (ASSETS / "fonts").mkdir(parents=True, exist_ok=True)
    shutil.copy(FONT_SRC, ASSETS / "fonts" / FONT_SRC.name)

    site = json.loads((ROOT / "content/site.json").read_text())
    projects = json.loads((ROOT / "content/projects.json").read_text())

    lw, ld = LOGO_SRC / "btl-architects-logo-white.png", LOGO_SRC / "btl-architects-logo-darkgrey.png"
    logo_w = emit(lw, "logo-white", [140, 280], 92) if lw.exists() else _manifest["logo-white"]
    logo_d = emit(ld, "logo-dark", [140, 280], 92) if ld.exists() else _manifest["logo-dark"]

    def collect(folder, pattern, key_fmt, limit, ladder, **kw):
        """Encode from source when it is reachable; otherwise serve what is
        already in the manifest. The build must not fail because a source
        directory is temporarily unavailable — the assets are already built."""
        found = sorted((SRC_IMAGES / folder).glob(pattern))[:limit]
        if found:
            return {key_fmt(i): emit(f, key_fmt(i), ladder, **kw)
                    for i, f in enumerate(found, start=1)}
        prefix = key_fmt(1).rsplit("-", 1)[0]
        cached = {k: v for k, v in _manifest.items() if k.startswith(prefix + "-")}
        if not cached:
            sys.exit(f"no source and no cached assets for {prefix}")
        print(f"note: {folder} unreadable — using {len(cached)} cached assets")
        return cached

    off = collect("Office", "*.jpeg", lambda i: f"office-{i:02d}", 11, LADDER)

    # Portraits — square sources, cropped 4:5 with the head high in frame.
    ppl = collect("people", "*.jpg", lambda i: f"person-0{i}", 12,
                  [400, 576, 864], crop="4:5")

    menu_img = picture(off.get("office-11", off["office-02"]), "The studio", "(min-width:48rem) 22rem, 92vw", prefix="assets/")

    # ---- project images
    # One images[] array now, with `kind` marking the cover. The old model kept
    # the cover in a separate `hook` object, which meant an editor reordering a
    # project could not promote an image to the cover without a developer.
    for pj in projects:
        cover = next((im for im in pj["images"] if im["kind"] == "cover"), pj["images"][0])
        # The cover leads the sequence rather than being held out of it: on the
        # project page it was simply missing, and on a card it is the frame that
        # is already on screen when the card opens.
        rest = [cover] + [im for im in pj["images"] if im is not cover]

        hk = f'{pj["slug"]}-hook'
        src_hook = SRC_IMAGES / cover["src"]
        pj["_hook"] = emit(src_hook, hk, COVER_LADDER) if src_hook.exists() else _manifest[hk]
        pj["_cover"] = cover
        pj["_seq"] = []
        pj["_seqmeta"] = rest
        for i, im in enumerate(rest, start=1):
            k = f'{pj["slug"]}-{i:02d}'
            src_i = SRC_IMAGES / im["src"]
            entry = emit(src_i, k, PORTRAIT_LADDER) if src_i.exists() else _manifest[k]
            pj["_seq"].append((entry, im["alt"]))

    # ---------------- index — the one-pager ----------------
    # The landing takes the strongest photograph available. The supplied office
    # set is one bench from eleven angles — not a full-viewport image.
    lnd = site["landing"]
    land = (next(x for x in projects if x["slug"] == lnd["project"])["_hook"]
            if lnd.get("project") else off[lnd["image"]])
    menu_pic = off.get("office-11") or off["office-02"]
    st = site["studio"]


    # the home preview shows the principals only; the full team lives on /people
    people_mini = "".join(
        f'<figure class="rv" data-delay="{i}">'
        f'{picture(ppl.get(pp["image"]) or off[pp["image"]], pp["imageAlt"], "(min-width:44rem) 22rem, 92vw", prefix="assets/")}'
        f'<figcaption><span class="t-h3">{e(pp["prefix"])} {e(pp["name"])}</span>'
        f'<span class="eyebrow" style="display:block;margin-top:var(--s-2)">{e(pp["role"])}</span></figcaption></figure>'
        for i, pp in enumerate(x for x in site["people"] if x.get("tier", "principal") == "principal"))

    press_mini = press_index(site, count=3, prefix="assets/")

    # The home page shows the same cards as the index, running the same code.
    # It used to have its own hover-list — a second way of presenting projects
    # that had to be learned separately and then re-learned on /projects. §22:
    # the home page is a composition of the site's systems, not imitations.
    featured = [x for x in projects if x.get("featured")] or projects[:3]

    c = site["contact"]
    addr = "<br>".join(e(x) for x in c["address"])

    # ---- the opening ------------------------------------------------------
    # Atmosphere before information: a full-bleed stage that cycles a short
    # authored sequence — the land, the building in the land, the rooms. No
    # arrows, no dots, no counter; it is ambient, not a carousel (R8). The
    # poster carries the first frame so something is on screen immediately,
    # and under reduced motion or Save-Data the video is never fetched at all.
    vman = json.loads((ASSETS / "video-manifest.json").read_text())
    frames = []
    for i, clip in enumerate(vman["landscape"]):
        port = next((p for p in vman["portrait"] if p["key"] == clip["key"]), None)
        frames.append(f"""      <figure class="stage__f" data-on="{'true' if i == 0 else 'false'}"
               data-label="{e(clip.get('label',''))}">
        <video class="stage__v" muted loop playsinline preload="{'auto' if i == 0 else 'none'}"
               poster="assets/{e(clip['poster'])}"
               data-src="assets/{e(clip['mp4'])}"
               data-src-portrait="assets/{e(port['mp4']) if port else e(clip['mp4'])}"></video>
      </figure>""")
    stage = ('<div class="stage" data-stage-frames>\n' + "\n".join(frames) +
             '\n      <p class="stage__label" data-stage-label aria-live="off"></p>\n    </div>')

    out = head("btl architects", site["tagline"], "")
    out += header(site, "", "", logo_w, logo_d).replace("__MENU_IMG__", menu_img)
    out += f"""<main id="main">
  <section class="landing" data-ground="media" data-stage>
    <h1 class="sr-only">btl architects — architecture and interiors, Kozhikode</h1>
    {stage}
    <div class="landing__cue" data-on-media>
      <div class="line line--s line--draw"><span class="line__bar"></span>{line_svg()}<span class="line__bar line__bar--stub"></span></div>
    </div>
  </section>

  <!-- RELEASE — the work, edge to edge -->
  <!-- COMPRESSION — one line, a lot of air -->
  <section class="home-sec home-sec--compress" id="statement" data-ground="dark">
    <div class="container">
      <p class="home-statement rv">{e(site['home']['statement'])}</p>
    </div>
  </section>

  <!-- RELEASE — the work, in the same cards the projects page uses -->
  <section class="home-sec home-sec--release" id="projects" data-ground="dark">
    <div class="container">
      <div class="home-sec__head">
        <h2 class="home-sec__k">Selected work</h2>
        <a class="tl" href="projects.html">All projects</a>
      </div>
    </div>
    <div class="pindex" data-pindex>
{cards_for(featured, "")}
    </div>
  </section>

  <!-- COMPRESSION — the page stops and speaks -->
  <section class="home-sec home-sec--compress" id="studio" data-ground="dark">
    <div class="container">
      <div class="home-sec__head">
        <h2 class="home-sec__k">Studio</h2>
        <a class="tl" href="studio.html">More about us</a>
      </div>
      <div class="home-studio">
        <p class="t-lead rv">{e(st['lead'])}</p>
        <p class="rv" data-delay="1" style="color:var(--text-secondary)">{e(st['body'][0])}</p>
      </div>
    </div>
  </section>

  <!-- RELEASE -->
  <section class="home-sec home-press" id="press" data-ground="dark">
    <div class="container">
      <div class="home-sec__head">
        <h2 class="home-sec__k">Press</h2>
        <a class="tl" href="press.html">Everything</a>
      </div>
      <ol class="pi pi--compact">
{press_mini}
      </ol>
    </div>
  </section>

  <!-- RELEASE — the faces behind the credibility just established -->
  <section class="home-sec" id="people" data-ground="dark">
    <div class="container">
      <div class="home-sec__head">
        <h2 class="home-sec__k">People</h2>
        <a class="tl" href="people.html">The team</a>
      </div>
      <div class="mini mini--2">{people_mini}</div>
    </div>
  </section>

  <!-- COMPRESSION — the page resolves -->
  <section class="home-sec home-sec--compress" id="contact" data-ground="dark">
    <div class="container">
      <div class="home-sec__head">
        <h2 class="home-sec__k">Contact</h2>
        <a class="tl" href="contact.html">Send an enquiry</a>
      </div>
      <div class="mini mini--2">
        <div class="rv">
          <address style="font-style:normal; line-height:1.7; color:var(--text-secondary)">{addr}</address>
        </div>
        <div class="rv" data-delay="1">
          <p><a class="tl" href="mailto:{e(c['email'])}">{e(c['email'])}</a><br>
             <a class="tl" href="tel:{e(c['phoneHref'])}">{e(c['phone'])}</a></p>
        </div>
      </div>
    </div>
  </section>
</main>
"""
    out += footer(site, "")
    (ROOT / "index.html").write_text(out)

    # ---------------- projects ----------------
    # No page heading, no container: you land straight into the work. §24 B.


    # Categories are declared in site.json but the interface is derived from the
    # work that exists (P9): a category with nothing published never renders, so
    # `commercial` stays dark until it has a project and then appears by itself.
    published = [p for p in projects if p.get("lifecycle") == "published"]
    cats = [c for c in site.get("categories", [])
            if any(c["slug"] in p.get("category", []) for p in published)]

    slugs = {p["slug"] for p in projects}
    clash = slugs & {c["slug"] for c in site.get("categories", [])}
    if clash:
        raise SystemExit(f"category/project slug collision: {clash}")

    def chips(active, prefix):
        items = [("", "All")] + [(c["slug"], c["label"]) for c in cats]
        return "".join(
            f'<a class="chip" href="{prefix}projects{"/" + s if s else ""}.html"'
            f'{" aria-current=\"page\"" if s == active else ""}>{e(lbl)}</a>'
            for s, lbl in items)

    def write_index(items, active, path, prefix, title, desc):
        out_ = head(title, desc, prefix)
        out_ += header(site, prefix, "projects", logo_w, logo_d).replace(
            "__MENU_IMG__", menu_img if not prefix else picture(
                off.get("office-11", off["office-02"]), "The studio", "92vw",
                prefix=prefix + "assets/"))
        out_ += f"""<main id="main" data-ground="dark" style="padding-top:var(--header-h)">
  <h1 class="sr-only">{e(title)}</h1>
  <nav class="chips" aria-label="Project categories">{chips(active, prefix)}</nav>
  <div class="pindex" data-pindex>
{cards_for(items, prefix)}
  </div>
</main>
"""
        out_ += footer(site, prefix)
        path.write_text(out_)

    write_index(projects, "", ROOT / "projects.html", "",
                "Projects — btl architects", "Selected work by btl architects.")

    (ROOT / "projects").mkdir(exist_ok=True)
    for c in cats:
        items = [p for p in published if c["slug"] in p.get("category", [])]
        write_index(items, c["slug"], ROOT / "projects" / f'{c["slug"]}.html', "../",
                    f'{c["label"]} — btl architects',
                    f'{c["label"]} by btl architects.')

    # ---------------- each project ----------------
    (ROOT / "projects").mkdir(exist_ok=True)
    for i, pj in enumerate(projects):
        prev_p = projects[i - 1] if i > 0 else projects[-1]
        next_p = projects[(i + 1) % len(projects)]
        out = head(f"{pj['title']} — btl architects", pj["description"][:155], "../")
        out += header(site, "../", "projects", logo_w, logo_d).replace(
            "__MENU_IMG__", picture(off["office-02"], "The studio", "92vw", prefix="../assets/"))
        out += f"""<main id="main" data-ground="dark" class="pj">
  <article>
    <!-- On its own page the rail has no index row above it, so the project
         names itself here. Same information, stated once. -->
    <header class="pj__head">
      <span class="pjh__id grid12">
        <span class="pjh__name">{e(pj['title'])}</span>
        <span class="pjh__place">{e(pj['location'])}</span>
      </span>
    </header>
    {project_rail(pj, "../assets/", priority=True)}

    <div class="container">

      <nav class="pager" style="margin-top:var(--s-8)" aria-label="Projects">
        <a href="{e(prev_p['slug'])}.html"><span class="pager__k">Previous</span><span class="pager__n">{e(prev_p['title'])}</span></a>
        <a class="pager__r" href="{e(next_p['slug'])}.html"><span class="pager__k">Next</span><span class="pager__n">{e(next_p['title'])}</span></a>
      </nav>
      <p style="padding-block:var(--s-6)"><a class="tl" href="../projects.html">All projects</a></p>
    </div>
  </article>
</main>
"""
        out += footer(site, "../")
        (ROOT / "projects" / f"{pj['slug']}.html").write_text(out)

    # ---------------- studio ----------------
    st = site["studio"]
    body = "".join(f'<p class="t-body rv" style="margin-top:var(--s-5)">{e(p)}</p>' for p in st["body"])
    out = head("Studio — btl architects", st["lead"], "")
    out += header(site, "", "studio", logo_w, logo_d).replace("__MENU_IMG__", menu_img)
    out += f"""<main id="main" data-ground="dark">
  <div class="container" style="padding-top:calc(var(--header-h) + var(--s-8)); padding-bottom:var(--space-section)">
    <h1 class="t-h1 rv">Studio</h1>
    <p class="t-lead rv" data-delay="1" style="margin-top:var(--s-6)">{e(st['lead'])}</p>
    <div style="max-width:var(--measure)">{body}</div>
    <div class="rv" style="margin-top:var(--s-8)">
      {picture(off[st['image']], st['imageAlt'], "(min-width:64rem) 60rem, 92vw", prefix="assets/")}
    </div>
  </div>
</main>
"""
    out += footer(site, "")
    (ROOT / "studio.html").write_text(out)

    # ---------------- people ----------------
    def person(pp, i, tier):
        """Portraits come from people/; team placeholders stand in with office
        photographs until real headshots arrive."""
        big = tier == "principal"
        img = ppl.get(pp["image"]) or off[pp["image"]]
        name = f'{e(pp["prefix"])} {e(pp["name"])}'.strip()
        bio = f'<p class="person__b">{e(pp["bio"])}</p>' if big and pp.get("bio") else ""
        sizes = "(min-width:68rem) 24rem, (min-width:44rem) 44vw, 92vw" if big else "(min-width:44rem) 12rem, 44vw"
        return (f'<div class="person rv" data-delay="{i % 4}">'
                f'<div class="person__img">{picture(img, pp["imageAlt"], sizes, prefix="assets/")}</div>'
                f'<h2 class="person__n">{name}</h2>'
                f'<span class="person__r">{e(pp["role"])}</span>{bio}</div>')

    principals = [x for x in site["people"] if x.get("tier", "principal") == "principal"]
    team = [x for x in site["people"] if x.get("tier") == "team"]
    team_block = ""
    if team:
        team_block = (f'<h2 class="eyebrow" style="margin:var(--s-8) 0 var(--s-5)">The team</h2>'
                      f'<div class="team">{"".join(person(x, i, "team") for i, x in enumerate(team))}</div>')

    out = head("People — btl architects", "The people behind btl architects.", "")
    out += header(site, "", "people", logo_w, logo_d).replace("__MENU_IMG__", menu_img)
    out += f"""<main id="main" data-ground="dark">
  <div class="container" style="padding-top:calc(var(--header-h) + var(--s-8)); padding-bottom:var(--space-section)">
    <h1 class="t-h1 rv">People</h1>
    <div class="principals" style="margin-top:var(--s-7)">
      {''.join(person(x, i, "principal") for i, x in enumerate(principals))}
    </div>
    {team_block}
  </div>
</main>
"""
    out += footer(site, "")
    (ROOT / "people.html").write_text(out)

    # ---------------- press ----------------
    out = head("Press — btl architects", "Where the practice has been published.", "")
    out += header(site, "", "press", logo_w, logo_d).replace("__MENU_IMG__", menu_img)
    out += f"""<main id="main" data-ground="dark">
  <div class="container" style="padding-top:calc(var(--header-h) + var(--s-8)); padding-bottom:var(--space-section)">
    <h1 class="press-hero rv">See where we've been.</h1>
    <ol class="pi">
{press_index(site)}
    </ol>
    <p class="t-caption" style="margin-top:var(--s-7)">Links open the publication's own page. Scans to follow.</p>
  </div>
</main>
"""
    out += footer(site, "")
    (ROOT / "press.html").write_text(out)

    # ---------------- contact ----------------
    c = site["contact"]
    addr = "<br>".join(e(x) for x in c["address"])
    out = head("Contact — btl architects", "Talk to the studio.", "", "light")
    out += header(site, "", "contact", logo_w, logo_d).replace("__MENU_IMG__", menu_img)
    out += f"""<main id="main" data-ground="light" style="background:var(--surface); color:var(--text-primary)">
  <div class="container" style="padding-top:calc(var(--header-h) + var(--s-8)); padding-bottom:var(--space-section)">
    <h1 class="t-h1 rv">Contact</h1>
    <div style="display:grid; gap:var(--s-8); margin-top:var(--s-8)">
      <div style="max-width:34rem">
        <form name="enquiry" method="POST" data-netlify="true" netlify-honeypot="company">
          <p class="hp"><label>Company <input name="company" tabindex="-1" autocomplete="off"></label></p>
          <div class="f"><label for="n">Name</label><input id="n" name="name" type="text" autocomplete="name" required></div>
          <div class="f"><label for="em">Email</label><input id="em" name="email" type="email" inputmode="email" autocomplete="email" required></div>
          <div class="f"><label for="ph">Phone <span class="muted">(optional)</span></label><input id="ph" name="phone" type="tel" inputmode="tel" autocomplete="tel"></div>
          <div class="f"><label for="ms">Message</label><textarea id="ms" name="message" required minlength="20"></textarea></div>
          <button class="b b--solid" type="submit">Send enquiry</button>
          <p class="t-caption" style="margin-top:var(--s-4)">Your name and email reach the studio at {e(c['formTo'])} and are kept only to reply. Nothing is shared.</p>
        </form>
      </div>
      <div>
        <span class="footer__k" style="color:var(--text-tertiary)">Studio</span>
        <address style="font-style:normal; line-height:1.7">{addr}</address>
        <p style="margin-top:var(--s-4)">
          <a class="tl" href="mailto:{e(c['email'])}">{e(c['email'])}</a><br>
          <a class="tl" href="tel:{e(c['phoneHref'])}">{e(c['phone'])}</a>
        </p>
      </div>
    </div>
  </div>
</main>
"""
    out += footer(site, "")
    (ROOT / "contact.html").write_text(out)

    MANIFEST.write_text(json.dumps(_manifest, indent=1))
    total = sum(f.stat().st_size for f in (ASSETS / "img").glob("*.webp"))
    print(f"built {len(projects) + 6} pages · {len(list((ASSETS/'img').glob('*.webp')))} image files "
          f"· {total/1024/1024:.1f} MB")


if __name__ == "__main__":
    try:
        build()
    except Exception as exc:  # fail loudly, never ship a half page
        sys.exit(f"build failed: {exc}")
