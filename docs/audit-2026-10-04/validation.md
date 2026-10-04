# Integrated validation and evidence

4 October 2026. Worktree: `/Users/ousephpaul/Documents/Webapps/btl-website-audit`;
branch: `claude/whole-site-audit`; audit baseline: `6b2002f`; Codex continuation:
`2316d24` plus the scoped REV-01 correction. Final source identity and suite
totals are recorded below after integration. Local results do not imply
release, provider receipt, physical-device behavior or deployed performance.

## Commands and results

| Check | Result |
| --- | --- |
| Web clean install / current dependency audit | `npm ci` succeeds; `npm audit --json` reports zero vulnerabilities. |
| Web unit tests | `npm test`: 61 passed, 0 failed, 0 skipped. |
| Web production build | Content checks, Astro types, build, mode-derived routes, minification, redirects, architecture/byte budgets, site integrity and best-effort image warming pass. |
| Generated content | 24 pages; 28 redirect rules; public CMS check validates 79 figures, 6 projects, 12 people, 2 Press entries and one settings record. No CMS writes. |
| Runtime focused integration | Earlier viewer/menu integration: 59 passed, 5 explicit native/API skips across 64 cases. Current close/swipe/history/page-end subset: 11 passed, 1 native-CDP WebKit skip, 0 failures. |
| Progressive navigation | Six Chromium/WebKit cases at 390/820/1440 px are part of the final suite; JavaScript disabled, reduced motion. |
| Full browser integration | `TEST_PORT=8792 npx playwright test --project=chromium --project=webkit`: 325 passed, 19 explicit feature/API skips, 0 failures across 344 cases (6.8 min). Source correction `966a6ea`; original phone close assertions restored. |
| Studio clean install, tests, types, build | `npm ci`, 12 tests, `tsc --noEmit` and build pass. |
| Studio dependency audit | Fails: 10 high transitive entries rooted in the unpatched `braces` advisory. No suppression. |
| Synthetic mode HTTP smoke | 22 assertions pass: production static assets/routes, public noindex previews, draft unauthorized/authorized paths and fail-closed malformed marker. Uses synthetic credentials/content only. |
| Real Chrome bfcache | Restored page has `persisted=true`, closed menu, no inert background/scroll lock. |
| Structural social-rail CLS probe | Two CPU4 Chrome runs record no `NAV.srail` entries; baseline had 0.00814 per run. This is a local structural probe, not revised deployed CLS. |
| Firefox local launch | Fails before loading the site; explicit fresh-profile retry also fails. Linux CI remains required. |

No test used a real enquiry provider submission or authenticated CMS operation.
Browser provider requests are intercepted. Tests use copied generated output
with only loopback-incompatible HSTS and CSP upgrade directives removed; real
production output keeps both. Reader demonstration fixtures exist only in the
test copy, never in the deployable build.

The 19 skips cover unpublished biographies, Chromium-only native touch/clipboard
injection and the Layout Instability API; they are not product passes. The phone
close test has no `fixme`. Its first full run timed out in a frame sampler;
explicitly foregrounding the test page preserves its original timeout, sample
count and position thresholds. Twelve repeated phone/desktop cases pass, and
the complete rerun above passes. The first run and trace remain in ignored
`codex-e2e-first.log` and `evidence/REVIEW/codex-close-timeout/`.

Fresh complete build budgets: largest page 53.8/60 kB, CSS 11.3/40 kB, JS
18.5/20 kB, fonts 45.2/50 kB and two eager images against a maximum of three.
All architecture and numeric limits remain unchanged. Final fresh warming
completed 492/492 derivatives; it is best effort, not cold-cache performance.

## Independent review

The original visual matrix covers all 24 routes: 816 Chromium states completed
(16 server-interrupted states were rerun) and 96 WebKit route/width checks.
Separate enlargement/spacing, synthetic content, motion-frame and additional
accessibility checks are detailed in the independent report. Six forced-color
axe contrast alerts were investigated with computed colors/screenshots and
pixel evidence: rendered black on white is 21:1, while the tool used the authored
gray. They are documented tool false positives; no axe rule was disabled.

