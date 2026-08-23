/* One-way import: the prototype's JSON becomes Sanity documents.
 *
 *     node migrate.mjs            # needs SANITY_WRITE_TOKEN in studio/.env
 *
 * Safe to run more than once. Every document gets a deterministic id derived
 * from its slug, so a second run updates the same records instead of creating a
 * second set — which matters, because the first run will not be the last: image
 * uploads fail, someone spots a wrong caption, and the whole thing gets run
 * again.
 *
 * Images are uploaded once and cached by content hash in .migrate-cache.json,
 * so re-runs do not re-upload 155 photographs.
 */
import { createClient } from "@sanity/client";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..");
const SRC_IMAGES = resolve(REPO, "references and inspirations");
const CACHE_PATH = resolve(HERE, ".migrate-cache.json");

/* --- env ---------------------------------------------------------------- */
if (existsSync(resolve(HERE, ".env"))) {
  for (const line of readFileSync(resolve(HERE, ".env"), "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
  }
}

const projectId = process.env.SANITY_STUDIO_PROJECT_ID;
const dataset = process.env.SANITY_STUDIO_DATASET ?? "production";
const token = process.env.SANITY_WRITE_TOKEN;

if (!projectId || !token) {
  console.error(
    "\nMissing configuration.\n\n" +
      "  SANITY_STUDIO_PROJECT_ID — written by `npx sanity init --env`\n" +
      "  SANITY_WRITE_TOKEN       — create at sanity.io/manage → API → Tokens (Editor)\n\n" +
      "Both belong in studio/.env, which is git-ignored.\n",
  );
  process.exit(1);
}

const client = createClient({ projectId, dataset, token, apiVersion: "2024-10-01", useCdn: false });

/* --- helpers ------------------------------------------------------------ */
const site = JSON.parse(readFileSync(resolve(REPO, "site/content/site.json"), "utf8"));
const projects = JSON.parse(readFileSync(resolve(REPO, "site/content/projects.json"), "utf8"));

const cache = existsSync(CACHE_PATH) ? JSON.parse(readFileSync(CACHE_PATH, "utf8")) : {};
const saveCache = () => writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 1));

/* Deterministic ids, joined with a hyphen — NOT a dot.
 *
 * A dot in a Sanity document id is a namespace separator, not decoration. Ids
 * like `project.nelly-house` land in a private path that only an authenticated
 * request can read, so every document imported that way was created
 * successfully, reported as committed, and then was completely invisible to the
 * website — which reads the public dataset with no token. The failure is
 * silent in both directions, which is what made it worth a comment. */
