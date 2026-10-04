# Codex continuation from `2316d24`

4 October 2026. The owner supplied Claude's pushed `NEXT-STEPS.md` and authorized
fixing the remaining phone close regression, restoring its test, running the
full listed checks and opening a PR. Merge remains subject to owner approval.
The correction is committed as `966a6ead17b3dba2dcbec2ecb6cfa6971286eb25`.

## REV-01 phone close: diagnosis and correction

Reproduced the exact 390×844 touch journey in Chromium and WebKit: open the
third project on `/projects/`, scroll from 300 to 700 px, then close its card.
Removing the stacked reading panel immediately shortens the card by 334 px.
Both engines synchronously change scrollY from 700 to 366 and move its top from
approximately −1 to 333 px. The existing frame anchor restores 700 on the next
frame, but cannot prevent the first visible jump.

This is native scroll anchoring, not a scroll clamp: after removal the maximum
valid scroll is still 1214 px, comfortably above 700. Controlled variants
disabling native anchoring on the root or just the index preserve 700 throughout
the sampled frames in both engines. Evidence:
`.audit-work/evidence/REVIEW/phone-close-codex.{mjs,jsonl}`.

The fix is scoped CSS: `:where(.js) .pindex { overflow-anchor: none; }`.
The enhanced index already owns a bounded, user-cancellable transition anchor;
preventing the browser from also choosing its disappearing contents avoids
the synchronous correction conflict. Ordinary documents without enhancement
retain native anchoring. No reserved height, timer, history traversal, card
dimensions or document-wide scroll lock was added.

Removed only the phone `test.fixme` and its obsolete comment. The existing
45-frame assertions still require every scroll sample within 1 px and every
card-top sample within 2 px of the reader's starting position. Both engines
pass the phone and desktop variants. Page-end tests still assert no height hold,
immediate hidden navigation and eventual note removal; they pass. Close/open
race and chosen-photo swipe tests remain intact.

One initial full run timed out inside the animation-frame sampler in Chromium
(the trace's pending `Evaluate` call), rather than failing either position
assertion. The test now explicitly foregrounds its own page and additionally
asserts visible document state before sampling. Its timeout, 45-frame count and
position bounds are unchanged. Three repetitions of each phone/desktop case in
each engine pass: 12 passed, 0 failures. The complete suite is rerun rather than
reporting the timed-out run as a pass.

## Verification and release

Fresh web `npm ci`, all 61 unit tests and the complete production build pass.
Fresh Studio `npm ci`, all 12 unit tests, `tsc --noEmit` and build pass.
Targeted close/swipe/history/page-end checks: 11 passed, 1 explicit WebKit
native-CDP skip, 0 failures. Full Chromium/WebKit suite: 325 passed, 19 explicit
feature/API skips, 0 failures across 344 cases in 6.8 minutes. See
[validation.md](validation.md) for evidence and limitations.

Fresh web dependency audit: zero vulnerabilities. Fresh Studio audit: 10 high
entries rooted in the known unpatched `braces` advisory. No audit suppression,
budget change, image degradation, CMS write, account operation or live enquiry
was performed. The two-second project target remains unproven until revised
deployed measurements pass; previous baseline missed it.

Next: push the correction and open the authorized PR, identify its immutable
Cloudflare preview by exact source SHA, then report Linux Firefox, dependency
and deployed performance results honestly. A PR is review/validation, not
authorization to merge, release Studio or alter owner-managed settings.
