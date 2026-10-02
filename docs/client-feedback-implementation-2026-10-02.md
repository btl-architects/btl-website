# Client feedback implementation — 2 October 2026

Implemented locally on `codex/client-feedback`, based on `6155725`. The scope
starts after the 1 October 12:37 PM voice notes and includes the 2 October
follow-ups. Earlier team density and Thank-you decisions are preserved.

## Delivered changes

| Feedback | Result |
| --- | --- |
| F02 — Alumni pictures | Team and Alumni share the same portrait card. The rebuilt People page includes Noel’s currently published portrait. Publishing a replacement and rebuilding now updates that section through the normal image pipeline. |
| F03 — Founder roles | Principals can leave the role blank. Home, People and profiles omit the empty role element. Team and Alumni still require a role. Existing published role values were preserved. |
| F04 — Page headings | Projects, Press, Contact and Privacy use a 28–40px page-title scale. Statements and Thank-you keep their existing styles. |
| F05 — Navigation | Desktop navigation and the mobile menu use weight 400. Underlines, focus states and menu controls remain intact. |
| F06 — Homepage links | “Everyone at btl” and “Send an enquiry” use the existing secondary grey, with clear hover and keyboard focus states. |
| F07 — Press pictures | Each entry has a separate main-image field, independent of its logo and related project. Home and Press prefer that image. Full covers retain their lettering: layout does not crop them, old CMS crops are ignored for this treatment, and hover does not zoom them. Older records retain their project-photo fallback; new entries can explicitly choose it. |
| Browser follow-up — dark publication logos | Transparent publication marks render in white on Home and Press. The treatment only applies to the small logo; cover and photograph colours are preserved. Logo alternative text uses the publication name. |
| F09 — Ordering | Separate Arrange people and Arrange projects screens support drag handles, arrow keys and Move up/down. Publish order saves positions in one guarded transaction. Queries use a stable ID tie-breaker. People stay within their published sections; hidden and new records are retained. |
| F10 — Statement fade | The existing scroll reveal works and was retained. Added checks cover normal scrolling, browser Back, reduced motion and disabled scripts. |
| F11 — Image roles | Project-only choices now have explanations and are hidden for portraits and Press images. The guide explains Cover, Photograph and Drawing. |
| F08 — Already answered deletion question | The guide records the existing Press deletion workflow. No entries were deleted. Untitled Press entries now have a readable editor preview. |

Also fixed an existing mobile-menu focus timing issue exposed by Safari checks:
deferred initial focus no longer overrides a quick Tab or Escape. Patched the
editor’s transitive Undici and DOMPurify dependencies and the local website
test server’s Undici dependency; no framework major upgrade was required.

The first GitHub browser run reached Firefox successfully and exposed an extra
Tab stop on an open project’s scroll container. The container now has
`tabindex="-1"`; its photographs remain keyboard controls. The existing Tab
check also verifies moving to the next photograph and back. The focused Chrome
and Safari checks passed after this follow-up. The next GitHub run passed all
97 browser checks, including Firefox, with two intentional clipboard skips.

That run exposed slow homepage startup: its trace attributed forced style and
layout work to the startup token and header measurements. Both now run after
first paint; event handlers remain available immediately, and the opening film
keeps its existing scheduling. Fourteen focused Chrome/Safari checks passed
for gallery access, menus, video, reduced motion and the statement reveal.

## How ordering protects other edits

