# Production readiness — 3 October 2026

Audited `ad5697e` on the live Pages origin, then prepared fixes on
`codex/production-readiness`. This records evidence and limits; it does not
claim that every operational setting or accessibility criterion is verified.

## Fixes prepared

- Contact email and telephone details use the existing copy mark on desktop
  hover and keyboard focus. Touch appearance and copy behavior are retained.
- Photograph taps activate on completed touch input, without relying solely on
  the compatibility click after a viewer swipe. Movement, cancellation and
  additional fingers cancel activation. Mouse and keyboard keep their click
  path. The compatibility click cannot open an already-open viewer a second
  time. The dark-tap click guard ends on the next press rather than swallowing
  all clicks for 500 ms.
- Responsive width checks wait two animation frames after a viewport change.
  Linux WebKit's failing traces measured immediately after resize and reported
  779 px at 768 px on project indexes. The check still requires document width
  at or below the viewport; it has no added tolerance or retry. Other existing
  responsive checks already wait for that frame.
- Sanity CDN connection setup begins in the document head. Project pages also
  preload the exact responsive first-image candidate before the embedded font
  and stylesheet. A request-count regression check guards against downloading
  an unused fallback. Automatic rail
  warming and onward-page prefetch wait for the opening high-priority image.
  Neighbor images warmed by JavaScript have low fetch priority; scrolling and
  deliberate link presses remain immediate. Image widths, quality 82, crops,
  font and layout are unchanged.
- Browser fixtures and script-free checks use the configured local test URL,
  allowing an isolated run without reaching a different checkout on port 8788.
- CI continues to measure deployed performance and run dependency audits after
  unrelated browser failures. Failures still fail the job. Previously a viewer
  or width failure skipped both checks, hiding other evidence.

