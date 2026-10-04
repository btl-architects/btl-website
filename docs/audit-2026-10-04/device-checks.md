# Physical-device verification still required

All recorded touch/browser checks in this audit are labelled emulation unless
explicitly real Chrome. There is no physical phone, iPad, Android tablet,
screen-reader operator or mobile simulator available in this environment.
Use the final authorized deployed preview, record its source marker, device,
OS/browser version, orientation and result. Do not test an old immutable URL.

| Device/browser | Journeys to exercise |
| --- | --- |
| Android Firefox (original report), Chrome and Samsung Internet | Home social rail while bars show/hide, fling scrolling, pause/reverse direction, rotation, reopening tab; lettering should keep its anchor through height-only changes. Width changes may deliberately recenter it. |
| iPhone Safari and Chrome | Menu open/focus/close/navigation/Back; gallery tap near both viewer arrows; pinch/pan, double tap, swipe, dismiss and return to same photograph; Press peek/read/pull-down/close; toolbar and keyboard changes. |
| iPad Safari portrait/landscape, with and without keyboard/trackpad | Approved tablet card density; swipe closed project strips without opening; tap to open/read; viewer pinch and swipe; Press detents/swipe dismissal/outside tap/close button; hardware-keyboard focus exposes hidden chrome. Fine pointer underlines also animate into view. |
| Android tablet Firefox/Chrome | Same tablet journeys, mixed mouse/touch when available, enlarged system/browser text and short landscape heights. |
| Desktop Chrome/Safari/Firefox/Edge | Approved two-up 416 px Press presentation; mouse drag/horizontal trackpad, arrow keys, current nav indicator, viewer/reader focus trap and Escape, zoom/reflow, native Back/Forward. |
| Assistive technology | VoiceOver Safari and TalkBack Chrome/Firefox with a person: names/order, dialogs and focus return, menu initial focus, image alternatives, reading-panel scrolling, validation/status announcements and keyboard alternatives to gestures. |

On Home/Projects/filtered indexes, rapidly reopen a closing project, switch
projects, close the last card near page end and repeat open/close several times.
There should be one title/note per open card, no blank tail, no stale transform,
no reserved black void, and Back should leave the index after cards are closed.
Forward may restore the active project. Reloading a real project URL serves its
standalone page; that shareable-route fallback is intentional.

At enlarged text, confirm full navigation remains reachable through the compact
menu, contact text and copy controls wrap safely, Press credit labels do not
overlap values, and gallery notes reveal their title and final metadata by
vertical scrolling. Check ordinary layouts too, so an accessibility fix does
not silently resize approved cards.

Test enquiry paths against an intercepted test provider, never by repeatedly
submitting real enquiries. Include whitespace-only fields, invalid email,
short valid `Hi`, 5000-character boundary, provider rejection/429, malformed
response, offline/timeout, double submit, success and browser Back. Text should
survive failures and each state should give visible feedback. Real inbox
receipt, recipient and quotas require a separately authorized owner check.

Check copy at mouse hover, keyboard focus, touch, repeated copying and denied
clipboard permission. Feedback should not leave a permanently visible duplicate
button. Check reduced motion and Save-Data without making ambient films request
video; the owner-approved control-free film remains a documented accessibility
exception, not a claim of full AA conformance.

## Desktop versus tablet input (added after the width-only tablet fix)

1. On a Mac or Windows laptop with no touchscreen, set the browser window to about 1280 px wide (or zoom a
   1440 px window to 110%). Home: "See every project" and "Everyone at btl" show no green line until hovered;
   Press cards are the large desktop size. Repeat at 1024 px.
2. On an iPad (portrait and landscape) with no keyboard: the same lines are drawn at rest, Press cards are the
   compact tablet size, and closed project strips swipe sideways.
3. Attach a Magic Keyboard/trackpad to the iPad and reload: the tablet treatment must remain (the touchscreen
   is still present), and the trackpad pointer can still open cards and the viewer.
4. On a Windows touchscreen laptop, note that the tablet treatment applies at 768–1366 px; this is intended for
   touch-capable devices. Report if that feels wrong in practice.
