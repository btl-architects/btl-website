# Production hardening — 2 October 2026

This pass starts from main commit `8def530c524d6bb5e3fe50a9368029b9e9424956`.
The requested “thin project pages” are the Press readers, not the architectural
project galleries. Captions sit beneath the photograph within the complete artwork, using its
Sanity hotspot as the centre. The complete artwork and logo remain visible.
The film keeps its existing control-free behavior by explicit user instruction.
Instagram is updated to the supplied profile; LinkedIn and YouTube stay present.

## Prioritized findings and fixes

| Severity | Location | Finding and consequence | Applied fix |
| --- | --- | --- | --- |
| High, conditional | `netlify.toml`, `web/server/build-mode.js` | Netlify requested draft content without running the Cloudflare authentication middleware. Adding its missing token would have produced unprotected drafts. | Netlify previews read published content; draft mode refuses Netlify. Cloudflare draft previews retain password protection and fail closed. |
| High | `studio/migrate.mjs` | The README called re-import safe, although `createOrReplace` could erase subsequent client edits. | Refuse a populated dataset by default; explicit recovery flag and backup instructions. No migration was run. |
| Medium | `web/server/build-mode.js` | A Netlify branch build could include the live enquiry key. | Strip it in every non-production Netlify context as well as Cloudflare branches and draft builds. |
| Medium | `web/src/layouts/Base.astro`, robots, sitemap, build marker | Published branch previews were still indexable. | Separate draft visibility from indexing; branch previews emit noindex metadata, disallow crawling, have an empty sitemap and get a Pages noindex response header. |
| Medium | `web/astro.config.mjs` | Canonicals and sitemap pointed to a hostname without a working website address. | Use the working Pages hostname; an HTTPS-origin-only `SITE_URL` switches every metadata URL together after custom-domain setup. |
| Medium | `web/public/scripts/site.js` | The main CI trace attributed about 72ms to a reveal sweep repeatedly writing styles and reading geometry. | Measure all pending elements before applying classes. Preserve the statement’s separate scroll-triggered fade. |
| Medium | `web/tools/inline-home-styles.mjs` | Home waits on a separate stylesheet before first paint; the repeated CI Home LCP was 2116ms against a 2000ms budget. | Embed Astro’s generated stylesheet in Home’s HTML, preserving one authored cascade. Other routes retain the shared cacheable file. No deferred-style flash or JavaScript dependency. |
| Medium | Opening film player setup | Every clip constructed a media element during initial HTML parsing, including unplayed clips. Home CI still scored 81 with LCP 1948ms and CLS 0 after the render-delay fixes. | Keep players in inert templates and create them only when a clip plays or its delayed preload is needed. Verify actual playback, automatic pausing and still-only modes. |
| Medium | `MediaStage.astro`, `ResponsiveFigure.astro`, styles | Initial phone stills used landscape framing until JavaScript ran, then fetched/switched to portrait; without scripts the phone still stayed landscape. | Browser-selected responsive picture through the existing Figure/CDN pipeline. The matching still remains until video playback; failed playback leaves a still. No film controls were added. |
| Medium | `studio/schemas/articleContent.ts`, publication schema, reader components | Existing features were headline-plus-cover previews. | Intro, separate hero, body headings/paragraphs, nested ordered/unordered lists, figures, captions, pull quotes, credits and a BTL publication date, using one static reader renderer. All three opening modes retain one panel and native page fallback. |
| Medium | `studio/scripts/seed-press-readers.ts` | AD and ELLE had no authored reader body. | Prepare original, labelled BTL project notes with existing photos, captions and verified project credits. Applied original BTL notes with standard Portable Text quotes compatible with the previous renderer, after backing up touched documents and guarding every revision. Unrelated drafts were preserved. |
| Medium | `web/tools/content-check.mjs`, `web/server/article-validation.js` | API imports bypass Studio validation; article heroes, Studio photos, movie stills and malformed rich text were not covered. | Validate these before rendering. Reject malformed spans, unsupported blocks, unsafe links and invalid list depth; retain normal empty states. |
| Medium | settings/publication schemas, `web/src/lib/content.ts` | Unsafe social URLs or malformed navigation keys could be introduced via editing/API imports. | Require valid public web addresses, disallow URL credentials, constrain internal page keys and safely filter invalid links at the data boundary. |
| Low | `web/src/styles/components.css` | Card metadata was left aligned with an unnecessary gap. | Use the image hotspot to centre captions beneath the photograph within the uploaded canvas. Complete artwork remains uncropped. Set both current artwork hotspots to the visually verified photograph centre; long captions are checked at 320, 375, 768 and 1440px. |
| Medium | Press reader mobile toolbar and spacing | The toolbar wrapped into three rows on a phone, reducing the reading area. | One compact row with publication name, original link and Close, each control at least 44px. Safe-area padding and tighter mobile editorial spacing. |
| Low | package manifests/lockfiles | Astro was two patches behind; client/editor/tooling updates and obsolete image-url imports were outstanding. | Upgrade compatible dependencies; fix image-url 2 public exports/named builder. Fresh npm installs and zero-advisory audits pass. |
| Low | `.github/workflows/checks.yml` | Actions were on old major versions and mutable tags. | Update official actions to current verified releases, pin commit SHAs and retain existing least-privilege permissions. |
| Low | `.gitignore` | An unanchored `projects/` rule also matched new source routes. | Ignore only the repository’s original-media folder, keeping new project source files trackable. |
| Low | `web/src/lib/content.ts`, `media.ts`, unused manifests/styles | Untyped query rows, obsolete logo state, prototype media maps containing machine-specific paths and empty legacy CSS blocks. | Typed query projections, tighter settings projections, remove obsolete logo state, remove unused maps and legacy empty styles. |
| Low | README, Studio README, env examples, deploying/editing guides | Setup still instructed creation of a new Sanity project; contact relay/recipient instructions and re-import claims were stale. | Document the existing project, correct browser-to-Web3Forms delivery, preview security, content workflow, guarded imports and separate website/Studio deployment. |

