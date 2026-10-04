# Runtime remediation — resumed whole-site audit

Baseline: `6b2002fd352d9bf044954f40a507fd7c5c741b57` on `claude/whole-site-audit`.
Implementation is uncommitted pending lead integration; the integrated production build passed on 2026-10-04. Evidence is under
`.audit-work/evidence/RESUME-RUNTIME/`. No CMS writes, real enquiries, deploys,
account changes, dependency waivers or photo-quality/sizing changes were made.

## Dispositions and implementation

| Finding | Disposition | Change |
| --- | --- | --- |
| ARCH-01 | Confirmed; fixed and verified in focused Chromium/WebKit regressions | Closing cards retain a callable cleanup. Reopening executes that cleanup before injecting fresh frames/note, removing stale close transform and duplicate content. |
| ARCH-02 | Confirmed in Chromium native-touch emulation; fixed and verified in focused Chromium/WebKit regressions | A shared spent-click guard consumes the compatibility click after touch opens the viewer, as well as after a dark-background dismiss. A new pointerdown releases the guard immediately. |
| ARCH-03 | Confirmed; fixed and verified in focused Chromium/WebKit regressions | Pure closes stop reserving document padding or pinning their position; navigation hides immediately with collapse. Holding remains for simultaneous collapse/expansion of different cards. |
| A11Y-01 | Confirmed; fixed and verified in focused Chromium/WebKit regressions | A focused hardware-keyboard viewer control exposes touch chrome even if a previous finger tap hid it. The viewer now owns all Tab steps and re-entry from BODY, since WebKit can skip native button stops after a photo tap. |
| IX-01 | Confirmed; fixed and verified in final Chromium/WebKit regressions | Menu opening preserves its slide, retries until the Home link itself is visible, and verifies native focus succeeded before canceling; WebKit reduced motion can briefly expose the parent while its link remains hidden. Quick Tab/Escape/close cancels both timer/frame. |
| IX-02 | Confirmed history-stack growth; corrected while preserving project URLs | First open pushes an owned project entry; switching active cards replaces it; explicit close consumes that entry with native Back. Browser Back/Forward still closes/reopens naturally. Non-owned restoration falls back to replacing the index URL rather than pushing another close entry. |
| IX-03 | Confirmed original real-Chrome bfcache evidence; fixed and verified with a real Google Chrome bfcache restore | pagehide closes menu and releases inert/overflow state without restoring focus into the departing document. |
| IX-04 | Accepted shareable-route fallback | A full reload or bfcache eviction at `/projects/<slug>/` serves that actual project page. Keeping this progressive, shareable URL behavior is preferable to substituting Home or an origin index. The misleading initialization comment was clarified; no fake routes were introduced. |
| PERF-01 | Confirmed structural displacement; fixed in source, integrated measurements pending | Pin the social rail's center in pixels and retain the child centering transform. Fixed parent remains untransformed. Height-only resizes stay locked; width/rotation establishes a new center. Transform automatically centers after font/text-size changes, removing the measurement observer and font-ready remeasurement. |
| Resumed visual review: enlarged text/future labels | Confirmed; fixed and verified in final Chromium/WebKit regressions | Contact/pager text, Press credit labels and long principal names wrap within their column. Header uses measured logo/nav space to expose the existing menu when labels no longer fit, with focus transfer and font/size/content observation. Ordinary sizing and navigation remain authored. |
| Speculative network contention | Confirmed ordering gap; fixed and focused test passed | Automatic index warming waits for the first high-priority image load/error and serializes each markup + offscreen-image promise; intentional hover/focus still warms promptly. Warmed image requests are explicitly low priority. Baseline already had separate initialAhead/warmOnward guards, which are preserved and not credited as new changes. |
| Resumed visual review: inline note clipping | Confirmed baseline visual-agent evidence; fixed and verified in focused Chromium/WebKit regressions | Standalone inline reading panels use safe bottom alignment, vertical scroll and a keyboard stop; complete text remains reachable on short landscape screens without altering gallery/image heights. |

## Reproduction evidence

`baseline-regressions.log`: Chromium baseline **7 failed, 3 passed**. The failures
reproduce ARCH-01, ARCH-02, IX-01, IX-02 (close and switch), and A11Y-01 at 390/820.
The initial pure-close assertions waited until cleanup and therefore did not
catch the transient hold; they were corrected to inspect immediately.

`baseline-close-cls.log`: corrected pure-close assertions **2 failed, 1 passed**,
confirming `data-holding` persisted during pure close at 1024/1440px. The first
layout-shift observer ignored entries marked recent-input by browser viewport
setup; its regression now checks structural social-rail displacement regardless
of that flag rather than claiming a lab CLS score from a synthetic viewport.

