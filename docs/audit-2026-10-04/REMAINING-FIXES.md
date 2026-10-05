# Follow-up: project switching, delivery bandwidth, loading and physical Firefox

Main release `506080d` is live. Its full three-engine browser suite passed; the automated performance gate remains red at Home 2116 ms and Nelly House 2479 ms. Studio audit remains red for GHSA-vfj7-8cjw-p6xm; npm still has no patched braces release. Do not weaken either gate.

The owner confirmed Sanity's 80% monthly bandwidth warning. The previous build fetched 538 image variants every time and discarded the bytes. Hidden Home film posters also loaded despite never appearing during normal playback.

The follow-up copies Sanity's optimized WebP renditions into Cloudflare static assets. Source assets, crop/hotspot, width ladders, quality and editing stay with Sanity. No photographs enter Git and no second transformer is introduced. URL hashes include the asset and transformation options; unchanged renditions reuse `web/node_modules/.astro/btl-media-v1`. Cloudflare's Astro build cache can persist that directory when build caching is enabled. A cold cache still needs one download per rendition. Already consumed bandwidth is not refunded, and Studio use and social preview scrapers still consume Sanity bandwidth.

The photograph viewer changes both its width query and static path when sharpening. All zoom rungs are copied, even when the fitted source is smaller than the largest responsive rung. Builds fail before replacing HTML if an image response is missing or invalid.

Later film posters remain inside inert templates until a genuine video failure. With scripts disabled they remain available through `noscript`; reduced motion and Save-Data retain the first still without fetching films.

The owner confirmed the compact social rail still moves on physical Android Firefox 157 with the top toolbar. Desktop simulation does not reproduce that compositor animation. A separate noindex phone comparison tested six approaches: A/C/F moved with the toolbar; B/D/E stayed in place. The owner briefly chose A, confirmed its smooth movement on the actual Home preview, then clarified that the links must stay in place while the page moves around them. The follow-up therefore retains the Firefox bottom anchor corresponding to B/E, without visual-viewport event handlers or height-only CSS/attribute writes. Rotation and changed font metrics still recenter it. Other touch browsers retain visual-viewport-origin compensation; desktop positioning stays unchanged. Physical confirmation of this final Home revision is pending at https://64e67929.btl-website-3wo.pages.dev/ .

Switching from The Conservatory to Teak and Terra reproduced a large upward jump on phone and tablet layouts. The space reservation happened before the new card's anchor measurement; native anchoring could choose the footer outside the enhanced index and move the page during that reservation. Reduced motion also bypassed the anchor entirely. The new helper measures the tapped card first, temporarily disables document anchoring while it owns the transition, corrects instant changes synchronously, and cancels any older tracking loop. Input cancels tracking and restores native behavior. New actual-touch tests sample 60 frames and require the photograph's top to remain within 2 px on Home and Projects, with both motion preferences. The earlier strict close-card test is unchanged.

Photographs also get a static AVIF ladder when Sanity has finished every candidate, plus their complete WebP fallback. Responsive preloads select the same AVIF source, avoiding duplicate first-photo downloads. Existing art-directed pictures retain their media queries and portrait dimensions, with paired AVIF/WebP sources. AVIF is optional and asynchronous in Sanity: an incomplete modern ladder leaves the entire WebP ladder selected. Seven delivery unit tests cover cache reuse, corrupt-cache repair, invalid responses, zoom widths, art direction and the complete/fallback AVIF cases.

Published branch previews now use static delivery with a build-generated `X-Robots-Tag: noindex, nofollow` on every page and asset. Draft builds still protect every request through authenticated middleware. This removes the per-image Function/marker lookup from public preview speed measurements while preserving indexing and draft protections.

Validation so far: 70 unit tests pass; type/build/static checks and delivery budgets pass. A repeat build reused all 560 WebP and 510 AVIF files with no image downloads. The initial switch/close/reopen regression run passed 16 Chromium/WebKit checks; the expanded Home/Projects switch matrix passed another 16 checks at standard phone and tablet heights. The media/rail/resolution/zoom targeted run passed 42 checks, with two existing WebKit CDP-gesture skips. Local Firefox still cannot launch on this Mac; CI must provide that evidence.

Earlier WebP-only public-preview measurements still missed the speed target (Home median 2009 ms, Nelly House 3181 ms). Opening-only AVIF delivered Home at 1895 ms but the project at 2989 ms. Complete-gallery AVIF-preview measurements and full CI are pending; do not claim an under-two-second result or a physical Firefox fix until verified.


## Phone switching follow-up, 5 October

The owner reports frame drops when switching on production; production still has the pre-follow-up position behavior. When a touch-layout gallery's photographs are entirely above the viewport, switching now finishes that unseen strip's height change synchronously instead of animating it alongside the new gallery. Visible strips keep their closing motion, and the newly tapped strip keeps its expansion. The original pure-close regression and 60-frame position limits are unchanged. The switch matrix additionally limits whole-page scroll positions to two when the old photographs are off-screen; a still-visible tablet strip correctly needs animated compensation.

