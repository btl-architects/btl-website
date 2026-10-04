# Opening films, original uploads and Android Firefox toolbar follow-up

Owner report: each Home clip exposed its thumbnail before playing; a client
reported an MP4-only rejection when attempting a MOV upload; the Home social
rail still moved with the top address bar in Android Firefox 157.0.

## Changes

- Video preloading now explicitly uses `auto`, starting the next clip as soon
  as the current clip has its first frame, rather than after a three-second
  timer. The next frame becomes visible only after `requestVideoFrameCallback`
  confirms a decoded video frame (a playing/paint fallback supports older
  engines). Until then, the outgoing decoded picture remains visible. Complete
  durations, looping, muted playback, offscreen/tab pausing and reduced-motion /
  Save-Data alternatives are retained. Failed uploads retain the authored still
  and advance; a stalled handoff has a bounded wait. Cancelled callbacks cannot
  override a later visibility/preference change.
- Empty clips consistently select the Mux uploader, including objects without
  an explicit mode. Previously, a missing mode exposed the MP4-only manual file
  uploader even though the field's initial value said Mux. The object now has
  an explicit initial value; original Mux uploads and already-prepared manual
  MP4 uploads have distinct labels. Saved legacy uploads remain available.
  Shared editor/build/player mode selection and processing validation agree.
- The rail's fixed shell is separated from its internal word position. On
  Android Firefox it anchors to the bottom, whose compositor compensation
  handles the top toolbar moving the content origin. The measured bottom
  distance stays constant through height-only changes. Other touch browsers
  retain a top anchor and compensate visible viewport offsets. Width changes
  recenter it; pinch zoom is left to the browser; desktop CSS centering remains.

## Evidence and limits

Physical preview feedback on the first candidate (`2c1daed`) showed that the
rail moved during Firefox's animation and returned afterward. That candidate
is **not a verified fix**. The revised candidate uses a compact, natural-height
bottom-fixed box with a measured pixel inset and native `sideways-lr` text,
removing the viewport-height shell and transformed text layer. A size observer
keeps its centre correct when fonts or labels change. Phone verification is
still required before treating the transient movement as resolved.

Read-only public CMS inspection found six published clips all selecting Mux,
with completed public MP4 renditions up to 1080p. The playback gap was in the
website handoff, not absent transcoding. No CMS documents or Mux settings were
changed and no paid upload was made. The specific client rejection was not
reproduced: their selected processing mode and exact error remain unknown.
The configured official plugin accepts `video/*`, including normal MOV's
`video/quicktime`; the manual Sanity file field accepts only `video/mp4`.
[Mux documents MOV input support](https://www.mux.com/docs/api-reference/video/direct-uploads/create-direct-upload).

Controlled same-fixture, same-browser comparison: the old script showed the
next poster in all 45 held-download samples; the new script showed none and
retained the outgoing decoded frame in every sample. The modeled top-toolbar
cycle moved the old rail by up to 56px; the new rail's modeled screen-coordinate
movement was 0px. These are reproducible browser diagnostics, **not a physical
Android Firefox toolbar-animation certification**. Physical Firefox 157 phone
verification remains necessary; Mozilla's compositor behavior cannot be fully
reproduced by desktop viewport resizing.

Website: 62 unit checks and full build pass. Studio: 13 unit checks, TypeScript
and build pass. JS remains 18.8kB gzipped within the unchanged 20kB budget; no
player framework or new dependency was introduced. Regression tests cover
held-download handoffs at phone/desktop widths, missing frame-callback support,
pending preference changes, complete duration/sequence restart, error fallback,
responsive sources, viewport offsets, the top-toolbar model and rotation.

Raw local evidence stays ignored under `.audit-work/`: comparison JSON/scripts,
`video-rail-targeted.log`, `firefox-toolbar-model.log`, final browser/build logs.
Deployed `2c1daed` playback verification also cycled all six actual Mux clips
back to the first in Chromium and WebKit at 390px and 1440px. Across all four
cases, 3,895 sampled frames exposed no intervening poster, every incoming video
had decoded dimensions, and there were no page errors. The compact rail revision
passes its build and 11 Chromium/WebKit checks with one explicit API skip.
The existing PR runs the full Chromium/WebKit/Firefox suite and deployed mobile
Lighthouse again. The previous failed performance gate and Studio `braces`
advisory remain explicit; no gate is disabled or weakened.

The owner authorized merging the entire audit branch/draft PR into `main` and
then explicitly requested releasing the current update without waiting for the
remaining Firefox movement to be resolved. Do not mark that issue fixed based
on the model. Full updated Linux CI results may still be pending at release;
the unchanged performance/dependency gates are not waived or made green.

The owner separately authorized the existing hosted Studio deployment. The
Sanity CLI successfully deployed the editor and 1/1 schemas to
https://btldesigns.sanity.studio/ with `--schema-required`. No draft document
was published and the specific client's rejected MOV was not uploaded.
