# Phone interaction review — 3 October 2026

Phone changes are gated on a coarse pointer without hover, below 52rem. Mouse layouts retain their existing visual treatment, including narrow desktop windows.

- Text destinations retain the existing green hairline at rest. Linked biographies and project paging use the same cue; plain team cards remain plain.
- Project covers show “View project”, and linked Press artwork shows “Read feature” or “Open feature”. Press cues follow the same photograph anchor as the caption. Complete publication artwork is preserved.
- Gallery photographs carry a compact full-view symbol at their leading corner, which stays visible when a landscape photograph extends beyond the phone. Touch viewer arrows remain visible at rest; they step aside during zoom.
- Standalone footer/contact/category links, the logo, form inputs and viewer Close offer at least 44px of touch height. Inline prose links retain normal text flow.
- Home’s footer includes its social destinations on phones, where the opening social rail scrolls away. Mouse layouts retain the rail and original footer.
- Individual project descriptions and credits sit below the photographs on touch layouts. The shared project-note component supplies both layouts from the same Sanity content; expanded project cards retain their existing phone stack.

Validation covers actual taps in Chromium and WebKit mobile emulation, narrow-screen accessibility/layout, native Chromium swipes in both directions, and existing desktop gallery/Press regression checks. Device emulation does not replace testing on a physical phone.
