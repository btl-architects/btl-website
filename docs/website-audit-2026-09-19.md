# BTL website audit and implementation plan

19 September 2026 · Source revision `19b51fe` · Audit only

The website has a coherent visual identity and a working technical foundation. Preserve the dark ground, Satoshi typography, architectural photography, static pages, and shared project browser. The next phase should concentrate on trustworthy content, accessible interactions, dependable enquiries, and publishing safeguards. A further visual rebuild would address less urgent problems.

Launch readiness is **not demonstrated**. The local production build passes, but content and functional issues remain, and the production domain could not be verified.

## Scope and evidence

Reviewed the experience plan, design memory, draft implementation contract, migration notes, deployment instructions, Astro frontend, Sanity schemas, published CMS content, and enquiry function. Built the current project and inspected it at `http://127.0.0.1:4322/`.

The implementation contract explicitly says “not yet approved.” Its requirements are a comparison baseline, not evidence of a signed agreement. Later decisions recorded in the implementation should be reconciled with it before work starts.

| Check | Result |
| --- | --- |
| Full `web` build | Pass: 16 HTML pages; content, type, redirect, budget, and image warming checks complete |
| Astro diagnostics | 0 errors, 0 warnings, 2 advisory hints |
| Generated markup | Exactly one H1 and no missing image alt attributes on all 16 pages |
| Internal page links | No missing page targets found in generated HTML; anchor IDs and external destinations were not exhaustively crawled |
| Responsive widths | No document overflow across Home, Projects, Nelly House, Studio, People, Press, Contact at 320, 375, 768, and 1440px; 28 checks |
| Project interactions | In-place opening updates URL; Back closes and Forward reopens the project; standalone project route renders |
| Viewer | Pointer activation opens the viewer with Close, Previous, and Next controls |
| Mobile menu | Opens and Escape closes; keyboard loop excludes the Close button |
| Browser logs | No captured warnings/errors during the route-width sweep |
| Enquiry handler | Five local tests with the mail provider mocked; no emails sent |
| Public domain | `curl -I https://btldesigns.in/` failed DNS resolution from this environment; this alone does not establish a worldwide outage |

This was not a Lighthouse/Core Web Vitals measurement, full axe audit, screen-reader certification, penetration test, or real-device cross-browser pass. Cloudflare configuration, mail delivery, private previews, backups, and monitoring remain unverified.

## Prioritized findings

Priority 1 means resolve or explicitly disposition before launch. Priority 2 means address in the following release or as part of launch hardening. Severity labels from dependency scanners are recorded separately from these project priorities.

### 1. Published claims and project content need verification — Priority 1

The published CMS contains four projects. House Two, House Three, and House Four have empty descriptions, no year, and the photographer value “Photographer to be confirmed.” Nelly House also has no year. All four appear in the public build.

Of six recognition entries, only Architectural Digest has an article-specific URL. Dezeen and ArchDaily link to their homepages; Elle Decor and two awards have no URLs. Their existence in the CMS is not evidence that the claims are true. The earlier design notes also list recognition details as unfinished.

LinkedIn, Instagram, and YouTube links all lead to platform homepages. Six people are currently published, including four team members, while old migration notes say real team names are still needed. Verify their names and portraits instead of assuming either version is current. Neither principal has a bio.

**Action:** Build a content approval register. Verify each recognition claim, title, date, image, team identity, and social profile; replace or withhold unsupported items. Complete project names, short narratives, dates, and credits. Preserve established project URLs or create redirects when renaming them.

**Acceptance:** Every visible claim has an approved source; every outgoing recognition/social link reaches its intended destination; no provisional photographer credits or project names ship.

Evidence: published CMS read, rendered Home/Projects/People/Press, and [open content items](</Users/ousephpaul/Documents/Webapps/btl website/docs/design-memory.md:473>).

### 2. Image-rights checks do not enforce the promise made to editors — Priority 1

The schema offers “Publication owns it — do not reuse,” but the build accepts its `publication` value as publishable. A required selection does not establish permission to reproduce an image.

The build validator also queries `settings.founders`, while the actual field is `foundersImage`. Studio images, additional studio photographs, and hero media are outside that validator. Its “33 figures valid” result therefore does not cover every media item displayed on the website.

Nelly House images currently carry `client-supplied`, whereas the project notes still require written permission for the AD-sourced photographs. That discrepancy needs documentary resolution; the audit does not establish whether permission has subsequently been obtained.

**Action:** Record licence evidence and permitted uses; distinguish provenance from publication permission; validate the actual rendered media fields and resolved assets. Cover every public media path, with an explicit policy for decorative posters. Gate published content without unnecessarily blocking incomplete, unpublished work.