A Chromium phone simulation with sixfold CPU throttling compared the preceding position-fixed build with this optimization: the switching interval used 25 distinct scroll positions before, two after. Neither run missed a 33 ms frame; total layout/paint timings varied and did not establish a CPU speedup. This confirms fewer whole-page adjustments, not a reproduced or conclusively fixed physical-phone frame drop. Android Firefox 157 still needs a real-phone recheck after release.

Complete AVIF-gallery delivery preview measurements were Home median 2052 ms, Nelly House 2506 ms and Contact 1069 ms; the under-two-second gate remains unmet. The earlier CI run passed every new position/close test in all three engines, but exposed AVIF source sizes remaining at thumbnail widths in Firefox. Expansion now updates the picture sources together with the image's sizes. The native Press-tab test now waits for document commit before inspecting the tab, and the blocked-opening-photo fixture handles owned static media URLs. The latest complete three-engine run is pending.


## Release validation, 5 October

The owner physically checked `fd541b1d` on Android Firefox 157: the tapped image now stays in place and switching is smooth. A small phone frame drop remains. The rail also holds its position, with a small jitter during the toolbar animation. The owner explicitly accepted both residual effects for release if they cannot be eliminated. Do not call either physical effect completely resolved.

Full Linux run `37255209233` on runtime head `f1a358d` passed 526 browser checks, skipped 37 explicit unsupported-API checks, and failed one Chromium Press new-tab test. All project switch/close/source-resolution checks passed in Chromium, WebKit and Firefox. No browser check was flaky. The remaining trace shows the article correctly rendered in the modifier-opened tab while Playwright's cached frame URL is empty. The corrected test checks the real document location, its heading and the closed reader; it neither changes the destination nor navigates the tab itself. Focused Linux run `37257264090` passed the corrected test in all three engines (three checks). No runtime/build/dependency source changed after the full run; the final changes are test, diagnostic workflow and documentation edits. Manual workflow dispatch can now select a diagnostic regex; PR and main runs always retain the complete browser suite.

The same run passed 70 website unit tests, website type/build/budget/static checks and the website dependency audit. Deployed mobile medians: Home 1937 ms (score 99, CLS 0), Nelly House 2562 ms (score 97, CLS 0.00000385), Contact 1519 ms (score 100, CLS 0). The project therefore still fails the unchanged two-second gate. Studio tests/type/build pass; the existing unpatched braces advisory remains open.

Read-only Cloudflare build-log inspection found build caching was disabled and hosted builds still downloaded all renditions. Build caching was enabled through the documented Pages project setting; build commands, source and deployment bindings/settings were verified unchanged. A seed build saved the output cache, and subsequent hosted build `4b13ab86` restored it: 560 WebP plus 510 AVIF reused, zero photo downloads. This does not refund earlier Sanity traffic, and other hosts still need their own caching or retirement. No paid-plan settings or CMS documents changed.

## Desktop recording, 5 October

The owner's screen recording shows production switching between Office in Mysore and Residence in Manjeri near the footer. A direct mouse reproduction on production moves the page about 580 px when the reserved padding appears, then clamps it back when that padding is removed. The browser's footer anchoring competes with the project transition. The pending release's existing document-level anchoring fix also prevents this desktop failure; no further runtime change was needed.

Two desktop regression cases (1280×720 and 1780×1080) reproduce the partially hidden preceding card and open last card, switch both ways twice using real mouse clicks, and sample 70 frames per switch. Every sampled card top must stay within 2 px. They also require one open card, one note fully inside the horizontal strip, and no leftover reserved padding. They pass in local Chromium and WebKit (four checks) and in Linux Chromium, WebKit and Firefox (six checks, run `37258302293`). Locator clicks are deliberately avoided here because their automatic scroll into view would hide the recorded failure. The existing phone and pure-close assertions remain unchanged. Direct deployed-preview measurements at 1780×1080 show a maximum displacement of 0.5 px in Chromium and 0.922 px in WebKit, compared with 576.5 px on production, with no page errors in either preview engine.

The subsequent full run `37257577375` passed 525 checks, skipped 37 explicit unsupported-API cases, had one navigation-load flake (passed on retry), and failed the Chromium native Press-tab test. Its first trace contains the new tab's 200 document response but no attached Page event; the retry reads location during document replacement. The test now activates the actual native Chromium background target before waiting for its Page object, then waits for the unchanged visible heading before checking the real document URL. It preserves the combined external-source/close/modifier-click sequence, native click, expected URL/content and reader-dismissal assertions; it never creates or navigates a replacement tab. Ten repeated local Chromium/WebKit checks pass. Linux related checks are pending.

