# CMS, content integrity and SEO continuation — 4 October 2026

## Scope and identity

This continuation resumes Claude's CMS investigation of baseline `6b2002fd352d9bf044954f40a507fd7c5c741b57` in the isolated audit checkout. It implements verified validation/content-seam fixes; it does **not** deploy the website or Studio, alter client content, publish drafts, enable profiles, or write to Sanity. Source changes remain local for integration by the audit lead. The lead's final integrated build/SHA and end-to-end ledger supersede this area's intermediate checks.

Read-only evidence is stored in `.audit-work/evidence/RESUME-CMS/`. Published-data checks use unauthenticated GETs against the public Sanity project/dataset with `perspective=published`. No token, CMS mutation, initial migration, account change, enquiry or real mail was used. Public production GETs were spaced by at least 550ms.

## Coverage and results

| Area | Method/environment | Result and limitation |
|---|---|---|
| Published projects, people, publications, taxonomies, settings and image metadata | Fresh public GROQ GET, 2026-10-04 05:02 UTC (10:32 IST) | 6 projects, 12 people, 2 publications, 3 categories, 4 locations, 1 settings record; 79 figures pass updated validation with zero errors. |
| CMS02 photographer placeholder | Fresh published credits/rights query plus production GET of all three affected project pages | Confirmed twice in each page at baseline/live. Exact provisional optional labels now normalize to omission in the local content seam; verified attribution remains unchanged. Fresh integrated HTML now confirms zero placeholder occurrences/photographer rows on all three affected routes, and two preserved Nelly House credit rows. |
| CMS03 nonreuse licence | Baseline validator executed from the audited Git SHA against a synthetic prohibited figure; resumed validator against equivalent content | Baseline has no errors for `publication`; updated shared build/schema policy rejects it. Current published project images are labelled `owned`; this is metadata evidence, not proof of legal permission. |
| Missing/deleted image asset document | Actual baseline and updated GROQ evaluated locally against a synthetic missing reference with `groq-js` | Baseline claims `hasAsset=true` despite removal; updated projection returns false and build validation rejects the image. |
| Route safety/history, singleton and required references | Pure local synthetic validation tests; current public dataset | Unsafe/reserved/duplicate routes and historical collisions, missing required category/location references, and 0/2 settings records now fail. Real published content passes. |
| Draft/archive lifecycle | Existing publishing helpers inspected; targeted validation tests | Archived projects remain routable; drafts accepted only with preview option. Production queries retain their published perspective and allowed lifecycle scope; no feature flag changed. |
| Search override/description rules | Schema/read-path inspection and synthetic tests | Explicit search title/description limits and project description bounds enforced at build time. Optional absence retains existing fallbacks; long authored Press headlines are not truncated or treated as a content error. |
| Studio schema/unit behaviour | Local Node unit tests and TypeScript | **Fresh `npm ci` succeeds; 12/12 tests pass**, including reusable/nonreuse licences and safe/reserved route segments; `npx tsc --noEmit` and local `npm run build` pass. The Studio build includes only the public project/dataset identifiers. No logged-in Studio interaction or publishing was performed. |
| New web validation/credit behaviour | Node fixture tests | **13/13 tests pass**. Tests cover genuine valid omissions, exact placeholder recognition, verified name preservation, each shared image slot's licensing gate, broken assets, slugs/history/references, singleton, SEO limits and malformed reader content. |
| Astro content-seam types | `npm run check`, local audit source | 0 errors, 0 warnings, 5 existing hints at the executed check. Other agents were editing runtime source concurrently, so this is an intermediate integration result. |
| Full web unit command | Rerun after lead restored dependencies | **61/61 pass**. An earlier interrupted run had three Vite/Sharp module-loading failures during dependency refresh; those were harness/install failures and disappeared after restoration. |
| Studio dependency audit | Fresh `npm audit --audit-level=high --json` after `npm ci` | **Fails:** 10 high transitive advisory entries rooted in `braces` GHSA-vfj7-8cjw-p6xm. No forced Sanity 5.7 downgrade, suppression or threshold change; see lead security report for supported upstream disposition. |
| Hosted Studio schema | Fresh unauthenticated hosted entry/static bundle GET, 2026-10-04 05:01 UTC | Still `/static/sanity-Cl_yLf15.js`, Last-Modified 3 October 10:50 UTC. Current search-listing markers absent; Home text/role markers present. **CMS01 remains an external deployment blocker.** |
| All generated routes / canonical/JSON-LD/internal links | Fresh read-only crawl of lead's integrated generated HTML, plus baseline HTTP/source evidence | 24 pages; no missing titles/descriptions, malformed JSON-LD, broken internal links or missing anchors. No profile pages or profile sitemap routes. Marker correctly says `sourceDirty=true` with baseline source SHA; this is local integrated output, not a deployed clean commit. |
| Redirects/statuses/disabled profiles | Read baseline production probe and current `redirects`/`build-mode`/`features` helpers/tests | Existing redirect tests cover chains, cycles, self/missing/shadowed destinations, unsafe targets and duplicates. Inherited production probe covers all 28 rules (301/302 → 200) and test fixture absence. New whole-build rerun needed after lead integration. |
| CMS webhooks, backups, delete/create editor UX and webhook build notification | No authenticated infrastructure access | **Unverified**, with concrete follow-ups below. |

