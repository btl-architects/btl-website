/* One-off: turn free-text locations into location documents.
 *
 * Calicut and Kozhikode are the same city. As free text they produced two place
 * routes, each holding part of the work that belongs to one place — and no
 * amount of care at the keyboard prevents that recurring, because the field
 * accepted anything. As references it cannot happen again.
 */
import { createClient } from "@sanity/client";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
if (existsSync(resolve(HERE, ".env"))) {
  for (const line of readFileSync(resolve(HERE, ".env"), "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
  }
}

const client = createClient({
  projectId: process.env.SANITY_STUDIO_PROJECT_ID,
  dataset: process.env.SANITY_STUDIO_DATASET ?? "production",
  token: process.env.SANITY_WRITE_TOKEN,
  apiVersion: "2024-10-01",
  useCdn: false,
});

// The one editorial judgement in here: Calicut is the older anglicised name for
// Kozhikode, the practice writes Kozhikode, so they fold into one place.
const ALIASES = { calicut: "Kozhikode" };

const projects = await client.fetch(`*[_type=="project" && defined(location)]{_id, title, location}`);
const stringLocations = projects.filter((p) => typeof p.location === "string");

if (stringLocations.length === 0) {
  console.log("Locations are already references — nothing to do.");
  process.exit(0);
}

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const canonical = (s) => ALIASES[s.trim().toLowerCase()] ?? s.trim();

const places = new Map();
for (const p of stringLocations) {
  const label = canonical(p.location);
  places.set(slugify(label), label);
}

const tx = client.transaction();
let i = 0;
for (const [slug, label] of places) {
  tx.createOrReplace({
    _id: `location-${slug}`,
    _type: "location",
    label,
    slug: { _type: "slug", current: slug },
    order: i++,
  });
  console.log(`  place: ${label}`);
}
for (const p of stringLocations) {
  const slug = slugify(canonical(p.location));
  tx.patch(p._id, { set: { location: { _type: "reference", _ref: `location-${slug}` } } });
  const note = canonical(p.location) !== p.location.trim() ? `  (${p.location} -> ${canonical(p.location)})` : "";
  console.log(`  ${p.title} -> ${canonical(p.location)}${note}`);
}

const res = await tx.commit();
console.log(`\nCommitted ${res.results.length} mutations.`);
