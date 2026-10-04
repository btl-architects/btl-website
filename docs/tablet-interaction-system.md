# Tablet layout and interaction system

Tablet layouts cover 768–1366 CSS pixels, including portrait and landscape. Width chooses the composition and density; input chooses touch gestures or mouse behavior. Section-link underlines animate into view across this tablet band, including previews with a cursor. Reduced motion shows the cue immediately.

| Feature | Tablet decision |
| --- | --- |
| Navigation | Desktop navigation with finger-sized links; phone menu below 768px. |
| People and Studio | Side-by-side image and text, with a smaller column gap in portrait. |
| Contact | Two-column layout; visible copy controls on touch, validation and sending feedback, short messages accepted. |
| Project previews | Compact horizontal strips showing multiple photographs; native swiping on touch; horizontal trackpad scrolling and mouse dragging in tablet previews. A swipe never opens a card. |
| Open project cards | Larger photos, readable text below, close and gallery controls; retain the project through split view and rotation. |
| Individual project pages | Desktop heading and photograph rail; the compact phone reading block stays a phone layout. |
| Photograph viewer | Tap for controls, pinch/double-tap to zoom, drag to pan, sideways swipe to change photos, downward swipe to close. |
| Press previews | Preserve the phone’s existing two-up size and desktop’s 416px two-up cards and spacing. Tablet thumbnails cap at 256px and 32svh (including larger touch tablets). Only tablet grids add columns for future articles instead of enlarging cards. Shared on Home and Press. |
| Press reader | Wider touch card with peek/full positions, swipe up to read, pull down to lower/close, outside tap to dismiss. Touch reader gestures do not stop at a tablet width boundary. A mouse reader opens fully. |
| Link cues | Section underlines draw on entry; inline link marks and touch feedback follow the phone behavior. |
| Loading and media | Responsive sharp images, low-priority neighboring photos, wide opening footage, reduced-motion and Save-Data handling. |
| Accessibility | Keyboard controls remain available alongside touch controls; reduced motion suppresses moving cards and reader transitions. |

Project density is defined in `web/src/styles/tokens.css` and consumed by the shared card component on Home and every project index:

| Layout | Preview height | Open photograph height | Gap between projects |
| --- | --- | --- | --- |
| Phone | `clamp(10rem, 22vh, 12rem)` | `clamp(15rem, 33vh, 17.5rem)` | 3rem |
| Tablet | `clamp(9rem, 18vw, 15rem)` | `clamp(16rem, 32vw, 25rem)` | 2rem |
| Desktop | `clamp(11rem, 27vh, 21rem)` | `clamp(19rem, 56vh, 32rem)` | 4rem |

Use `--project-preview-h`, `--project-open-h` and `--project-card-gap`; avoid per-page card heights. `Credit.astro` mirrors the tablet Press card cap in its image sizes. `peekSizes()` in `web/src/lib/media.ts` mirrors the preview heights so the browser requests a sharp file at each layout. Photos retain their own aspect ratios. The documented 85.375rem boundary lives in `web/tools/budget.mjs`; file-size, image-quality, accessibility and performance assertions remain in force.

Browser coverage includes 768, 820, 1024, 1180 and 1366px layouts, every main route, photo resolution at 768/820px, the tablet view with a cursor, portrait/landscape gestures, Press detents, copying, mocked enquiry submission, and resizing an open gallery. Native gesture injection runs in Chromium; tap and layout coverage runs in Chromium, WebKit and Firefox. These simulations do not establish physical iPad or Firefox Android toolbar behavior; real-device checks remain necessary for that.

Individual People profiles remain disabled. Existing client text, image quality, wide-screen composition and the opening-film pause decision remain as authored.
