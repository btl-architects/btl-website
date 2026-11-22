# Recognition, IIID award and opening-film fixes (2026-11-22)

Working checklist for the practice's request of 2026-11-22. Tick items as they
land. Nothing is done until it is live (check `build-status.json` sourceSha).

## Status — branch `recognition-and-film` (2026-11-22)

Done in code (not yet merged or deployed): A2–A4, A6, B1–B8, C5, D1–D3, E1, G3b,
editing guide. A1 is covered in code (a `press` nav key shows as Recognition and
links to `/recognition/`); the CMS entry should still be renamed after deploy.
A5 needs `sanity deploy`.

Found on the way: `main` already had the in-app/Low Power Mode tap fix (#79,
live 2026-11-22 17:39 UTC), which covers G1–G2. What it did not cover was iOS
Reduce Motion, where the site never tried to play, so no tap could help. G3b
fixes that.

Content:
- C1–C4: the award exists as a **draft** (`drafts.award-iiid-kerala-2026-nelly-house`,
  `studio/scripts/add-iiid-award.ts`). Publish it **after** this release deploys
  (`-- --publish`). Card artwork done in the ELLE DECOR / AD format (aerial view
  of Nelly House, "IIID / DESIGN AWARDS" masthead set in Didot and Futura, not
  IIID's official logo), saved in `btl brand and assets/005 Recognition
  artwork/` and set on the draft. Its caption matches press: "Award · Nelly
  House · 2026". Placeholders: date (set to 2026-11-22) and the IIID
  announcement link (the Instagram post is embedded meanwhile).
- F: done. Clip 4's portrait film is re-cut from its 1080p landscape film,
  centred on the tree-through-roof house (Mux `DLaHyLU6…`, 1080p/720p/480p), with
  a matching portrait still. Published settings backed up to
  `backups/opening-before-portrait-b23da7fdbeb1-*.json` first. Mux's free plan
  is capped at 10 videos; the three the site did not use were deleted at the
  owner's request to make room. The site shows the new cut from its next build.

## A. Press → Recognition

- [ ] A1. Nav label "Press" → "Recognition" (Settings → nav in Sanity; it is CMS content, not code).
- [ ] A2. `/press/` page → "Recognition": `<title>`, `<h1>`, meta description ("Where the practice has been published" no longer fits), `copy.pressLead`, share text.
- [ ] A3. URL `/press/` → `/recognition/`, articles `/press/<slug>/` → `/recognition/<slug>/`; 301s in `web/public/_redirects` (including the existing `/press.html` rule), sitemap, canonical URLs, internal links (`Onward`, `articlePagePath`, people pages, privacy page). *(Pending decision Q1.)*
- [ ] A4. Recognition page split into two sections: **Awards** then **Press**, each with its own heading; a section with no entries is not shown.
- [ ] A5. Studio: the document list is titled "Press & awards" already. Rename it to "Recognition" and keep the kind radio (Press feature / Award). Run `sanity deploy` so the hosted Studio picks it up (hosted Studio lags the schema).
- [ ] A6. Search remaining "Press" wording site-wide (footer, people pages, reader labels, tests, e2e fixtures) and update it.

## B. Home: rotating Recognition section

- [ ] B1. Home section heading "Press" → "Recognition"; onward link → `/recognition/`.
- [ ] B2. All entries (awards + press) rotate, two cards visible at a time, in the agreed order *(Q2)*.
- [ ] B3. Motion: a slow, eased crossfade with a slight lift, staggered by card (the left card first, then the right card about 120 ms later), using the site's existing `--ease` / duration tokens. No arrows, dots or counter, so it stays ambient like the opening film.
- [ ] B4. Pauses when off-screen, when the tab is hidden, and while the visitor's pointer or finger is on a card. Tapping or clicking a card still opens it.
- [ ] B5. Reduced motion: still rotates, as a plain crossfade with no lift (Q3).
- [ ] B6. Card heights stay fixed during the swap, so the page never jumps (the reason the home page shows two cards, not three).
- [ ] B7. Record the exception in `docs/design-memory.md` R8 ("Nothing auto-advances except the opening"), which now gains a second, practice-approved exception.
- [ ] B8. Article reader on home: the reader is only loaded when a visible entry has an article page; with rotation, any entry can become visible, so this check must cover all of them.

## C. IIID award entry (placeholders until details arrive)

- [ ] C1. New Recognition entry: Kind **Award**; body **IIID Kerala Design Awards 2026**; headline **Gold — Single Dwelling**; related project **Nelly House** (`/projects/nelly-house/`); date 2026 *(exact day TBC)*.
- [ ] C2. Image: placeholder = Nelly House project photograph ("Use the project photograph") until the award or certificate photo arrives.
- [ ] C3. Ceremony video: Instagram post `https://www.instagram.com/p/DfwpIUPn8R9/` (tracking parameter removed) *(Q4: embedded or linked)*.
- [ ] C4. Announcement link: blank for now and added when IIID publishes the results.
- [ ] C5. Recognition line on the Nelly House project page: "Gold, IIID Kerala Design Awards 2026 — Single Dwelling", generated from every award whose "work that earned it" is that project, so future awards appear automatically.
- [ ] C6. Patch through the API **and** check for open drafts (patching a published doc leaves drafts stale).

## D. Search engines

- [ ] D1. `award` on the studio's LocalBusiness JSON-LD (all award entries).
- [ ] D2. Project page JSON-LD (CreativeWork / house) with `award` for that project's wins.
- [ ] D3. Recognition page title and description mention awards; the sitemap uses the new URLs.
- [ ] D4. Validate with the Rich Results / schema validator on the deployed URL.

## E. Social rail line

- [ ] E1. Remove the 1px vertical line beside YouTube / LinkedIn / Instagram on the home page's right rail (`.landing .srail__i::after` in `components.css`). Hover and focus still brighten the word; keyboard focus keeps a visible outline.

## F. Opening film, clip 4 framing ("thirunelly 2")

Finding: clip 4 is the only clip with its own uploaded portrait cut, and that cut is
framed on the left roof edge. It misses the house with the tree through its roof.
The other five use the landscape film centre-cropped, which is fine.

- [ ] F1. Re-cut a 9:16 portrait version from the original landscape source, framed on the tree-through-roof house (slightly right of centre).
- [ ] F2. Show the crop as stills for approval before uploading.
- [ ] F3. Upload as the clip's portrait film (Mux) and replace the portrait poster to match.
- [ ] F4. Check on a phone-sized viewport.

## G. iPhone: opening film does not play (Instagram in-app browser, Chrome, tap)

Finding: the film only plays through muted autoplay. When iOS refuses autoplay
(**Low Power Mode**, which blocks it in Safari, Chrome and Instagram alike, since
all iPhone browsers use WebKit), `play()` is rejected and the code treats that as a
broken film: it shows the still and moves on. Nothing listens for a tap, so tapping
does nothing either. Separately, with iOS **Reduce Motion** turned on, the site
deliberately never loads the film at all.

- [ ] G1. Tell "autoplay was refused" (`NotAllowedError`) apart from "the film is broken".
- [ ] G2. When refused: keep the still, and start the film on the visitor's first tap or scroll touch anywhere on the page (a user gesture is allowed to start playback even in Low Power Mode).
- [ ] G3. A tap on the opening itself always starts the film.
- [ ] G3b. Reduce Motion no longer switches the film off (Q3); Save-Data still does.
- [ ] G4. Check the encodes are H.264 / baseline-compatible MP4 with fast start (Mux static renditions; confirm with ffprobe).
- [ ] G5. Test in WebKit (Playwright) with autoplay denied; ask the affected person to retry. It would help to know whether their phone was in Low Power Mode.

## H. Verification and release

- [ ] H1. Unit and e2e tests updated (press-reader spec, press-overview-density, schema tests) and passing.
- [ ] H2. Browser check: home rotation on phone and desktop, Recognition page sections, redirects, the social rail.
- [ ] H3. PR, merge, then confirm live via `build-status.json` sourceSha.
- [ ] H4. When the award photo and IIID link arrive: replace placeholders C2 and C4.

## Decisions (practice, 2026-11-22)

- Q1. **Move to `/recognition/`** with permanent redirects from every `/press/` address.
- Q2. **Newest date first.**
- Q3. **Play the opening film automatically even under Reduce Motion.** (Supersedes the earlier stills-only rule; Save-Data still gets stills. The Recognition rotation under Reduce Motion uses a plain crossfade with no movement.)
- Q4. **Embed the Instagram post** in the award entry, with a link to Instagram below it.
