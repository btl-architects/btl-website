#!/usr/bin/env python3
"""btl architects — video pipeline for the opening sequence.

Separate from build.py on purpose: transcoding is slow and the sources are
gigabytes, so it runs rarely and caches hard. build.py reads the manifest this
writes and never touches ffmpeg.

    python3 site/media.py            # encode anything missing
    python3 site/media.py --force    # re-encode everything

The cut is a sequence, not a shuffle: land, then the building in the land, then
the rooms, then the practice. Authored here rather than in content.json because
which eight seconds of a thirty-second clip are the good ones is a directorial
judgement, not something an editor should have to re-make on every upload.
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
SRC = REPO / "references and inspirations"
OUT = ROOT / "assets" / "video"
MANIFEST = ROOT / "assets" / "video-manifest.json"

# Every source reel carries a burned-in btl watermark in the top-right corner.
# The site already shows the logo top-left, so the watermark is a second logo
# competing with the first. Cropping the top band removes it and leaves a
# wider, more cinematic frame — the crop is a gain, not a compromise.
WATERMARK_CROP = "crop=iw:ih*0.88:0:ih*0.12"

# left, top, width, height are fractions; `start`/`dur` in seconds.
# `crop` applies before scaling.
CUT = [
    {
        "key": "open-01-land",
        "src": "Nelly House/Drone/DJI_20260307071910_0053_D.MP4",
        "start": 2.0, "dur": 9.0,
        "label": "Wayanad, first light",
        "note": "the land before the building",
    },
    {
        "key": "open-02-house",
        "src": "Nelly House/Drone/DJI_20260308155448_0112_D.MP4",
        "start": 3.0, "dur": 9.0,
        "label": "Nelly House",
        "note": "the building in the land",
    },
    {
        "key": "open-03-rooms",
        "src": "Home 4/Videos/BTL Reel Horizontal_Instagram.mp4",
        "start": 0.5, "dur": 10.0,
        "crop": WATERMARK_CROP,
        "label": "Interiors",
        "note": "the rooms",
    },
]

# Mobile gets the natively-portrait studio clips rather than a cropped landscape
# one. Space_3 ends on a white logo card — trimmed off, it would flash white in
# a black hero.
CUT_PORTRAIT = [
    {
        "key": "open-01-land",
        "src": "Nelly House/Drone/DJI_20260307071910_0053_D.MP4",
        "start": 2.0, "dur": 9.0,
        # 0.378, not 0.28. Measured rather than judged: the sun is the
        # brightest point in the frame and sits at 0.517 of its width, so an
        # offset of 0.28 put it 85% of the way across the portrait crop —
        # hard against the right edge. This centres it.
        "crop": "crop=ih*0.5625:ih:iw*0.378:0",
    },
    {
        # Nelly House, cropped from the landscape drone frame rather than
        # substituted with a studio clip. The frame carries a label, and a
        # portrait cut that shows a different building while the caption reads
        # "Nelly House" is simply wrong — the phone should see less of the same
        # thing, never something else.
        "key": "open-02-house",
        "src": "Nelly House/Drone/DJI_20260308155448_0112_D.MP4",
        "start": 3.0, "dur": 9.0,
        "crop": "crop=ih*0.5625:ih:iw*0.30:0",
    },
    {
        # interiors, and the portrait reel genuinely is interiors — label and
        # picture agree
        "key": "open-03-rooms",
        "src": "Home 4/Videos/Space_3.mp4",
        "start": 0.5, "dur": 10.5,                 # stops before the white end card
        "crop": WATERMARK_CROP,
    },
]

LANDSCAPE_W = 1600
PORTRAIT_W = 720
FPS = 30
FORCE = "--force" in sys.argv


def run(args: list[str]) -> None:
    r = subprocess.run(args, capture_output=True, text=True)
    if r.returncode:
        raise RuntimeError(f"ffmpeg failed:\n{r.stderr[-1500:]}")


def encode(item: dict, width: int, suffix: str) -> dict:
    key = f'{item["key"]}{suffix}'
    src = SRC / item["src"]
    if not src.exists():
        raise FileNotFoundError(src)

    vf = [item["crop"]] if item.get("crop") else []
    vf += [f"scale={width}:-2:flags=lanczos", f"fps={FPS}"]
    chain = ",".join(vf)

    mp4 = OUT / f"{key}.mp4"
    poster = OUT / f"{key}.jpg"

    base = ["ffmpeg", "-v", "error", "-ss", str(item["start"]),
            "-t", str(item["dur"]), "-i", str(src), "-vf", chain, "-an"]

    if FORCE or not mp4.exists():
        # H.264 only. VP9 was tried and dropped: on the drone clips it came out
        # LARGER than the H.264 it was meant to undercut, and every browser we
        # support has played H.264 for a decade. One format, no negotiation.
        #
        # The bitrate cap matters more than the CRF here — dense foliage at
        # CRF alone produced a 10 MB clip for nine seconds. maxrate makes the
        # budget a property of the pipeline rather than a thing to notice later.
        run(base + ["-c:v", "libx264", "-profile:v", "high", "-crf", "28",
                    # 1500k, not 3000k. This is a homepage hero: the sequence
                    # was 5.5 MB, which is a lot to spend before a visitor has
                    # read a word. Halving the cap costs very little on
                    # photography that is mostly slow aerial movement, and the
                    # first clip — the one everybody pays for — lands well
                    # under half a megabyte.
                    "-maxrate", "1500k", "-bufsize", "3000k",
                    "-preset", "slow", "-pix_fmt", "yuv420p",
                    "-movflags", "+faststart", "-y", str(mp4)])
    if FORCE or not poster.exists():
        # the poster is the frame the hero shows before playback, and the only
        # thing anyone sees under reduced motion or save-data
        run(["ffmpeg", "-v", "error", "-ss", str(item["start"] + 0.5),
             # the posters are all fetched up front — under reduced motion they
             # ARE the sequence — so one of them weighing half a megabyte is a
             # cost every visitor pays. Scaled down and eased off on quality:
             # they are a held frame behind a moving image, not a photograph
             # anyone will study.
             "-i", str(src), "-vf", chain + ",scale=1100:-2", "-frames:v", "1",
             "-q:v", "7", "-y", str(poster)])

    return {
        "mp4": f"video/{mp4.name}",
        "poster": f"video/{poster.name}",
        "mp4Bytes": mp4.stat().st_size,
        "posterBytes": poster.stat().st_size,
        "dur": item["dur"],
    }


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {"landscape": [], "portrait": []}

    for item in CUT:
        e = encode(item, LANDSCAPE_W, "")
        e.update(key=item["key"], label=item["label"], note=item["note"])
        manifest["landscape"].append(e)
        print(f'  {item["key"]:18} {e["mp4Bytes"]/1e6:5.2f} MB · '
              f'poster {e["posterBytes"]/1e3:4.0f} kB')

    for item in CUT_PORTRAIT:
        e = encode(item, PORTRAIT_W, "-p")
        e["key"] = item["key"]
        manifest["portrait"].append(e)
        print(f'  {item["key"]:18} portrait  {e["mp4Bytes"]/1e6:5.1f} MB')

    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n")
    total = sum(x["mp4Bytes"] for x in manifest["landscape"])
    print(f"\nlandscape total {total/1e6:.1f} MB across {len(CUT)} clips")


if __name__ == "__main__":
    main()
