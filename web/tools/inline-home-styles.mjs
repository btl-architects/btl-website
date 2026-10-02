/* Home is usually the first visit, so its small design system arrives with the
 * document rather than behind another render-blocking round trip. Other routes
 * keep Astro's shared cacheable stylesheet. Use generated CSS, never a second
 * authored copy, so the cascade cannot drift between pages. */
import {readFileSync, writeFileSync} from "node:fs";
import {resolve, sep} from "node:path";
import {fileURLToPath} from "node:url";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const home = resolve(dist, "index.html");
let count = 0;
const html = readFileSync(home, "utf8").replace(/<link\b[^>]*>/g, tag => {
  if (!/\brel="stylesheet"/.test(tag)) return tag;
  const href = tag.match(/\bhref="([^"]+)"/)?.[1];
  if (!href?.startsWith("/_astro/") || !href.endsWith(".css")) throw new Error("[inline-home-styles] unexpected stylesheet URL");
  const path = resolve(dist, "." + decodeURIComponent(href));
  if (!path.startsWith(resolve(dist) + sep)) throw new Error("[inline-home-styles] stylesheet outside build");
  const css = readFileSync(path, "utf8");
  if (/<\/style/i.test(css)) throw new Error("[inline-home-styles] unsafe CSS closing tag");
  count++;
  return `<style>${css}</style>`;
});
if (!count) throw new Error("[inline-home-styles] expected Home's generated stylesheet");
writeFileSync(home, html);
console.log(`[inline-home-styles] ${count} generated stylesheet embedded; other routes retain shared CSS`);
