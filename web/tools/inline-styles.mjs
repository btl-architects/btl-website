/* Every direct entry needs its first layout without a stylesheet round trip.
 * Embed the generated design system, not a second authored copy. */
import {readFileSync, writeFileSync,readdirSync,statSync} from "node:fs";
import {resolve, sep} from "node:path";
import {fileURLToPath} from "node:url";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
function* pages(directory) {
  for(const name of readdirSync(directory)) {
    const path=resolve(directory,name);
    if(statSync(path).isDirectory()) yield* pages(path);
    else if(name.endsWith('.html')) yield path;
  }
}
let count = 0;
for(const page of pages(dist)) {
const html = readFileSync(page, "utf8").replace(/<link\b[^>]*>/g, tag => {
  if (!/\brel="stylesheet"/.test(tag)) return tag;
  const href = tag.match(/\bhref="([^"]+)"/)?.[1];
  if (!href?.startsWith("/_astro/") || !href.endsWith(".css")) throw new Error("[inline-styles] unexpected stylesheet URL");
  const path = resolve(dist, "." + decodeURIComponent(href));
  if (!path.startsWith(resolve(dist) + sep)) throw new Error("[inline-styles] stylesheet outside build");
  const css = readFileSync(path, "utf8");
  if (/<\/style/i.test(css)) throw new Error("[inline-styles] unsafe CSS closing tag");
  count++;
  return `<style>${css}</style>`;
});
if (!count) throw new Error("[inline-styles] expected a generated stylesheet");
writeFileSync(page, html);
}
console.log(`[inline-styles] ${count} generated stylesheets embedded`);