**Acceptance:** Unapproved publication-owned media cannot enter a public build; missing rights on founders/studio/hero media are caught; an approved licence record resolves the Nelly House discrepancy.

Evidence: [rights allowlist](</Users/ousephpaul/Documents/Webapps/btl website/web/tools/content-check.mjs:60>), [wrong settings field](</Users/ousephpaul/Documents/Webapps/btl website/web/tools/content-check.mjs:104>), [figure schema](</Users/ousephpaul/Documents/Webapps/btl website/studio/schemas/objects.ts>).

### 3. Dependencies need a deliberate security update — Priority 1

`npm audit --omit=dev` reported the following against the current lockfiles:

| Package tree | Reported affected packages |
| --- | --- |
| Web | 1 critical, 3 high: Astro, js-yaml, sharp, svgo |
| Studio | 4 high, 11 moderate, including transitive CLI/build packages |

Astro is pinned to 7.2.4. The [Astro advisory](https://github.com/advisories/GHSA-26w7-cxv4-gfx2) identifies 7.2.8 as patched for an issue triggered by processing malicious AVIF images. This site generates static pages and serves photographs through Sanity, so the scan is not proof of an exploitable public image-processing endpoint. Build and CMS tool exposure still need assessment.

**Action:** Update to reviewed, patched compatible versions, inspect transitive paths, and rebuild both packages. Review Studio remediation manually: the scanner proposes a Sanity major-version downgrade for several paths. Do not apply a blanket forced fix. Add a recurring dependency review and CI policy for actionable advisories.

**Acceptance:** Documented disposition for every high/critical finding, passing frontend/CMS builds, and updated lockfiles.

### 4. The enquiry endpoint lacks abuse controls and usable error recovery — Priority 1

A locally mocked request carrying `Origin: https://unrelated.example` reached the provider and returned success, exactly like a same-origin request. The handler contains no origin validation or rate limiting. Edge-level controls might exist, but were not available for verification.

Validation and a honeypot work, but the missing-key and provider-failure branches return plain text without the studio's actual email link. Form input has no maximum-length attributes matching server limits, and there is no submit handler preventing duplicate sends. There is also no explicit upstream timeout.

**Action:** Add appropriate origin checks, per-source/global limits at the host or handler, bounded request processing and upstream timeout, duplicate-send handling, matching field constraints, and an accessible failure state that retains the visitor's message and offers a working email link. Keep success conditional on provider acceptance.

**Acceptance:** Reject unauthorized origins, exercise throttling safely in staging, and cover invalid input, timeout, missing configuration, provider rejection, and repeated submission. A separately authorized delivery test must demonstrate receipt at the intended studio address.

Evidence: [enquiry handler](</Users/ousephpaul/Documents/Webapps/btl website/web/functions/api/enquiry.js:48>), [form](</Users/ousephpaul/Documents/Webapps/btl website/web/src/pages/contact.astro:28>).

### 5. Privacy information is incomplete — Priority 1

There is no `/privacy/` route or privacy link beside the form. The current notice says an unnamed service holds a copy for 30 days and also says details are “never passed on.” It does not explain the studio's own retention period, deletion contact/process, or name the form processor.

**Action:** Have the owner confirm the actual handling of enquiries and the provider's retention settings. Publish a concise notice identifying purposes, recipients/processors, retention, and deletion requests; link it at the form and footer. Replace unverified blanket promises.

**Acceptance:** The owner approves wording that matches actual operations. This is a product/documentation gap against the draft contract, not a legal compliance determination.

### 6. Motion behavior contradicts the reduced-motion and offscreen promises — Priority 1

The offscreen handler clears slideshow timers but never pauses the active video. Browser inspection confirmed `paused: false` with the entire hero above the viewport.

The reduced-motion/Save-Data path prevents video sources loading, but still starts the frame-advance interval. That contradicts the planned single still. There is no user-facing pause control for the ambient sequence.

**Action:** Pause actual media when offscreen or the document is hidden; resume only when appropriate; render a stable selected poster for reduced motion; respond to preference changes; provide an unobtrusive pause/resume control.

**Acceptance:** Offscreen/hidden media stops; reduced motion downloads no video and does not change frames; visitors can pause ongoing animation while continuing to use navigation. This recommendation follows [W3C's Pause, Stop, Hide guidance](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html).

Evidence: [hero playback and timer handling](</Users/ousephpaul/Documents/Webapps/btl website/web/public/scripts/site.js:149>).

### 7. Keyboard access is incomplete — Priority 1

The photograph viewer is opened by clicking plain images. Those images have no focusable control or keyboard activation path, although the viewer has keyboard handling once opened. The standalone rail also lacks explicit, discoverable gallery navigation controls.

In the mobile menu, Shift+Tab from Home moves to the telephone link, and Tab from the telephone link wraps to Home. Close is outside that loop. Escape works, so this is not a complete keyboard trap, but the visible Close control is unreachable through the menu's normal tab cycle. The custom modal also does not make the underlying page inert.

**Action:** Give photographs semantic, named activation controls; provide accessible rail navigation; include Close in modal focus management and restore focus to the opener. Ensure viewer keyboard handling does not also move or close a project underneath it.

**Acceptance:** A keyboard-only visitor can open, browse, zoom where supported, and close photographs and the menu without using a pointer. Verify with VoiceOver and NVDA. See [W3C keyboard guidance](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html).

Evidence: [viewer click delegation](</Users/ousephpaul/Documents/Webapps/btl website/web/public/scripts/site.js:1232>), [menu focus loop](</Users/ousephpaul/Documents/Webapps/btl website/web/public/scripts/site.js:284>), [rail markup](</Users/ousephpaul/Documents/Webapps/btl website/web/src/components/ProjectRail.astro>).

### 8. Preview and archive behavior need a single lifecycle policy — Priority 2

The same `lifecycle == "published"` query supplies project routes, indexes, and previews. A project marked lifecycle Draft will not appear merely because a draft preview perspective is enabled. Archived projects lose their generated route after rebuild, contrary to the draft contract's promise to preserve citations. The Studio labels archive as “off the site,” so the documents actively disagree.

Preview configuration is recorded for Netlify while deployment instructions use Cloudflare. `noindex` is not access control; authenticated protection of the preview output was not verified. A missing preview token silently produces normal published output without a preview banner.

**Action:** Separate route eligibility from index visibility and preview selection. Decide whether archive preserves URLs, implement that policy, and document it consistently. Establish protected Cloudflare previews and validate the exact dataset being previewed. Fail clearly when a requested preview cannot be built.

**Acceptance:** Demonstrate new draft, edited published project, archived project, and missing-token behavior on staging; production cannot expose draft output.

Evidence: [project query](</Users/ousephpaul/Documents/Webapps/btl website/web/src/lib/content.ts:185>), [preview setup](</Users/ousephpaul/Documents/Webapps/btl website/web/src/lib/sanity.ts:36>), [contract lifecycle](</Users/ousephpaul/Documents/Webapps/btl website/docs/implementation-contract.md:80>).

### 9. Existing build checks cover less than the documentation claims — Priority 2

No repository CI workflow, Lighthouse configuration, or automated axe suite was found. The custom budget check is useful, but it measures compressed files and eager-image counts; it does not measure LCP, CLS, INP, or actual media transfer.

The redirect checker validates generated/CMS rules separately from the static rules it appends to. It cannot detect conflicts across both sets as currently written. Slug changes require the editor to create a redirect manually rather than automatically protecting old links.

Person profile pages can be generated once bios exist, but `sitemap-index.xml.ts` never includes them. Category/location pages are omitted from the sitemap while remaining indexable; omission alone does not exclude them from search.

**Action:** Add focused CI checks for real user flows, accessibility, the final merged redirect set, and sitemap coverage. Decide the indexing policy for thin archive pages. Establish measured loading budgets for hero posters/video and project images alongside the existing code-size limits.

**Acceptance:** Broken lifecycle/redirect/keyboard behaviors fail meaningful checks; published profiles enter the sitemap; performance results state device/network conditions rather than treating bundle size as a speed score.

## Design and content direction

| Area | Assessment and recommended refinement |
| --- | --- |
| Opening | The film gives the practice atmosphere. Keep it; introduce pause control and consider a quiet “View work” cue so continuation is evident. Measure poster loading before changing the composition. |
| Projects | In-place expansion is a strong organizing idea and basic history handling works. Make swipe/drag/keyboard browsing discoverable and give every project a concise, specific account of the brief and architectural response. |
| Studio | The image/text composition is coherent. The generic statement about structure and identity is less informative than the concrete passage about existing trees, reclaimed doors, and earth from the pond. Expand the latter with approved examples. |
| Press | Repeated use of the same cover image makes multiple entries look similar. First verify the entries; then select approved alternate views where useful. Awards without project imagery need a deliberate text treatment rather than unexplained empty image space. |
| People | The shared founders photograph supports the brand. Add short principal bios and verify team content; do not invent text to fill the layout. |
| Contact | The dark page is consistent with the rest of the site. Improve the sending/recovery experience, privacy wording, and expectation-setting with an owner-approved response timeframe. |
| Overall | The main opportunity is specificity and trust. Maintain a restrained interface and let verified work carry more of the explanation. |

## Audit of the existing plan

The original experience plan is useful as a record of intent but unreliable as a remaining-work list.

| Original item | Current position |
| --- | --- |
| Astro/Sanity migration and structured model | Implemented; migration notes retain obsolete file-backed descriptions |
| Hero media pipeline | Implemented: three clips, portrait variants, CMS assets; original drone-file size is no longer the relevant delivery budget |
| Shared project browser | Implemented as expansion inside the page; original overlay/spine proposal was deliberately superseded |
| Press and People systems | Implemented, with later layout decisions; content verification remains open |
| Studio and Contact | Implemented; enquiry resilience and privacy work remain |
| Responsive/accessibility/performance pass | Partially supported by evidence; “done” claims overstate complete validation |
| Operational handover | Editing/deployment guides exist; preview access, monitoring, backups, restore and rollback evidence remain outstanding |

Reconcile four documents: experience plan, design memory, implementation contract, and migration status. Record the chosen host as Cloudflare, the actual homepage order (Opening → Statement → Work → Press → Studio → People → Contact), current social placement, archive policy, and the surviving visual decisions. Remove the obsolete `ENQUIRY_TO` claim from deployment instructions: the handler uses only the provider access key. The retained Netlify configuration does not supply an equivalent enquiry function, so moving back requires application work as well as hosting configuration.

Do not schedule the old project overlay, global social rail, CMS migration, or video transcoding again just because they remain in old plan text. Defer archive virtualization and large-list pagination until real content and measurements justify them.

## Proposed delivery sequence

Effort ranges are planning estimates for one developer, excluding studio approvals, licence collection, and external account access. No changes below have been implemented as part of this audit.

| Phase | Work | Owner | Approximate effort | Exit condition |
| --- | --- | --- | --- | --- |
| 1. Establish approved content and decisions | Resolve findings 1–2; confirm host, lifecycle, privacy handling; refresh the plan | Studio + developer | 1–2 developer days; content collection varies | Approved content register and one current specification |
| 2. Repair core behavior | Dependency updates, rights gates, enquiry resilience, privacy route, motion and keyboard fixes | Developer; studio approves copy | 3–5 days | Priority 1 items verified locally and in staging |
| 3. Complete publishing safeguards | Protected previews, archive/slug policy, merged redirect validation, sitemap and CI checks | Developer + account owner | 2–4 days | Editor can preview/publish/archive safely; relevant regressions fail CI |
| 4. Validate production and hand over | Real-device/assistive-technology tests, measured performance, authorized mail delivery, domain/headers/redirects, backup restore, rollback and alerts | Developer + studio | 1–2 days plus external setup | Launch evidence recorded; named owner for each recurring operation |

Content collection can proceed while the developer works on phases 2–3. Start with the existing design and scope visual adjustments to issues observed after verified content is in place.

## Performance baseline

| Build measurement | Current | Existing ceiling |
| --- | --- | --- |
| Largest HTML page, gzip | 10.7 kB | 60 kB |
| CSS, gzip | 8.0 kB | 40 kB |
| JavaScript, gzip | 17.5 kB | 20 kB |
| Fonts, gzip | 41.5 kB | 50 kB |
| Maximum eager image count | 2 | 3 |

The three landscape clips total approximately 3.63 MB and portrait clips approximately 2.79 MB in CMS asset sizes. The first clip is approximately 408 kB landscape / 236 kB portrait. Clips are loaded over time, so these totals are not measured initial transfers. Posters and photographs add separate costs. No image preload is emitted in the inspected HTML; all pages preload the font. Investigate the actual LCP candidate and request waterfall before adding image preloads.

The build warmed 136 of 136 image URLs successfully. The JavaScript budget has limited room remaining, so fixes should use native controls and reduce redundant interaction code where practical.

## Launch evidence still needed

- A reachable production hostname with the intended build, canonical host, TLS, redirects, security headers, and correct API routing.
- Confirmed enquiry recipient and one explicitly authorized end-to-end delivery/reply check.
- Approved rights evidence and no unresolved placeholder or unsupported recognition content.
- Accessible operation with keyboard, reduced motion, 200% zoom, forced colors, VoiceOver/NVDA, and representative Safari/Firefox/Chrome devices.
- Measured performance under agreed conditions; no fabricated Lighthouse score or Core Web Vitals claim.
- Protected preview, successful CMS-triggered rebuild, notifications for failed builds, and recovery from failure.
- Verified original-media backup, dataset restore, deployment rollback, and named owners for uptime, expiry, and enquiry monitoring.

Only this audit document and its dependency evidence files were added. Website code, CMS documents, dependency versions, deployment settings, and DNS were not changed.
