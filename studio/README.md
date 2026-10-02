# btl architects content studio

Studio is https://btldesigns.sanity.studio/, using project `aur12nrf` and dataset
`production`. Do not create a replacement Sanity project.

Use Node 26. Copy `.env.example` to `.env`, fill in the project ID, run `npm ci`,
then `npm run dev`. Sign in with an account that has project access using
`npx sanity login`. A write token is optional for guarded import scripts; it
is not required in the website production environment.

Validate changes with `npm test`, `npx tsc --noEmit` and `npm run build`.
Deploy the verified editor with `npm run deploy`. This updates schemas and the
editing interface; it does not publish draft documents.

Projects, People, Press & awards, Categories, Locations, Redirects and Site
settings are managed here. Ordering screens save explicit order values.
Principals may omit their role; Team and Alumni require one. Home founders and
People team photographs are separate fields. The website keeps three desktop
team cards per row without exposing layout controls in the editor.

Press uses complete client artwork with no additional publication logo.
Reader supports an introduction, a separate opening photograph, paragraphs,
headings, nested lists, captioned photographs, pull quotes and credits.
Switching to embed or feature preview preserves reader content. Figures need
alt text and image provenance. Published galleries need exactly one cover.
See the [editing guide](../docs/editing-guide.md).

`migrate.mjs` is the initial import from `archive/original-content/`.
It uses `createOrReplace`, which can overwrite later edits, so it now refuses
an existing dataset unless recovery explicitly includes `--replace-existing`.
Back up the dataset first. Stable IDs prevent duplicates; they do not make
re-imports safe. Later updates use revision-guarded targeted patches that
preserve unrelated fields and unpublished edits.
