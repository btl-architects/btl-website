/* Turn the CMS's redirects into Netlify's _redirects file, and refuse to ship a
 * broken set.
 *
 * A redirect is a permanent commitment to a URL somebody else controls — a link
 * in an email, a line in a printed magazine. That makes a malformed one worse
 * than none at all: a loop removes a page from the internet entirely, and a
 * redirect pointing at a 404 converts a working old link into a broken new one
 * with an extra hop in between.
 *
 * So every rule the implementation contract asks for is enforced here, at build
 * time, where it fails loudly rather than quietly on a Tuesday:
 *
 *   - chains are flattened (old -> middle -> new becomes old -> new)
 *   - a loop fails the build
 *   - a self-redirect fails the build
 *   - a duplicate source fails the build
 *   - an internal target that does not resolve to a real page fails the build
 *
 * Run after the build, so the pages exist to check targets against.
 */
import { readdirSync, statSync, existsSync, writeFileSync, appendFileSync, readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@sanity/client";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(HERE, "..", "dist");

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
  console.log("[redirects] no SANITY_PROJECT_ID — skipping");
  process.exit(0);
}

const client = createClient({
  projectId,
  dataset: process.env.SANITY_DATASET ?? "production",
  apiVersion: "2024-10-01",
  useCdn: false,
  perspective: "published",
});

const rows = await client.fetch(
  `*[_type == "redirect" && defined(from) && defined(to)]{from, to, permanent}`,
);

/* The prototype shipped project pages at /projects/<slug>.html. Those URLs may
 * have been shared, and one of them is in a magazine feature, so they have to
 * keep working.
 *
 * Written explicitly, one rule per project, rather than as a pattern. The
 * pattern version — `/projects/:slug.html` — looked obviously correct and was
 * not: a Netlify placeholder cannot carry a suffix within a segment, so it
 * matched every path under /projects/ and redirected it to the literal string
 * "/projects/:slug/". Every project page on the live site became a redirect
 * loop. Explicit rules cannot do that. */
const slugs = await client.fetch(
  `*[_type == "project" && lifecycle == "published"].slug.current`,
);
for (const slug of slugs ?? []) {
  rows.push({ from: `/projects/${slug}.html`, to: `/projects/${slug}/`, permanent: true });
}

if (!rows.length) {
  console.log("[redirects] none defined");
  process.exit(0);
}

/* Normalise: lower-case, leading slash, one trailing-slash convention. The
 * build format is "directory", so every real page lives at a trailing slash. */
const norm = (p) => {
  if (!p || p.startsWith("https://")) return p;
  let s = p.trim().toLowerCase().split("?")[0].split("#")[0];
  if (!s.startsWith("/")) s = "/" + s;
  // A .html source is a real file path, not a directory — adding a slash to it
  // would produce a rule that never matches anything.
  if (s !== "/" && !s.endsWith("/") && !s.endsWith(".html")) s += "/";
  return s;
};

const errors = [];
const map = new Map();

for (const r of rows) {
  const from = norm(r.from);
  const to = norm(r.to);
  if (from === to) errors.push(`"${r.from}" redirects to itself`);
  else if (map.has(from)) errors.push(`"${r.from}" is defined more than once`);
  else map.set(from, { to, permanent: r.permanent !== false });
}

// Flatten chains, and detect loops while doing it.
for (const [from, rule] of map) {
  const seen = new Set([from]);
  let target = rule.to;
  while (map.has(target)) {
    if (seen.has(target)) {
      errors.push(`"${from}" is part of a redirect loop`);
      target = null;
      break;
    }
    seen.add(target);
    target = map.get(target).to;
  }
  if (target && target !== rule.to) rule.to = target;
}

// Does the destination actually exist?
const pages = new Set();
(function walk(dir, base = "") {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, `${base}/${entry}`);
    else if (entry === "index.html") pages.add(`${base}/` || "/");
    else if (entry.endsWith(".html")) pages.add(`${base}/${entry}`);
  }
})(DIST);

for (const [from, rule] of map) {
  if (!rule.to || rule.to.startsWith("https://")) continue;
  if (!pages.has(rule.to)) errors.push(`"${from}" points at "${rule.to}", which is not a page`);
  if (pages.has(from)) errors.push(`"${from}" is a real page — a redirect would shadow it`);
}

if (errors.length) {
  console.error("\n[redirects] refusing to build:\n");
  for (const e of errors) console.error("  · " + e);
  console.error("\nFix these in the Studio under Redirects.\n");
  process.exit(1);
}

/* Appended, not written: netlify.toml already carries the permanent rules for
 * the prototype's .html URLs, and _redirects is a separate file Netlify merges. */
const lines = [...map]
  .map(([from, r]) => `${from}  ${r.to}  ${r.permanent ? 301 : 302}`)
  .join("\n");

const out = join(DIST, "_redirects");
existsSync(out) ? appendFileSync(out, "\n" + lines + "\n") : writeFileSync(out, lines + "\n");
console.log(`[redirects] ${map.size} written`);
