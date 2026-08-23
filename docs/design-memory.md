# btl architects — design memory

The single source of truth. Principles govern rules; rules govern tokens and patterns.
When new feedback arrives, refine an entry — do not append a new one.

---

## Principles

**P1 — The photography is the content.** Everything else is scaffolding: felt, not noticed.

**P2 — Restraint over incident.** When a page feels weak, remove before adding. Space and
proportion carry the work.

**P3 — The mark is rare.** The btl line is a signature. Used everywhere it becomes a UI
component and stops signifying anything.

**P4 — One state at a time.** Two things half-lit reads as a bug, not a state.

**P5 — Pages have rhythm, not a list.** Sections alternate release (full-bleed, image-led)
and compression (contained, narrow, type-led). Every section the same shape — heading,
hairline, link, grid — is why a page reads as a kit.

**P6 — Weight follows importance.** A preview must never out-weigh the thing it previews. If
a portrait is taller than the work above it, the hierarchy is inverted.

**P7 — Down is the archive, right is the room.** One interaction grammar for the whole site.
Vertical movement changes subject — the next project, the next section. Horizontal movement
goes deeper into the subject — through a project's images, into a person, into a publication.
No component invents a third direction or reverses these two. It is a plan and a section,
which is how the work is already drawn.

**P8 — Content states facts, never layout.** If a field describes how something looks, it
belongs in the template. `bandHeight` and `align` were content once; at four projects an
editor coped, at forty they would be art-directing compositions they cannot see. Rhythm is
derived from position.

**P10 — What you touched does not move.** Expanding or collapsing anything keeps the element
under the pointer exactly where it was: measure its position before the change and restore it
after. A layout that jumps to re-centre itself takes the reader's place away in exchange for a
tidiness only the developer wanted.

**P9 — The interface is derived from the content that exists.** A category renders only once
it has a published project; a section appears only once it has something to show. An empty
category makes a practice look thin, so an empty state must be impossible rather than
something an editor remembers to hide.

---

## Rules

**R1 — One ground.** Near-black, everywhere, and it never follows the OS setting. There is no
light register any more — Press was the last page on white and it read as lacklustre. Where a
component needed a white card to work (the press spreads), that was a container problem, not
a ground problem: remove the card, keep the black.

**R2 — The mark is the real vector or it is not the mark.** One asset, `LINE_PATH`,
extracted from the source artwork, rendered as an `<svg class="line__fig">` inside `.line`:
flat bar, then the real inflection, bar height 22.5% of the figure so the rule butts against
the curve with no seam at any width. Never redrawn, never reconstructed, never rotated except
in multiples of 90°. Colour follows the ground: red or blue on white, white on colour, green
or cyan on dark — **a photograph counts as dark**.

The rule exists because the opposite was tried at length. The mark was rebuilt in CSS for
underline duty — the knot as a masked image, the flat run as a gradient, at a fixed `--mark-h`
— and across four rewrites it never became a faithful drawing at that scale: `aspect-ratio`
inflated the box width so the line ran past its own word; percentage padding resolved against
the parent; 14px turned the flick into a filled wedge; 9px was legible but still not the
drawing. A near-miss of a practice's own mark is worse than no mark — it reads as the logo set
badly. The construction is gone. And the one place the genuine vector *was* used, the SVG
carried no `line__fig` class, so every rule that sized, filled and drew it missed: the real
element was unstyled the whole time the reproduction was being tuned to match it.

**R3 — Where the mark appears.** Only where it can be rendered at a size that carries the
drawing — currently the landing cue, plus part dividers and the sequence progress rule.
Nowhere else, and never as decoration on a text link.

