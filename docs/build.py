#!/usr/bin/env python3
"""Build docs/design-system.html from design-system.src.html.

Inlines the Satoshi variable font and the reference photography as data URIs so
the document is a single self-contained file. Run from anywhere:

    python3 docs/build.py
"""
import base64, io, json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"
SRC = DOCS / "design-system.src.html"
OUT = DOCS / "design-system.html"
FONT = ROOT / "_claude-design-upload/fonts/Satoshi-Variable.woff2"
PHOTOS = ROOT / "projects/nelly-house/images"
REFS = ROOT / "references and inspirations"
LOGOS = ROOT / "_claude-design-upload/logos"

# key -> (source file, target width on the long edge)
IMAGES = {
    # existing — motion demos, ratio study
    "aerial":    (PHOTOS / "01-aerial.jpg",             980),
    "exterior":  (PHOTOS / "04-exterior.jpg",           860),
    "verandah":  (PHOTOS / "02-verandah.jpg",           460),
    "living":    (PHOTOS / "08-living.jpg",             460),
    "library":   (PHOTOS / "12-library.jpg",            460),
    "kitchen":   (PHOTOS / "11-kitchen.jpg",            460),
    "bedroom":   (PHOTOS / "13-primary-bedroom.jpg",    460),
    "entry":     (PHOTOS / "05-entry.jpg",              440),
    "courtyard": (PHOTOS / "15-bedroom-courtyard.jpg",  560),
    # studio — landing
    "office":    (REFS / "Office/WhatsApp Image 2026-08-11 at 14.35.03.jpeg", 1180),
    "office2":   (REFS / "Office/WhatsApp Image 2026-08-11 at 14.35.06.jpeg",  620),
    # project hook bands — one per project
    "bNelly":    (REFS / "Nelly House/EXTERIOR VIEW(1).jpg",      760),
    "bHome2":    (REFS / "Home 2/ARN_6289 copy.jpg",              760),
    "bHome3":    (REFS / "Home 3/BTL 1pg.jpg",                    760),
    "bHome4":    (REFS / "Home 4/Images/VK_01511.jpg",            760),
    # horizontal sequence — Nelly House
    "q1":        (REFS / "Nelly House/AERIAL(2).jpg",             620),
    "q2":        (REFS / "Nelly House/VERANDAH.jpg",           430),
    "q3":        (REFS / "Nelly House/LIVING(1).jpg",             430),
    "q4":        (REFS / "Nelly House/INSIDE COURTAYRD(1).jpg",   430),
    "q5":        (REFS / "Nelly House/LIBRARY.jpg",               430),
}
LOGO_IMAGES = {
    "logoW": (LOGOS / "btl-architects-logo-white.png",    220),
    "logoD": (LOGOS / "btl-architects-logo-darkgrey.png", 220),
}


def encode_photo(path: Path, width: int, quality: int = 68) -> str:
    from PIL import Image
    im = Image.open(path).convert("RGB")
    im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "WEBP", quality=quality, method=6)
    return "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()


def encode_logo(path: Path, width: int) -> str:
    from PIL import Image
    im = Image.open(path).convert("RGBA")
    im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "WEBP", quality=90, method=6)
    return "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()


def main() -> int:
    if not SRC.exists():
        sys.exit(f"missing source: {SRC}")

    html = SRC.read_text()

    html = html.replace("__SATOSHI_B64__", base64.b64encode(FONT.read_bytes()).decode())

    assets = {k: encode_photo(p, w) for k, (p, w) in IMAGES.items()}
    assets |= {k: encode_logo(p, w) for k, (p, w) in LOGO_IMAGES.items()}

    wanted = set(re.findall(r"__IMG_(\w+)__", html))
    if missing := wanted - set(assets):
        sys.exit(f"source references unknown images: {sorted(missing)}")
    if unused := set(assets) - wanted:
        print(f"note: built but unused: {sorted(unused)}")

    for key, uri in assets.items():
        html = html.replace(f"__IMG_{key}__", uri)

    if leftover := re.findall(r"__[A-Z][A-Z0-9_]*__", html):
        sys.exit(f"unreplaced placeholders: {sorted(set(leftover))}")

    OUT.write_text(html)
    print(f"built {OUT.relative_to(ROOT)} — {len(html) / 1024 / 1024:.2f} MB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
