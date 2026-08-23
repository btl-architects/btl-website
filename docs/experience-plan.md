# btl architects — experience architecture

The plan for the overhaul. Read `design-memory.md` for the rules this produces;
read `implementation-contract.md` for how it must be built.

---

## 0 — What the client is actually building

Not a portfolio. The references agree with each other more than they look like
they do:

| Reference | What it is really saying |
|---|---|
| Humming Tree | The practice should have *atmosphere* before it has content. A moving image, not a photograph. |
| BIG | The catalogue **is** the navigation. Categories are places, not filters. |
| The AD still | Recognition is an *image*, not a sentence. The masthead is the object. |
| The social rail | Chrome should be architecture — structural, edge-anchored, permanent. |
| The founders photograph | The practice is two people in front of a building, not two headshots. |
| "expand, move right, scroll down" | Browsing should feel like moving through a place. |

Humming Tree is a Kozhikode practice too. The client is not asking to copy it —
they are asking not to be beaten by it locally. That raises the bar and it also
tells us where not to go: Humming Tree is a WordPress/Elementor site with a
serif logotype and an awards wall. Ours has to be quieter and more built.

**The thesis:** the site is one continuous surface with one interaction grammar.

> **Down is the archive. Right is the room.**

Vertical movement changes *subject* — the next project, the next section.
Horizontal movement goes *deeper* into the subject — through a project's images,
through a person, through a publication.

One rule. It is a plan and a section, which is how architects already think. It
is learnable in three seconds. It is native to touch (scroll and swipe). It
makes the homepage and the projects page the same system rather than two designs
that resemble each other. Everything below is an application of it.

---

## 1 — Current problems

Findings from the audit, ordered by how much they cost.

1. **Content carries layout.** `bandHeight` and `align` are art direction stored
   as content. At four projects an editor can cope; at forty they are choosing
   compositions they cannot see. Rhythm must be derived from position, never
   authored.
2. **The model is missing most of what the site claims to know.** No `category`,
   no `year`, no per-image `caption`, no `collaborators`, no `related`. The
   design system says categories exist; the data says they do not. That is why
   the category affordance had nothing to point at.
3. **The homepage is a table of contents.** Six sections, each one label + link +
   preview. That is the "kit" the system explicitly warns against, and only two
   of the six have been rebuilt.
4. **The strongest asset class is entirely unused.** 185 MB of studio video and
   1.6 GB of drone footage sit in the references folder. The site has no moving
   image anywhere.
5. **Project pages are terminal.** You arrive, you leave. There is no next, no
   previous, no sense of an archive — the opposite of what was asked for.
6. **Recognition is set as text.** The press index built last round is honest and
   scalable, but the client wants the masthead to be the visual event. Text where
   they asked for image.
7. **People is a card grid** — the exact thing the brief rejects — made worse by
   stock placeholder portraits.
8. **Social is a footer afterthought** and LinkedIn is missing entirely.
9. **91 tokens** for a site with one typeface and one ground. Mild bloat; worth a
   pass, not a rebuild.

---

## 2 — Preserve

These earned their place and are not reopened.

- One near-black ground, never following the OS setting (R1).
- Satoshi only; display Black and tight, body Regular at 150% (R6).
- The mark as a fixed 9px glyph, one visible at a time (R2, R3).
- No containers — no cards, borders, shadows, radii around content (R4).
- Photography never boxed; art-directed crops only where a crop is unavoidable (R5).
- One easing curve, `IntersectionObserver` over scroll handlers, a genuine
  reduced-motion alternative rather than motion switched off (R10).
- Content/template separation: `build.py` ↔ JSON stands in for Astro ↔ Sanity.
- The publishing gate on `rights` — an image whose rights are unknown cannot ship.
- Real URLs for every project, category and person.

## 3 — Discard

- `bandHeight` and `align` from the content model.
- The band index as the *only* way to see projects.
- The repeated section-head pattern (label, rule, link) — six instances of one
  shape is why the page reads as a kit.
- The typographic press index built last round. Its honesty survives; its form
  does not.
- The people card grid.
- The premise that the homepage *previews* pages. It should run the same systems.

---

## 4 — New principles

Additions to design memory, phrased as rules.

**Two axes.** Down changes subject; right goes deeper. No component may invent a
third direction or reverse these meanings.

**Content states facts, never layout.** If a field describes how something looks,
it belongs in the template. Editors describe the work; the system composes it.

**Motion clips, it does not slide.** Things arrive by being uncovered along one of
the two axes — masked wipes, `clip-path`, never drifting in from nowhere. The
mark's draw is already this; it becomes the whole language.

