# Independent performance review

4 October 2026. Read-only review of Claude's performance evidence, current audit source and `performance.md`. No Lighthouse run, browser launch, performance-budget change, dependency upgrade, deployment or cache purge was performed for this review. The current source is local/uncommitted; the original deployed baseline is `6b2002f`.

## Evidence checked

- Five deployed cold-browser-cache Lighthouse reports/traces each for Home, Nelly House and Contact in `.audit-work/perf-baseline/`.
- Twelve diagnostic local variant reports, their scripts, actual altered HTML/JS approach and `lh-summary.txt` under `.audit-work/evidence/PERF/`.
- Original social-rail Layout Instability API experiments and CI-history/cache/header/HTML-composition evidence.
- Current runtime diff, responsive-image/preload/font/CDN/build budgets, generated HTML and delivery/auth/build-identity helpers.
- Fresh gentle public HEADs, exact npm registry release metadata and official release notes. New read-only evidence: `.audit-work/evidence/RESUME-PERF/`.

## Baseline and claims

Recomputed directly from the saved reports:

| Deployed baseline route | Runs | Median mobile LCP | Maximum CLS | Median score | Median TBT |
|---|---:|---:|---:|---:|---:|
| Home | 5 | 1139ms | 0.00855 | 100 | 0ms |
| Nelly House | 5 | 2649ms | 0.000354 | 97 | 0ms |
| Contact | 5 | 943ms | 0.000287 | 100 | 0ms |

These use Lighthouse simulated mobile throttling: 412×823, DPR 1.75, RTT 150ms, throughput 1638.4 Kbps, CPU slowdown 4. Trace resource timings are actual recorded timing inputs; Lighthouse's simulated LCP is not their arithmetic sum. Zero initial-load TBT **does not** measure subsequent gesture/reader/gallery/copy/form interaction latency or establish field INP.

The audited `performance.md` correctly retains the Nelly House miss, separates laptop from CI conditions and does not claim the new source meets two seconds. Its scope is a performance assessment with pending deployed verification, not a completed all-route/all-device performance certification.

One correction to the inherited finding: PERF01 calls CI CLS 0.0173 a budget failure against 0.02. That number is below the threshold. The social rail's 0.00814 structural shift is confirmed and worth fixing, but that sample's failed gate is LCP, not CLS. The current performance assessment avoids this old overstatement.

The old `curl-ttfb-run1.txt` has repeated Brotli decoding errors and `size=0`. Its observed response headers/initial TTFB remain useful, but total/completed-body/transfer-size fields cannot establish a successful download, cold/warm transfer comparison or payload size. Fresh HEAD evidence below deliberately makes no throughput claim.

## Source attribution and real changes

`initialAhead()`, `warmOnward()` and `loadAhead()` assigning low image priority are already in baseline `6b2002f`. They are preserved baseline safeguards, not improvements delivered by this audit. This was independently checked from `git show` against the current source.

Actual new improvements reviewed:

1. Production-only Function routing avoids the preview guard and its extra build-status asset lookup on HTML/scripts/fonts. Draft/public-noindex branch requests keep middleware on every URL. This is a plausible TTFB improvement; its amount has not been measured on deployed new source.
2. Project-index automatic warming waits for the opening photograph's load/error, and its offscreen opening image requests low priority. This is new; native lazy images may already have been scheduled by the browser and are not cancelled by this guard.
3. Social positioning pins the center while retaining child centering transforms, removing the confirmed initial structural displacement without changing the authored placement. Browser/source verification is separate from actual physical Firefox Android toolbar behaviour.
4. Exact source metadata plus an eight-hex immutable deployment target let the later deployed performance run identify the tested source. This improves measurement integrity; it does not improve LCP by itself.

### Missed issue found and corrected: automatic warming was not actually serial

The comment promised one-at-a-time network warming, but the original drain cleared `draining` immediately after `warm(slug)` returned void. Three synthetic 2 s responses started at 2/305/606 ms, reaching three simultaneous HTML fetches. Thus a 300 ms gap was a launch cadence, not completion-based serialization.

I reproduced the **actual extracted source block** in a local VM with controlled asynchronous promises, rather than asserting this from comments. No browser or real network was involved. The runtime owner then made `warm()` return/reuse a promise through both HTML and the offscreen image load/error phase, and kept the automatic queue busy until settlement. Explicit intent paths remain immediate.

Independent current-source rerun with 2 s HTML responses and 120 ms image loads shows starts at 2/2427/4851 ms, maximum HTML in-flight count 1. The next item starts only after prior image settlement and the 300 ms spacing. This establishes queue ownership correctness in the synthetic harness; browser delayed-response regression results and real impact remain in the runtime/lead verification ledger.

Evidence: `warming-concurrency-before.json`, `warming-concurrency.json` and companion scripts. A correction to source launch concurrency is not evidence of an achieved LCP/INP target.

## Images, fonts, native delivery and caches

