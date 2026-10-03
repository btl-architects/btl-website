# Phone interaction review — 3 October 2026

Touch cues are gated on a coarse pointer without hover, below 52rem; the project strips and the viewer's finger gestures follow the screen width and the input respectively. Mouse layouts and mouse input keep their existing treatment.

## How a phone shows what can be tapped

One small vocabulary, used the same way everywhere. A phone has no hover, so each cue must be visible at rest, and each must be quiet enough that a screen is not covered in signals.

| What it is | Cue on a phone | Examples |
| --- | --- | --- |
| The onward link that ends a section or page | Green line, drawn in as the section arrives | See every project, Send an enquiry, Every project |
| A link inside (or standing alone in) a sentence | Small raised ↗ after the words | privacy notice↗, Contact the studio↗ |
| The studio's email and phone number | Small raised copy mark; tapping the words writes or dials, the mark copies | Contact page, Home contact |
| Photographs, project strips and Press artwork | None; the picture is the tap target | Galleries, project cards, Press features |
| Previous/next project | None; the PREVIOUS / NEXT label already says it | Project pages |
| Footer, social, menu, project categories | None; their place on the page says it | Footer row, social rail, menu |

Linked people (when a biography is published) keep the green line under their name, which also draws in.

## Project cards on a phone

- Each project is a film strip: two or three frames at their own proportions, edge to edge, with the name and place on the first frame (the name keeps to the page column). The strip can be swiped before it is opened; once it moves, the name steps aside.
- A tap opens the card in place, around the frame that was tapped. Every frame grows by about half (a landscape frame runs just past the phone's width), the counter, arrows and close cross appear, and the description stacks underneath. The next project follows below, as on desktop.
- The counter names the frame at the start of the strip, rather than estimating from the scroll distance.

## The photograph viewer with fingers

Mouse behaviour is unchanged. Fingers get the vocabulary of a phone's own photo app:

| Gesture | Result |
| --- | --- |
| Drag sideways | The photograph follows; past a fifth of the screen, or a flick, turns to the next or previous one, otherwise it springs back |
| Drag down | The photograph follows and the dark thins; far enough, or a flick, closes the viewer |
| Double-tap | Zoom to that spot; again to come back out |
| Pinch | Zoom about the fingers |
| Drag while zoomed | Look around; a flick keeps gliding briefly |
| Single tap | Show or hide the count, Close, arrows and caption (it no longer zooms or closes) |

Arrows and Close remain, so nothing depends on a gesture alone.

## Other phone details

- Standalone footer/contact/category links, the logo, form inputs and viewer Close offer at least 44px of touch height. Inline prose links retain normal text flow.
- Home's social rail stays fixed in the right margin while scrolling, as on desktop; without its padding it fits the phone's margin, clear of the text column.
- Individual project descriptions and credits sit below the photographs on touch layouts. The shared project-note component supplies both layouts from the same Sanity content.

Validation covers actual taps in Chromium and WebKit mobile emulation, narrow-screen accessibility/layout, native Chromium swipes on strips and in the viewer (turn, spring back, double-tap zoom, pan, pull to close), and existing desktop gallery/Press regression checks. Device emulation does not replace testing on a physical phone.
