# Migration status — prototype → Astro + Sanity

The Python prototype in `site/` settled the design language. It is now reference,
not the product. All new work happens in `web/`.

**Do not add pages to `site/build.py`.** Anything built there has to be built
again in Astro, which is what the plan's sequencing exists to prevent.

## Where things are

| | State |
|---|---|
| Repository | `git init` done. Photographs and `.env` are ignored — the contract forbids committing either. No commits yet. |
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

## Backend

`studio/` holds the Sanity studio: schemas for project, person, publication,
category and settings, all typechecking clean. `alt` and `rights` are required
at the schema level, and exactly one cover per project is enforced by custom
validation. `migrate.mjs` imports the existing JSON and all photographs, is
idempotent, and caches uploads by content hash.

**Blocked on one thing only:** a Sanity account, which I cannot create. See
`studio/README.md` — two commands, then `node migrate.mjs`.

## Still to do

- Connect `lib/content.ts` to Sanity (the seam exists; this is a swap, not a rewrite)
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
