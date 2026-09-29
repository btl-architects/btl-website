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
let zoomed = 0;
for (const f of htmlFiles(DIST)) {
  const html = readFileSync(f, "utf8");
  for (const m of html.matchAll(/https:\/\/cdn\.sanity\.io\/images\/[^\s"',]+/g)) {
    urls.add(m[0].replace(/&amp;/g, "&"));
  }

  /* The viewer's zoom renditions never appear in the HTML — site.js asks for
     them only when someone zooms — so they are derived here the same way it
     derives them: from the largest candidate in each srcset (bestSrc), at each
     width in data-zoom-widths that the original can supply (sharpen). A cold
     6000px render took 4.7s, which is a long time to look at a soft picture. */
  const rungs = (/data-zoom-widths="([\d,]+)"/.exec(html)?.[1] ?? "").split(",").map(Number).filter(Boolean);
  if (!rungs.length) continue;
  for (const [, srcset] of html.matchAll(/srcset="([^"]+)"/g)) {
    const largest = srcset.replace(/&amp;/g, "&").split(",")
      .map((part) => part.trim().split(/\s+/))
      .sort((a, b) => parseInt(b[1], 10) - parseInt(a[1], 10))[0]?.[0];
    const full = Number(/-(\d+)x\d+\.[a-z]+(\?|$)/i.exec(largest ?? "")?.[1] ?? 0);
    const have = Number(/[?&]w=(\d+)/.exec(largest ?? "")?.[1] ?? 0);
    if (!largest?.startsWith("https://cdn.sanity.io/") || !full || !have) continue;
    const top = Math.min(full, rungs[rungs.length - 1]);
    for (const w of [...rungs.filter((r) => r < top), top]) {
      if (w <= have * 1.15) continue;
      const url = largest.replace(/([?&])w=\d+/, `$1w=${w}`);
      if (!urls.has(url)) { urls.add(url); zoomed++; }
    }
  }
}

if (urls.size === 0) {
  console.log("[warm] no CDN images found — nothing to warm");
  process.exit(0);
}

const started = Date.now();
let ok = 0, failed = 0;

/* Ask the way a browser asks. Every URL carries auto=format, so Sanity picks
   the format from the Accept header and caches each format separately (the
   response says `vary: accept`). fetch() on its own accepts any type, which is
   answered with a JPEG — so this step spent every build warming JPEGs while
   every current browser was sent a cold WebP. Measured on one 3100px frame:
   Chrome's first request 2.9s, then Safari's 0.04s for the WebP Chrome had
   caused to exist; the JPEG was a separate 1.5s render no visitor would get.
   This is Chrome's image Accept; Safari and Firefox are served the same WebP. */
const ACCEPT = "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8";

// A small pool: enough to be quick, not so many that the CDN starts refusing.
const list = [...urls];
const POOL = 8;
await Promise.all(
  Array.from({ length: POOL }, async () => {
    while (list.length) {
      const url = list.pop();
      try {
        const res = await fetch(url, { method: "GET", headers: { Accept: ACCEPT }, signal: AbortSignal.timeout(30000) });   /* a cold 6000px render can take 10s+ */
        await res.arrayBuffer();
        res.ok ? ok++ : failed++;
      } catch {
        failed++;
      }
    }
  }),
);

const secs = ((Date.now() - started) / 1000).toFixed(1);
console.log(`[warm] ${ok}/${urls.size} images cached in ${secs}s, ${zoomed} of them zoom renditions${failed ? ` (${failed} failed)` : ""}`);
