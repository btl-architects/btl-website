# Implementation contract — btl architects website

Companion to `design-system.html`. That document is the design specification: what the site
looks like, how content is modelled, how it behaves. **This document is the engineering
contract**: the operational rules a developer must follow and must not break.

Written as MUST / MUST NOT / SHOULD so it cannot be interpreted away. Section references
in `§` point at the design system document.

Version 0.3 · 11 August 2026 · not yet approved

---

## 1. Non-negotiables

### MUST

- Astro **7.2** (latest stable at time of writing — confirm on day one), static output, TypeScript in `strict` mode
- Exact versions pinned in the lockfile; no automatic major-version upgrades
- Sanity as the only content source; schemas versioned in `studio/` in this repository
- Netlify for hosting, build and form handling
- Every design token read from `src/styles/tokens.css` — the single source of truth
- Every image rendered through the `Figure` component
- Every route in `src/pages/` mirroring the sitemap in §05
- Slugs generated once and locked at first publish
- Draft, preview and publish states working before launch, not after
- `alt` and `rights` enforced at the schema level on every image
- Accessibility checks passing in CI on every route

### MUST NOT

- Introduce Tailwind or any CSS framework
- Introduce React, Vue or Svelte as a global runtime
- Build an arbitrary page builder, or add slide types beyond the five in §09 without approval
- Hard-code any project's content, images or routes
- Commit photographs to the git repository
- Autoplay a carousel, or auto-advance any content
- Ship a third-party script on initial page load
- Bypass CMS validation from the build or the front end
- Write a raw pixel value for spacing outside the primitives
- Render an `<img>` anywhere outside `Figure`
- Reference grid column numbers outside a grid composition (`grid-column: 7 / 13` and the like)
- Hard-code navigation, categories or locations — all three are CMS content
- Create a second image pipeline, or fetch an image from anywhere but the CMS
- Introduce an icon library, animation library or analytics provider
- Reproduce **this documentation's** visual language in the website: numbered parts, tags,
  tables, code styling, the contents rail. The design system describes the site; it is not
  a mockup of it
- Weaken an accessibility requirement to make a component easier to build
- Remove or relax a performance budget
- Change a design token silently — tokens change by decision, with a note
- Alter the information architecture or add a route not in §05
- Ship placeholder or lorem content to production
- Ship reference photography whose rights are not documented
- Modify MX, SPF, DKIM, DMARC or any mail-related DNS record
- Commit a secret, a token or a `.env` file

### SHOULD

- Prefer a platform feature to a dependency, every time
- Prefer CSS to JavaScript, every time
- Keep each island under 10 KB gzipped

---

## 2. Content lifecycle

The design document specifies fields. It does not specify what happens to content over time.
This does.

```
Draft ──> Published ──> Archived
  │            │
  └── Preview ─┘
```

**Scheduled publishing is not in v1.** A statically generated site does not wake up on a
date; making it work needs a nightly build or a release webhook, and no requirement for it
has been stated. The editor presses publish.

| State | Public? | In sitemap? | Notes |
|---|---|---|---|
| Draft | No | No | Never reachable on a public route, by any URL |
| Preview | Token only | No | `noindex`, unguessable token, visible DRAFT banner |
| Published | Yes | Yes | — |
| Archived | Yes, at its original URL | Yes | Removed from the index; still linkable so citations survive |

### MUST

- Drafts are excluded from every public query, not merely hidden by CSS
- Archived projects keep their URL. Removing a project from the index MUST NOT 404 it
- Deleting a published project MUST create a redirect, or return 410, never a bare 404
- Every destructive action in the CMS requires confirmation
- Sanity's document history is enabled so any revision can be restored
- Concurrent edits surface a warning rather than silently overwriting

### Preview

- Preview renders **draft** content, including draft references
- Preview URLs carry an unguessable token and send `X-Robots-Tag: noindex`
- A persistent, visible "PREVIEW — not published" bar, with an obvious exit
- Preview MUST NOT expose unpublished content through normal routes
- Preview MUST render the **same components and the same image pipeline** as production.
  It is not a simplified CMS-side rendering — a preview that differs from production is
  worse than no preview, because it is trusted

---

## 3. Image rights as a publishing constraint

See §08. Restated here because it is an engineering rule, not a design preference.

### MUST

- `rights` is required on every image: `owned` · `licensed` · `client-supplied` ·
  `press-supplied` · `archival` · `unknown`
- An image with `rights: unknown` MUST NOT be published. The CMS blocks it; the build fails
  if one reaches it
- `alt` is required unless `decorative` is explicitly ticked
- Alt text MUST NOT be auto-generated by copying the caption
- Per-image `credit` overrides the project's `defaultCredit`; the resolved credit renders in
  the fact sheet and in the lightbox

