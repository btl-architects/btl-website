# Shared scroll motion — 3 October 2026

Reference: Foster + Partners homepage. Its cards use a 100px upward fade with a
500ms transition. BTL uses the same entrance pattern with 40px travel on desktop,
24px on phones, and a softer 800ms / 700ms transition. The homepage statement
retains its longer 1100ms fade.

The shared tokens live in `web/src/styles/tokens.css`; `.rv` and `.rvc` use one
fade-and-rise treatment. Project cards retain their independent height animation.
Press artwork and its aligned caption move together without changing the PNG crop
or caption anchor. Team members, section headings, image/text spreads, galleries
and onward links use the same system. Reusable components automatically include
future Sanity content; there are no new editor fields or content migrations.

Initial visible content appears immediately. Below-fold groups start at 82% of
the viewport, with the homepage statement waiting until 68%. Siblings stagger
75ms, capped at 225ms. Entrances run once; returning up the page does not hide
content. Native scroll, modal controls and article reading content retain their
existing behaviour.

Keyboard focus exposes an unrevealed destination immediately. Reduced-motion,
unsupported observers, background tabs and restored pages show content without
entrances. Changing motion preferences cannot hide previously revealed content.
The observer and passive, frame-throttled backstop share the same trigger and
stop checking once every group is visible. No animation dependency was added.

Validation: production build and all 26 web unit tests passed. Focused Chrome and
Safari tests cover entrances at 375px and 1440px, statement timing and return
navigation, live motion preferences, keyboard focus, project height/galleries,
Press readers and captions, and no-script/observer fallback. Local Lighthouse:
home 100 / LCP 1584ms, project 100 / 1517ms, contact 100 / 1516ms; CLS 0 on all.
The earlier discrepancy between local and Linux CI performance remains a separate
issue; these measurements are local validation, not a guarantee of CI results.

## Image clarity

The shared image pipeline now uses quality 82, up from 68, and adds 2800px and
4000px responsive candidates. Each candidate is capped by the cropped source.
Galleries and closed project strips request their actual height-driven widths;
the older 700px gallery ceiling and fixed 400px thumbnail request are removed.
CDN variants remain warmed during the build and below-fold images remain lazy.

Sanity now measures usable pixels after the saved crop when giving a non-blocking
resolution warning. The earlier founders source was 914 × 1279px, with a 732 × 870px crop. The user
supplied a 4640 × 6960px camera original, now uploaded into the published settings
with a crop ending above the feet. Principal order now matches the photograph
(Faizan, then Thressia). Image and order changes used revision guards and local
backups; unrelated draft content was preserved.
Upload instructions are in the editing guide.

Web and Studio builds and checks pass (26 and 10 unit tests respectively). Browser
resolution checks cover every generated page at 375px, 1024px and 1440px on 2x
screens, and gallery/viewer, caption and motion regressions run in Chrome/Safari.
The resolution guard only excuses an image when its cropped original is exhausted;
a CDN size limit alone cannot excuse an under-resolved image.

## Opening films

With multiple clips, the former 6.2-second rotation cut longer uploads short. Playback now advances
on the actual media `ended` event and restarts the sequence; a single clip loops.
Offscreen/background/reduced-motion/Save-Data behaviour is retained. A failed
file keeps its authored still and allows the sequence to continue. Sanity's
field descriptions now explain full playback and prepared MP4 requirements.
The official Sanity Mux input now supplies a second, automatic-processing mode.
New clips default to it; existing file clips remain compatible. Mux Basic creates
a highest MP4 capped at 1080p. Shared pure source selection and Sanity validation
require ready public playback and a ready MP4. Processing, failed, signed or
malformed assets cannot become website sources. CSP allows only Mux's delivery
host for media; credentials are kept in the official editor-only secrets record,
never queried by the web build. The public film player needs no additional
JavaScript or analytics SDK. Landscape and portrait cuts share the existing
playback system. The editor is deployed; account connection and an actual Mux
upload remain the activation step until credentials are configured.

## Fresh dependency audit

On 3 October, fresh audits report two previously installed dependency families:
Astro → http-cache-semantics (GHSA-ch52-4w7c-c8xp), and Sanity CLI/codegen → braces
(GHSA-vfj7-8cjw-p6xm). The latest registry releases are still affected; both
advisories list no patched version. Mux's plugin adds neither affected package.
These packages are part of build/code-generation tooling; the BTL deployment
serves static output and does not operate an authenticated shared HTTP cache or
accept visitor-supplied glob patterns. This is an exposure assessment, not an
assertion that the dependencies are patched. Audit gates remain intact and will
fail until addressed upstream or through a separately verified replacement.
No forced major downgrade or advisory suppression was introduced.

Sources: https://github.com/advisories/GHSA-ch52-4w7c-c8xp and
https://github.com/advisories/GHSA-vfj7-8cjw-p6xm.
