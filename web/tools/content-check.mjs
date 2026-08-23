/* Check the content against the rules the Studio enforces — at build time.
 *
 * The Studio validates as an editor types. That covers everything typed into
 * the Studio, and nothing else. Content seeded by script, imported, or patched
 * through the API never passes through those rules, so the dataset can drift
 * away from its own schema and the only place it shows up is a red panel that
 * somebody has to happen to open.
 *
 * That is exactly what happened: twenty-four photographs carried kind "full", a
 * value left over from an earlier draft of the design that was never in the
 * schema's list, and four had alt text below the eight-character minimum. The
 * site rendered perfectly the whole time — GROQ does not validate, and the
 * front end only ever branches on kind == "cover" — so nothing was visibly
 * wrong until the client opened the editor and found errors on every project.
 *
 * So the same rules run here, against the real dataset, before anything is
 * built. Studio-side validation is for the person typing; this is for the
 * dataset. Where the two disagree the schema wins, and this file is the place
 * that notices.
 *
 * Kept deliberately literal rather than derived from the schema: importing the
 * Studio's TypeScript into the web build would couple the two packages for the
 * sake of about thirty lines, and a validator you cannot read at a glance is
 * one nobody trusts.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@sanity/client";

const HERE = dirname(fileURLToPath(import.meta.url));

/* Astro loads web/.env by itself; a plain node script does not. On Netlify the
 * variables come from the environment and this file will not exist. */
const envFile = resolve(HERE, "..", ".env");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
  }
}

const projectId = process.env.SANITY_PROJECT_ID;
if (!projectId) {
  console.log("[content] no SANITY_PROJECT_ID — skipping");
  process.exit(0);
}

const client = createClient({
  projectId,
  dataset: process.env.SANITY_DATASET ?? "production",
  apiVersion: "2024-10-01",
  useCdn: false,
  perspective: "published",
});

// Mirrors studio/schemas/objects.ts. Changing a list there means changing it
// here, and the mismatch this file exists to catch is the reminder.
const KINDS = ["cover", "photograph", "drawing"];
const RIGHTS = ["owned", "client-supplied", "licensed", "publication"];
const ALT_MIN = 8;
const ALT_MAX = 160;

const errors = [];
const where = (doc, path) => `${doc} · ${path}`;

/* One figure, wherever it appears. Every image on the site is one of these,
 * which is what makes a single function enough. */
function checkFigure(fig, doc, path) {
  if (!fig) return;
  if (!fig.hasAsset) errors.push(`${where(doc, path)} has no image file`);

  const alt = (fig.alt ?? "").trim();
  if (!alt) errors.push(`${where(doc, path)} has no alt text`);
  else if (alt.length < ALT_MIN)
    errors.push(`${where(doc, path)} alt is ${alt.length} characters, minimum ${ALT_MIN} — "${alt}"`);
  else if (alt.length > ALT_MAX)
    errors.push(`${where(doc, path)} alt is ${alt.length} characters, maximum ${ALT_MAX}`);

  if (!fig.rights) errors.push(`${where(doc, path)} has no licence set`);
  else if (!RIGHTS.includes(fig.rights))
    errors.push(`${where(doc, path)} licence "${fig.rights}" is not one of ${RIGHTS.join(", ")}`);

  // kind only applies to figures inside a project's image list; a portrait or a
  // masthead has no role to play in a project.
  if (fig.checkKind) {
    if (!fig.kind) errors.push(`${where(doc, path)} has no role set`);
    else if (!KINDS.includes(fig.kind))
      errors.push(`${where(doc, path)} role "${fig.kind}" is not one of ${KINDS.join(", ")}`);
  }
}

const data = await client.fetch(`{
  "projects": *[_type == "project"]{
    _id, title, lifecycle, "slug": slug.current,
    "images": images[]{ alt, rights, kind, "hasAsset": defined(asset.asset) }
  },
  "people": *[_type == "person"]{
    _id, name, "portrait": portrait{ alt, rights, "hasAsset": defined(asset.asset) }
  },
  "publications": *[_type == "publication"]{
    _id, publication, "logo": logo{ alt, rights, "hasAsset": defined(asset.asset) }
  },
  "settings": *[_type == "settings"][0]{
    "founders": founders{ alt, rights, "hasAsset": defined(asset.asset) }
  }
}`);

for (const p of data.projects ?? []) {
  const id = p.title || p._id;
  if (!p.slug) errors.push(`${id} has no slug`);
  const imgs = p.images ?? [];
  if (!imgs.length) errors.push(`${id} has no photographs`);
  imgs.forEach((fig, i) => checkFigure({ ...fig, checkKind: true }, id, `photograph ${i + 1}`));

  // The cover is what the home page and the index lead with. Two covers means
  // the choice is made by array order, which is not a choice anyone made.
  const covers = imgs.filter((f) => f.kind === "cover").length;
  if (p.lifecycle === "published" && covers !== 1)
    errors.push(`${id} has ${covers} covers — a published project needs exactly one`);
}

for (const p of data.people ?? []) checkFigure(p.portrait, p.name || p._id, "portrait");
for (const p of data.publications ?? []) checkFigure(p.logo, p.publication || p._id, "logo");
checkFigure(data.settings?.founders, "Settings", "founders photograph");

if (errors.length) {
  console.error(`\n[content] refusing to build — ${errors.length} problem${errors.length > 1 ? "s" : ""}:\n`);
  for (const e of errors) console.error("  · " + e);
  console.error("\nFix these in the Studio, then build again.\n");
  process.exit(1);
}

const n =
  (data.projects ?? []).reduce((a, p) => a + (p.images?.length ?? 0), 0) +
  (data.people ?? []).filter((p) => p.portrait).length +
  (data.publications ?? []).filter((p) => p.logo).length;
console.log(`[content] ${n} figures valid`);
