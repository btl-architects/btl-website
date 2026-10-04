# Visual, accessibility and interaction audit continuation

4 October 2026. Audit baseline `6b2002fd352d9bf044954f40a507fd7c5c741b57`, served as a production-style copy on local port 8804. This report extends Claude's saved VIS, A11Y and IX evidence; original evidence and findings are retained. Source changes belong to the runtime remediation owner. Final integrated retest is pending.

## Coverage and evidence

| Area | Executed coverage | Result |
| --- | --- | --- |
| Original responsive matrix | 24 routes × 34 configurations, 320–2560 CSS pixels; phone, tablet, landscape, fine and coarse pointer, breakpoint neighbours | All 816 route/configuration states now have evidence: 800 original successes plus the 16 ultra-wide cases rerun after the old server stopped. The failed original attempts remain recorded as infrastructure failures, not site defects. |
| Visual collision follow-up | Chromium and WebKit, eight width/height/input combinations, Home section scrolling (96 samples) | No navigation item overlap. Some rail padding bounds intersect prose bounds; screenshots keep the actual rail lettering clear of prose. |
| Standalone gallery descriptions | Six projects × 14 height/width/input configurations (84 samples), Chromium | Confirmed content cropping in short windows: VIS-R01. |
| Reflow and text | Ten routes × ten configurations (100 samples), Chromium: 200/400% equivalent reflow geometry, 125/150/200% root text enlargement and WCAG text spacing | Reflow and spacing avoid document-wide horizontal scrolling; text-only growth reveals VIS-R02–R04. |
| Synthetic growth | Seven scenarios × six configurations (42 samples): 20 projects, 12 Press cards, long titles/locations/names, empty descriptions, extreme picture ratios | Titles, images and compact tablet grid remain contained. Founder names reveal VIS-R05. No content was written to the CMS. |
| Existing automated accessibility | All 24 routes at three Chromium widths; ten WebKit routes; menu, gallery, viewer, reader, validation/sending/failure/success and copy states | Saved axe runs have no violations. This does not clear visual focus visibility or contrast over images. A11Y-01 and IX-01 remain verified baseline defects. |
| Extra engine layout | 24 routes × four representative WebKit configurations (96 samples) | No uncontained overflow or clipped layout. `missing-matrix.json` also contains the 16 completed Chromium ultra-wide retries. |
| Forced colours and keyboard overlay states | Contact, reader and viewer at three widths in Chromium forced colours; equivalent ordinary-colour WebKit states (18 extra axe samples) | Forced-colour text/field outlines remain visible. Six raw axe contrast alerts disagree with rendered/computed system colours; verified tool discrepancy, detailed below. Keyboard reader navigation and Escape restore the page without inert residue. |
| Motion frames/reduced motion | Phone, tablet and desktop, both motion settings (90 captured card frames; reader and menu states) | Reduced motion transitions are effectively instantaneous; normal tablet/phone cards use 700ms and readers 320ms. Baseline menu focus race reproduced. |

Reflow cases use the same CSS viewport geometry as browser zoom, not a physical browser toolbar zoom operation. Text-only and text-spacing cases are deliberate local stylesheet overrides. Touch is Playwright emulation. WebKit is not physical iOS/iPadOS Safari. Local Firefox remains blocked by its profile-folder launch failure. Physical-device scrolling/toolbars, assistive technology operated by a person and an actual screen-reader session remain untested.

Original matrix evidence: `.audit-work/evidence/VIS/json/matrix/` and `matrix/`. Continuation scripts, logs, measurements and screenshots: `.audit-work/evidence/RESUME-VIS/`.

## Confirmed findings

### VIS-R01: Inline project descriptions are cropped in short windows

- **Severity:** medium. **Kind:** visual/accessibility bug. **Confidence:** confirmed.
- **Where:** standalone project pages. Baseline `web/src/styles/components.css:324` (`.rail`) and `:339` (`.rail__note`).
- **Reproduction:** open `/projects/nelly-house/` at 844×390 with touch. The note's title and opening sentences extend 83px above the rail, which clips vertical overflow. The visible paragraph begins in mid-sentence. Threaded Time loses 83px; Conservatory 37px; Teak and Terra 13px. Nelly and Threaded also lose 37px at 1024×600 touch and 43px at 1280×593 mouse. Normal 1180×820 and 1440×900 fit.
- **Cause:** fixed-height photographs determine the rail height. A flex column bottom-aligns a taller description without a safe alignment/scrolling fallback. Automated text-overlap flags here describe already clipped text, rather than an additional visible title collision.
- **Fix:** retain approved photograph heights; let oversized note content start safely and scroll independently, including a usable keyboard alternative. Preserve bottom alignment when the note fits. Runtime owner is implementing this.
- **Evidence:** `misc/railnote/railnote.json`, `misc/railnote/pl844x390-nelly-house.jpg`, `railnote.log`.