const id = (type, slug) => `${type}-${String(slug).replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;

// The stubs that exist so the prototype had something to lay out. They are not
// content and must not become documents.
const STUB = /^\s*(PLACEHOLDER\b|TBD\b|TODO\b)/i;
const real = (s) => (s && s.trim() && !STUB.test(s) ? s.trim() : undefined);
const altText = (s, fallback) =>
  (s ?? "").replace(/^\s*(placeholder(\s+alt\s+text)?|TBD|TODO)\s*[—–:-]\s*/i, "").trim() || fallback;

async function uploadImage(relPath, label) {
  const abs = resolve(SRC_IMAGES, relPath);
  if (!existsSync(abs)) {
    console.warn(`  ! missing source, skipped: ${relPath}`);
    return null;
  }
  const bytes = readFileSync(abs);
  const hash = createHash("sha1").update(bytes).digest("hex");
  if (cache[hash]) return cache[hash];

  const asset = await client.assets.upload("image", bytes, { filename: label });
  cache[hash] = asset._id;
  saveCache();
  console.log(`  ↑ ${label}`);
  return asset._id;
}

const figure = (assetId, { alt, caption, credit, rights, kind }) => ({
  _type: "figure",
  _key: createHash("sha1").update(assetId + alt).digest("hex").slice(0, 12),
  asset: { _type: "reference", _ref: assetId },
  alt,
  ...(caption ? { caption } : {}),
  ...(credit ? { credit } : {}),
  rights: rights ?? "client-supplied",
  kind: kind ?? "photograph",
});

/* --- run ---------------------------------------------------------------- */
async function main() {
  const tx = client.transaction();

  console.log("\nCategories");
  for (const [i, c] of (site.categories ?? []).entries()) {
    tx.createOrReplace({
      _id: id("category", c.slug),
      _type: "category",
      label: c.label,
      slug: { _type: "slug", current: c.slug },
      order: i,
    });
    console.log(`  · ${c.label}`);
  }

  console.log("\nProjects");
  for (const p of projects) {
    const images = [];
    const cover = p.images.find((i) => i.kind === "cover") ?? p.images[0];
    const ordered = [cover, ...p.images.filter((i) => i !== cover)];
    for (const [i, im] of ordered.entries()) {
      const assetId = await uploadImage(im.src, `${p.slug}-${i + 1}`);
      if (!assetId) continue;
      images.push(
        figure(assetId, {
          alt: altText(im.alt, `${p.title}, ${p.location}`),
          caption: real(im.caption),
          credit: im.credit,
          rights: im.rights,
          kind: i === 0 ? "cover" : im.kind === "cover" ? "photograph" : im.kind,
        }),
      );
    }

    tx.createOrReplace({
      _id: id("project", p.slug),
      _type: "project",
      title: p.title,
      slug: { _type: "slug", current: p.slug },
      description: real(p.description) ?? "",
      category: (p.category ?? []).map((c) => ({
        _type: "reference",
        _ref: id("category", c),
        _key: c,
      })),
      location: p.location,
      ...(p.year ? { year: p.year } : {}),
      workStatus: p.workStatus ?? "completed",
      lifecycle: p.lifecycle ?? "draft",
      featured: !!p.featured,
      order: p.order ?? 0,
      credits: { _type: "credits", ...p.credits },
      images,
    });
    console.log(`  · ${p.title} (${images.length} photographs)`);
  }

  console.log("\nPeople");
  for (const person of site.people ?? []) {
    if (!person.name || /^\s*(team member|placeholder)\s*$/i.test(person.name)) {
      console.log(`  – skipped placeholder person`);
      continue;
    }
    tx.createOrReplace({
      _id: id("person", person.name),
      _type: "person",
      prefix: person.prefix ?? "",
      name: person.name,
      role: person.role,
      slug: { _type: "slug", current: person.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") },
      ...(real(person.bio) ? { bio: real(person.bio) } : {}),
      tier: person.tier ?? "team",
      order: person.order ?? 0,
      active: person.active !== false,
    });
    console.log(`  · ${person.name}`);
  }

  console.log("\nPress & awards");
  for (const item of site.press ?? []) {
    if (!item.publication || item.publication === "PLACEHOLDER") {
      console.log("  – skipped placeholder entry");
      continue;
    }
    tx.createOrReplace({
      _id: id("publication", item.publication + "-" + (item.date ?? "")),
      _type: "publication",
      kind: item.kind ?? "press",
      publication: item.publication,
      short: item.short ?? "",
      title: item.title,
      ...(item.date ? { date: new Date(item.date).toISOString().slice(0, 10) } : {}),
      ...(item.url && item.url !== "#" ? { url: item.url } : {}),
      ...(item.relatedProject
        ? { relatedProject: { _type: "reference", _ref: id("project", item.relatedProject) } }
        : {}),
    });
    console.log(`  · ${item.publication}`);
  }

  console.log("\nSettings");
  const foundersId = await uploadImage(
    "people/WhatsApp Image 2026-08-12 at 19.55.05.jpeg",
    "founders",
  );
  const c = site.contact ?? {};
  tx.createOrReplace({
    _id: "settings",
    _type: "settings",
    name: site.name,
    domain: site.domain,
    tagline: site.tagline,
    statement: site.home?.statement,
    studioLead: site.studio?.lead,
    studioBody: (site.studio?.body ?? []).filter(real),
    ...(foundersId
      ? {
          foundersImage: figure(foundersId, {
            alt: "Ar. Thressia Paul and Ar. Faizan Hussain outside the studio",
            rights: "owned",
            kind: "photograph",
          }),
        }
      : {}),
    nav: (site.nav ?? []).map((n) => ({ ...n, _key: n.href, _type: "object" })),
    social: (site.social ?? []).map((s) => ({
      label: s.label,
      url: s.url,
      _key: s.label,
      _type: "object",
    })),
    address: c.address ?? [],
    email: c.email,
    formTo: c.formTo,
    phone: c.phone,
    phoneHref: c.phoneHref,
    gstin: c.gstin,
  });

  console.log(`\nCommitting ${tx.toJSON().length} document mutations…`);
  const res = await tx.commit({ visibility: "sync" });
  console.log(`  committed: ${res?.results?.length ?? "?"} results, txn ${res?.transactionId ?? "?"}`);
  console.log("\nDone. Open the studio with `npm run dev`.\n");
}

main().catch((err) => {
  console.error("\nMigration failed:", err.message ?? err, "\n");
  process.exit(1);
});