Hover, focus and current-page states are a **1px hairline in `--mark`**, drawn left to right
with the same clip and timing the mark used (R10 — clip, don't slide). The affordance and the
motion language are unchanged; only the pretence that the hairline is the logo is gone. One at
a time still holds: the navigation uses a single sliding indicator, and elsewhere only the
hovered element shows a rule.

**R4 — No containers.** No cards, borders, shadows or rounded corners around content. The
arch (large radius on two corners) is the one exception and is reserved for statement blocks.
Separation comes from whitespace, hairlines and the mark.

**R5 — Photography is never boxed** and never cropped by default. Cover images and cards take
an art-directed crop around the focal point; full images, galleries and drawings keep their
original ratio.

**R6 — Type.** Satoshi only. Display is Black and tight (100% leading); body is Regular at
150%. Ten sizes, no more. Display type is the one loud element on any page.

**R7 — Metadata is quiet.** Location and photographer only on a project. Year, status and
team live in the record, not on the page. Prefer metadata on the image over a table beside it.

**R8 — Nothing auto-advances except the opening.** No carousels, no slideshows, no timed
cross-fades inside content. Where a section shows several things, the reader moves between
them. The one carve-out is the homepage opening sequence: it is ambient rather than
navigational, it carries no arrows, dots or counter, it pauses off-screen, and under reduced
motion or Save-Data it is a single still that never downloads the video.

**R9 — One page, one ending.** A page resolves once. The footer does not repeat what a
section above it already said.

**R10 — Motion is one system, and it clips rather than slides.** Things arrive by being
uncovered along whichever axis the interaction belongs to (P7) — masked wipes, never drifting
in from nowhere. The reveal is **staggered and one-directional**: a container grows, its
photographs wipe up in turn (~60ms apart), and the words follow once the pictures have landed.
**Opening gets the full duration; closing gets out of the way** — `--dur-slow` open,
`--dur-hover` close, and the closing wipes drop their stagger so the card clears together
rather than unravelling. Both may run at once: when one project replaces another the two cards
animate simultaneously and the card under the pointer is held still for the whole of it.
Freshly-inserted markup needs a forced style flush before the open state is applied, or it has
no closed state to travel from and the wipe snaps. One curve, five durations, only `transform`,
`opacity` and `clip-path`.
`IntersectionObserver`, never scroll handlers. Reveal once. No parallax, no springs, no scroll
hijacking, nothing that moves while the reader is still. Reduced motion keeps the structure
and drops the reveal — a designed alternative, not a disabled site.

**R11 — Section labels are labels.** On the home page a section head is meta-sized, not a
headline. The work is the headline.

**R12 — The landing takes the strongest photograph available.** Currently the studio interior
with 'between the lines' cut into the wall — it puts the practice's name in its own building.

**R13 — Recognition is an image.** A publication is shown by its masthead, a project by its
photograph. Words caption them; they never replace them. Where a logo is missing the
publication name is set typographically at display scale — a deliberate fallback of the same
species, not a degraded one.

**R14 — The chrome is structural, and there is as little of it as possible.** Logo and
navigation sit on the edges of the frame and stay there, on every page: they read as the
building's structure, not as a toolbar that scrolled into view.

The social rail used to be part of that and has been removed. Three links pinned to the edge
of every screen compete with the photographs on a site whose entire argument is the
photographs, and nobody arrives at an architecture practice looking for its Instagram. Social
lives in the footer and on Contact, where someone who wants it will look. Structural chrome
earns its permanence by being needed everywhere; anything else is decoration that follows you
around.

**R15 — A section with nothing real in it does not render.** Placeholder is not content. Four
rows of "Publication to come" under one genuine credit make the practice look like it is
waiting rather than published, and four people called "Team member" are worse than no team
list. Stubs are filtered at the content boundary, in one place, and every section is written
to disappear when its content is absent and to return by itself when it arrives. Alt text is
the single exception: it can never be dropped, because an image with no alt is unusable and
`alt=""` would declare a photograph decorative — so a stub prefix is stripped and the real
description behind it is kept.

**R15a — The scale follows the writing.** A statement set at display scale is a statement; the
same treatment applied to a thirty-word paragraph is a wall that outshouts the photograph
beside it. Where a field can hold either, the template chooses the variant from the word count
rather than the stylesheet assuming a length. Content states facts, the interface derives the
arrangement — P8 applied to type, not just layout.

**R16 — The interface is earned.** A control that exists before the content justifies it makes
a young practice look thin. The category filter bar appears when two categories each hold
three published projects, not before; a category appears when it has published work; the team
list appears when there are names. Each rule is evaluated at build from the content itself, so
nothing has to be remembered, hidden or switched on — and no developer is involved on the day
it changes. Routes for these are generated the whole time and simply stay unlinked and out of
the sitemap until they are worth landing on.

---

## Tokens

Defined in `site/styles/tokens.css`. That file is the only place a value is declared.

```
ground        --surface #050505 · --surface-sunken #141414
ink           --text-primary #FFFFFF · --text-secondary #BFBFBF · --text-tertiary #8A8A8A
line          --border-subtle #242424 · --border-strong #424242
accent        --accent #00D0FF (dark) · #0037FF (light)
mark          --mark #00FF66 (dark) · #ED2941 (light) · always green on media
type          --type-display/h1/h2/h3/lead/body/body-sm/caption/meta/nav
space         --s-1…--s-9 (4→96px) · --space-section · --space-section-lg
grid          12 columns · --grid-gap · --page-margin · --max-width 96rem
motion        --ease cubic-bezier(.16,1,.3,1) · --dur-fast/base/hover/slow/draw
shape         --radius-none 0 · --radius-pill · --radius-arch
media         H.264 only, ≤3 Mbit cap · landscape 1600w · portrait 720w · poster per clip
```

---

## Patterns

**Projects grid** — the 12 columns the system always declared, finally used: `.grid12` sets
columns, gutter, page margin and max width in one place, and every piece of type on the page
sits on it. Only photography breaks out of it and bleeds.

**Project index** — one card per line, and a card is a **filmstrip**: six photographs at their
own proportions, side by side, with the card clipping whatever runs past its edge. Three fill
a laptop and six fill a maximised window, so the card is never part-empty at any width, and
the clipped frame is the affordance saying it continues. A single photograph across a shallow
full-width card was a 5:1 crop — it ruined most architectural images and made every card the
same flat letterbox. Name and location sit on the end frame over a scrim covering only the
type (R4). Hovering dims every other card (P4). Categories run above as real routes, rendered
only where work exists (P9).

**Two gaps doing opposite jobs must not be the same size.** The space between cards says
"different project"; the space between a card's own photographs says "same project, next
frame". At 1.5rem against 1rem they read as one interval and the page flattened into a single
grid of pictures. 4rem against 0.5rem — an eight-to-one ratio — and the projects separate.

**Every project is laid out the same way.** Caption left, hook left, the strip running left to
right — on every card, at every width. Two attempts at alternating hands were tried and both
removed: first mirroring the whole card (`direction: rtl` on every second strip), then keeping
just the caption on the opposite side. Neither survived contact. A reader should not have to
re-learn where a project's name sits or which way its photographs run halfway down the page,
and the variation bought less than the confusion cost. Rhythm comes from the work — different
photographs, different proportions — not from flipping the frame around it.

The mirror is a **wide-screen device only** — below 52rem every strip runs left-to-right. On a
phone you see one photograph at a time, so half the cards scrolling the other way reads as
disorienting rather than as rhythm; the alternating caption carries the variation there
instead, which costs nothing. The mirror is **one CSS property**: `direction: rtl` on the strip
(children set back to `ltr`).
That flips the running order so the hook lands on the right *and* moves the scroll origin to
the right edge, so the resting position is correct with no JavaScript and no reordering of the
content. Do **not** mirror with `justify-content: flex-end` or `flex-direction: row-reverse` —
on a scrollable flex container both push the overflow past the START edge, which no scrolling
can ever reach, and leave a stray sliver of photograph pinned to one side.

**The gesture is identical in both hands; only its sign differs.** The note is inserted at the
strip's start, which displaces the photographs; the strip is scrolled by exactly that distance
to cancel it, held there while the card grows, then eased back to 0. An rtl strip rests at 0
and scrolls negative, so `hold = mirrored ? -offset : offset` is the whole difference. An
earlier attempt mirrored the *movement* instead — note appended to the far end, scrolling to
`max` — and it read as a second, worse animation: the sweep was the length of the entire strip
rather than one note-width, and the target went stale as images loaded.

**The caption must beat an unknown photograph.** It sits over whatever image the studio
uploads, including a pale interior, so it is set at display weight with a scrim that is deep
and dark rather than a hint — a gentle gradient disappears against half the portfolio.

**A phone needs to be told the strip scrolls.** One photograph fills the width with nothing
beside it, so there is no clipped edge doing the work the desktop card gets for free. An open
card therefore shows a position and a progress rule — `04 / 07`, drawn as a rule, which R3
already allows on a sequence progress rule — plus a soft fade on the trailing edge. Hidden on
desktop, where the next frame is visible and says it already.

**On a phone the text leaves the strip.** A 20rem note inside a 375px-wide scroller leaves a
sliver of photograph and reads as a mistake, so below 52rem the note is placed under the strip
in normal flow and the card takes whatever height the words need — the strip animates its own
height instead of the card's. Full-width swipeable photographs, then the writing.

**The whole card is the target.** A photograph that looks clickable and is not is the least
intuitive thing an index can do, so the pointer target is the entire card, not the caption.
The caption stays a real `<a>` underneath for keyboard, middle-click and no-JavaScript. A drag
along an open strip ends in a click event, so any pointer movement over ~8px disqualifies it —
scrolling the photographs is not a choice to open or close something.

**The card expands, nothing else appears.** Opening does not summon a panel; the card itself
grows taller and its own strip starts scrolling, gaining the rest of the photographs. One
object changing state, not a second object answering for the first.

**Text leads, and the photographs do not move to let it in.** The note is inserted at the
front of the strip, and the strip is scrolled by exactly the note's width at the same instant
— so nothing appears to shift — then eased back to zero so the text arrives from the left
under its own steam. Setting that scroll offset once is not enough: while the card is still
growing the photographs are shorter and therefore narrower, the strip has less scrollable
width than the note occupies, and the value silently clamps (the first image lurched ~110px).
Re-assert it every frame until the growth finishes. The card's caption hides while open,
because the note now states the name and two of them collide in the same corner.

**Switching between projects moves both cards at once, and the one you touched holds still.**
A single before/after measurement only works when the change is instant; once the closing and
the opening card both animate, the height is in flight for the whole transition and has to be
tracked every frame. Two things make that possible:

- **Reserve the space before the collapse, not after.** The browser clamps scrollTop the
  instant the document gets shorter, so padding added afterwards is already too late — the
  position is gone. The closing card's current height is the upper bound on what is about to
  disappear; hold exactly that, then ease it away.
- **Let the reader win.** The anchor releases on the first wheel, touch or key — their intent
  outranks ours.

**Opening gets the full duration; closing gets out of the way.** `--dur-slow` to open,
`--dur-hover` to close, and the closing wipes drop their stagger delays so the card clears
together instead of unravelling. Injected markup is removed only once the close has finished,
so there is something to animate; re-opening mid-close cancels that clean-up rather than
racing it.

**Hand back reserved space while the anchor is still running.** Releasing the held height
after the anchor has stopped shortens the document with nothing left to compensate the clamp —
a small lurch right at the finish. Release it inside the anchor's window and it is absorbed
like any other movement. And give it back in one step: animating it drags the document height
for another 320ms after everything else has settled, which is a glitch of its own.

**A frame loop is not a guarantee; pair every tween with a timer.** `requestAnimationFrame`
all but stops in a throttled or backgrounded tab. A loop bounded only by frames then either
never finishes — stranding a strip mid-animation with its text half off the edge — or keeps
re-asserting a held position long after it should have released, overriding whatever came
next. Every tween and every pin ends on a clock as well, landing exactly on its target.

**Type never sits flush against the edge of a scroller.** A scroller re-anchors itself
whenever its contents change size, and lazy photographs change it constantly; a few pixels of
drift shears words off mid-letter if there is no margin to absorb it. Padding on both sides
makes the drift invisible, and type should not touch its container in any case.

**Motion yields to the reader, always.** Any animation that keeps re-asserting a position —
the reveal pinning a strip, the scroll anchor holding a card — cancels the moment the reader
touches, drags, wheels or types. An animation that moves something back while a hand is on it
is the worst possible fight. Frame loops need a **frame count as well as a clock**: a throttled
or backgrounded tab stretches 600ms of wall time across a handful of frames, and a loop bounded
only by time is still running long after it should have stopped.

**No scroll-snap on a photographic strip.** It fought everything that moves the strip — the
reveal eased to its resting place and snap yanked it to the nearest frame, and letting go of a
drag jumped instead of settling. Photographs of different widths have no natural grid to snap
to in any case. Free scrolling is smoother and truer.

**Never move the element that carries a scrim.** A caption sits on a gradient anchored to the
bottom of its card. Lifting that element on hover — a 2px flourish — pulled the gradient's
bottom edge off the card and exposed a strip of un-darkened photograph across the full width,
gaps included: a pale band that appeared *only on hover* and survived every fix aimed at the
images. If type is to move, move the type; the scrim stays where it is.

**Never leave a photograph on a composited layer's edge.** Anything that promotes an element
to its own layer — an `opacity` used for hover dimming is enough, so is a leftover `clip-path`
— makes its box edges rasterise at partial coverage. Card heights come from `vh`, so the box is
fractional almost always, and the edge smears whatever sits on it into a lighter band across
the full width, gaps included. It appeared **only on hover**, which is what finally identified
it. Two rules follow: take a reveal's `clip-path` off once it has finished, and inset the
content one pixel from the card's edge so the smear lands on the ground rather than on an
image. Black smeared into black is nothing at all.

**Move a strip with `transform`, never with scroll or width.** Taking the note out of a
closing card went wrong six times, and every failure came from choosing the wrong property:

- *Remove it outright* — the photographs shift by its width in a single frame.
- *Defer removal on a timer* — the card sits showing a slab of black where the title was, then
  snaps when the clean-up runs.
- *Collapse its `flex-basis`* — slices the words mid-letter, and animating a **layout**
  property re-lays out seven large photographs every frame, which jitters against the card's
  own height transition.
- *Scroll it off the edge* — the card is shrinking at the same time, so the photographs narrow,
  the scrollable range shrinks with them, and the residue lands as one abrupt jump.
- *Sequence the scroll and the collapse* — correct, but it loses the single continuous
  movement that made it read well.
- *Drive any of it from a `requestAnimationFrame` loop* — stalls the moment the tab is
  throttled and degrades to a jump.

**And the distance is not fixed.** A reader does not leave a project at its beginning — they
scroll into it, and the card has to come back from wherever they stopped, which may be
thousands of pixels rather than the width of the note. Every version of this assumed a resting
scroll of zero, so anyone who had actually *looked* through a project got the whole distance
dumped in one frame when they opened the next one — an 1800px jump where the measurement from
a resting card showed one pixel. That is why it read as inconsistent: the fault only appeared
after real use. The displacement is the note's width **plus the current scroll**, and the
duration grows with it so a long way back does not become a blur.

What works is a CSS `transform` on the strip's children. It runs on the compositor, so there
is no re-layout and no frame loop to stall, and it removes the end-of-close snap **by
construction**: the shift is exactly the space the note occupied, so dropping the transform and
deleting the note in the same frame moves nothing. Measured across that frame: one pixel.

**A scrim is an eased ramp with no plateau.** Holding a flat opacity near the bottom
(`rgba(...,.92) 8%`) puts a hard crease where the constant meets the ramp — a Mach band running
the full width of the card along the bottom edge of every photograph, and it reads across the
gaps between images too. Approximate an ease with several stops so the falloff never creases.

**Clip the fractional edge of any photograph in a vh-sized box.** Card heights come from `vh`,
so they land on fractional pixels almost always (27vh of 1044 = 281.88). A replaced element on
a fractional box smears its last texel row along the bottom edge — a thin streaked band that
reads as a squashed copy of the image. The figure clips and the image is a pixel taller than
it, which puts that row outside the visible box at every display scale.

**Nothing resets a scroll position after the reader can still see it.** Setting `scrollLeft`
back to 0 during clean-up yanked the photographs sideways inside a card that was still on
screen. The strip eases home when the close *begins*, while the card is still full height;
clean-up only settles a value that is already there.

**An image placeholder is the ground, never a lighter tint.** `--surface-sunken` behind a
photograph shows as a pale seam wherever a fractional height rounds, and flashes grey before
the image loads. On a near-black page the placeholder must be the page.

**A reveal that starts hidden needs an escape hatch.** `IntersectionObserver` reports nothing
while the document is hidden, so a page opened in a background tab sat blank until it happened
to be scrolled. Anything that begins clipped or transparent must also reveal on
`document.hidden` and on reduced motion.

**Growing is animated; shrinking is instant.** Two separate scroll bugs came from ignoring
this. A card that *shrinks on a timer* makes layout non-deterministic, so scroll compensation
measures a height still in flight and lands hundreds of pixels out. Worse, an expander that
*removes height before it adds height* makes the document briefly shorter and **the browser
clamps the scroll** — a 950px leap. Add first, remove instantly, then measure. Drift is zero
for open, switch, close and back, on desktop and mobile.

Progressive by construction: each caption is a real link to a real project page and the click
is only intercepted. The strip is lifted out of that page on first open, its `src` and
`srcset` re-resolved against the URL it came from, then cached — an index of two hundred
projects ships no project markup at all, and with JavaScript off the browser simply navigates.
`pushState` gives every project a real URL, and every image on the page must be pinned to the
original base at init or the browser re-resolves relative `srcset` candidates against the
pushed path and 404s. The card already shows the first three figures, so injection starts at
the fourth rather than duplicating them.

**Rail** — one project on one horizontal axis. Height drives, width follows: a landscape
photograph comes out wide and a portrait one narrow, **never cropped to a common slot** (R5) —
a `max-width` and an `object-fit: cover` were doing exactly that and had to go. The note rides
inside the strip as its first panel so it scrolls away with the pictures rather than holding a
column for the whole project. It carries the paragraph and the photographer only: title and
location are already on the row above it, and architect is btl on every project, so it says
nothing.

**Work index** — the home page's projects section, and the pattern that replaced the hook.
Every project named, every name its own link, set as display type over a held-back photograph
that changes as you read down the list. The hook it replaced showed one project at a time and
sent all four of them to `/projects`: you could see one house, and clicking it took you
somewhere else. Nothing auto-advances (R8) — the image moves only because you did.

**Opening** — the homepage's first screen: a full-bleed stage cycling an authored sequence of
video — the land, the building in the land, the rooms — with the frame naming itself quietly
bottom-left. No arrows, dots or counter; it is ambient, not navigational (R8), and it stops
when scrolled out of view. The poster of the first frame paints immediately so the page is
never black while a video negotiates, and the next clip is fetched three seconds INTO the
current one rather than alongside it — preloading the sequence together cost 5.5 MB before
anyone had watched six seconds of it. Under reduced motion or Save-Data the posters alone
carry it and no video is requested. A portrait encode serves phones, and it must show **the
same subject** as its landscape twin: the frame carries a label, and a portrait cut showing a
different building under the caption "Nelly House" is simply wrong.

**Social rail** — LinkedIn, Instagram, YouTube, set vertically up the left margin, fixed, on
every page. Structural chrome (R14), not a footer afterthought. Hidden below 64rem, where
there is no margin to give it.

**Press index** — publication at display scale, headline under it, year alone in the margin,
a hairline drawing along the row on hover. No images. Simulating spreads out of project
photography was wrong twice over: it read as decoration rather than evidence, and the pages
were never pages. The mastheads are the composition. When real scans arrive they become the
hover state and nothing else has to move.

**Person** — two tiers. Principals at scale with a bio; everyone else in a compact grid that
works at four people or forty.

**Nav indicator** — one element that slides. See R3.

**Home rhythm** — landing (full) → projects (release) → studio (compress) → people (release,
capped) → press (release) → contact (compress, resolves).

---

## Decisions

- Hybrid structure: scrolling home page, real pages behind every section. The nav always
  navigates to a page — never to an anchor on the home page, and there is no scroll spy. A
  menu item that scrolls you somewhere instead of going where it says reads as a broken link.
- Press is a typographic index, not simulated spreads. Decided; see the Press index pattern.
- Featured work is a scroll sequence on the project page and the work index on the home page.
- Categories exist in the model but stay out of the interface until there is enough work.
- Astro 7.2 + Sanity + Netlify. Engineering rules live in `implementation-contract.md`.
- No analytics, no third-party scripts, no CSS or animation framework.

---

## Traps already sprung

- **The image cache is keyed by slot, so it must record its source.** `emit()` returned
  whatever the manifest held for a key and never re-opened the file. Folding the cover into the
  sequence shifted every key by one: `01–06` kept the photographs cached under the old
  numbering and the new `07` re-encoded the source `06` was already showing, so every project
  ended on the same picture twice. Entries now store `src` and re-encode when it changes.
- **String-replace edits against a file already edited this session silently do nothing.** Two
  mirror fixes appeared to fail as design problems when the patch had simply not matched.
  Rewrite the block, then verify the code actually changed.

---

## Open

1. **Photography licence** — the AD-sourced Nelly House images are Condé Nast's. Originals
   and a written licence from Abhimanyu K V before launch. *Blocks launch.*
2. Real publication names, headlines, dates and links for press entries 2–5.
3. Studio and People copy; principals' bios.
4. Names, locations and one paragraph each for Houses Two, Three and Four, plus their
   photographer credits.
5. Instagram caption, YouTube clip, map coordinates.
6. Drone video is 200–500 MB — transcode and host externally before it goes near the site.
7. Confirm the dark ground against a finished Nelly House page before locking it.
8. Press index paginates past ~20 entries; not a problem at five.