The full trace also exposed the Press demonstration fixture silently dropping its photograph after AVIF added a picture wrapper. The fixture now finds the fallback image inside that wrapper and fails loudly if no built photograph is available. The flaky tablet underline check waits for DOM readiness and its existing animation assertions rather than the live opening film's load event. These are test-only changes. Runtime, build and dependency source remain identical to the already tested `f1a358d` tree. Full-run mobile medians were Home 1929 ms, Nelly House 2585 ms and Contact 1522 ms; the project speed gate and Studio advisory remain open.

## Paint-first speculative loading, 5 October (Claude)

**Project speed gate.** The latest CI Lighthouse reports for Nelly House show a correctly prioritised opening
photograph (102 kB AVIF, discoverable, `fetchpriority=high`, not lazy). The gap came from what started
alongside it. `site.js` began neighbouring gallery photographs, automatic project warming and onward prefetches on
the photograph's `load` event, which comes before decode and first paint. In the unthrottled trace that Lighthouse
simulates from, ~98 kB of neighbouring photographs (w480 and w900) began in that gap and were modelled as sharing
slow-4G bandwidth with the photograph.

Change: one `openingPainted()` helper (decode, then one frame, then a task, with an 8 s clock backstop for
background tabs) now gates all three. Clicks, taps, focus and scrolling still start work immediately. Photograph
sizes, quality, crops and layout are unchanged.

Regression: `runtime-audit-regressions.spec.ts`, "speculative requests wait until the opening photograph can be
painted", holds the opening photograph's decode and asserts that no eager neighbour, warming fetch or prefetch
starts until it is released (Home, Projects, Nelly House; Chromium and WebKit). It fails on the previous code in
all six cases and passes after the change.

Limits, stated plainly:
- Under realistic throttling in a real browser, the script work already followed the paint closely. This mainly
  corrects ordering in the lab model, so the measured gain must come from CI's deployed run, not this note.
- Chrome's native lazy loading still fetches one neighbouring photograph on Nelly House (~130 kB) and about 26 on
  `/projects/` (~740 kB) early on slow connections. That is browser behaviour; removing it would need script-gated
  image sources plus `noscript` duplicates, which is not done here.

The under-two-second target remains unproven until deployed CI measures it.

**Studio advisory (`braces`, GHSA-vfj7-8cjw-p6xm).** Re-checked 5 October: npm latest is still 3.0.3, the advisory
lists no patched version, and upstream PR micromatch/braces#72 is open and mergeable. The path is
`sanity → @sanity/cli → @sanity/codegen → chokidar 3 / globby → braces`; it is Studio development tooling only.
When 3.0.4 (or later) is published, run `npm update braces` in `studio/` (lockfile only, within existing ranges),
then `npm audit`, `npm test`, `npx tsc --noEmit` and `npm run build`. No override to an unreleased commit and no
suppression.

**Physical-phone residue.** These need a physical device, and the owner has accepted both for release:
- Android Firefox toolbar jitter on the Home social links: the rail is already untransformed, bottom-anchored and
  measured, and six approaches were compared on the owner's phone. The remaining movement happens inside
  Firefox's compositor during its toolbar animation. The only remaining lever is a design change (links that
  scroll with the film on phones), which contradicts the owner's request that they stay in place, so it is not made.
- Small frame drop when switching projects on a phone: not reproducible in Chromium/WebKit at 6× CPU slowdown, so
  any change would be blind. Re-measure on the physical phone after this release before tuning further.

## Project-page speed and card-opening flicker, 5 October (Claude)

**Held later photographs.** Chrome's own lazy loading reaches past a phone screen on slow connections, so the next
three rail photographs (about 230 kB on Nelly House) downloaded beside the first, which is the LCP image. The build
(`tools/defer-rail-images.mjs`, run after `cache-images.mjs`) now gives every project-page rail photograph after the
first a transparent placeholder `src`, keeps the real `src`/`srcset` in data attributes, and adds a `<noscript>` copy.
`site.js` restores them once the first photograph is painted, or at the first touch, click or key press. Cards that
open on index pages restore them at once. Without scripts the `<noscript>` copy shows. Held photographs keep their
proportions, so nothing shifts.

Local Lighthouse (mobile, simulated throttling, same build without and with the hold): Nelly House median LCP
2561 → 2038 ms; score 97 → 99; CLS unchanged at 0.0004. Home 1664 ms. Deployed CI is the authority on the gate.

**Card-opening flicker.** Opening a card changed the visible preview photographs' `sizes` in place, and the browser
dropped the drawn thumbnail before the larger file arrived: 5–6 blank frames in Chromium. The larger file is now
fetched and decoded off-screen first (`enlarge()` in `site.js`): 0 blank frames in Chromium and WebKit at 390 and
1440 px.

**Tests.** New regressions: later project photographs wait for the first to be painted (held decode); without
scripts every project photograph is shown once. The two founder-name tests no longer pin the editorial "Ar."
honorific, which the studio removed from Home on 5 October; names and order are still checked. Full local suite:
375 passed, 19 skipped, 0 failed (Chromium and WebKit); 71 unit tests.