## Findings and dispositions

### CMS01 — hosted Studio deployment drift (medium; confirmed external blocker)

The hosted Studio still lacks `pageSeo`, “Search listings”, and the new person/publication search-metadata editor fields. The website reads these fields correctly, but editors cannot enter them through the hosted release. Fresh entry-marker evidence agrees with Claude's original finding.

**Disposition:** no automatic deployment. Once the integrated source has passed validation and the owner explicitly approves Studio release, an authenticated owner should deploy the verified Studio and confirm these fields exist in the actual UI. These local audit changes add further licensing and slug validations, so the current hosted editor does not yet contain them either. Build-time checks protect the website independently when the new web code is released.

Do not call an entry-string comparison proof of publish permissions, webhook health or the entire deployed schema; it establishes this specific drift.

### CMS02 — provisional optional photographer labels rendered publicly (medium; confirmed bug, fixed locally)

Three projects (`the-conservatory`, `teak-and-terra`, `house-of-threaded-time`) contain `Photographer to be confirmed`. Fresh public GETs find two rendered occurrences per project. Photographer names and years were explicitly not supplied/required by the owner. Treating accepted absence as a site-wide release failure or inventing names would be inappropriate.

**Fix:** shared `optionalPhotographerCredit()` omits only a whole field matching a known provisional optional credit: `to be confirmed`, `TBC`, `TBD`, optionally prefixed with `photographer`, case insensitive. Actual names and wording containing those tokens remain unchanged. Project credits, project image credits, article credits, article opening images and article figure credits pass through the helper at the content seam. Whitespace-only optional credits also become empty. Empty optional credits therefore use the already-authored omission/fallback behavior everywhere these data are rendered.

The shared Studio credit description now tells editors to leave unconfirmed attribution empty. No CMS string was rewritten, no new photographer or project year was added, and there is no broad placeholder scan that could wrongly reject a legitimate name or title. The real Nelly House credit `Abhimanyu K V` is preserved.

**Integrated verification:** fresh generated HTML has no provisional photographer occurrences or rows on these three routes; Nelly House retains two verified `Abhimanyu K V` credit rows. CMS data itself will retain the existing provisional strings until an owner chooses to clear them; that cleanup is not necessary for the normalization fix.

### CMS03 — explicit publication-owned/do-not-reuse classification was not enforced (medium; confirmed bug, fixed locally)

Running the actual baseline `checkFigure` on a synthetic `rights="publication"` figure returns no errors. The Studio option explicitly says “Publication owns it — do not reuse”, yet all such figures were accepted into the website. The resumed validator now rejects this choice and unknown/absent classifications across project photos, portraits, Press artwork, article opening figures, article content figures and settings photographs. Studio uses the same policy helper, so the authoring and build rules cannot disagree about allowed licence values.

**Fix:** `shared/image-rights.ts` returns a clear error for `publication`; reusable `owned`, `client-supplied` and `licensed` remain supported. An editor should remove a prohibited image or obtain verified permission and record an appropriate licence. Merely changing a field is not evidence of permission.

