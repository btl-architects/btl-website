# Whole-site performance assessment

4 October 2026. Baseline source `6b2002f`, deployed HTTPS Pages origin. The
two-second target remains a real gate: performance score ≥95, median mobile
LCP <2000ms and maximum CLS <0.02. No numerical budget, image quality or approved
composition was reduced to get a pass.

## Baseline and diagnosis

| Route | Five cold HTTPS runs, quiet local machine | Latest baseline main CI |
| --- | --- | --- |
| Home | Median LCP 1139ms; CLS 0.0086 | LCP 2377ms; CLS 0.0173 |
| Nelly House | Median LCP 2649ms, misses target | LCP 2624ms, misses target |
| Contact | Median LCP 943ms | Around 1000ms, within target |

Source evidence: `.audit-work/perf-baseline/`, original
`.audit-work/evidence/PERF/ci-perf-history.txt`. These are actual baseline
measurements, not predictions for the new source. CI and the laptop differ;
repeat cold-cache deployed measurements are necessary. Lab traces do not
establish field INP or slow-phone physical-device performance.

The project LCP is the opening photograph, already eager, high-priority and
preloaded with a matching responsive candidate. A sampled report requests
1080px artwork (~104kB) for the phone rail. Adjacent low-priority pictures and
three speculative HTML pages also transfer during the first-load phase. The
large document/inline font and photograph affect simulated slow-network LCP;
the captured actual trace has about 346ms TTFB and 250ms image download. The
Lighthouse simulated total is not the sum of those unthrottled trace parts.

The baseline social rail contributes a repeatable 0.00814 layout-shift entry:
its box moves 178 px while a compensating child transform makes lettering look
stationary. This is recorded by the Layout Instability API even though the
visible words barely move. The center remains pinned in pixels in the fix and
the child's centering transform remains, removing that structural displacement
while retaining height-only toolbar stability and rotation handling.

## Implemented, pending deployed measurement

- Production-only Function routing removes the preview guard/extra asset fetch
  from normal static page and resource requests. Public noindex and protected
  draft previews retain full coverage.
- Automatic project-index warming is coordinated with the opening image;
  queued work waits for the previous markup/photo warm to settle rather than
  starting another request every 300 ms. Intentional hover/focus remains immediate;
  speculative offscreen images use low priority. Actual visible photos and
  their native progressive/no-JavaScript delivery remain present.
- Social-rail pinning retains its centering transform, with a regression for
  structural displacement after a deliberately delayed script.
- Source/build metadata allows deployed measurements to identify the tested
  commit, rather than assuming an old preview contains current code.

Image derivation, q82 source requests, authored crops, photo ratios, tablet
density and phone/desktop card sizes are preserved. CDN derivative warming is
already best effort and negotiates modern formats; it is not a substitute for
a cold-cache measurement.

The pre-existing opening-image guards for rail warming and onward-page
prefetch remain intact; they are baseline behavior, not newly credited fixes.
Intentional presses and hover/focus warming remain responsive.

Claude's diagnostic local variants deferred other photographs and externalized
the inline font. They improved some project runs but remained above 2s and could
damage progressive delivery or create another font round trip. They were not
adopted wholesale. Local results made during parallel agent work are diagnostic,
never a production performance pass.

## Remaining verification

After authorization to publish the audit branch, use its immutable Cloudflare
preview and recorded source SHA. Run the unchanged deployed gate with 3–5 cold
runs per route; retain report/trace/devtools artifacts, compare medians and
maximum CLS, and investigate any miss rather than relax thresholds. Measure
other representative pages and repeat visits separately. CI runs all three
browser engines on Linux, including the locally blocked Firefox.

If the project remains above 2 s, continue from the trace and network waterfall.
Do not remove real content, withhold the LCP, weaken photography, bypass the
gate or describe an unmeasured improvement as meeting the target. Field INP
requires real-user evidence that this site currently does not collect.
