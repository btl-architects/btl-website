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
const STYLES = resolve(dirname(fileURLToPath(import.meta.url)), "..", "src", "styles");

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

/* --- classes with nobody behind them ----------------------------------------
 * Every check on this project looked for the dead-rule direction: CSS that no
 * markup uses. The opposite went unnoticed for the life of the site —
 * .contact__grid and .contact__aside sat in the markup with no rules anywhere,
 * so the contact form never had its two columns and stacked at the full width
 * of the page. Nothing errored. Nothing could: a class that matches no rule is
 * silent by design.
 *
 * Utility and state classes are excluded by prefix, because plenty of those are
 * hooks for JavaScript rather than for CSS. */
const styles = [...files(DIST, ".css")].map((f) => readFileSync(f, "utf8")).join("\n");
/* Names that are structure rather than style: a grid places them and they need
 * no rules of their own. Anything not on this list that has no rule is a bug. */
const structural = new Set(["spread__body"]);
const ignore = /^(js|is-|has-|no-|rv|in|sr-only|container|astro-)/;
const unstyled = new Map();
for (const f of files(DIST, ".html")) {
  const html = readFileSync(f, "utf8");
  const name = f.replace(DIST, "").replace("/index.html", "") || "/";
  for (const m of html.matchAll(/class="([^"]+)"/g)) {
    for (const cls of m[1].split(/\s+/)) {
      if (!cls || ignore.test(cls) || structural.has(cls) || cls.startsWith("astro-")) continue;
      if (styles.includes("." + cls)) continue;
      if (!unstyled.has(cls)) unstyled.set(cls, name);
    }
  }
}
if (unstyled.size) {
  for (const [cls, where] of unstyled) {
    failures.push(`.${cls} is in the markup (${where}) but no stylesheet defines it`);
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

/* --- one content edge, not seven -------------------------------------------
 *
 * The site's left edge is a formula: the gutter, or past 96rem the centring
 * offset plus the gutter. It was once written out in seven separate rules. Six
 * agreed; the seventh applied --page-margin without a max-width, so on a wide
 * screen the header sat 63px from the window while the page under it sat at
 * 255. Nothing caught that, because every page looked right at 1440 — which is
 * BELOW this site's own max-width, where the two formulas happen to agree.
 *
 * So the check is not "does each page look aligned". It is "is there still only
 * one definition". A rule may consume --page-margin only if it is the shared
 * content-edge rule in base.css, or if it is genuinely full-bleed and using the
 * gutter as a plain inset with no content column to line up with.
 *
 * Adding a new full-bleed element means adding it here deliberately. Adding one
 * that belongs on the content column means joining the selector list in
 * base.css instead. Either way it is a decision someone made on purpose, which
 * is the only thing that stops the seventh copy becoming the eighth. */
const FULL_BLEED = new Set([
  ".header",       // the fixed bar spans the window; .header__inner holds the column
  ".menu",         // full-screen overlay
  ".rail",         // horizontally scrolled, deliberately runs past the column
  ".preview-flag", // pinned to the window, not to the page
  ".lb__bar",      // lightbox chrome sits over the viewport
  ".lb__cap",
]);

for (const file of readdirSync(STYLES).filter((f) => f.endsWith(".css"))) {
  const css = readFileSync(join(STYLES, file), "utf8");
  const rule = /([^{}]*)\{([^{}]*)\}/g;
  let m;
  while ((m = rule.exec(css))) {
    /* var(--page-margin) is a use; --page-margin: is the definition in :root. */
    if (!m[2].includes("var(--page-margin)")) continue;
    const sel = m[1].replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").trim();
    if (!sel) continue;
    const line = css.slice(0, m.index).split("\n").length;
    const selectors = sel.split(",").map((s) => s.trim());
    /* The canonical rule — recognised by the fact that .container is in it. */
    if (selectors.includes(".container")) {
      if (!m[2].includes("max-width: var(--max-width)")) {
        failures.push(`${file}:${line} is the content-edge rule but no longer caps to --max-width`);
      }
      continue;
    }
    const strays = selectors.filter((s) => !FULL_BLEED.has(s));
    if (strays.length) {
      failures.push(
        `${file}:${line} re-derives the content edge: ${strays.join(", ")} — join the ` +
          `shared rule in base.css, or add it to FULL_BLEED in tools/budget.mjs if it is not on the column`,
      );
    }
  }
}

/* --- a transition shorthand that eats its neighbour --------------------------
 *
 * `transition` is a shorthand: it replaces the property, it does not add to it.
 * So when one element carries two concerns that each declare a transition, the
 * rule written later wins outright and the other animation is gone — no error,
 * no warning, it simply never runs.
 *
 * That is what happened to the project cards. Every .pcard is also a .rvc; the
 * reveal declared `transition: clip-path`, .pcard declared `transition: height`
 * a few lines further down at the same specificity, and the reveal was deleted.
 * The cards had been snapping into place instead of animating for as long as
 * the component has existed, which is what "everything appears at once" was.
 *
 * The reveal is now a token, and any transition list on a component that is also
 * a reveal has to include it. Checked, not trusted. */
const REVEAL_COMPONENTS = [".pcard"];

for (const file of readdirSync(STYLES).filter((f) => f.endsWith(".css"))) {
  const css = readFileSync(join(STYLES, file), "utf8");
  const rule = /([^{}]*)\{([^{}]*)\}/g;
  let m;
  while ((m = rule.exec(css))) {
    /* Only the shorthand clobbers. transition-duration and friends are additive. */
    if (!/(^|[;\s])transition\s*:/.test(m[2])) continue;
    const sel = m[1].replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").trim();
    if (!sel) continue;
    const hit = REVEAL_COMPONENTS.find((c) => sel.split(",").some((s) => s.trim() === c));
    if (!hit) continue;
    /* `transition: none` is a deliberate opt-out — reduced motion turns the
       whole thing off, and that is allowed. */
    if (/transition\s*:\s*none/.test(m[2])) continue;
    if (!m[2].includes("var(--tr-reveal)")) {
      const line = css.slice(0, m.index).split("\n").length;
      failures.push(
        `${file}:${line} sets the transition shorthand on ${hit}, which is also a .rvc, ` +
          `without var(--tr-reveal) — this deletes the card's reveal animation`,
      );
    }
  }
}

/* --- card grids state a size, not a count -----------------------------------
 *
 * A grid of repeating content has two ways to be written, and they read almost
 * the same: repeat(3, 1fr) says "three across", and repeat(auto-fill,
 * minmax(22rem, 1fr)) says "as many as fit at this size". The first one has no
 * opinion about how big a card should be — it inherits one from the window, so
 * the card grows every time the page gets wider. That is exactly what happened
 * when the page cap went from 96rem to 120rem: the press credits went from 480px
 * to 576px and were suddenly too big, with nothing in the CSS to blame.
 *
 * Layout grids — the 12-column grid, a two-up spread, a header — are legitimately
 * count-based, because the count IS the design. This only applies to grids whose
 * children are a repeating list of content cards. */
const CARD_GRIDS = [".credits"];

for (const file of readdirSync(STYLES).filter((f) => f.endsWith(".css"))) {
  const css = readFileSync(join(STYLES, file), "utf8");
  const rule = /([^{}]*)\{([^{}]*)\}/g;
  let m;
  while ((m = rule.exec(css))) {
    if (!m[2].includes("grid-template-columns")) continue;
    const sel = m[1].replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").trim();
    if (!sel) continue;
    const hit = CARD_GRIDS.find((c) => sel.split(",").some((s) => s.trim().endsWith(c)));
    if (!hit) continue;
    const decl = /grid-template-columns:([^;]+)/.exec(m[2]);
    if (!decl) continue;
    const value = decl[1].trim();
    /* A fixed small count is how the phone layout is stated deliberately — two
       across on a narrow screen is a decision, not an accident. Only the rules
       that run at width is where the card is free to grow have to be size-led. */
    const isSizeLed = /auto-fill|auto-fit/.test(value);
    const isPhoneDefault = /^repeat\(\s*2\s*,/.test(value);
    if (!isSizeLed && !isPhoneDefault && /repeat\(\s*\d+/.test(value)) {
      const line = css.slice(0, m.index).split("\n").length;
      failures.push(
        `${file}:${line} ${hit} states a column COUNT (${value}) — a card grid must state a ` +
          `card size instead, e.g. repeat(auto-fill, minmax(var(--card-min), 1fr)), or the card ` +
          `grows with the window`,
      );
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