## Dependencies and compatibility

| Package | Before | After |
| --- | --- | --- |
| Astro | 7.3.3 | 7.3.5 |
| Sanity client, both packages | 8.6.2 | 8.9.0 |
| Sanity image URL | 1.2.0 | 2.1.1 |
| Astro check | 0.9.5 | 0.9.10 |
| Sanity Studio | 6.15.0 | 6.17.0 |
| Sanity UI | 4.2.1 | 4.3.0 |
| React / React DOM | 19.2.8 | 19.3.0 |
| TypeScript | 5.9.3 | 6.0.3 |
| Node types | 24.13.6 | 26.6.4 |
| Wrangler | 4.135.0 | 4.147.0 |

Node 26 is consistent across local setup, CI and hosting; both packages declare
it. Runtime packages are pinned and lockfiles are committed. Fresh `npm ci`
succeeded in both packages. Both initial and updated audits found **zero**
known advisories at all severities. Updating did not repair a known vulnerability.
Direct dependency trees have no invalid or unmet peers. Different nested tools
may legitimately carry separate dependency versions; no forced global dedupe
was used to override their compatibility constraints.

TypeScript 7.0.2 is deliberately deferred: Astro check currently declares
TypeScript 5/6 peer support. 6.0.3 is the latest compatible version. image-url 2
moves type exports to the public package root and uses a named image builder;
these breaking changes are handled. See [image-url releases](https://github.com/sanity-io/image-url/releases),
[Sanity upgrade guidance](https://www.sanity.io/docs/studio/upgrade) and official
[action releases](https://github.com/actions/checkout/releases).

## Coverage and evidence

- Strict Astro and Studio type checks, unit tests and production builds.
- Unit coverage of reader rendering, nested lists, unsafe links, complete artwork,
  crop dimensions, publishing lifecycle, redirects, ordering and preview security.
- Full route accessibility/overflow checks at 320, 375, 768 and 1440px; keyboard
  menu, galleries, photograph zoom, Back/Forward and scroll/focus restoration.
- Press reader modes, publisher framing refusal, failure/cancellation, no-script
  reading, reduced motion, captions with long names and narrow dialog layout.
- Team/founders separation, three-card desktop rows, enquiry recovery and no
  preview delivery. Enquiry requests are intercepted; no real test mail is sent.
- Build integrity verifies one h1 per standalone page, image alternatives,
  canonical/sitemap policy, internal links/anchors, JSON-LD, redirect graphs,
  byte budgets, CSS token rules and production HTTPS headers.
- Static generation remains: no frontend framework hydration, no visitor Sanity
  requests, no new initial third-party scripts. Cached bulk queries avoid N+1
  requests; project photo rails fetch their static page only when opened.
- One variable Satoshi font is preloaded with swap behavior. Responsive image
  ladders honor CMS crops and intrinsic sizes; complete artwork keeps its frame.
- A tracked-file scan found no credential-token patterns or committed private
  env files. Studio bundles only the public project/dataset identifiers.
- Existing dataset backups and photographic screenshot evidence stay ignored.

Local browser testing initially passed Chromium/WebKit (91 tests, one platform
skip); local Firefox could not launch its temporary profile on this Mac.
GitHub’s Linux run passed 136 browser tests across Chromium, WebKit and Firefox,
with two platform-specific skips. It also passed 20 website and eight Studio unit
tests, both type checks and production builds. The initial CI performance runs
missed the Home launch target (79 / 2076ms and 99 / 2116ms respectively); the release remains gated on that check.

Both Cloudflare and Netlify previews were verified to return noindex metadata
and response headers, disallow crawling, publish an empty sitemap and omit the
live enquiry key. The updated Studio editor was deployed successfully.

## Performance

Mobile Lighthouse uses the existing default simulated throttling and unchanged
launch targets: score at least 95, LCP below 2000ms, CLS below 0.02. Reports retain
trace evidence. These are lab measurements; no real-user INP is claimed.

| Route | Local before score / LCP / CLS / TBT | Final local after score / LCP / CLS / TBT |
| --- | --- | --- |
| Home | 100 / 1750ms / 0 / 0ms | 100 / 1586ms / 0 / 0ms |
| Nelly House | 100 / 1515ms / 0 / 0ms | 100 / 1514ms / 0 / 0ms |
| Contact | 100 / 1517ms / 0 / 0ms | 100 / 1515ms / 0 / 0ms |

The final local run meets the budget and retains a score of 100 on every route;
these small differences do **not** establish a meaningful speed improvement. An
intermediate Home run was 96 / 1993ms / 0 / 210ms, illustrating lab variability. The old main CI run scored Home 69, LCP 2318ms, CLS 0 and TBT 1370ms;
its Nelly House and Contact results were both 100. CI and laptop scores must not
be compared as a before/after improvement. Final CI measurements will be compared
with the old CI environment separately. The revised local trace reports no
forced-reflow attribution for the reveal sweep.

Build byte budgets remain unchanged. Current output is about 9.3KB CSS, 12.6KB
JavaScript, 41.5KB fonts and 28.8KB for the largest HTML page (all gzip); two eager
images on Home. The image warmer is bounded to eight concurrent requests and
reports CDN failures without blocking valid output. Build duration grows with
content and rendition count; serving traffic is independent of CMS availability.

## Deferred items and operational limits

1. **Continuous film, WCAG 2.2.2:** user declined a pause/stop treatment. Reduced
   motion, Save-Data and offscreen/hidden-tab stops remain; full AA compliance
   cannot be claimed. Automated axe checks do not detect every requirement.
2. **Custom domain:** local HTTPS resolution failed; Google public DNS returned
   no apex A answer and NXDOMAIN for www. Hosting/domain verification and a
   deliberate switch of `SITE_URL` remain before launching the intended domain.
   No mail DNS record was changed.
3. **LinkedIn/YouTube:** generic platform links remain by the user's explicit
   instruction, pending real profiles. Studio warns about homepage links.
   Generic URLs are excluded from Organization `sameAs`; Instagram is real.
4. **Editorial content:** the two publisher headlines, dates and writers are now
   verified. AD: Vaishnavi Nayel Talawadekar, 5 August 2026. ELLE DECOR: Disha
   Kalyankar, 28 September 2026. The previous ELLE headline/date were incorrect.
   Reader content is explicitly labelled as an article summary; invented pull
   quotes were removed. Full publisher wording awaits text supplied for licensed
   republication. Incomplete architectural project descriptions remain deferred
   by the client; no project gallery was rewritten.
5. **Publisher embeds:** browsers enforce publisher framing restrictions; no
   website can guarantee every third-party article embeds. All modes keep the
   shared panel, close behavior and source fallback. Use BTL reader for dependable
   branded reading of future articles.
6. **Mail delivery and retention:** verify the provider’s recipient/domain
   configuration using an authorized real enquiry. UI/error behavior is tested
   without emailing people. The 12-month retention notice requires the studio to
   apply that policy to its mailbox; this website stores no enquiry database.
7. **Field Core Web Vitals:** no analytics/RUM was added without a product decision.
   There is no meaningful live INP dataset yet; Lighthouse TBT is a lab proxy.
8. **Future content scale:** pagination and larger build/cache infrastructure are
   unnecessary for four current projects. Reassess for dozens of projects or very
   large galleries. Current code uses static rails, lazy figures and bounded image
   warming, but no synthetic thousand-project capacity claim is made.

## Release record

PR [#18](https://github.com/btl-architects/btl-website/pull/18) contains this pass.
The compatible editor is live at https://btldesigns.sanity.studio/.
Merged to main as `c2a21eba39ce4d70620ae57dcec82ab5e390c53c` through PR #18.
Cloudflare production deployment passed and the public Press reader was verified
on 2 October 2026: Close label 15px, fixed 16px icon, verified headline/writer/date,
and clearly labelled summary content. Both current Press entries now
have verified source headlines, dates and writer credits, clearly labelled
short summaries, three credited project photographs each and project credits
in Sanity. Revision-guarded patches were backed up locally and preserve unrelated
drafts. Sanity separates the original writer from the author of reader content.
The current artwork caption hotspots and supplied Instagram URL were also
updated; LinkedIn/YouTube remain. Studio deployment publishes no drafts.

The oversized desktop Close label was caused by a generic descendant span rule
originally intended for its icon. The icon is now an explicitly sized SVG; the
label inherits the toolbar’s normal control typography. Other close controls
were inspected, and the browser test now compares actual desktop label sizes
and icon dimensions as well as mobile targets and focus restoration.

Publisher sources:
- https://www.architecturaldigest.in/story/a-publisher-and-wildlife-conservationists-wayanad-home-lies-amid-the-wilderness/
- https://elledecor.in/btl-architects-kerala-home/

AD returns both `frame-ancestors none` and `X-Frame-Options: DENY`. ELLE returned
no framing headers in the observed response; this does not guarantee future
embedding. Original links remain available in every reader mode.

The actual AD and ELLE readers were visually inspected at 390px, and the Press
artwork/caption alignment at 1280px. Screenshot evidence is stored in the ignored
`docs/client-feedback-evidence-2026-10-02/` directory. The persistent local preview
is running the enriched content and updated mobile UI. Local Chromium/WebKit
testing passed 91 checks, with one platform-specific skip.

The performance harness checks local asset-serving readiness before launching
Lighthouse so cold Wrangler initialization does not compete with Chrome. Each
measurement still uses a fresh browser cache and default simulated throttling;
score, LCP and CLS thresholds are unchanged. Raw CI runs before this harness
change are retained as context, not a strictly equivalent speed comparison.

The final Linux run on `3e438446` passed all functional checks, including 136
browser checks and Studio checks, but missed lab performance targets: Home
89 / LCP 1954ms / CLS 0, project 98 / LCP 2294ms / CLS 0, Contact 100 / LCP
1534ms / CLS 0. Earlier local runs passed all targets (Home 100 / 1586ms).
This CI performance discrepancy remains open; budgets have not been relaxed
and the release is not described as passing every production-readiness gate.

After the source/control correction: 21 web unit tests, 8 Studio unit tests,
strict checks and builds passed; 16 focused Chromium/WebKit reader checks passed.
Actual phone reader width was 390px, toolbar 61px tall, with no horizontal
overflow. Final local performance passed all unchanged targets: Home 100 /
1588ms / CLS 0, project 100 / 1516ms / CLS 0, Contact 100 / 1516ms / CLS 0.
The newest full Linux runs were still in progress at publication; the earlier
CI lab discrepancy remains recorded above. Public website and Sanity editor
both include these corrections. No full publisher article has been republished.