**Recognition is an image.** A publication is shown by its masthead, a project by
its photograph. Words caption them; they do not replace them.

**The chrome is structural.** Logo, navigation and social sit on the edges of the
frame and stay there — they read as the building's structure, not as a toolbar.

**The interface is derived from the content that exists.** Nothing in the
navigation is hard-coded ahead of the work. A category appears only once it has a
published project; a section appears only once it has something to show. An empty
category reads as a practice with gaps, so the system must make an empty state
impossible rather than ask an editor to remember to hide one.

---

## 5 — Homepage

Sequence, following the brief's own emotional rhythm and putting People after
Press as asked. Weights deliberately unequal.

| # | Section | Weight | What it does |
|---|---|---|---|
| 1 | **Opening** | 100vh | Full-screen moving image. Logo, nav, social rail. No headline. Atmosphere before information. |
| 2 | **Statement** | short | One line, a lot of air. The compression after the immersion. |
| 3 | **Work** | tallest | The real project browser, three featured projects, identical interaction to `/projects`. |
| 4 | **Studio** | medium | Context — where and how the practice works. Editorial, asymmetric. |
| 5 | **Press** | medium | Credibility. The masthead wall. |
| 6 | **People** | tall | One photograph of the founders. The faces behind the credibility. |
| 7 | **Contact** | short | Resolution. |

The close is deliberate: proof, then the people responsible, then the way to
reach them.

**The opening.** A single full-bleed media stage cycling a short sequence of
studio video and project stills. Not a carousel — no arrows, no dots, no
counter. Transitions are masked wipes along the vertical axis, slow (≈1.6 s hold
on the wipe, ≈6 s per frame). The project's name sits bottom-left and changes
with the frame. Video is muted, looping, `playsinline`, with a poster frame; a
portrait encode is served under 768px; under reduced motion or Save-Data it is a
still and never downloads the video.

**The social rail.** Vertical, rotated, on the left edge, hairline-divided —
LinkedIn, Instagram, YouTube. It persists across every page as part of the frame,
which is what makes it structural rather than decorative.

---

## 6 — Projects: the cross-axis browser

The single largest piece of work, and the thing that teaches the language.

**Index.** A vertical succession of projects. Each is a full-bleed photograph
with its name and location right-ranged in a narrow type column — BIG's
asymmetry, our typography. Categories run across the top as **real routes**
(`/projects/houses`, `/projects/interiors`), not JavaScript filters, so a
category is a place you can link to, share and index.

**Open.** Selecting a project expands it into a large panel occupying ~78vw,
anchored right. The index stays as a narrow spine on the left showing where you
are in the archive — so you never lose your place, which is what makes the
experiment safe rather than confusing.

Inside the panel, a horizontal rail:

```
[ writeup + metadata ] [ image ] [ image ] [ image ] … [ next project ]
```

The writeup is the first panel in the rail, so reading and looking are the same
gesture rather than two different ones. Images keep their own aspect ratios and
run at full panel height. Credits and rights pin to the panel foot.

**Leaving.** Scroll down past the last image and the next project takes over —
the client's "scroll down to go to the next project", made continuous. Esc, or
the spine, returns to the index.

**URLs.** `history.pushState` writes a real URL for every project as it opens, and
each of those URLs also renders as a standalone static page. The experiment must
not cost us shareable links, SEO, or the back button.

**Mobile.** No panel and no spine — the project opens full-width, the rail becomes
a swipeable gallery, vertical scroll still carries you to the next project. Same
two axes, less chrome. Designed as its own layout, not a squeezed desktop.

**Scale.** The index virtualises past ~30 rows; categories carry the load beyond
that. The interaction is identical at 5 projects and at 200.

---

## 7 — People

The founders photograph is the page. It is portrait, and more than half its frame
is the building above them — that architecture is the type field, so the names
are set *into* the photograph's own negative space rather than beneath it.

Below: the practice statement, then the team as a quiet typographic list that
reveals a portrait on hover — the work-index device, now an established pattern
being reused rather than a new component (§28). Alumni as a second tier, per the
reference.

Art-directed presentation, fully structured underneath: name, prefix, role, bio,
portrait, tier, order, active. Adding a seventh person or retiring a third
changes nothing about the composition.

## 8 — Publications and awards

One content type with a `kind` field — press or award. Never two systems.

The masthead is the object: publication logos set large on black, at rest, in an
irregular but authored composition. On hover or focus the logo holds and the
related project's photograph rises behind it, tying the recognition to the work
that earned it. The title and date are secondary and appear on the active row.
Clicking goes to the publication.