### VIS-R02: Enlarged text can move desktop navigation outside a tablet window

- **Severity:** medium. **Kind:** accessibility bug. **Confidence:** confirmed with text-size simulation.
- **Where:** shared header; `.header__inner`/`.nav`, navigation breakpoint at 48rem.
- **Reproduction:** 820×1180, root font-size 150%. Navigation extends to x=895.8px; Contact is cut off outside the viewport. All ten sampled routes reproduce this. Normal-size navigation fits.
- **Cause:** link text grows while the width-based desktop composition remains active; no fallback checks whether the actual navigation fits.
- **Fix:** an accessible compact navigation fallback when measured header content no longer fits, without changing the normal approved desktop/tablet composition. Do not prevent text resizing or reduce font scaling to hide the defect.
- **Evidence:** `zoom/zoom.json`; `zoom/text150-t820-contact-vp.jpg`.

### VIS-R03: Large text overflows contact rows and project paging

- **Severity:** medium. **Kind:** accessibility bug. **Confidence:** confirmed with text-size simulation.
- **Where:** Home/Contact contact links and standalone project's pager.
- **Reproduction:** 390×844 with root font-size 200%. Home document width is 413px; Contact 406px; Nelly House 445px. The project's next-project label forces its flex item beyond the right edge. Contact rows reserve their text plus copy control without enough wrapping/shrink allowance.
- **Fix:** preserve copy controls and normal composition; allow contact text, flex items and pager labels to shrink/wrap. Keep individual controls reachable.
- **Evidence:** `zoom/zoom.json`, `zoom/text200-p390-home-full.jpg`, `zoom/text200-p390-contact-full.jpg`, `zoom/text200-p390-projects_nelly-house-full.jpg`.

### VIS-R04: Press article credit labels overlap their values with enlarged text

- **Severity:** medium. **Kind:** accessibility bug. **Confidence:** confirmed with text-size simulation.
- **Where:** `/press/elle-decor-nelly-house/`, shared `.press-article__credits`; baseline `components.css:2100–2103`.
- **Reproduction:** 390×844, root font-size 200%. “Architecture” overlaps “btl architects” by 34.8px; “Photography” overlaps the photographer value by 44.5px. At 150% the label already escapes its grid cell.
- **Cause:** `dd` allows anywhere wrapping but `dt` does not. Long indivisible labels overflow the narrow first column.
- **Fix:** allow labels to wrap within their grid column and ensure grid items can shrink. Ordinary reader card sizing need not change.
- **Evidence:** `zoom/zoom.json`, `zoom/text200-p390-press_elle-decor-nelly-house-full.jpg`.

### VIS-R05: A longer principal name can widen Home on phones

- **Severity:** low. **Kind:** content resilience bug. **Confidence:** confirmed with synthetic DOM-only content.
- **Where:** `.spread__names > span` uses `white-space:nowrap` in the shared founders caption.
- **Reproduction:** replace one principal name with “Ar. Annamalai Venkataraghavan Subramaniam-Pillai”. Home expands to 392px at a 320px viewport, and 395px at 390px. This is a plausible future authored name, not a request to change the current names.
- **Fix:** cap caption items to their available width and allow wrapping when necessary. Preserve the existing single-line rendering for names that fit.
- **Evidence:** `growth/growth.json`, `growth/p320-home-long-full.jpg`.

## Existing defects retained from Claude

- **A11Y-01, medium:** keyboard focus remains invisible in a touch photograph viewer after its controls are hidden. Saved focus/opacity measurements and screenshots confirm this independently of axe. The runtime owner must restore control visibility on keyboard focus.
- **IX-01, low:** first focus into the phone menu races its opening visibility transition. Motion allowed fails Chromium; WebKit also fails reduced motion. Waiting for visibility or changing the opening visibility transition is necessary; testing only a subsequent Tab is insufficient.
- **IX-02, medium:** closing a project card creates an extra history entry; Back reopens closed cards. Retest open/close, switching cards and Back/Forward after the runtime fix.
- **IX-03, low:** navigating from the menu and returning via bfcache restores the menu open, with background inert and scroll locked. Retest with real Chrome bfcache explicitly enabled.
- **IX-04:** reloading an in-place project's shareable URL loads the standalone project page. This is consistent with a URL naming the project; treat the dead index-only fallback/documentation as an implementation clarity issue, not automatically a redesign requirement.

## Design observations and limits