The recurring Linux CI viewer failure is documented in
[run 37133313099](https://github.com/btl-architects/btl-website/actions/runs/37133313099).
It successfully dismissed the viewer, tapped the first figure at (115.5, 675.42),
and then remained closed. Local baseline runs, including an 8x CPU slowdown,
passed. The repaired path subsequently passed the complete Linux browser suite.

## Published-content correction

The portrait descriptions for Yadukrishnan, Nijas C K and Safa Mariyam A were
corrected in Sanity with revision guards and a private backup. Only `portrait.alt`
changed. Names, portraits, roles, biographies and slugs were preserved. The
normal publish webhook rebuilt the website; all three descriptions were then
verified on the live People page. Individual people profiles remain off.

## Current evidence

| Area | Result and practical limit |
| --- | --- |
| Public routes and responsive layout | All 15 navigation-linked routes inspected live at 390, 768 and 1440 px: no page overflow or broken loaded images. Build checks cover all 24 generated pages, including filters and 404. |
| Menus, Press and photograph viewer | Live menu navigation, Press reader opening, photograph navigation and close verified. Automated regression checks additionally cover keyboard, gestures, focus and scroll restoration. Prior viewer and width failures passed in the full Linux run recorded below. |
| Client content | All six published projects have descriptions. Client writing retained. Project years are optional and unsupplied; no dates invented. Press readers are attributed summaries with original-source links. |
| Search and sharing | SEO PR #35 merged and deployed. Canonicals, titles, descriptions, structured data, robots and sitemap checked. Platform-homepage social links are excluded from business `sameAs`. |
| Sanity access and publishing | Client sign-in and publishing verified by explicit owner report. The portrait repair independently verified the automatic rebuild. New optional SEO editor controls require a separate Studio release; working publishing does not establish that those controls are deployed. |
| Contact form | Production access key is present. Required fields, validation, honeypot, accessible status and simulated success/failure handling checked. No real message sent; actual inbox delivery is explicitly deferred. The recipient is configured in Web3Forms, not by Sanity's fallback address. |
| Accessibility | Route-level axe checks and keyboard regressions included. The owner previously retained the opening film without a pause control, so WCAG 2.2.2 remains an accepted exception and full AA conformance is not claimed. |
| Delivery and assets | Build metadata, internal links, redirects, headers, image warming and unchanged byte budgets pass. Profiles remain off. |
| Dependency security | Two upstream advisories remain unresolved; scope and next action below. The audits remain visible and failing. |
| Release process | Cloudflare can deploy `main` independently of Actions. Main branch protection was absent when inspected. Passing tests must be reviewed before merging; this PR does not change hosting settings or branch protection. |
| Operational recovery | Existing editing/deployment guides retained. Account backup retention, restore drills and external monitoring are not established by repository tests. |

## Mobile performance

Fresh-cache mobile Lighthouse against the live Pages origin before these fixes:

| Page | Performance | LCP | Maximum CLS |
| --- | --- | --- | --- |
| Home (one run) | 100 | 1141 ms | 0.000408 |
| Nelly House (three-run median) | 96 | 2696 ms | 0.000354 |
| Contact (one run) | 100 | 969 ms | 0.000287 |

Nelly's three LCP runs were 2696, 3395 and 2641 ms. Its first rail photograph
was the LCP element. The launch gate remains median LCP under 2000 ms,
performance at least 95 and maximum CLS under 0.02, over three cold-cache
runs on the immutable deployed preview. A local build is not a performance pass.

## Upstream dependency blockers

Registry and advisory status were checked on 3 October 2026. Both installed
packages are the latest published versions and both advisories list no patched
release:

- [braces, GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm):
  `3.0.3`, through Sanity's CLI/codegen, chokidar 3 and globby/fast-glob/micromatch.
  Deeply nested brace patterns can exhaust the Node call stack. Sanity 6.17.0
  and codegen 8.1.1 still declare these dependencies. The site does not accept
  visitor glob patterns, and this CLI path is not shipped as a Pages function.
  That bounds the assessed exposure, but does not patch the dependency.
  [Upstream PR #72](https://github.com/micromatch/braces/pull/72) remains unmerged.
- [http-cache-semantics, GHSA-ch52-4w7c-c8xp](https://github.com/advisories/GHSA-ch52-4w7c-c8xp):
  `4.2.0`, through Astro 7.3.5. The vulnerable cross-user `max-stale` cache
  behavior is not an application request cache in this static website. Astro's
  use is its build-time remote-image cache; this site's Figure pipeline renders
  Sanity URLs directly. No Astro server adapter or remote-image API is deployed.
  The installed dependency nevertheless remains affected.

`npm audit fix --force` proposes downgrades to Sanity 5.7.0 and Astro 2.10.9.
They are not supported fixes for this implementation. Chokidar/globby major
version overrides change Sanity's glob/watch and module contracts; an unmerged
third-party security patch is not a maintained release. No forced downgrade,
package alias, audit suppression or claim of a clean security audit was added.

Next action: adopt a reviewed patched release or upstream dependency removal,
then rerun `npm ci`, the builds, Studio type checking, regression tests and audits.
Until then, a fully green security gate cannot honestly be delivered through
supported upgrades. No account/settings mutation or audit waiver is implied.

## Accepted deferred work

Domain connection, unsupplied photographer names, official LinkedIn/YouTube
URLs, and real enquiry inbox delivery are deferred by the owner. No placeholder
names, fabricated verification, test email or unrelated CMS content was added.

## First fixes preview

Immutable preview `https://d92608d3.btl-website-3wo.pages.dev` (`dfbad3d`):
three cold mobile runs per page gave median LCP 1365 ms (Home), 2603 ms
(Nelly House), and 934 ms (Contact), median performance 100 / 97 / 100.
Nelly's runs were 2603 / 2642 / 2584 ms. This was an improvement, but still
failed the unchanged 2000 ms target. A subsequent revision adds the first-image
preload. Its final measurements below still miss the performance target; the
browser failures are resolved.

Local validation so far: 37 web unit tests; 10 Studio unit tests, type checking
and build; web build, 24-page checks and byte budgets; 58 focused Chrome/Safari
checks (2 intentional skips); 2 native-touch regressions; all 12 corrected
fixture/script-free checks; 4 responsive-preload request-count checks. The first
full isolated browser run passed 180 checks and exposed 12 hard-coded-port
fixture failures, which then all passed after correction.

## Verified release

The owner explicitly approved release after the remaining performance and
security limits were disclosed. [PR #38](https://github.com/btl-architects/btl-website/pull/38)
merged as `5f4b023029e9385166571d18c1d1ab6e2abd6499`. Its runtime source is
identical to tested code commit `3a1a65f81559559ba30c24715d4b147356e561a8`.
Cloudflare reported a successful production deployment. Live checks confirmed
the desktop copy-mark styling, opening-image preconnect/preload, viewer open /
next / close, all three corrected portrait descriptions, and zero individual
profile links. The production enquiry key is present; no message was sent.

Final local Chrome/Safari suite: **196 passed, 8 intentional skips**.
[Linux CI run 37136454617](https://github.com/btl-architects/btl-website/actions/runs/37136454617):
**291 browser checks passed, 15 intentional skips, no failed or flaky browser
checks**, across Chromium, WebKit and Firefox. This includes the recurring
viewer and Safari width failures and the Press external-tab check. Both builds,
37 web unit tests, 10 Studio unit tests and Studio type checking passed.

Three cold mobile runs against the same live production origin immediately
before and after release:

| Page | Before median LCP | Released median LCP | Released performance | Maximum CLS |
| --- | --- | --- | --- | --- |
| Home | 1230 ms | 1146 ms | 100 | 0.000408 |
| Nelly House | 2593 ms | 2614 ms | 97 | 0.000354 |
| Contact | 958 ms | 955 ms | 100 | 0.000287 |

Released LCP samples: Home 1192 / 1141 / 1146 ms; Nelly 2614 / 2602 /
2658 ms; Contact 1540 / 955 / 938 ms. These are lab samples, not field
measurements. Nelly has **not** measurably improved and still misses the target.

The CI machine's separate three-run preview medians were Home **2311 ms**,
Nelly **2494 ms**, Contact **982 ms** (performance 98 / 98 / 100; maximum CLS
0.009190 / 0.000004 / 0). Thus Home and Nelly both miss the 2000 ms CI target.
The earlier follow-up already recorded a 2321 ms Home CI median; the new result
is not a demonstrated Home regression. Laptop measurements do not override CI.

The browser step is green, but the overall workflow remains **failing** on
performance and the two unresolved upstream audits. No assertion, target, audit
or branch policy was bypassed or relaxed to report a pass. The website is
released with these recorded limits; full production clearance is not claimed.
Studio deployment, domain changes and real enquiry delivery were not performed.