Ordinary contact details were independently checked at phone/tablet/desktop
widths and retain a single glyph line. Approved Press frames remain approximately
162.48/256/416 px at 390/820/1440 px; project previews approximately
185.67/147.59/242 px in the corresponding sampled states. Enlarged-text and
short-landscape fixes preserve those ordinary dimensions. These earlier samples
describe phone/touch-tablet/desktop compositions, not a width-only invariant:
current tablet styling also requires a coarse pointer. Narrow mouse windows
retain responsive desktop sizing (Press approximately 337/361 px at 768/820 px,
reaching 416 px from about 1024 px). The final suite checks both input types.

The independent 100-state integration discovered the WebKit touch-to-keyboard focus
gap after 98 passing states. That finding was remediated and independently
rechecked rather than recorded as an audit pass. Four explicit phone/tablet
re-entry regressions now pass both engines. These partial matrix runs are not
misrepresented as a completed rerun of every state on final source. Claude's
later independent review is preserved in `.audit-work/evidence/REVIEW/review.md`;
its remaining phone finding is resolved by the Codex continuation.

## Measurement limits

The formal speed baseline is deployed HTTPS, five quiet cold mobile Lighthouse
runs each on Home, Nelly House and Contact. Medians are 1139/2649/943 ms.
Current-source local probes cannot establish an under-two-second result. Do
not run Lighthouse concurrently with browser workers. Keep current gates and
run three or five cold deployed repetitions after exact source verification.

No-JavaScript route regressions explicitly use reduced motion: Chromium
automation's action polling retained the outgoing execution context during a
cross-document transition and could not finish the next locator action. Native
link/keyboard functionality is checked separately; ordinary enhanced motion
has its own tests. Native transition behavior with scripting disabled remains
a physical-browser check, not a falsely reported pass or a production CSS change.

Physical Android Firefox toolbar animation, iPad/iPhone gestures, older/slow
hardware, real-user INP, person-operated screen readers, authenticated editor
workflow, inbox receipt/quotas, operational backups and permission/privacy facts
remain outside the available automated environment.

## Local evidence index

| Location under `.audit-work/` | Contents |
| --- | --- |
| `integrated-build.log`, `web-unit-final.log` | Integrated build and unit evidence. |
| `codex-web-validation.log`, `codex-studio-validation.log` | Fresh complete installs, tests, types/build checks after `2316d24`. |
| `codex-close-regression.log`, `codex-e2e-final.log` | Restored original scroll assertions, no-height-hold checks and final full two-engine run. |
| `codex-close-repeats.log`, `codex-e2e-first.log`, `codex-source-fingerprints.json` | 12 repeated strict cases, retained timeout diagnostic and exact tested source hashes. |
| `codex-{web,studio}-audit.json`, `evidence/REVIEW/phone-close-codex.{mjs,jsonl}` | Fresh dependency dispositions and controlled native-anchoring diagnosis. |
| `progressive-navigation.log`, `e2e-final.log` | Native fallback and full two-engine suite results. |
| `web-install-resumed.log`, `web-audit-resumed.json`, `studio-audit-resumed.json` | Fresh install/audit dispositions. |
| `routing-smoke-results.json`, `routing-smoke.log`, `routing-smoke.mjs` | Mode-level local HTTP assertions and reproducible harness. |
| `evidence/RESUME-RUNTIME/` | Runtime before/after reproductions, focused results, bfcache, structural CLS. |
| `evidence/RESUME-VIS/` | Responsive matrix, ordinary geometry, enlarged text, focus and contrast evidence. |
| `evidence/RESUME-CMS/` | Public GET validation, fixture defects, Studio types/build/tests and generated crawl. |
| `evidence/RESUME-PERF/`, `perf-baseline/`, `evidence/PERF/` | Independent trace/concurrency review, deployed baseline and local diagnostics. |
| `findings/`, `evidence/{ARCH,IX,A11Y,CMS,SEC,VIS}/` | Claude's original specialist findings and baseline artifacts. |

## Next release steps

1. Push the corrected branch and open the PR authorized in the latest owner
   handoff. This creates a Cloudflare preview; it does not authorize merging.
2. Verify preview mode, immutable URL and exact clean source SHA; run all three
   Linux browser engines and unchanged deployed performance gates.
3. Continue trace-based remediation if a metric misses. Do not waive the Studio
   advisory, performance budget or check failure to make CI green.
4. Complete relevant physical/owner checks, then request merge/deployment
   authorization separately. No account, CMS, DNS, mail or Studio operation has
   been authorized by preparing this local branch.
