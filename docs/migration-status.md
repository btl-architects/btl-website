# Migration status — prototype → Astro + Sanity

The Python prototype in `site/` settled the design language. It is now reference,
not the product. All new work happens in `web/`.

**Do not add pages to `site/build.py`.** Anything built there has to be built
again in Astro, which is what the plan's sequencing exists to prevent.

## Where things are

| | State |
|---|---|
| Repository | `btl-architects/btl-website`, private. Photographs and `.env` are ignored — the contract forbids committing either. |
| `web/` | Astro 7.2.4, TypeScript strict, static output, zero UI dependencies. |
| Design system | `tokens.css` → `base.css` → `components.css` copied verbatim and imported in cascade order by `Base.astro`. Unchanged from the prototype except the `@font-face` URL, which now resolves from `/assets/`. |
| Behaviour | `site.js` ported unchanged to `public/scripts/`. It reads hrefs from the DOM and absolutises them, so it is URL-shape agnostic and works with directory routes. |
| Images | One seam: `lib/media.ts`. Reads the prototype's webp manifest today, becomes Sanity's CDN later. Nothing else builds an image URL. |
| Content | Second seam: `lib/content.ts`. Reads `site/content/*.json` today, queries Sanity later. Its **types are the target CMS schema**, not the shape of today's files, so routes do not change when the CMS lands. |
| `<img>` | Renders in exactly one place, `components/Figure.astro`, which throws on a missing `alt`. |

## Routes built — 16 pages, 0 broken links, 0 images missing alt

```
/                        home: media stage, statement, work, studio, press, people, contact
/projects                index
/projects/[slug]         4 projects
/projects/type/[cat]     generated, not linked (see below)
/projects/place/[loc]    generated, not linked
/studio                  statement, full-bleed room, passages stepping across the grid
/people                  founders composition + team list
/press                   masthead wall
/contact                 form + details, light ground
/404                     offers recent work
/sitemap-index.xml       generated, unearned routes excluded
/robots.txt              generated
```

Verified in the browser: cards expand **in place**, the rail is fetched from the
project's own route, all four cards stay listed, `pushState` updates the URL, no
console errors. The expansion JS survived the port unchanged.

## Two corrections the migration forced

**1. The filter bar was showing when it should not.** The design system (§05)
says the bar is *earned*: at least two categories each holding at least three
published projects. Today houses has 3 and interiors has 1, so one category
qualifies and the bar stays off. The prototype was rendering chips regardless.
Encoded in `getEarnedCategories()`.

**2. Category routes could collide with project slugs.** The prototype put both
at `projects/<name>.html`, so a project titled "Houses" would have overwritten
the Houses category page. The design system reserves `type` and `place` as
segments precisely to prevent this. Now `/projects/type/houses/`.

## Backend — connected and live

Sanity project `aur12nrf`, dataset `production`. The site reads it at build
time with no token, because the dataset is public and the content is meant to
be. **The prototype's JSON is no longer read by anything.**

In the dataset: 4 projects (all published), 3 categories, 2 people, 1 press
entry, 1 settings document, and 29 full-resolution photographs. Every display
size is derived by Sanity's CDN from those originals, so nobody has to think
about image sizes again.

Both seams paid for themselves. Swapping the file-backed adapter for GROQ
touched `lib/media.ts` and `lib/content.ts` and nothing else — no route,
component or template knew where its content came from, so none of them
changed beyond awaiting the calls.

### One trap, worth not repeating

`migrate.mjs` first built document ids as `project.nelly-house`. **A dot in a
Sanity document id is a namespace separator, not decoration.** Those documents
were created, reported as committed, and were then invisible to every
unauthenticated read — which is exactly how the website reads. The import
looked completely successful and the site saw an empty dataset. Ids are now
joined with a hyphen.

## Accessibility and responsive pass — done

- Every page has exactly one `<h1>`, heading order never skips a level, and every
  page carries `<main>`, `lang`, and a skip link.
- No horizontal overflow at 375px on any route. The photograph strips overhang
  their container by design — that is the horizontal scroll, not a layout bug.
- Reduced motion is a global kill switch over all 34 transitions, and the
  scroll reveals only exist under `no-preference`, so the structure survives and
  only the reveal is dropped.
- The focus underline on form fields clears 3:1 against both grounds, with an
  outline restored under `forced-colors` where author colours stop applying.
- Form touch targets are 43–44px.

## Still to do

- Draft / preview / publish states
- Netlify config: headers, form handling, redirects, build hook
- Responsive, reduced-motion, a11y and performance pass
- Client editing guide

## Content the studio must supply

These block launch and no amount of code fixes them.

| | |
|---|---|
| Real names, locations and years for Houses Two, Three and Four | They publish today on their photographs alone; the writeups are absent rather than faked |
| Both principals' bios | Currently absent |
| Four team members' real names | The team list stays hidden until they exist |
| Founders photograph at full resolution | The supplied frame is a 960×1280 WhatsApp copy — fine for a column, too small to ever go full-bleed |
| Written licence for the Nelly House photographs | They are Condé Nast's. `rights` is a required field precisely so one cannot be reused by accident |

## Known content issue

`Calicut` and `Kozhikode` generate two location routes for one city. That is a
content problem, not a code one — it resolves when locations become a CMS
reference rather than a free-text field.
