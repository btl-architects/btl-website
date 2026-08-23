/* Warm Sanity's image cache immediately after a build.
 *
 * Sanity generates each derived width the first time somebody asks for it —
 * roughly half a second — and serves it from cache after that. Left alone, the
 * people paying that cost are real visitors, one image at a time, as they
 * scroll. On a site that is almost entirely photographs, that is the difference
 * between "considered" and "slow".
 *
 * So the build asks for every URL it just generated. It runs after the pages
 * are written, in parallel, and deliberately cannot fail the build: a cold
 * cache is a slower site, not a broken one, and a CDN hiccup should not stop a
 * deploy.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// fileURLToPath, not .pathname — the repo lives in a folder with a space in it
// and .pathname hands back "btl%20website", which is not a path that exists.
const DIST = resolve(dirname(fileURLToPath(import.meta.url)), "..", "dist");

function* htmlFiles(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* htmlFiles(full);
    else if (entry.endsWith(".html")) yield full;
  }
}

const urls = new Set();
for (const f of htmlFiles(DIST)) {
  const html = readFileSync(f, "utf8");
  for (const m of html.matchAll(/https:\/\/cdn\.sanity\.io\/images\/[^\s"',]+/g)) {
    urls.add(m[0].replace(/&amp;/g, "&"));
  }
}

if (urls.size === 0) {
  console.log("[warm] no CDN images found — nothing to warm");
  process.exit(0);
}

const started = Date.now();
let ok = 0, failed = 0;

// A small pool: enough to be quick, not so many that the CDN starts refusing.
const list = [...urls];
const POOL = 8;
await Promise.all(
  Array.from({ length: POOL }, async () => {
    while (list.length) {
      const url = list.pop();
      try {
        const res = await fetch(url, { method: "GET" });
        res.ok ? ok++ : failed++;
        await res.arrayBuffer();
      } catch {
        failed++;
      }
    }
  }),
);

const secs = ((Date.now() - started) / 1000).toFixed(1);
console.log(`[warm] ${ok}/${urls.size} images cached in ${secs}s${failed ? ` (${failed} failed)` : ""}`);