Phone and desktop card sizing, complete publication artwork, three people per desktop row, profiles disabled and the control-free ambient film exception are accepted owner decisions. They are not defects. Existing Press grid growth uses more columns in the tablet band; ordinary desktop keeps its approved two-column presentation. Synthetic 12-article growth stays contained.

The matrix finds several image requests below ideal device-pixel density, especially a landscape opening poster cropped into a tall tablet. These measurements identify asset-density limitations, not proof that every affected photograph looks unacceptably blurred. Some CMS originals themselves bound available resolution. Any adjustment needs the performance owner's assessment and preservation of the authored film framing; no global quality reduction or unasked image redesign is proposed.

Text-over-image contrast remains partly manual/indeterminate. Axe cannot certify contrast over photographs, video frames vary, and screenshots of current frames cannot prove all future authored frames. No claim of complete WCAG conformance or physical-device certification is made.

## Independent integrated verification plan

Independent review of the first integrated build caught and reported two additional regressions before release: WebKit reduced-motion menu focus still stayed on the toggle, and the copy-space reservation wrapped ordinary Home contact details at 820/1440. The copy reservation is corrected: both engines again render each normal email/phone as one glyph line at 390/820/1440. A first visibility retry still missed a WebKit frame in which the menu parent was visible but its Home link inherited hidden visibility. `menu-focus-trace.json` confirms that the native focus call silently failed. The runtime owner is correcting the target-visibility/success check; final verification remains pending.

After the lead rebuilds integrated source, start a fresh copy on the assigned port and record the exact build identity. Recheck: note title and final metadata reachable at short landscape and enlarged text; Contact link/copy and next-project labels contained at 200%; full header navigation reachable at tablet enlarged text; Press credits separated; future names wrap; hidden viewer controls become visible upon Tab; menu first focus with motion allowed; card close and switching Back/Forward; real Chrome bfcache menu cleanup. Check unchanged normal phone/tablet/desktop sizing and compare targeted screenshots against this baseline. Reuse stable prior coverage rather than regenerate all 816 baseline states.

## Forced-colour automated contrast discrepancy

Chromium reports active forced colours, computed label colour `rgb(0,0,0)`, body background `rgb(255,255,255)` and `forced-color-adjust:auto`. Screenshot pixel sampling finds black label ink on white (21:1 for the solid colours). Axe 4.13 nevertheless reports the author's muted `#8a8a8a` as the foreground on forced white, yielding a false 3.45:1 alert for that label. Raw violation data is retained in `forced-contrast-probe.json` and the before-axe screenshot. Ordinary-colour axe coverage remains clean. This is an evidence-backed tool discrepancy, not a site contrast-rule waiver; image/video contrast remains separately unconfirmed. The white raster brand mark is visually lost on the forced light canvas, while navigation labels and focus indicators remain usable; an alternate high-contrast mark is a design recommendation, not a new WCAG text-contrast defect.

## Intermediate independent verification

The integrated snapshot built at `2026-10-04T07:11:50.149Z` declares source `6b2002f`, dirty source true. Seventy-one targeted states passed with no runtime page errors before the remaining WebKit menu assertion halted the run; partial JSON is retained. Short reading panels at standard/enlarged text are reachable with keyboard End in both engines. Normal Chromium overview sizes remain: 390px viewport Press 162.48px/project 185.67px; 820px Press 256px/project 147.59px; 1440px Press 416px/project 242px. Both engines preserve one-line normal Home details. These are intermediate checks, not a claim that the complete final source audit has passed.

## A11Y-R02: Touch viewer cannot regain keyboard focus under WebKit button-tab policy

Confirmed medium accessibility defect in the integrated cross-input journey: after a photograph tap hides the viewer controls, focus moves to BODY. Chromium Tab enters Close and the focus-visibility override works. WebKit Tab remains on BODY and the controls stay hidden at both 390 and 820px, even after 850ms. The existing viewer trap handles only first/last focused buttons and never repairs focus outside the viewer; it also depends on the browser's native button Tab policy. Evidence: `viewer-focus-probe.json`, `integrated/viewer-focus-webkit-390.png`, `integrated/viewer-focus-webkit-820.png`. Runtime owner is implementing explicit button cycling/outside-focus recovery, following the menu's existing technique. This is WebKit emulation, not a physical iPad claim.

The integrated snapshot built at `2026-10-04T07:18:17.967Z` passes 98 independent target states with no runtime page errors before this assertion. Menu initial focus now succeeds in all eight separately probed engine/width/motion configurations, and normal Home contact details stay single-line in both engines. Final viewer and no-JavaScript fallback retests remain pending.
