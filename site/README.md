# btl architects — reference site

A working prototype of the site described in `docs/design-system.html`. Static HTML, real
photography, real behaviour. Built to be shown to the client and to prove the interactions
before the production build starts.

**Open `site/index.html` in a browser.** No server, no install, no internet needed.

---

## What this is — and is not

**Is:** the real design system running. `styles/tokens.css` is the production token file and
carries over to the Astro build unchanged. The CSS, the SVG line geometry, the sequence
behaviour and the accessibility work all transfer.

**Is not:** the production stack. No Astro, no Sanity. Content lives in `content/*.json` and
a Python script renders the HTML — which mirrors what Astro + Sanity will do, without needing
either yet.

---

## Structure

```
site/
├── content/
│   ├── site.json          nav, studio, people, press, contact
│   └── projects.json      the four projects and their sequences
├── styles/
│   ├── tokens.css         ← the single source of truth. Production file
│   ├── base.css           reset, primitives, type roles, motion
│   └── components.css     header, bands, sequence, wall, form, footer
├── scripts/site.js        four islands, ~4 KB, no dependencies
├── assets/                generated — do not edit
├── build.py               renders everything
└── *.html                 generated — do not edit
```

## Rebuild

```bash
python3 site/build.py
```

Requires Python 3.10+ and Pillow. Images only re-encode when missing, so repeat builds are
fast. Delete `site/assets/img/` to force a full re-encode.

## Add a project

Add an entry to `content/projects.json` and re-run the build. Nothing else. No template is
touched, no HTML is written by hand — which is the whole point, and the same thing the studio
will do through Sanity later.

```json
{
  "slug": "house-five",
  "title": "House Five",
  "location": "Kozhikode",
  "bandHeight": "m",          // xl | l | m | s — the index rhythm
  "align": "right",           // which side the title sits on
  "text": "One short paragraph about the project as a whole.",
  "credit": "Photographer name",
  "rights": "client-supplied",
  "hook":     { "src": "Folder/hero.jpg", "alt": "…" },
  "sequence": [ { "src": "Folder/01.jpg", "alt": "…" } ]
}
```

`src` paths are relative to `references and inspirations/`.

---

## What is implemented

| | |
|---|---|
| Home | The one-pager: landing, then Projects, Studio, People, Press and Contact stacked, each linking to its page. Nav scrolls here and marks the section you are reading |
| Landing | Full-viewport office photograph, no words, line as scroll cue |
| Project hook | Slow cross-fade between projects, dots, pause; stops off-screen, never runs under reduced motion |
| Projects | Hook bands in four heights, alternating title alignment |
| Project | Horizontal sequence, natural ratios, snap, keyboard, buttons, progress |
| Studio / People / Press / Contact | Light register, real content model |
| Underline | The line device in the nav only, never two at once; plain rule on every other link |
| Nav | Line under the active item, colour resolved from the ground behind it; header takes the page ground past the hero |
| Mobile | Full-screen menu with focus trap, Esc, scroll lock, studio photograph |
| Images | `srcset` + `sizes` + intrinsic dimensions, WebP ladder, one LCP per route |
| Motion | One curve, IntersectionObserver only, full reduced-motion path |

## Known gaps — deliberate

- **Press spreads** are project photography standing in. Real spreads pending.
- **Studio and People copy** is placeholder, marked as such in the JSON.
- **Video** is not wired in. The supplied drone files are 200–500 MB and must be transcoded
  and externally hosted first — see the contract.
- **No CMS.** Editing means editing JSON. That is the next phase, not this one.
- **Photography rights** are unconfirmed. Nothing here ships until Abhimanyu K V's licence is
  in writing.

## Testing notes

Open `index.html` and try: the nav line on hover and on the active page, the horizontal
sequence with arrow keys and the buttons, the mobile menu at a narrow width, and the whole
site with reduced motion enabled.

The sequence is the component to stress — full-viewport horizontal scrolling is the thing
most likely to feel sluggish on a mid-range Android, and it was built first for that reason.