`baseline-rail-shift-cpu4.jsonl`: the original performance-agent probe against an
isolated baseline dist copy at port 8801 recorded **0.00814 NAV.srail displacement
in both runs**, from layout y412 to y234. Both entries have `hadRecentInput=true`
because of emulation startup. This confirms the mechanism, while production
Lighthouse/CrUX claims require separate evidence and belong to the lead.

The visual agent's original note-clipping evidence is in
`.audit-work/evidence/RESUME-VIS/misc/railnote/railnote.json`: 83px hidden at844×390,
37px at1024×600 and43px at1280×593 on Nelly House.

## Verification and limits

Final integrated focused result: **59 passed,5 skipped,0 failed** across
Chromium/WebKit, **55.3s**, in
`.audit-work/evidence/RESUME-RUNTIME/final-combined-focused-regressions.log`.
This is64 cases:52 new targeted cases plus12 unchanged journey checks. Skips are
explicitly limited to native-touch injection/Layout Instability APIs not exposed
by the WebKit harness, including one unchanged compatibility-click test.

The final run verifies reopening cleanup, simple/switching project history,
pure-close layout, animated/reduced-motion menu focus, adaptive navigation focus
handoff, normal single-line contact text at390/820/1440px, enlarged text/no
horizontal overflow, long future principal names, Press credit column wrapping,
complete landscape reading panels plus enlarged/letter-spaced text, native
opening-tap retargeting, keyboard-visible touch viewer controls, social-rail
structural shift removal, first-image warming order and serialized delayed
project requests. Unchanged checks cover nested viewer Escape/Back/Forward,
Tab after project expansion, menu focus cycle, contact centering, social rail
height/rotation stability and withheld compatibility clicks.

Independent source logic evidence in
`.audit-work/evidence/RESUME-PERF/warming-concurrency.json` shows2-second markup
responses plus120ms offscreen image loading start at2/2427/4851ms; maximum
automatic markup concurrency dropped from3 to1. Actual-browser700ms-response
regressions also pass both engines. No INP or Lighthouse score is inferred.

The last complete production-mode build passed24 routes/28 redirects, existing
numeric budgets and492 image warms. `web/tools/budget.mjs` was not changed;
latest gzip budgets are JS18.2/20kB,CSS11.2/40kB,largest page53.7/60kB.
`node --check web/public/scripts/site.js` and owned-source `git diff --check` pass.
The lead owns the full suite, deployed performance measurements and integration. The full330-case Chromium/WebKit suite on8792 is running; its result is not included in this focused report.

The real Google Chrome bfcache check **passed immediately before the final viewer Tab-trap addition**
(`final-bfcache.log`): `pageshow.persisted=true`, `/studio/`, menu closed,
`main.inert=false`, no overflow lock and label Menu. Reusable probe:
`verify-bfcache.mjs`; screenshot: `bfcache-restored-menu-closed.jpg`.

The structural-shift probe, taken immediately before that unrelated Tab-trap addition, (`final-rail-shift-cpu4.jsonl`) recorded zero
NAV.srail layout-shift sources in both CPU4 runs; the baseline had0.00814 each.
The final rail center is412px and its child visual top235px. Font glyph shifts
remain separately observed. Synthetic viewport setup marks entries recent-input,
so these traces verify box displacement removal rather than a production CLS
score; Lighthouse/CrUX measurements remain the lead's work.

Intermediate tests caught two implementation errors before release: a percentage
copy-space reservation prematurely wrapped ordinary tablet/desktop text, and
WebKit reduced motion made the menu's parent visible one frame before its Home
link. The final source bounds copy space by the shared canonical content-edge
variable and verifies target visibility plus actual focus success. Both fixes
have explicit final regressions and unchanged normal layout checks.

All tests use assigned port8801 and only owned processes are stopped.
Local Firefox launch remains blocked by its profile error; Linux CI is required.
Playwright WebKit is not physical iOS Safari, and Chromium touch emulation is not
physical Android/iPad testing. No physical-device pass is asserted. Full reload
or bfcache eviction at a shareable project URL intentionally serves that real
project page (IX-04). No<2-second or production-deployment claim follows from
this focused remediation.

## Independent follow-up before integration

The independent visual matrix subsequently found a WebKit-specific viewer
keyboard gap: tapping the photograph leaves focus onBODY; native Tab can skip
buttons, so the original endpoint-only trap never re-enters the controls.
The source now cycles every rendered/enabled button in both directions and
handles outside focus explicitly. Four unskipped browser cases at390/820px
check photo-tap re-entry, visible chrome, intermediate steps, endpoint wrapping,
reverse cycle and Escape/opener restoration. The fresh combined no-JS fallback/runtime build's64-case focused run passed
**59 cases with5 explicit skips,0 failures,55.3s**. Both new WebKit cases pass,
including re-entry from BODY, intermediate steps and the complete reverse cycle. No Header/base/CSS
changes were made by this agent during the follow-up.
