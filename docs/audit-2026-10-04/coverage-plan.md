# Whole-site audit — baseline and coverage plan

4 October 2026 · audit branch `claude/whole-site-audit` · isolated worktree

## Baseline

| Item | Value |
| --- | --- |
| Audited source | `origin/main` = `6b2002fd352d9bf044954f40a507fd7c5c741b57` (merge of PR #43) |
| Deployed build | `https://btl-website-3wo.pages.dev/` — byte-identical to a local production build of that SHA on every page, script, sitemap and robots file, except `/contact/`, which differs only by the production enquiry key. Production is therefore current `main`. `build-status.json` carries no source SHA, so identity was established by comparison. |
| Content | Published Sanity dataset `production` (173 published documents: 6 projects, 12 people, 2 publications, 4 locations, 3 categories, 2 Mux films, settings). 0 drafts were read. |
| Build mode | `SANITY_PREVIEW=false`, no `CF_PAGES*`, no enquiry key locally (local form reports "unavailable"). 24 pages, 28 redirect rules, budgets within limits (largest page 53.3/60 kB gzipped; JS 17.5/20 kB). |
| Toolchain | macOS 27.0.1, Node 26.10.0, npm 11.19.1, Playwright 1.63 (Chromium 1243, WebKit 2359, Firefox 1543), Google Chrome (real), Safari 27 (automation disabled; not enabled by the audit). No Xcode/iOS Simulator, no physical phones or tablets, no Firefox/Edge desktop apps. |
| CI at baseline | `main` run 37175037668 failed: deployed mobile performance (Home LCP 2377 ms, CLS 0.0173; Nelly House 2624 ms) and `npm audit --audit-level=high` in both packages. Browser suite passed in CI. No branch protection; Cloudflare deploys `main` independently of Actions. |
| Starting failures (local) | Web unit 37/37 pass. Studio unit 10/10 pass; `tsc --noEmit` clean. `npm audit`: web 1 high (`http-cache-semantics` 4.2.0 via Astro; 4.3.0 published 2026-10-04), studio 10 high (`braces` ≤3.0.3 via Sanity CLI tooling; no patched release). |
| Production performance (quiet machine, 5 cold mobile Lighthouse runs) | Home median LCP 1139 ms, CLS 0.0086 (`nav.srail`); Nelly House 2649 ms (fails < 2000 ms), Lighthouse TTFB ≈ 315 ms; Contact 943 ms. |
| Inaccessible | Cloudflare and GitHub settings (read-only API only), Sanity management, hosted Studio sign-in, Web3Forms account, Google Workspace, DNS management, physical devices, screen readers driven by a person. No secret was read or printed; the audit worktree holds only the public project ID and dataset. |

Local harness change made first: `TEST_PORT` selects the browser-test server port and copy
directory, so isolated runs no longer collide on 8788.

## Route inventory (24 generated pages)

| Family | Routes | Notes |
| --- | --- | --- |
| Home | `/` | opening film, statement, selected work strips, people, studio, press, contact |
| Projects | `/projects/`, 6 project pages | strips/cards, rails, viewer, prev/next |
| Project filters | `/projects/type/{houses,interiors,commercial}/`, `/projects/place/{kozhikode,mysore,manjeri-malappuram,thirunelly-wayanad}/` | generated, unlinked until content justifies them (design memory R16), excluded from sitemap |
| Press | `/press/`, `/press/elle-decor-nelly-house/`, `/press/architectural-digest-nelly-house/` | artwork grid, reader overlay, direct article routes |
| People | `/people/` | profiles flag off; 12 legacy profile URLs 302 to `/people/` |
| Studio, Contact, Privacy | `/studio/`, `/contact/`, `/contact/thanks/`, `/privacy/` | copy controls, enquiry form (Web3Forms from the browser) |
| Errors | `/404.html` (served for unknown paths) | |
| Machine | `robots.txt`, `sitemap-index.xml`, `build-status.json`, `_headers`, `_redirects`, `_routes.json`, `functions/_middleware.js` | preview authentication and noindex |

## Specialist assignments (wave 1, audit only)

| Agent | Scope | Port |
| --- | --- | --- |
| ARCH | Runtime JS (site.js, press-reader.js, enquiry.js), Astro components, lib, server, build tools: state, races, cleanup, history/bfcache, progressive enhancement | 8801 |
| SEC | Dependencies, advisories (primary sources), lockfiles, CI/actions, headers/CSP, middleware and `_routes.json`, preview isolation, Web3Forms contract, privacy copy, domain/mail readiness, operations | 8802 |
| PERF | Deployed traces, LCP sub-parts, TTFB/edge, images, fonts, caching, prefetch, interaction latency, bfcache; only agent running Lighthouse | 8803 |
| VIS | Visual system and responsive composition: width/height/DPR/pointer matrix, overflow/overlap/clipping/blur, zoom/text size, synthetic growth, motion frames | 8804 |
| IX | Every control and journey: navigation, strips/cards, viewer gestures, Press reader, copy, mocked enquiry paths, film, history/bfcache, cross-feature residue | 8805 |
| A11Y | axe on routes and overlay/form states, keyboard, AX tree semantics, contrast over photos, forced colours, reduced motion, reflow, text spacing, target size, gesture alternatives | 8806 |
| CMS | Studio schemas/validation/actions, build invariants, published content integrity, SEO/canonical/sitemap/structured data/redirects/link integrity, editorial docs | 8807 |

Wave 2 implements verified fixes with one owner per shared file (site.js, components.css,
tokens.css, build tools, lockfiles, CI), then an independent reviewer re-audits integrated
fixes and cross-feature boundaries.

## Responsive and input sampling

Widths 320, 360, 375, 390, 430, 667 (landscape), 767/768, 820, 1024, 1180, 1366/1367, 1440,
1600, 1920, 2560, plus both sides of every CSS/JS breakpoint found in source. Heights varied
independently (short landscape, tall portrait, narrow desktop window, wide monitor). Inputs:
touch without hover, fine pointer with hover, keyboard only, and mixed (tablet width with a
fine pointer; large touch tablet). Engines: Chromium (full matrix), WebKit and Firefox
(representative subset), real Chrome (subset). Emulation is labelled as such throughout;
it does not stand in for iOS Safari, iPadOS or Firefox for Android on physical hardware.
