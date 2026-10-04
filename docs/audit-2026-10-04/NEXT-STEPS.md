# Next steps for whoever takes over (Codex)

Branch `claude/whole-site-audit` (pushed), based on `main` `6b2002f`. Read `README.md` and
`findings-ledger.md` in this folder first. The owner has asked for this branch to go to `main` after the
open issue below is fixed and checks are green.

## 1. Open issue to fix first — REV-01 phone variant

**Symptom.** On a phone layout (390×844, touch), open a project card on `/projects/`, scroll ~400 px into the
open card, then close it (close button, caption or Escape). The page scroll moves by ~334 px. It should stay
where the reader is, with the card's top fixed (design rule P10). Reproduced in Chromium and WebKit.
Desktop (1440) is fixed and passes.

**Regression, not pre-existing.** The independent review measured baseline `6b2002f` holding position at 390 px.

**What has already been tried.**
- Closing no longer uses `history.back()` (that caused the desktop jump). It now `replaceState`s a spent entry
  `{closedIndex}`; the next open reuses it, and Back from it skips once (`onSpentEntry` in `web/public/scripts/site.js`,
  `closeAll()` and the `popstate` handler).
- `anchor(card, CLOSE_SLIDE_MAX + 120)` was restored in `closeAll()` without `holdHeight()`. Not enough on phone.

**Likely cause to investigate.** Codex's ARCH-03 change removed `holdHeight(...)` from pure closes. On a phone the
open card is tall (strip plus note stacked below it in normal flow), so the document shortens a lot when it
collapses. Check whether the move comes from the scroll clamp or from browser scroll anchoring
(`overflow-anchor`). Also check whether `anchor()` releases early on the test's `touchstart`/`wheel`. Find a fix
that keeps the card in place without bringing back the black void at the end of the page (ARCH-03, which its own
test covers).

**Test.** `web/tests/browser/runtime-audit-regressions.spec.ts`, "closing a project leaves the page where the reader
is at 390px", is marked `test.fixme(viewport.touch, …)`. Remove that line once fixed; do not loosen its
assertions.

## 2. Validate

```bash
cd web
npm ci && npm test && npm run build
TEST_PORT=8792 npx playwright test --project=chromium --project=webkit
```

Last full Chromium+WebKit run, before the REV fixes, was 319 passed / 0 failed. Local Firefox cannot launch on
this Mac, so Firefox evidence comes from CI. In `studio/`: `npm ci && npm test && npx tsc --noEmit && npm run build`.

## 3. Release

Open a PR from `claude/whole-site-audit` to `main`. CI then runs Firefox, the dependency audits and deployed mobile
performance against the branch preview. Two failures are already known and must be reported, not suppressed:
- the Studio `braces` advisory (no upstream fix);
- the Nelly House LCP budget, unless the preview now passes.

Merge only with the owner's approval.

## 4. Owner-only follow-ups (not code)

Studio deploy (CMS-01), branch protection (SEC-05), retiring the old Netlify site (SEC-06), photographer credits and
licences, domain and mail, and the physical-device checks in `device-checks.md`.