**Status update.** The client has now supplied original photography for all four projects in
`references and inspirations/` — sixty Nelly House frames plus three further houses and the
studio. These supersede the AD CDN copies entirely, and the AD-derived files in
`projects/nelly-house/images/` must not ship. Rights on the originals are `client-supplied`
pending written confirmation from Abhimanyu K V; the AD copies stay `rights: unknown` and
the gate keeps them out.

**Video.** The supplied drone footage is 200–500 MB per file. Under §26 nothing above 20 MB
is self-hosted, so these MUST be transcoded and placed with a video host before any of it
appears on the site. Uploading the originals would breach every budget in §27 at once.

---

## 4. Deployment

```
GitHub (main)
   │  push / PR
   ▼
Netlify CI ── astro build ── Lighthouse + axe budgets ── fail closed
   │
   ▼
Netlify CDN (production)          Deploy previews (per PR, noindex)
   ▲
   │  build hook
Sanity publish webhook
```

### MUST

- `main` is the production branch and is protected; no direct pushes
- Every pull request gets a deploy preview, and every preview sends `noindex`
- A Sanity publish fires a build hook; nothing is deployed by hand
- Production releases are tagged
- Rollback is a one-click redeploy of the previous build, tested once before launch
- Secrets live in Netlify environment variables and nowhere else — never in the repository,
  never in client-side code
- The Sanity read token used at build time is read-only

### Environments

| Environment | Branch | Dataset | Indexed |
|---|---|---|---|
| Production | `main` | `production` | Yes |
| Preview | any PR | `production` (drafts) | No |
| Local | — | `production` (read-only) | — |

A separate staging *dataset* is deliberately not used. For a site this size it doubles the
content-entry burden and drifts out of sync. Deploy previews against real content give the
same confidence.

---

## 5. Ownership and access

The account-ownership principle in §11 applies to **every** service, not only the CMS.

### MUST — all registered to BTL Architects, not to any contractor

- Domain `btldesigns.in` and DNS
- Netlify team and site
- Sanity organisation and project
- GitHub repository
- The `admin@btldesigns.in` and `studio@btldesigns.in` mailboxes

### Roles

| Role | Can |
|---|---|
| Owner | Everything, including billing and access. Held by a principal architect |
| Editor | Create, edit, publish and archive projects, people, press, studio copy |
| Contributor | Create and edit drafts; cannot publish |
| Developer | Schemas, code, deployment. Not a permanent content role |

### MUST

- No shared logins. One account per person
- Two-factor authentication on every Owner and Developer account
- Developer access is reviewed at handover and revoked when the engagement ends

---

## 5a. Security

The weakest area of the specification before this pass. Astro 7.1's CSP support makes most
of it straightforward.

### Headers — MUST

