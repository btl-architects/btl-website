# btl architects website

Astro renders static pages from Sanity. Cloudflare Pages serves the website;
Sanity Studio is a separate editing application.

- Website: https://btl-website-3wo.pages.dev/
- Editor: https://btldesigns.sanity.studio/
- Intended canonical domain: https://btldesigns.in
- Sanity project: `aur12nrf`, dataset: `production`

## Local setup

Use Node 26 and npm. Both packages have committed lockfiles. In `web/` and
`studio/`, copy `.env.example` to `.env`, set the project ID and run `npm ci`.
Published content needs no read token. Do not commit either `.env`.

Run `npm run dev` in each package for the website and Studio. For a production-
style website, run `npm run build`, then `npm run serve:test` in `web/`.
It serves http://127.0.0.1:8788 with Pages middleware and security headers.
Restart it after rebuilding: its test directory is copied once at startup.
The labelled reader demonstration is local test content and never deploys.

## Checks

In `web/`, run `npm test`, `npm run build` and `npm run test:e2e`.
Install Playwright browsers first with `npx playwright install chromium firefox webkit`.
Stop an existing server on port 8788 before the browser suite starts.
For performance, set `PERFORMANCE_ORIGIN` to the exact deployed HTTPS build,
then run `npm run test:performance`. The gate does not measure the local HTTP server.
Use `TEST_PORT=8792` for an isolated browser run; its build copy and local
Wrangler persistence are separate from the default test server.

In `studio/`, run `npm test`, `npx tsc --noEmit` and `npm run build`.
GitHub runs dependency audits, tests, builds, all three browser engines,
accessibility checks and mobile performance budgets. Do not bypass a failed
check or relax a budget to publish.

## Content and deployment

Publish content through Studio; the Sanity webhook rebuilds Pages.
Saving drafts does not change the public site. Website code deploys from `main`.
Editor changes also require `npm run deploy` in `studio/`.

Press artwork and article photography are separate fields. Reader, embed and
feature preview use the same panel. See the [editing guide](docs/editing-guide.md)
and [deployment guide](docs/deploying.md).

Protected draft previews require a read-only Sanity token and a Cloudflare
runtime password of at least 16 characters. Netlify previews use published
content because Netlify does not run the Cloudflare authentication layer.
Branch previews do not send enquiries and are excluded from search.
`build-status.json` records the build mode, source commit and build time. A
local build also records whether its checkout was dirty. Production static
pages bypass the preview Function; branch and draft previews retain middleware
on every URL, including assets. The build generates and checks `_routes.json`.

Original photographs and private backups stay outside Git. Never rerun
`studio/migrate.mjs` against client content: it is an initial import, not an
updater, and refuses a nonempty dataset by default.

Design rules live in [design memory](docs/design-memory.md), CSS tokens and the
[implementation contract](docs/implementation-contract.md). Later user decisions
override historical details, including hosting, complete Press artwork, three
people per desktop row and the control-free opening film.
The film respects reduced motion, Save-Data, tab visibility and viewport
visibility. Its lack of a pause/stop control remains a documented WCAG 2.2.2
exception. Automated accessibility checks do not establish full AA compliance.
