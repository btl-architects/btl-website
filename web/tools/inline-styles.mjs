/* Every direct entry needs its first layout without a stylesheet round trip.
 * Embed the generated design system, not a second authored copy. */
import {readFileSync, writeFileSync,readdirSync,statSync} from "node:fs";
import {resolve, sep} from "node:path";
import {fileURLToPath} from "node:url";
import {gzipSync} from 'node:zlib';

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
// The common variable-font subset is small enough to arrive with the first
// document. Text no longer needs a second request before its final layout.
// Extended glyphs remain a separately cached, on-demand resource.
const latinFont = readFileSync(resolve(dist, 'assets/fonts/Satoshi-Latin.woff2')).toString('base64');
function* pages(directory) {
  for(const name of readdirSync(directory)) {
    const path=resolve(directory,name);
    if(statSync(path).isDirectory()) yield* pages(path);
    else if(name.endsWith('.html')) yield path;
  }
}
let count = 0, embeddedFonts = 0;
for(const page of pages(dist)) {
const styled = readFileSync(page, "utf8").replace(/<link\b[^>]*>/g, tag => {
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
const embedded = styled.replace(/<link\b[^>]*>/g, tag =>
  /\brel="preload"/.test(tag) && /\bhref="\/assets\/fonts\/Satoshi-Latin\.woff2"/.test(tag) ? '' : tag
).replaceAll('/assets/fonts/Satoshi-Latin.woff2', `data:font/woff2;base64,${latinFont}`);
// Long indexes keep the cached font request rather than spending their HTML
// budget on an embedded copy. Leave 5 KB of headroom under the 60 KB page cap.
const inlineFont = gzipSync(embedded).length <= 55 * 1024;
const html = inlineFont ? embedded : styled;
if (inlineFont) embeddedFonts++;
writeFileSync(page, html);
}
console.log(`[inline-styles] ${count} generated stylesheets embedded; ${embeddedFonts} fonts delivered with their page`);