| Header | Value |
|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` |
| `Content-Security-Policy` | `default-src 'self'`, images additionally from the Sanity CDN, frames only from the video hosts, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | camera, microphone, geolocation, payment all denied |

No inline `<script>` without a nonce or hash. No `unsafe-inline`, no `unsafe-eval`.

### Secrets and tokens — MUST

- The Sanity token used at build time is **read-only**, scoped to the production dataset
- Secrets live only in Netlify environment variables; never in the repository, never in
  client-side code, never in a preview deploy that a URL guess could reach
- The Sanity → Netlify build hook URL is treated as a secret, and the webhook's **signature
  is verified** before a build is triggered. An unauthenticated build hook is a free
  denial-of-wallet for anyone who finds the URL
- Secret scanning enabled on the repository; a commit containing a key fails CI
- `npm audit` (or equivalent) runs in CI; a high-severity advisory in a production
  dependency fails the build

### DNS and mail — MUST NOT

**The developer must not modify MX, SPF, DKIM, DMARC or any mail-related DNS record.**
The practice runs `studio@` and `admin@` on this domain. A well-meant DNS cleanup that takes
the studio's email offline is a far worse outcome than any website bug. Web records
(`A`, `AAAA`, `CNAME`) only, and the change is confirmed with BTL before it is made.

---

## 5b. Redirects

The `redirect` document type needs rules or it becomes a source of bugs.

### MUST

- Matching is exact, on the path only; query strings are preserved and ignored for matching
- Trailing slashes are normalised — one canonical form, enforced at the edge
- Paths are case-insensitive on input, lower-case on output
- **301** for permanent moves (308 only where the method must be preserved, which here it
  need not be)
- **Chains are resolved at build time.** `old → middle → new` is flattened to `old → new`
- A redirect loop **fails the build**
- A self-redirect (`old → old`) **fails the build**
- A redirect whose target 404s **fails the build**
- Duplicate sources fail the build
- Changing a published slug automatically creates the redirect; the editor cannot forget

---

## 6. Backup and restore

### MUST

- Automated **daily** Sanity dataset export to BTL-owned storage, retained 90 days
- Monthly long-term archive, retained indefinitely
- **Original image and video binaries**, not only the JSON. A dataset export containing
  asset *references* is worthless if the assets are what disappeared. The photography is the
  practice's most valuable asset on this project and it must exist outside Sanity
- Schema, redirects and reference integrity included, so the site is reconstructable

The test the backup has to pass: **if Sanity vanished tomorrow, could we rebuild this site
and recover every photograph?** If the answer is not obviously yes, the backup is incomplete.
- Code is in git; that is the code backup
- **A restore is performed and verified once before launch, and once a year after.**
  A backup that has never been restored is not a backup

---

## 7. Monitoring

Small, but the owner must find out before a client does.

### MUST

- Uptime check on the homepage, alerting to `admin@btldesigns.in`
- Build-failure notification on every failed deploy
- Contact-form delivery monitoring — a submission that never arrives is invisible otherwise,
  and it is the one failure that costs the practice work
- TLS certificate and domain expiry alerts

### SHOULD

- Quarterly broken-link and sitemap validation

---

## 8. Contact form hardening

§21 specifies the form. Honeypot alone is optimistic; it stops naive bots and nothing else.

### MUST

- Honeypot field, hidden from sight and from the tab order
- Server-side validation — never trust the client
- Origin/referrer validation on the endpoint
- Rate limiting: per-IP and global, so the endpoint cannot be used to flood the studio inbox
- Netlify spam filtering enabled
- Duplicate submission prevention — the submit button disables on send
- **SPF, DKIM and DMARC configured** for the domain, or notifications land in spam and the
  studio silently loses enquiries. This is the single most likely quiet failure on the site
- A named owner for enquiries, a stated retention period, and a deletion procedure
- Submissions to `admin@btldesigns.in` only. The address MUST NOT appear as a `mailto:` in
  the page source in more than one place

### MUST NOT

- Add a CAPTCHA. It is an accessibility tax and the above is sufficient at this volume

---

## 9. Privacy and legal

India's DPDP Act applies from the moment a name and email are collected. A one-line notice
under the form is not sufficient on its own.

### MUST

- A `/privacy` page covering: what the form collects, why, who receives it, how long it is
  kept, how to request deletion, and the third-party processors involved (Netlify, Sanity)
- Consent language beside the submit button, linking to that page
- A stated retention period for enquiry data, and a deletion procedure someone can actually
  follow

### Analytics

None, by decision — recorded in §35. This is a **business and privacy choice**, not an
aesthetic one, and it is reversible. Should the practice later want to know which projects
are read and where enquiries originate, the architecture supports adding a cookieless,
privacy-first script under 2 KB with no restructuring and no cookie banner. That decision
belongs to BTL, not to the developer.

---

## 10. Dependencies

### MUST

- No dependency is added without a written reason why the platform cannot do the job
- Production dependencies are reviewed at least twice a year for vulnerabilities and
  abandonment
- Automated security updates enabled on the repository

This is what protects the "small and boring" philosophy from erosion after handover. Every
architecture site that becomes unmaintainable got there one reasonable-seeming dependency
at a time.

---

## 11. Definition of done

### Per route — none of this is optional

- [ ] Correct at every breakpoint in §16, and at 320px
- [ ] Keyboard operable, focus visible, focus order logical
- [ ] Screen-reader pass
- [ ] Reduced-motion pass
- [ ] Legible at 200% zoom with no horizontal scroll; survives forced-colors
- [ ] Every image through `Figure`, `sizes` verified against actual rendered width
- [ ] Exactly one preloaded LCP image, matching the `srcset` candidate
- [ ] No layout shift on load
- [ ] Title, description, canonical and OG generated
- [ ] Structured data validates
- [ ] No console errors or warnings
- [ ] No broken internal links
- [ ] Lighthouse CI budgets pass
- [ ] No new dependency without written justification
- [ ] Production and preview builds both succeed

### Per phase

- [ ] Lighthouse ≥ 95 across all four categories, on throttled 4G, mid-range Android
- [ ] LCP < 2.0s · CLS < 0.02 · INP < 200ms
- [ ] axe reports zero violations on every route
- [ ] One manual keyboard-only pass
- [ ] One screen-reader pass — VoiceOver and NVDA
- [ ] Verified on Safari, iOS Safari, Chrome, Android Chrome, Firefox, Edge
- [ ] Draft, preview, scheduled, published and archived states all demonstrated
- [ ] A restore from backup performed successfully
- [ ] A rollback performed successfully
- [ ] No image with `rights: unknown` in the published dataset
- [ ] Every image has alt text or an explicit decorative flag
- [ ] Editor walkthrough recorded, and `content-guide.md` written in plain language