- The baseline Nelly House waterfall requests the correctly preloaded high-priority 1080 px opening rendition at q82, with 104132 transfer bytes in the sampled run. Its responsive preload and displayed image use the same candidates. Changing image quality or omitting the photograph is not justified.
- Neighbouring native `loading="lazy"` photographs have real `src`/`srcset` and intrinsic boxes. Browsers can fetch nearby horizontal images early based on their own lazy thresholds; a JavaScript gate does not undo an existing native request. Keep this as a remaining trace investigation, rather than crediting automatic warming changes with eliminating all initial image overlap.
- Saved local experiments have project medians: baseline 2497 ms, defer 2404 ms, external font 2528 ms, defer+external font 2328 ms. All remain over 2 s. Externalizing the font alone did not demonstrate improvement in this run set. The experiments were diagnostic, ran on a shared machine and rewrote later images to `data-src`/`data-srcset`, which would harm no-JavaScript/native progressive delivery if adopted unchanged. Their wholesale rejection is justified.
- Current build still inlines Latin fonts on pages fitting the existing 55 KiB headroom check, and retains external cached-font delivery on larger pages. The inliner removes the Latin font preload when embedding it, avoiding a duplicate font download on those pages. This trades repeated-document bytes against a first-entry round trip; repeat-visit/multi-route journeys need measurement before changing the policy.
- Fresh production HEADs confirm HTML and unversioned `site.js` revalidate (`max-age=0, must-revalidate`) while the Latin font has a year-long immutable policy. Fixed font filenames therefore require versioning/cache planning if the font bytes ever change; this review found no current font-content change.
- A sampled q82/1400 px Sanity rendition negotiates **AVIF**, has `Vary: origin, accept`, a year-long client max-age/30-day shared max-age and a populated Age value. This HEAD examines the fallback `src` rendition, **not** a measured currentSrc choice or cold derivative. `warm-images.mjs` already supplies modern image Accept headers, but its claim that all current browsers receive the same WebP is stale. Do not generalize one warmed format to every browser/fallback/region.
- Browser-cold Lighthouse is not an origin/CDN purge. The build's best-effort derivative warming and current HEAD Age indicate origin derivatives can be warm while the browser cache is cold. Report those layers separately.
- Automatic film still respects reduced motion/Save-Data. Static source shows automatic project HTML/image warming does not independently inspect Save-Data/effective network type. This is a data-use policy/performance recommendation and test gap, not a demonstrated regression. If addressed, limit speculative work while preserving intentional opens and actual content delivery.

## Remaining performance coverage

| Area | Evidence available | Gap / required next action |
|---|---|---|
| Home, Nelly House, Contact first entry | 15 deployed baseline reports; local source fixes/experiments | New source needs authorized immutable HTTPS deployment and unchanged 3–5 cold runs, medians/max CLS and traces. Use odd 3/5 run counts; the current helper labels the upper middle result for even counts as “median”. |
| Other template families | Generated HTML budgets/asset-source inspection and behavioural tests | No comparable deployed LCP baseline for Press index/reader, People, Studio, other project proportions or media-heavy taxonomies; add representative measurements without replacing the existing gate. |
| Desktop/tablet/mobile cross-engine performance | Multi-engine behaviour/visual tests from other audit areas | Lighthouse samples are mobile Chromium simulation. No desktop/tablet slow-device or WebKit/Firefox loading/frame-time performance measurements here. |
| Repeat visits / fonts / script revalidation / cold CDN formats | Cache policy inspected; read-only HEAD metadata | No controlled warm-browser repeat-navigation comparison or same-user multi-route waterfall. Do not claim the inline-font policy is optimal for all journeys. |
| Gallery/reader cold opening, photo stepping, pinch/pan, copy/form response | Functional regressions and controlled warming logic | No quantitative Event Timing, frame/long-task, image-decode or interaction-to-feedback measurements found in original PERF artifacts. Record lab proxies separately; screenshots/test timeouts do not establish latency. |
| bfcache return | Runtime owner's real Google Chrome persisted-page/menu cleanup test | Correctness is demonstrated in that configuration; restoration speed/memory and older device performance are unmeasured. Desktop Chrome touch emulation is not physical iOS/Android. |
| Video startup/background/rotation/zoom detail | Source policies and feature tests | No full byte/energy/frame-time characterization across actual phones/tablets, Mux failures or background return. Preserve the approved control-free opening-film decision. |
| INP / real users | No field collection verified | No field INP or real-user p75 LCP/CLS result; do not equate TBT 0 or a synthetic click proxy with INP compliance. |
| Physical mobile toolbar/keyboard changes | Browser emulation and source system tests | Android Firefox/iPad/iPhone physical verification still required; no physical devices or browser farm used here. |

After the lead's current browser jobs are closed, interaction proxies can be collected on an isolated fresh server without Lighthouse contention. Until executed, those cells remain unmeasured. The speed claim remains **target not demonstrated for the entire website**.

## Outdated-package assessment: no unsupported upgrade

Fresh official npm metadata confirms the pinned sharp 0.35.4 and TypeScript 6.0.3, and available sharp 0.35.5/TypeScript 7.0.2. Metadata snapshots are in `release-metadata.json`.

- **Sharp 0.35.5:** compatible Node requirement remains ≥20.9. Its notes concern array bounds, fallback failure handling, JXL/types, extension dimensions and gain-map transforms, plus bundled native dependency updates. This site's direct use is build-time transparent artwork analysis via `ensureAlpha().raw().toBuffer()`. No reproduced site defect or demonstrated first-load/security fix requiring this patch was established. It is a maintenance candidate with native-platform/artwork regression checks, not a reason to disturb the audit's validated lockfile or claim faster visitor loading. [Official sharp changelog](https://sharp.pixelplumbing.com/changelog/v0.35.5/), [bundled native release](https://github.com/lovell/sharp-libvips/releases/tag/v1.3.4).
- **TypeScript 7.0.2:** this is a native compiler major, not a routine compatible patch. Microsoft explicitly distinguishes its missing programmatic compiler API from TypeScript 6. Locally, `@astrojs/check` permits TypeScript 5/6, and the Astro language server loads the TypeScript API. A blind 7.x replacement is unsupported by these peers and risks breaking checks; it cannot directly make the static website load faster. Keep 6.0.3 until supported tooling/migration and measured developer-build benefits justify a separate change. [Official TypeScript7 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/).

No package pin was changed by this review. An outdated listing alone is neither a security advisory nor proof of a product performance defect.
