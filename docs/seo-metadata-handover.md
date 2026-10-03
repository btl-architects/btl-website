# Search metadata without changing the website design

This change only affects HTML head metadata and machine-readable structured data.
Page headings, client-authored writing, photographs, navigation, animations and
browser interaction scripts keep their existing behavior.

The default Home browser-tab/search title becomes
`btl architects — Architecture & Interiors, Kozhikode`. Its existing description
still uses the client’s tagline. Search engines may choose different result text.

Business JSON-LD uses the defined `LocalBusiness` type, a stable practice ID,
the existing favicon as the logo, and the practice image independently of each
page’s share image. Postcode `673016` is extracted from the existing address,
not maintained as a second copy. Platform homepages stay out of `sameAs`.
Home also identifies the site with `WebSite` structured data.

## Editing after the verified website and Studio changes are released

- **Site settings → Search listings**: independent optional titles and
  descriptions for Home, Projects, Press, People, Studio and Contact.
- **People → Search listing**: metadata for an existing individual profile.
  It does not create a profile or change a biography.
- **Press & awards → Search listing**: metadata for the feature page. It does
  not change its visible headline or reader content. Embedded publisher pages
  and external feature previews keep their existing `noindex` behavior.
- **Projects → Details → Search listing** continues to work as before.

Empty metadata fields keep their page’s fallback. Index-page settings never
override project, article or profile pages. No canonical or indexing controls
are exposed to editors, and no existing Sanity records are changed by this patch.
The new controls require a separately approved Studio release; existing content
works before that release because every new field is optional.

## Validation and launch follow-up

Compare every generated HTML `<body>` and CSS/JS/font asset with the unchanged
base build using the same Sanity content. Run website and Studio tests, both
builds and browser regression checks in the isolated checkout.

The code uses the configured `SITE_URL` for business/site IDs, canonicals and
the sitemap. Connecting `btldesigns.in`, changing `SITE_URL`, releasing Studio,
merging this patch and production deployment require separate approval.
After release, validate the business markup in Google’s Rich Results Test and
the site-name markup in Schema Markup Validator (Rich Results Test does not
support site names). Inspect the main pages in Search Console.

## Verified on 3 October 2026

- Rebased cleanly onto `2b6eddc`, including Claude's mobile repair #36 and
  screenshot-helper cleanup #37. Only the isolated SEO checkout was used for
  implementation and build verification.
- All 24 generated HTML bodies match the latest unchanged main build byte for
  byte. All seven CSS, JavaScript and font assets and the generated redirects
  also match. Individual profiles remain disabled (`PROFILES=false`), no profile
  pages are generated, and the sitemap contains no individual person URLs.
  Profile metadata controls remain dormant while that feature is disabled.
- Website: all 37 tests, Astro checks, production build, page integrity and size
  budgets pass after the rebase. Studio's previously verified 10 tests,
  TypeScript and build pass; no Studio code changed during the rebase.
- Targeted browser checks after the rebase: 11 pass across Chromium and WebKit,
  with one intentional WebKit skip. These cover Press opening/closing, thumb
  dismissal, navigation feedback, the phone photograph viewer, and accessibility
  and narrow-screen width on Projects and the Kozhikode project index.
- The earlier 56 Chromium/WebKit accessibility, width and gallery regression
  checks passed. Firefox could not launch locally (`Could not find profile
  folder`), including a standalone launch without loading the website.
- Metadata rendering tests verify partial/empty overrides, head-only changes,
  unchanged article headlines and retained `noindex` behavior. JSON-LD tests
  cover escaping CMS text, known postcode extraction and excluding placeholders.

The previous PR CI run failed the Studio security audit and browser tests.
The same phone-viewer and WebKit width failures also occurred on its unchanged
main base. The targeted checks above pass locally on the latest rebased branch;
this does not establish that the entire hosted browser suite is green.
The user explicitly authorized merging while deferring the inherited dependency
issue: Sanity tooling includes `braces@3.0.3`, affected by the high-severity
[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).
The advisory lists no patched version. Dependencies and the audit policy remain
unchanged; this unresolved security issue requires separate remediation.

Merging to main and its automatic website deployment are authorized. Sanity
Studio and DNS have not been released or changed; new Studio search controls
still require a separately approved Studio release. No CMS content changed
as part of this code task.

References: [Google title guidance](https://developers.google.com/search/docs/appearance/title-link),
[Local business markup](https://developers.google.com/search/docs/appearance/structured-data/local-business),
[Site name markup](https://developers.google.com/search/docs/appearance/site-names).