**Data/business boundary:** the current published dataset contains no explicit forbidden classification, so no current content must be reclassified for this code fix. Published project photos are labelled `owned`, whereas historical documents discussed client-supplied originals/permission confirmation. The source of permission and ownership must be confirmed by the practice. This audit neither certifies those rights nor assumes the originals are the old prohibited AD CDN copies. No image content, quality, crops, asset URLs or client facts were changed.

### CMS04 — API/imported route and reference data could bypass Studio validation (medium; confirmed fixture defect, fixed locally)

Claude's original synthetic GROQ evidence showed unsafe/reserved/duplicate project slugs, missing or invalid category/location slugs, dangling references and duplicate settings selecting arbitrary copy. Existing build checks required only a nonempty project slug and did not validate these cross-document contracts.

**Fixes:** the isolated pure `validateContent()` guard now checks safe project/category/location/Press/person route segments, project `type`/`place` reservations, namespace uniqueness, previous-address collisions and syntax, exactly one published settings record, and required resolved category/location references of the correct type. Studio project/category/location/person slug fields now reject unsafe segments before publication while retaining existing Sanity uniqueness and project-history behaviour. Person slugs still create redirects while profiles are off, so their safety is checked without enabling profiles.

Draft/archived/published filtering remains as before. Archived URLs stay available, and taxonomy index rules remain earned from visible work. Historical self-record duplicates are accepted; another record claiming the same route/history is rejected.

**Current production impact:** the present real dataset passes. These are failure-prevention fixes for later edits/imports, not claims that current project routes are broken.

### CMS05 — image reference presence did not prove its asset existed (medium; confirmed fixture defect, fixed locally)

The old projection used `defined(asset.asset)`. A remaining `_ref` was accepted even after its asset document had disappeared. A synthetic fixture evaluated through the actual old GROQ returns `hasAsset=true` for an absent asset; the new query returns false and a human-readable content error.

**Fix:** all validated shared figures dereference the asset and require `_type == "sanity.imageAsset"`. This rejects missing or incorrectly typed references rather than producing an unusable rendered image. Malformed alt values and reader spans now report content errors without throwing during validation. Current 79 real figures pass.

### CMS06 — explicit content/search limits could be bypassed by API edits (low; fixture-prevention fix)

The Studio limits a project description to 600 characters and explicit search titles/descriptions to 60/155. The build accepted longer/malformed API values. The new gate mirrors these authored schema bounds on supplied overrides/project descriptions.

This gate intentionally **does not** enforce an artificial minimum on descriptions, shorten original publication headlines, or require optional SEO metadata. The inherited Press fallback titles are 120 and 69 characters; shorter search listings are an editorial recommendation using the optional SEO controls after CMS01 is resolved, not justification for rewriting the source article title.

## Source ownership and changes

- `shared/credits.ts`: exact optional photographer placeholder recognition; preserves verified strings.
- `shared/image-rights.ts`: shared reusable/nonreuse classification policy.
- `web/tools/content-validation.mjs`: side-effect-free build/content invariants used by fixtures and CLI.
- `web/tools/content-check.mjs`: public/preview query projections plus CLI failure reporting; asset dereference, reference/taxonomy/settings/SEO fields.
- `web/src/lib/content.ts`: optional credit normalization only; clears stale assertion that no placeholders were imported.
- `studio/schemas/{objects,project,category,location,person}.ts`: licence gate, safe slug validation and editor guidance.
- `web/tests/content-validation.test.mjs`, `studio/tests/schema.test.ts`: meaningful regression fixtures.

This area does not own runtime UI scripts/styles, dependencies/lockfiles, server/preview functions, build identity markers, media transforms, deployment or routes. Changes by other agents remain separate.

## Evidence and repeatable checks

