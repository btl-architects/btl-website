# Consolidated findings and dispositions

4 October 2026. Resumed whole-site audit, baseline `6b2002f`. Duplicate lead and
specialist IDs are grouped here; original reproductions remain in ignored audit
evidence. “Fixed locally” is not “merged/deployed”. Verification status belongs
to `validation.md`; unresolved owner/upstream/device checks are retained.

| IDs | Severity / kind | Finding | Disposition |
| --- | --- | --- | --- |
| ARCH-01 | Medium / runtime | Reopen during closing retained transforms and duplicated notes | Fixed locally: complete old cleanup before reinjection; transition regression. |
| ARCH-02 | Medium / touch | Compatibility click after viewer opening advanced to the wrong photo | Fixed locally: consume spent click; next intentional pointer press remains usable. Native-touch tests are Chromium emulation. |
| ARCH-03 | Low / interaction | Close near page end reserved a black void then clamped scroll abruptly | Fixed locally: no hold/anchor for pure closes; hide navigation with collapse. Expansion/switch anchoring retained. |
| A11Y-01 | Medium / accessibility | Touch-hidden viewer controls stayed invisible with keyboard focus | Fixed locally: focused controls expose chrome. Hardware-keyboard/switch pathways remain reachable. |
| IX-01 | Low / accessibility | Menu initial focus raced visibility, including WebKit reduced motion | Fixed locally: immediate opening visibility plus cancellable visible-state focus retry. Quick Tab/Escape not overridden. |
| IX-02 | Medium / navigation | Each closed project added extra history; Back reopened closed cards | Fixed locally: one owned project entry, replace on switching, consume on close; native Back/Forward and real project URLs retained. |
| IX-03 | Low / navigation | bfcache restored open menu/inert body/scroll lock | Fixed locally; actual Chrome bfcache restore probe passed. Other physical-browser checks remain. |
| IX-04 | Accepted / URL contract | Reload/evicted bfcache at an in-place project URL serves standalone project | Retained shareable/progressive route behavior; clarified misleading comment. No origin-page redirect or fake URL added. |
| IX-R01 | Medium / progressive navigation | Phone Menu and touch caption links required JavaScript to navigate | Fixed locally: native CMS-powered noscript menu; pointer suppression applies only with enhancement. Three-width native route/reader fallback regression, explicitly reduced-motion; independent review pending integration. |
| A11Y-R02 | Medium / mixed input | WebKit Tab could miss viewer buttons after touching a photograph | Fixed locally: explicit rendered-control focus cycle and outside-focus re-entry; four new phone/tablet cases pass both engines. |
| VIS-R01 | Medium / visual accessibility | Short-window project reading note lost title/opening copy | Fixed locally: safe bottom alignment, vertical overflow and keyboard stop; photo heights unchanged. |
| VIS-R02 | Medium / accessibility | Enlarged navigation overflowed tablet header | Fixed locally: actual-fit menu fallback, size/text observers and keyboard focus handoff; normal navigation preserved. |
| VIS-R03 | Medium / accessibility | Enlarged contact/copy rows and project paging widened page | Fixed locally: wrapping/shrink allowances and copy room at the shared content-width limit; normal single-line details checked. |
| VIS-R04 | Medium / accessibility | Enlarged Press credit labels overlapped their values | Fixed locally: labels wrap inside existing columns. No Press card resize. |
| VIS-R05 | Low / content resilience | Future longer principal name widened Home | Fixed locally: wrap only when necessary; current names unchanged. |
| CMS-02 | Medium / content | Three published project pages showed provisional photographer labels | Fixed locally: exact optional-credit normalization; genuine names retained; no CMS writes/invented credits. |
| CMS-03 | Medium / integrity | Explicit publication-owned/do-not-reuse images were publishable | Fixed locally: shared Studio/build gate. Present dataset has no forbidden classification; legal permission remains an owner fact. |
| CMS-04 | Medium / integrity | API/imported unsafe/duplicate/history routes, singleton or references bypassed editor rules | Fixed locally: pure build validation and aligned Studio slug checks; valid archived routes preserved. |
| CMS-05 | Medium / integrity | Reference existed but actual image asset could be missing | Fixed locally: dereference and verify image-asset type across all validated image slots. |
| CMS-06 | Low / integrity | API edits bypassed supplied SEO/description schema bounds | Fixed locally: mirror explicit limits without requiring optional SEO or truncating authored headlines. |
| PERF-01 / L-05 | Medium / layout stability | Social rail pin created 0.00814 structural shift | Fixed locally: pin center and preserve child transform. Baseline CI 0.0173 was below 0.02; this was not itself a CLS gate failure. Deployed revised metrics pending. |
| PERF-R01 | Medium / performance | Automatic warming started overlapping slow requests despite claiming serial behavior | Fixed locally: wait opening image; queued Promise owns markup/photo completion; low priority; intent warming still immediate. Delayed-response regression and independent VM proof. |
| L-06 | Medium / delivery | Preview Function/marker lookup ran for every production request | Fixed locally: mode-derived manifest; all preview URLs covered, production static bypass; missing/inconsistent generation refused. 22 local synthetic-mode HTTP probes passed. Deployed routing pending. |
| L-07 | Low / operations | Deployed build identity absent | Fixed locally: public source/mode/time/dirty metadata; CI rejects stale/draft/mismatched marker and mutable aliases before performance. |
| SEC-R01 | Low / reliability | Unicode preview password threw; lowercase authentication scheme failed | Fixed locally: advertised UTF-8/NFC, case-insensitive scheme, invalid config fails privately; strict complete marker. No credential changed. |
| SEC-01 / L-02 | High package advisory / build tooling | Web transitive resolution fell in reported vulnerable range | Supported lockfile resolution 4.3.0; fresh web audit 0. Upstream disputes allegation; not labelled an exploit-code fix. |
| SEC-02 / L-03 | High package advisory / upstream | Studio `braces` has no patched supported release | Open. 10 high transitive entries, one root. CLI tooling; no suppression/downgrade/budget waiver. |
| L-04 | High / performance goal | Project mobile LCP misses 2 s; Home misses on baseline CI | Open pending revised deployed measurement and any further trace-based work. No guarantee of a pass from local diagnostics. |
| SEC-05 / L-01 | High / release process | Main unprotected; Cloudflare deploys alongside failed checks | Open owner settings decision. Prepare honest green baseline; preserve CMS publish path when selecting gating. |
| SEC-06 | Medium / operations | Stale indexable Netlify production with unavailable enquiries | Open owner retirement/redirect decision. No preview-breaking repo redirect. |
| CMS-01 | Medium / deployed editor | Hosted Studio lacks current search controls/schema | Open authorized Studio deploy and authenticated UI verification. Local build passes. |
| UX-R01 (owner report) | Medium / responsive input | Tablet treatment was selected by width alone (768–1366 px), so mouse-only desktop windows in that range (laptops, unmaximised windows, zoom) showed resting green onward lines, tablet project-preview heights, browsable closed strips with notes stacked below, and 256 px Press cards instead of 416 px. Measured on production at 1280×800 and 1366×768. | Fixed locally: every tablet-band rule (tokens, components, `sizes` hints, `site.js` `browsableOverview`/`compactIndex`) also requires `(any-pointer: coarse)`. Touch tablets, including with a trackpad, unchanged; large touch tablets still matched by `(hover: none) and (pointer: coarse)`. Tests that asserted tablet cues for a mouse were replaced by mouse-at-tablet-width desktop assertions; Press density tablet cases now use a touch device. Physical iPad-with-trackpad check added to device follow-ups. |
| UX-R02 | Low / responsive input | Narrow mouse windows (<768 px) showed the Press reader's pull handle although dragging is touch-only. | Fixed locally: handle drawn only with `(any-pointer: coarse)`; card geometry unchanged. |
| IX-R03 | Medium / touch | After a partial swipe left the first photograph partly visible, tapping it opened the card with that photograph half off-screen (pre-existing; full-suite flake at `mobile-interactions.spec.ts:273`, 261 px). | Fixed locally: chosen frame placed whenever the strip is scrolled; deterministic regression test (failed 166 px before, passes after; 12/12 repeats). |
| REV-01 (independent review) | Medium / navigation | Closing a project stepped back through history, so browsers restored the index scroll: the page jumped back to where the card was opened (Chromium and WebKit). | Desktop fixed locally: closing replaces the entry instead of traversing; Back skips the spent entry; close anchor restored without the space hold. **Phone (390px touch) still moves ~334px when a tall open card closes — OPEN**, regression test marked `fixme`. |
| REV-02 | Low / navigation | Close followed immediately by an open lost the new card (late popstate). | Fixed locally (no traversal on close); regression passes in both engines. |
| REV-03 | Low / performance | One hung warming request stopped automatic warming for good. | Fixed locally: each warming step also ends after 10 s. |
| REV-04 | Low / input | Press pull handle shown where the pull gesture is off (touch laptops with a mouse). | Fixed locally: handle uses the gesture's own `(hover: none) and (pointer: coarse)`. Hybrid laptops remain a physical-device check. |
| REV-05 | Low / docs | Doc claimed 416 px Press cards for all mouse windows in the band. | Corrected: 416 px from ~1024 px; narrower mouse windows get proportionally smaller desktop cards. |
| REV-06/07 | Info | Two menu-focus retry loops could overlap; every reading note was a Tab stop. | Fixed locally: one loop; notes are Tab stops only when they overflow. |
| L-08 | Low / harness | Fixed port/shared test copy prevented isolated audits | Fixed locally: port/copy validation, per-port persistence, no reuse of stale servers. |
| L-12 | Low / documentation | Design memory/contract contradicted approved hosting/Press/social behavior | Updated current rules and historical-draft precedence; preserved numeric targets. |
| L-10 | Unconfirmed observation / visual | Header logo allegedly collided with scrolled Home heading | Not reproduced in independent Chromium/WebKit 800×600 screenshots; no speculative patch. |
| L-11 | Accepted / composition | Social lettering crosses photographs | Approved Home treatment; independent sampled screenshots do not cover prose/control lettering. |
| L-13 | Accepted / SEO | Type/place indexes omitted from sitemap and main navigation | Matches earned-taxonomy rule; profiles remain off. Generated filter routes still checked. |
| L-09 | Environment limitation | Local Firefox cannot find its generated profile on macOS | Separate explicit/tmp profile retry also fails before site loading. Do not call product failure or pass; Linux CI pending. |

Accepted owner decisions remain: phone/desktop card sizes; compact tablet system;
complete Press artwork; three people per desktop row; disabled profiles; missing
optional years/photographers; generic social destinations; control-free ambient
film accessibility exception; deferred canonical-domain activation. They are
context, not new defects.

Additional checks needing owner access or physical hardware: Studio publishing
roles/create/delete/order UX; actual inbox receipt and quotas; webhook/failure
notification configuration; backups/isolated restore; photograph/republishing
permissions and privacy retention facts; domain/mail cutover; physical mobile
toolbar animations/gesture handling and person-operated assistive technology.
