/* Performance budgets, enforced at build time.
 *
 * A budget written in a document is a wish. This one fails the build, which is
 * the only version that survives a deadline.
 *
 * What is measured is what the visitor actually waits for on first paint: the
 * HTML, the stylesheet, the script, and the typeface. Photographs are excluded
 * deliberately — they are the content of an architecture site, they are lazy
 * below the fold, and capping them would mean capping the work. What is capped
 * instead is how many a page asks for *before* it can paint.
 *
 * Sizes are gzipped, because that is what crosses the wire.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const DIST = resolve(dirname(fileURLToPath(import.meta.url)), "..", "dist");

const BUDGET = {
  html: 60 * 1024,   // one page's markup, gzipped — includes the inline blur previews
  css: 40 * 1024,    // the whole design system, gzipped
  js: 20 * 1024,     // all of it, gzipped. There is no framework here and there should not be
  font: 50 * 1024,   // one variable face
  eagerImages: 3,    // images that load before anything else can paint
};

const gz = (p) => gzipSync(readFileSync(p)).length;
const kb = (n) => `${(n / 1024).toFixed(1)} kB`;

function* files(dir, ext) {
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) yield* files(full, ext);
    else if (e.endsWith(ext)) yield full;
  }
}

const failures = [];
const report = [];

// --- HTML, per page ---------------------------------------------------------
let worstPage = { name: "", size: 0 };
for (const f of files(DIST, ".html")) {
  const size = gz(f);
  const name = f.replace(DIST, "").replace("/index.html", "") || "/";
  if (size > worstPage.size) worstPage = { name, size };
  if (size > BUDGET.html) failures.push(`${name} is ${kb(size)} of HTML (budget ${kb(BUDGET.html)})`);
}
report.push(["largest page", worstPage.size, BUDGET.html, worstPage.name]);

// --- CSS, JS, fonts ---------------------------------------------------------
const totalOf = (ext, dir = DIST) => {
  let n = 0;
  for (const f of files(dir, ext)) n += gz(f);
  return n;
};
const css = totalOf(".css");
const js = totalOf(".js");
const font = totalOf(".woff2");

if (css > BUDGET.css) failures.push(`CSS is ${kb(css)} (budget ${kb(BUDGET.css)})`);
if (js > BUDGET.js) failures.push(`JavaScript is ${kb(js)} (budget ${kb(BUDGET.js)})`);
if (font > BUDGET.font) failures.push(`Fonts are ${kb(font)} (budget ${kb(BUDGET.font)})`);
report.push(["css", css, BUDGET.css, ""], ["js", js, BUDGET.js, ""], ["fonts", font, BUDGET.font, ""]);

// --- how much loads before the page can paint -------------------------------
let worstEager = { name: "", n: 0 };
for (const f of files(DIST, ".html")) {
  const html = readFileSync(f, "utf8");
  const eager = (html.match(/<img\b[^>]*>/g) ?? []).filter((t) => !t.includes('loading="lazy"'));
  const name = f.replace(DIST, "").replace("/index.html", "") || "/";
  if (eager.length > worstEager.n) worstEager = { name, n: eager.length };
  if (eager.length > BUDGET.eagerImages) {
    failures.push(`${name} loads ${eager.length} images before it can paint (budget ${BUDGET.eagerImages})`);
  }
}

/* --- the page ending --------------------------------------------------------
 * Every page must leave the same room above the footer, and until now that was
 * an inline padding copied by hand into six templates. The seventh, the project
 * page, did not have it, so "Every project" sat flush against the footer — and
 * nothing failed, because a missing gap is not an error, it just looks wrong to
 * whoever happens to scroll that far.
 *
 * The rule is .page-end, and this is the check that it was not forgotten. It
 * rides along here rather than in a fifth build script because this file
 * already opens every page. */
for (const f of files(DIST, ".html")) {
  const html = readFileSync(f, "utf8");
  const name = f.replace(DIST, "").replace("/index.html", "") || "/";
  const main = html.slice(html.indexOf("<main"), html.indexOf("</main>"));
  if (main && !main.includes("page-end")) {
    failures.push(`${name} has no .page-end — it will sit flush against the footer`);
  }
}

/* --- srcset integrity -------------------------------------------------------
 * A cropped image gets `?rect=106,115,748,947` from Sanity, and a comma in a
 * srcset is a candidate separator — so the browser reads "rect=106" as one
 * candidate and silently fails to load anything. It produces no console error
 * and no failed request; the image simply never appears. One photograph on this
 * site broke exactly that way and it took a screenshot to notice.
 *
 * Every candidate must be "<url> <n>w". Anything else fails the build. */
for (const f of files(DIST, ".html")) {
  const html = readFileSync(f, "utf8");
  const name = f.replace(DIST, "") || "/";
  for (const tag of html.match(/<img\b[^>]*>/g) ?? []) {
    const m = /srcset="([^"]+)"/.exec(tag);
    if (!m) continue;
    for (const cand of m[1].replace(/&amp;/g, "&").split(",")) {
      if (!/^\S+ \d+w$/.test(cand.trim())) {
        failures.push(`${name} has a malformed srcset candidate: ${cand.trim().slice(0, 60)}`);
      }
    }
  }
}

console.log("\n[budget] gzipped, first paint");
for (const [label, size, limit, note] of report) {
  const pct = Math.round((size / limit) * 100);
  console.log(`  ${label.padEnd(14)} ${kb(size).padStart(9)} / ${kb(limit).padStart(9)}  ${String(pct).padStart(3)}%  ${note}`);
}
console.log(`  ${"eager images".padEnd(14)} ${String(worstEager.n).padStart(9)} / ${String(BUDGET.eagerImages).padStart(9)}         ${worstEager.name}`);

if (failures.length) {
  console.error("\n[budget] over budget:\n");
  for (const f of failures) console.error("  · " + f);
  console.error("");
  process.exit(1);
}
console.log("[budget] within budget\n");