**Where a logo is missing** — and today all of them are — the publication name is
set typographically at display scale as the deliberate fallback. The AD reference
is itself a serif wordmark, so the fallback and the asset are the same species
rather than a degraded version. Nothing looks broken while the client gathers
assets.

## 9 — Studio and Contact

Studio is the one place the practice speaks in its own voice: a statement at
display scale, the studio photograph full-bleed, the working method in short
editorial passages. Asymmetric, spatial, no grid of values.

Contact resolves the page once (R9): address, email, phone, the enquiry form. The
footer stays thin and does not repeat it.

---

## 10 — Motion

One curve (`cubic-bezier(.16,1,.3,1)`), five durations, and one idea: **things are
uncovered, not moved.** Wipes run along whichever axis the interaction belongs
to — vertical for succession, horizontal for depth. Only `clip-path`, `transform`
and `opacity`. No parallax, no springs, no scroll hijacking, nothing that moves
while you are still.

Reduced motion keeps the structure and drops the reveal: no video, no wipes,
instant state changes, the hero as a still. It is a designed alternative, not a
disabled site.

## 11 — Content model

```
project      title · slug · category[] · location · year · workStatus · lifecycle
             description · featured · order
             credits { architect · photographer · collaborators[] }
             images[] { asset · alt · caption · credit · rights · kind · hotspot }
             seo · related[]
             ✗ bandHeight  ✗ align        (layout is derived, never authored)

publication  kind (press|award) · publication · logo? · date · title · url
             relatedProject · description?

person       prefix · name · role · bio · portrait · tier (principal|team|alumni)
             order · active

home         heroMedia[] { kind (video|image) · asset · portraitAsset? · poster }
             statement · featuredProjects[]
```

Editors get controlled editorial choices — full image, image pair, image + text,
drawing, quote, gallery, video, statement — never a free-form block builder.
Creative latitude inside the system, not enough rope to leave it.

## 12 — Design-system changes

- Add: two axes; content states facts; motion clips; recognition is an image;
  chrome is structural.
- Revise **R10** — motion is now specifically wipe-based.
- Revise **R8** — the hero cycles, which needs an explicit carve-out: it is
  ambient and non-interactive, it pauses off-screen, and it never runs under
  reduced motion.
- Retire the **Band** pattern into a variant of the project index rather than a
  standalone pattern; retire **Press index** in favour of the masthead wall.
- Token pass: 91 → target ~60 by removing unused steps.
- One project pattern with variants (index row, panel, homepage), never a family
  of near-identical components.

---

## 13 — Implementation order

Sequenced so nothing is built twice.

1. **Content model migration + media pipeline.** New JSON shape, categories and
   years populated, `bandHeight`/`align` removed. Transcode video: 1080p H.264 +
   WebM, landscape and portrait, under ~6 MB per loop, poster frames extracted.
   Everything downstream depends on this.
2. **The cross-axis project system.** `/projects`, category routes, the panel, the
   rail, URL handling, mobile equivalent. Biggest piece; establishes the language.
3. ~~**Homepage opening.**~~ **Done.** Media stage cycling the three-clip cut, social rail on
   every page, statement section, and the sequence reordered to put People after Press.
4. **Homepage as composed systems.** Work now runs the real project cards (the hover-index it
   replaced is deleted). Studio, Press and People sections still show reduced previews and
   will follow their own pages.
5. **Publications.** Masthead wall with the typographic fallback.
6. **People.** Founders composition plus the reused reveal list.
7. **Studio and Contact.**
8. **Pass:** responsive, reduced motion, accessibility, performance budgets.
9. **Update design memory and write the CMS schema doc.**

## 14 — Open questions

These block specific pieces, not the start of work.

1. **Photography licence** — the Nelly House images are Condé Nast's. Originals
   and a written licence from Abhimanyu K V. *Blocks launch.*
2. **Publication logos** — needed for §8. The typographic fallback holds until
   they arrive.
3. ~~Categories~~ **Decided.** Houses and Interiors carry the site today.
   Commercial is real work but nothing is publishable until next year, and an
   empty category makes a practice look thin — so `commercial` lives in the model
   and its route and nav chip appear automatically the day a commercial project
   is published. Derived, never hard-coded.
4. **Real content for Houses Two, Three and Four** — names, locations, years,
   photographer credits.
5. ~~Which video opens the site~~ **Decided.** A mixed cut across studio video,
   drone and stills, sequenced here and reviewed by the client before it ships.
6. Social handles for LinkedIn and YouTube.