- `baseline-reproductions.log`: source-SHA-based old/new rights guard and fresh public credits/rights + production placeholder checks.
- `query-fixtures.log`: old/new actual GROQ handling of a removed image asset.
- `read-only-content-check.log`, `projected-content.json`: fresh current public dataset through the new guard.
- `content-unit.log`: 13 focused unit checks.
- `studio-unit.log`: 12 Studio unit checks; `studio-typecheck.log`: zero-error typecheck.
- `web-typecheck.log`: Astro check and existing hints.
- `all-web-unit.log`: restored-dependency full web unit result (61/61); the earlier install interruption is documented above.
- `studio-ci.log`, `studio-build.log`, `studio-audit.json`: fresh Studio install/build success and remaining audit failures.
- `current-hosted-studio.log`, `hosted-schema-markers.json`: fresh hosted schema-drift evidence.
- `integrated-credit-html.log`, `integrated-output-summary.json`, `seo-crawl.txt`, `seo-summary.json`: fresh integrated credit/24-page link/metadata checks, local dirty source identity and production Function routing selection.
- `inherited-seo-summary.log`: compact review of Claude's 24-page baseline crawl; original detailed evidence remains under `.audit-work/evidence/CMS/`.

From repository root, after dependencies have settled:

```sh
node --test web/tests/content-validation.test.mjs
node .audit-work/evidence/RESUME-CMS/read-only-content-check.mjs
```

Run normal `web`/`studio` test/typecheck/build commands as part of the lead's sequential integrated validation. The audit evidence scripts are local-only and are not a production build dependency.

## Unexecuted/external follow-ups

1. **Studio release/UI:** owner-authorized authenticated Studio deploy, then verify search fields, licence error and invalid slug errors in actual editor UI; create/copy/delete controls, publish actions, role permissions, slug-history preservation and arrange/reorder controls need logged-in testing.
2. **Published-to-build webhook:** owner verifies Sanity webhook protection/target, Cloudflare hook/account ownership, correct project/dataset, a sandbox-triggered build and failure notification. A configured URL in a guide is not execution evidence.
3. **Content/rights confirmation:** practice confirms original photograph licences and ownership for reusable classifications, optional photographer names/years when available, article author/republication permission and any processor/privacy facts. No unsupplied facts should be invented.
4. **Recovery/backup:** inspect actual dataset/asset backup exports, ownership and retention; perform restoration in a separate dataset/site before claiming recoverability. Never rerun the initial migration against production.
5. **Integrated output:** fresh build + 24-route internal-link/metadata/structured-data crawl, sitemap/noindex/profile/archive/redirect checks, and source identity tied to the final lead SHA. Inspect the three omitted placeholder credits and Nelly House preserved real attribution.
6. **Canonical domain:** owner has deferred connecting the final domain. Preserve actual Pages canonical configuration until an authorized connection/cutover; no DNS/mail change performed.
7. **External publisher availability and complete artwork:** existing read-only publisher probes/Press completeness remain inherited evidence; do not assume iframe permission, fresh article text republication or full third-party availability from our own fixture.

A passing metadata guard establishes structural consistency and explicitly recorded licensing rules. It does not establish factual accuracy of every client statement, licence ownership, successful webhook delivery, full SEO ranking, actual inbox receipt or authenticated publishing permissions.

## Independent review of integrated delivery/auth helpers

After dependencies were restored, this area also independently reviewed the lead’s new Function route selection, source identity, preview authentication, deployment-target finder and regression tests. Function routes retain middleware on every authenticated draft/public noindex branch asset and page; production HTML/scripts/fonts use static delivery, with the diagnostic marker still guarded. Missing/inconsistent markers fail closed. UTF-8/NFC credential construction matches the advertised UTF-8 challenge; Basic scheme handling is case insensitive; invalid credential configuration fails privately. Authorized draft content remains `no-store`, and the GitHub token is not forwarded to deployment-marker fetches. The full web unit result includes these mocked/error checks.

One issue was sent back to the lead: the deployment-finder URL regex accepted named branch aliases while describing an immutable target. A source marker verified only once does not keep a moving alias tied to the same source throughout a performance run. Restrict the selected hostname to the provider’s immutable deployment-ID format (the observed deployments use eight hex characters), with an alias-rejection fixture, or independently establish immutability. The lead tightened the hostname to eight hex characters and added branch/main/unrelated-host rejection fixtures. I independently read the revised finder and reran the full 61-test web unit suite successfully; this issue is resolved locally.

Content seam review found accepted missing photographer values, missing portraits and missing article credits/heroes safe under the selected GROQ shapes. Project credits are explicitly projected as an object, and the new gate catches null/missing mandatory project figures before HTML rendering. This does not claim an atomic Sanity snapshot across every query or replace final integrated route/render checks.
