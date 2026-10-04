# Integrated validation and evidence

4 October 2026. Worktree: `/Users/ousephpaul/Documents/Webapps/btl-website-audit`;
branch: `claude/whole-site-audit`; baseline: `6b2002f`. Final source identity and
suite totals are recorded below after integration. Local results do not imply
release, provider receipt, physical-device behavior or deployed performance.

## Commands and results

| Check | Result |
| --- | --- |
| Web clean install / current dependency audit | `npm ci` succeeds; `npm audit --json` reports zero vulnerabilities. |
| Web unit tests | `npm test`: 61 passed, 0 failed, 0 skipped. |
| Web production build | Content checks, Astro types, build, mode-derived routes, minification, redirects, architecture/byte budgets, site integrity and best-effort image warming pass. |
| Generated content | 24 pages; 28 redirect rules; public CMS check validates 79 figures, 6 projects, 12 people, 2 Press entries and one settings record. No CMS writes. |
| Runtime focused integration | Final mixed-input rerun pending; previous 60-case run: 55 passed, 5 explicit native/API skips. |
| Progressive navigation | Six Chromium/WebKit cases at 390/820/1440 px pending final build; JavaScript disabled, reduced motion. |
| Full browser integration | Pending final source freeze and focused results. |
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
short-landscape fixes preserve those ordinary dimensions.

The final 100-state integration discovered the WebKit touch-to-keyboard focus
gap after 98 passing states. That finding was remediated and independently
rechecked rather than recorded as an audit pass. Final result pending.

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
| `progressive-navigation.log`, `e2e-final.log` | Native fallback and full two-engine suite results. |
| `web-install-resumed.log`, `web-audit-resumed.json`, `studio-audit-resumed.json` | Fresh install/audit dispositions. |
| `routing-smoke-results.json`, `routing-smoke.log`, `routing-smoke.mjs` | Mode-level local HTTP assertions and reproducible harness. |
| `evidence/RESUME-RUNTIME/` | Runtime before/after reproductions, focused results, bfcache, structural CLS. |
| `evidence/RESUME-VIS/` | Responsive matrix, ordinary geometry, enlarged text, focus and contrast evidence. |
| `evidence/RESUME-CMS/` | Public GET validation, fixture defects, Studio types/build/tests and generated crawl. |
| `evidence/RESUME-PERF/`, `perf-baseline/`, `evidence/PERF/` | Independent trace/concurrency review, deployed baseline and local diagnostics. |
| `findings/`, `evidence/{ARCH,IX,A11Y,CMS,SEC,VIS}/` | Claude's original specialist findings and baseline artifacts. |

## Next release steps

1. Obtain explicit permission to push this reviewable branch/open a PR. The
   handoff names this gate because push creates a Cloudflare preview.
2. Verify preview mode, immutable URL and exact clean source SHA; run all three
   Linux browser engines and unchanged deployed performance gates.
3. Continue trace-based remediation if a metric misses. Do not waive the Studio
   advisory, performance budget or check failure to make CI green.
4. Complete relevant physical/owner checks, then request merge/deployment
   authorization separately. No account, CMS, DNS, mail or Studio operation has
   been authorized by preparing this local branch.
