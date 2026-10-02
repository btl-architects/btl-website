/* Render real components with labelled test-only content. No dataset writes. */
import {createServer} from "vite";
import {getViteConfig} from "astro/config";
import {experimental_AstroContainer} from "astro/container";
import {mkdirSync, readFileSync, writeFileSync} from "node:fs";
import {join} from "node:path";

export async function seedReaderDemo(directory) {
  const config = await getViteConfig({server: {middlewareMode: true}, logLevel: "error"})({command: "serve", mode: "test"});
  const server = await createServer(config);
  await server[Symbol.for("astro.devServerAppReady")];
  try {
    const container = await experimental_AstroContainer.create();
    const Credit = (await server.ssrLoadModule("/src/components/Credit.astro")).default;
    const Article = (await server.ssrLoadModule("/src/components/PressArticle.astro")).default;
    const template = readFileSync(join(directory, "press/index.html"), "utf8");
    const tag = /class="pc__img"[^>]*>\s*(<img\b[^>]*>)/.exec(template)?.[1];
    const attr = name => new RegExp(`\\b${name}="([^"]+)"`).exec(tag ?? "")?.[1]?.replaceAll("&amp;", "&");
    const image = tag ? {static: {src: attr("src"), width: Number(attr("width")), height: Number(attr("height"))}, alt: "Feature photograph for the local reader demonstration"} : null;
    const text = value => ({_type: "block", style: "normal", children: [{text: value, marks: []}], markDefs: []});
    const reader = {id: "reader-fixture", publication: "BTL reader demonstration", short: "Reader", title: "A quiet place to read", date: "2026-10-02", kind: "press", logo: null,
      image, useProjectImage: false, url: "https://example.com/original", openingMode: "reader", byline: "Local demonstration — sample content",
      readerContent: [text("This is sample content for reviewing the reader. The article opens over BTL, so you can read at your own pace and return to the page exactly where you left it."),
        {_type: "block", style: "h2", children: [{text: "Text and magazine pages, in one place", marks: []}], markDefs: []},
        text("Each Press entry has its own opening choice in Sanity. The BTL reader uses the website’s typography and displays uploaded photographs or magazine pages without cropping."),
        ...(image ? [{...image, _type: "figure", caption: "Local reader demonstration"}] : []), text("Close the panel or use browser Back to return to the Press page.")]};
    const embed = {...reader, id: "embed-fixture", publication: "Embedded publication", title: "An embedded article", openingMode: "embed", url: "https://example.com/embedded-article"};
    const external = {...reader, id: "external-fixture", publication: "External publication", short: "New tab", openingMode: "external"};
    const credits = (await Promise.all([reader, embed, external].map(item => container.renderToString(Credit, {props: {item}})))).join("");
    function write(path, html) {mkdirSync(join(directory, path), {recursive: true}); writeFileSync(join(directory, path, "index.html"), html);}
    write("__reader-demo", template.replace(/<div class="credits">[\s\S]*?<\/div>/, `<div class="credits">${credits}</div>`));
    for (const item of [reader, embed, external]) {
      const article = await container.renderToString(Article, {props: {item}});
      write(`press/${item.id}`, template.replace(/<main\b[\s\S]*?<\/main>/, `<main id="main" data-ground="dark" class="container page-end">${article}</main>`));
    }
  } finally {await server.close();}
}
