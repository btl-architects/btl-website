# Whole website audit — 4 October 2026

This continues Claude's handoff on the isolated `claude/whole-site-audit` branch,
starting from main `6b2002fd352d9bf044954f40a507fd7c5c741b57`. It covers the
website, source, dependencies, editorial/build system and delivery, rather than
only recent responsive changes. Claude pushed the audit branch through `2316d24`;
Codex is continuing its final phone regression and release checks. No audit
change has been merged to production, submitted to the enquiry provider or
written to the CMS.

Verified defects were corrected in project opening/closing and browser history,
menu/viewer keyboard focus, enlarged-text layout, optional credits, content
validation, preview authentication, production Function routing and automatic
warming. Native navigation now remains available without JavaScript. Approved
phone/desktop card sizes, tablet density, artwork, photography, authored copy
and feature flags are preserved. Specialist reviews also caught and corrected
ordinary-layout regressions before release.

## Read the results

| Report | Purpose |
| --- | --- |
| [Findings and dispositions](findings-ledger.md) | Fixed, accepted, unresolved and unverified findings, with original IDs. |
| [Validation](validation.md) | Final commands, counts, evidence, source identity and limitations. |
| [Runtime remediation](runtime-remediation.md) | Reproductions and corrections for state, history, focus, layout stability and warming. |
| [Independent visual/accessibility review](visual-accessibility-review.md) | Responsive matrix, ordinary dimensions, reflow, contrast and mixed-input checks. |
| [CMS/content integrity](content-integrity.md) | Public data, shared schema/build rules, all generated routes and deployed Studio drift. |
| [Security/dependencies/operations](security-dependencies.md) | Dependency disposition, auth/delivery checks and owner-controlled release risks. |
| [Performance](performance.md) and [independent review](performance-review.md) | Measured baseline, trace interpretation, local corrections and speed claims still needing evidence. |
| [Physical-device checks](device-checks.md) | Concrete phone/tablet/browser and assistive-technology verification. |
| [Baseline and coverage plan](coverage-plan.md) | Original source/deployment identity, inventory and audit sampling. |

## Release status

This is a reviewable correction set, not certification that every environment
or performance goal passes. The project baseline's median mobile LCP is
2649 ms, above the unchanged 2000 ms target. Revised deployed measurements and
Linux Firefox require the branch PR/Cloudflare preview checks. Local
Firefox cannot launch its profile, even with a fresh explicit profile.

The Studio dependency audit still reports ten high entries rooted in one
unpatched upstream `braces` advisory. No threshold, audit rule, numeric budget
or photography requirement was weakened. Hosted Studio schema drift, release
gating, the stale Netlify production, provider/mail settings and physical
devices remain separate owner/environment checks. The approved control-free
ambient film is an accessibility exception; automated tests cannot establish
full WCAG conformance.

The owner's latest handoff authorizes opening a PR after fixing the phone
regression and running the listed checks. Verify the immutable deployed marker
against the pushed commit; run Linux CI and unchanged cold HTTPS performance
gates. Merge still requires the owner's approval. Studio/account/DNS/CMS/mail
actions require their own authorization; branch permission does not imply
permission for them. See [Codex continuation](codex-continuation.md).

## Evidence and continuity

Raw reports, traces, screenshots, controlled fixtures and photographs remain
in the ignored `.audit-work/` directory of the audit worktree. They are not
published in Git. The validation report indexes the relevant evidence and
records how to resume; summaries and meaningful regression tests are in the
branch. The primary checkout and its handoff files remain intact.
