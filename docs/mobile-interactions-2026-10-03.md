# Phone interaction review — 3 October 2026

Phone changes are gated on a coarse pointer without hover, below 52rem. Mouse layouts retain their existing visual treatment, including narrow desktop windows.

## How a phone shows what can be tapped

One small vocabulary, used the same way everywhere. A phone has no hover, so each cue must be visible at rest, and each must be quiet enough that a screen is not covered in signals.

| What it is | Cue on a phone | Examples |
| --- | --- | --- |
| The onward link that ends a section or page | Green line, drawn in as the section arrives | See every project, Send an enquiry, Every project |
| A labelled action on a project cover | Arrow after the label | View project → |
| A link inside (or standing alone in) a sentence | Small raised ↗ after the words | privacy notice↗, Contact the studio↗ |
| The studio's email and phone number | Small raised copy mark; tapping the words writes or dials, the mark copies | Contact page, Home contact |
| Photographs and Press artwork | None; the picture is the tap target | Galleries, Press features |
| Previous/next project | None; the PREVIOUS / NEXT label already says it | Project pages |
| Footer, social, menu, project categories | None; their place on the page says it | Footer row, social rail, menu |

Linked people (when a biography is published) keep the green line under their name, which also draws in.

- Gallery photographs carry no extra symbol; the photograph itself is the tap target. Touch viewer arrows remain visible at rest; they step aside during zoom.
- Standalone footer/contact/category links, the logo, form inputs and viewer Close offer at least 44px of touch height. Inline prose links retain normal text flow.
- Home’s footer includes its social destinations on phones, where the opening social rail scrolls away. Mouse layouts retain the rail and original footer.
- Individual project descriptions and credits sit below the photographs on touch layouts. The shared project-note component supplies both layouts from the same Sanity content; expanded project cards retain their existing phone stack.

Validation covers actual taps in Chromium and WebKit mobile emulation, narrow-screen accessibility/layout, native Chromium swipes in both directions, and existing desktop gallery/Press regression checks. Device emulation does not replace testing on a physical phone.
