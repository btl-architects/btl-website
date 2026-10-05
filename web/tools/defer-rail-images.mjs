/* Hold a project's later photographs until its first one is on screen.
 *
 * A project page opens on its first photograph, the page's LCP image. Every
 * later photograph in the rail is `loading="lazy"`, but on a slow connection
 * Chrome's lazy-loading distance reaches well past the screen's edge, so the
 * next two or three photographs (about 230 kB on Nelly House) began downloading
 * alongside the first and shared its bandwidth. That is what kept the project
 * page over its LCP budget.
 *
 * After cache-images.mjs has written the final <picture> markup, every rail
 * photograph after the first gets a transparent placeholder `src` and keeps its
 * real `src`/`srcset` in data attributes, followed by an untouched <noscript>
 * copy. site.js restores the real attributes once the first photograph has been
 * painted, or at the first touch, click or key press, whichever comes first.
 * Without JavaScript the <noscript> copy is the photograph, and CSS
 * (`@media (scripting: none)`) hides the held one. Sizes, crops, quality and
 * layout are unchanged: the held image keeps its width, height and blurred
 * preview, so nothing moves when the real file arrives. */
import {readdirSync, readFileSync, statSync, writeFileSync} from 'node:fs';
import {join, relative, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

export const PLACEHOLDER = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

/** Defer every rail photograph after the first in one project page's HTML.
 *  A project page has exactly one rail, so its figures are taken in order. */
export function deferRailImages(html) {
  let deferred = 0, index = 0;
  const out = html.replace(/<figure class="rail__f"[\s\S]*?<\/figure>/g, figure => {
    if (index++ === 0) return figure;
    const media = figure.match(/<picture\b[\s\S]*?<\/picture>/) || figure.match(/<img\b[^>]*>/);
    if (!media || /data-defer/.test(media[0])) return figure;
    const held = media[0]
      .replace(/^<(picture|img)\b/, '<$1 data-defer')
      .replace(/(<source\b[^>]*?)\ssrcset="/g, '$1 data-srcset="')
      .replace(/<img\b[^>]*>/, img => img
        .replace(/\ssrcset="/, ' data-srcset="')
        .replace(/\ssrc="([^"]*)"/, ` src="${PLACEHOLDER}" data-src="$1"`));
    deferred++;
    return figure.replace(media[0], () => `${held}<noscript>${media[0]}</noscript>`);
  });
  return {html: out, deferred};
}

function* projectPages(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (!statSync(path).isDirectory() || entry === 'type' || entry === 'place') continue;
    try { statSync(join(path, 'index.html')); yield join(path, 'index.html'); } catch { /* not a page */ }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const projects = fileURLToPath(new URL('../dist/projects/', import.meta.url));
  let pages = 0, total = 0;
  for (const file of projectPages(projects)) {
    const before = readFileSync(file, 'utf8');
    const {html, deferred} = deferRailImages(before);
    if (!deferred) continue;
    writeFileSync(file, html);
    pages++; total += deferred;
    if (!html.includes(PLACEHOLDER)) throw new Error(`[defer] ${relative(projects, file).split(sep).join('/')} lost its deferral`);
  }
  console.log(`[defer] ${total} later project photographs held until the first is painted, on ${pages} pages`);
}
