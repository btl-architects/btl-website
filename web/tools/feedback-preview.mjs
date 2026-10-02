/* Local visual verification only: synthetic, lettered cover fixtures exercise
 * the new main-image slot without changing or publishing any Sanity record. */
import {createServer as createViteServer} from "vite";
import {createServer} from "node:http";
import {readFileSync, readdirSync} from "node:fs";
import {resolve} from "node:path";
import {getViteConfig} from "astro/config";
import {experimental_AstroContainer} from "astro/container";

const config = await getViteConfig({server: {middlewareMode: true}, logLevel: "error"})({command: "serve", mode: "test"});
const vite = await createViteServer(config);
await vite[Symbol.for("astro.devServerAppReady")];
const container = await experimental_AstroContainer.create();
const Credit = (await vite.ssrLoadModule("/src/components/Credit.astro")).default;
const {getPublications, getProjects} = await vite.ssrLoadModule("/src/lib/content.ts");
const [publications, projects] = await Promise.all([getPublications(), getProjects()]);
const entries = publications.filter((entry) => entry.logo).slice(0, 2);
if (entries.length !== 2) throw new Error("Two existing magazine image uploads are needed for this local fixture.");
const covers = ["#e5ded0", "#b9c5bc"].map((colour, index) => `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800"><rect width="600" height="800" fill="${colour}"/><rect x="4" y="4" width="592" height="792" fill="none" stroke="#202020" stroke-width="8"/><text x="30" y="80" font-family="sans-serif" font-size="50">TEST COVER ${index + 1}</text><rect x="50" y="160" width="500" height="470" fill="#6e7d6d"/><path d="M90 580V310L300 220L510 310V580Z" fill="#d2b490"/><path d="M90 310L300 220L510 310" fill="none" stroke="#202020" stroke-width="12"/><text x="30" y="755" font-family="sans-serif" font-size="38">FULL FRAME VISIBLE</text></svg>`);
const cards = await Promise.all(entries.map((entry, index) => container.renderToString(Credit, {props: {
  item: {...entry, image: {static: {src: `/fixture-cover-${index}.svg`, width: 600, height: 800}, alt: `Test magazine cover ${index + 1}, with lettering at both edges`}, logo: null},
  project: projects.find((project) => project.slug === entry.relatedProject),
}})));
const dist = resolve("dist");
const css = readdirSync(`${dist}/_astro`).filter((name) => name.endsWith(".css"))
  .map((name) => readFileSync(`${dist}/_astro/${name}`, "utf8")).join("\n");
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Press image verification</title><style>${css}</style></head><body><main class="container"><header class="index-head"><h1 class="index-head__t">Press</h1><p class="index-head__s">Local verification with test covers. No live content changed.</p></header><div class="credits">${cards.join("")}</div></main></body></html>`;
await vite.close();
createServer((request, response) => {
  const path = new URL(request.url, "http://127.0.0.1").pathname;
  const cover = path.match(/^\/fixture-cover-([01])\.svg$/);
  if (cover) {response.setHeader("Content-Type", "image/svg+xml"); response.end(covers[Number(cover[1])]); return;}
  if (path === "/") {response.setHeader("Content-Type", "text/html"); response.end(html); return;}
  const file = resolve(dist, `.${path}`);
  if (!file.startsWith(`${dist}/`)) {response.writeHead(403); response.end(); return;}
  try {
    if (file.endsWith(".woff2")) response.setHeader("Content-Type", "font/woff2");
    response.end(readFileSync(file));
  } catch {response.writeHead(404); response.end();}
}).listen(8791, "127.0.0.1", () => console.log("Local Press verification: http://127.0.0.1:8791/"));