Only `order` is changed. Published records and their existing drafts receive the
same position; draft text and images remain unpublished, and new records remain
drafts. A fresh comparison rejects a list changed by another editor. Revision
guards protect the commit from conflicting edits to its records. All patches
are sent together, so a rejected transaction cannot leave a partial order.
This uses Sanity’s documented [mutation and transaction behaviour](https://www.sanity.io/docs/apis-and-sdks/js-client-mutations).

The explicit **Publish order** action replaces the plan’s proposed separate
draft-order stage. It makes a position-only publication reviewable while avoiding
publication of unrelated draft changes. Leaving the arrangement view without
publishing or discarding is discouraged in its visible instructions; browser
reload/close also warns about pending changes.

## Verification

- Website build passed: 17 pages, 12 redirect rules, valid metadata, links,
  structured data, sitemap and transport headers. All 240 requested image
  renditions warmed successfully. Output remains within the existing budgets.
- Website tests: **12 passed**, including independent Press images, legacy
  fallback, image-less awards, full-frame covers and Alumni portraits.
- Editor tests: **6 passed**, including order persistence, draft isolation,
  concurrent-edit rejection, section boundaries, optional founder roles and
  context-sensitive image controls. Type checking and editor build passed.
- Integrated Chrome and Safari run: **65 passed, 1 intentionally skipped**. The skip
  is the existing Chrome-only phone-copy check. Checks cover accessibility and
  overflow at 320, 375, 768 and 1440px, image resolution, galleries, zoom,
  history, keyboard focus, mobile menus, motion and enquiry failure recovery.
  After tightening cancellation of deferred menu focus, its strengthened check
  passed **6 repeat runs** across Chrome and Safari against the final build.
- Firefox could not launch locally: its bundled browser reports “Could not
  find profile folder” before any page loads. Reinstall check and an alternate
  temporary directory did not resolve it. Firefox remains a release check;
  the repository’s Firefox test configuration has not been removed or weakened.
  The first GitHub run did launch Firefox: 96 checks passed, with two intentional
  clipboard skips and one gallery Tab failure. Its follow-up is described above.
- Local editor UI verification used isolated fixture records. Dragging,
  keyboard moves, Publish order, reopening/reloading and Discard changes worked.
  No Sanity writes were made by these checks.
- Performance measurement on the integrated preview scored **100** on Home,
  Nelly House and Contact, with LCP **1.745s / 1.517s / 1.524s** and CLS **0**.
  An earlier Home measurement was 2.223s; local measurements vary, so production
  performance still needs to be checked on the release host.
- Both dependency scans report zero vulnerabilities at verification time.
  Website checking retains five existing informational hints, with no errors
  or warnings.
- After the startup adjustment, local performance scored 100 on all three
  measured routes: Home LCP 1.738s, project 1.515s and Contact 1.518s, all with
  CLS 0. The preceding GitHub run measured Home at score 76 and LCP 2.180s,
  which prompted the trace investigation. Final GitHub checks are tracked on
  [PR #16](https://github.com/btl-architects/btl-website/pull/16).
- After the logo fix, the website build and all 12 website tests passed again.
  Press accessibility and Home scroll/Back/no-script checks passed in Chrome
  and Safari (6 checks). Both published logos load and are visibly white at
  desktop and 375px widths; the main photographs retain their original colours.
  The editor's 6 tests, type checking and build passed again before release.

## Visual evidence

Local evidence is in `client-feedback-evidence-2026-10-02/` beside this report.
It contains photographs and is excluded from Git:

- `people-after.png`: published People data, including Alumni portrait.
- `people-mobile-after.png` and `contact-mobile-after.png`: verified 375px layouts.
- `projects-after.png`, `contact-after.png`, `press-after.png`: title/navigation
  review against the initial desktop screenshots.
- `home-statement-after.png`: visible statement after scrolling.
- `press-mobile-after.png`: corrected white publication marks at 375px.
- `ordering-after.png`: saved and reopened local arrangement fixture.
- `press-covers-desktop.png` and `press-covers-mobile.png`: clearly labelled
  synthetic cover fixtures showing lettering at both edges. They demonstrate
  the new rendering without substituting test assets into real content.

The local fixtures and preview tool are outside website routes and production
output. The actual magazine files from WhatsApp have not been imported or
assigned; existing publication-logo uploads are still treated as logos.

## Remaining release work

The compatible editor was deployed with explicit user approval on 2 October
to [btldesigns.sanity.studio](https://btldesigns.sanity.studio/). Sanity confirmed
the schema and editor deployments succeeded. The in-app browser reached the
login page; its session cannot verify the founder form in the hosted editor.
Reload the signed-in editor to use the updated schema. No draft content was
published by the deployment.

The website code still needs its release. Assign the desired real Press images,
clear founder roles if desired, and choose the actual People/Projects order.
Preview and publish those content choices, and confirm a successful host rebuild.
No live content was reordered, deleted, or published during this task.

Client acceptance, Firefox verification, production performance and the live
publish-to-rebuild connection remain release checks. The local build proves the
templates render published content; it does not prove the deployment connection.

Use the updated [editing guide](editing-guide.md) for the client workflow. For
rollback, revert these code changes and restore the previous deployment. Added
optional fields can stay in Sanity; no dataset restoration is needed because
this task made no live data changes. Preserve existing project publish actions,
slugs, redirects and enquiry/privacy settings.
