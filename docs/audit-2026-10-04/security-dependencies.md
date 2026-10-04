# Security, dependencies and operations

4 October 2026. Resumed from Claude's baseline `6b2002f`; all changes are local
in `claude/whole-site-audit`. No account settings, DNS, CMS content or provider
configuration were changed. Original evidence remains in `.audit-work/evidence/SEC/`.

## Dependency disposition

| Package / finding | Evidence and exposure | Disposition |
| --- | --- | --- |
| Web `http-cache-semantics` / SEC-01, L-02 | Supported transitive resolution 4.2.0 → 4.3.0, three lockfile fields, no direct dependency or override. Fresh `npm ci` and `npm audit --json`: zero vulnerabilities. Astro uses it in build-time remote-image caching; this website renders Sanity image URLs rather than Astro remote assets. | Updated locally; this clears the advisory's current published range, not proof of a fix to its alleged code path. |
| Studio `braces` / SEC-02, L-03 | Fresh audit still reports ten high entries tracing to one root advisory. Registry latest 3.0.3; advisory has no patched version. Sanity CLI/codegen glob tooling, absent from the examined Studio runtime bundle. | Unresolved upstream. No suppression, downgrade, unreleased Git override or changed audit threshold. Studio's audit gate remains red. |
| Supply chain / SEC-04 | Both lockfiles reviewed; exact direct versions; current GitHub actions SHA-pinned and verified against release tags. Workflow token has contents/checks read permissions. | No unneeded dependency introduced. Existing supported resolutions retained. |

The upstream maintainer disputes the `http-cache-semantics` report; the current
4.3.0 tarball does not change the reported stale-response branch. Treat the
successful audit as the registry/advisory result on this date and recheck when
the advisory changes. Primary sources: [advisory](https://github.com/advisories/GHSA-ch52-4w7c-c8xp),
[maintainer issue](https://github.com/kornelski/http-cache-semantics/issues/56).
The issue was independently confirmed closed as `not_planned` by GitHub API.

`braces` remains affected under the [current advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).
Its build-tool exposure reduces the identified website attack surface; it does
not justify marking the dependency scan passed. Track the upstream release and
Sanity dependency chain. Any time-limited exception would be a separate owner
policy decision, not an implemented remediation.

Fresh direct-dependency outdated checks also found Sharp 0.35.5 and
TypeScript 7.0.2 available. These pins stay at their verified versions:
TypeScript 7 is a compiler/tooling migration outside Astro check's ^5/^6 peer
range; the Sharp patch's release notes do not identify a demonstrated failure
or security issue in this site's artwork-bound path. Newer does not by itself
mean this audit should replace a working dependency. See the independent
performance review for primary release references.

## Preview authentication, routing and build identity

The baseline route manifest invoked the preview Function for every production
HTML, script, font and image request, each fetching a build marker. The new
build generator retains all-route middleware for public branch previews and
authenticated drafts; production pages/assets use static delivery and only the
diagnostic marker invokes the guard. Missing/inconsistent markers abort route
generation. The post-build site check rejects a mismatched manifest. Source
coverage stays broad as a defensive fallback. This follows [Pages routing rules](https://developers.cloudflare.com/pages/functions/routing/),
which require at least one include rule.

The marker now includes source SHA, build time and local dirty-checkout status.
CI's deployment finder verifies the returned marker names its expected source
commit before measuring the immutable preview URL. It does not send the GitHub
token to Pages. A public marker contains source metadata, never environment
credentials, enquiry keys or draft contents.

The original SEC probe also found two authentication protocol defects: raw
Unicode credentials threw an uncaught `btoa` exception, and lowercase `basic`
was rejected. The guard now encodes the advertised UTF-8/NFC credentials,
accepts a case-insensitive scheme, validates malformed configuration and
requires a complete, consistent mode marker. Authentication still compares
fixed-length SHA-256 digests and denied/private responses remain `no-store`.
These details follow [RFC 7617](https://www.rfc-editor.org/info/rfc7617/).
ASCII credentials retain their behavior; no runtime credential was inspected.

Unit checks cover malformed/missing markers, no password/short password,
wrong/no authorization, correct ASCII/Unicode authorization, branch noindex,
invalid configuration, archived/draft route scopes and preview enquiry-key
omission. Local route-level smoke evidence and integrated check results belong
in the final validation ledger. Actual protected-preview infrastructure and
account quota/failure settings remain unverified; an owner must verify those
before exposing draft output.

## Browser/application security and privacy

Source and saved production/local HTTP probes confirm CSP, HSTS, frame denial,
nosniff, restrictive permissions and referrer policy. Script execution stays
same-origin, with no inline/eval allowance. The documented inline-style/font
exceptions support generated CSS and image placeholders. Publisher frames are
sandboxed and load on article opening; HTTPS frame sources are intentionally
editor-configurable. Rich-text link validation and Astro escaping were reviewed.
There is no dynamic server-side rendering of enquiry input.

The enquiry key is intentionally a public form identifier. Production-only
build gating strips it from branch/draft previews. The form uses the provider
from the visitor's browser, includes a honeypot, prevents duplicate submissions,
times out and preserves failed text. Browser tests intercept every provider
request; no real enquiry or email was sent. A mocked success is not evidence
of real inbox receipt or account recipient/quota configuration.

The privacy page describes this actual routing, external media and publisher
frames. No site analytics script or persistent visitor storage was found.
The practice must confirm its stated 12-month enquiry retention, processor
facts and recipient practices; code inspection cannot establish those facts or
legal compliance. No client copy was rewritten to invent them.

## Owner-controlled findings

| Finding | Verified baseline | Required follow-up |
| --- | --- | --- |
| SEC-05 / L-01, high: release gating | Main has no protection/ruleset; saved 118 website-check runs contain no success; Cloudflare reports deployment success alongside failed CI. Performance and dependency gates are real failures, not browser failures. | Restore an honest green baseline; owner then enables required PR/check rules and chooses production deploy gating without breaking CMS webhook publishing. Never bypass checks to merge this audit. |
| SEC-06, medium: legacy Netlify production | Old indexable copy still returns 200, has older assets and an unavailable enquiry form; legacy PR preview wiring still exists. Canonical points to Pages, limiting but not eliminating stale-host risk. | Owner retires/disconnects it or configures a production-only permanent redirect. No repo redirect was added that would inadvertently affect previews. |
| CMS-01, medium: hosted Studio drift | Hosted bundle lacks current search-listing fields; local build has them. New licence/slug gates also need an eventual Studio release. | Owner-authorized authenticated deploy, then actual editor/publish/permission checks. |
| Domain/mail, accepted pending cutover | Fresh public DNS still has no apex/www web A response; Google MX and SPF remain, `_dmarc` has no response. Owner deferred domain login/cutover. | Follow existing domain guide when authorized. Preserve mail records; verify DKIM with the actual configured selector and signed message rather than guessing selectors. |
| Webhooks, recipient settings, backups | Account access unavailable; operational guides describe setup but do not prove it is active. | Owner verifies hooks/failure notifications, provider recipient/quota and a restoration in a separate dataset/site. No initial migration rerun. |

Repository secret scanning/push protection were disabled in the saved public
repository API result. Enabling them is an owner-controlled settings improvement;
the audit made no settings change. Local-only browser evidence and photographs
stay ignored. The final branch is to contain source, tests and summaries only.
