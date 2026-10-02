import {strict as assert} from "node:assert";
import {after, before, test} from "node:test";
import {createServer} from "vite";
import {getViteConfig} from "astro/config";
import {experimental_AstroContainer} from "astro/container";

let server, container, Credit, PersonCard, PressArticle, press;
before(async () => {
  const config = await getViteConfig({server: {middlewareMode: true}, logLevel: "error"})({command: "serve", mode: "test"});
  server = await createServer(config);
  // Astro starts its dev application asynchronously. Let it finish before
  // closing this test server, so teardown cannot disconnect its module loader.
  await server[Symbol.for("astro.devServerAppReady")];
  container = await experimental_AstroContainer.create();
  Credit = (await server.ssrLoadModule("/src/components/Credit.astro")).default;
  PersonCard = (await server.ssrLoadModule("/src/components/PersonCard.astro")).default;
  PressArticle = (await server.ssrLoadModule("/src/components/PressArticle.astro")).default;
  press = await server.ssrLoadModule("/src/lib/press.ts");
});
after(async () => {await server?.close();});

const image = (name) => ({static: {src: `/fixtures/${name}.jpg`, width: 600, height: 800}, alt: name});
const item = {publication: "Magazine", short: "", kind: "press", date: "2026-10-01", url: "https://example.com/article", logo: null, image: null, useProjectImage: true};
const project = {title: "One project", hook: image("project-cover")};

test("Press entries render complete artwork without adding another publication logo", async () => {
  for (const name of ["cover-one", "cover-two"]) {
    const html = await container.renderToString(Credit, {props: {item: {...item, image: image(name), logo: image("logo")}, project}});
    assert.match(html, new RegExp(`/fixtures/${name}\\.jpg`));
    assert.match(html, /pc--custom/);
    assert.doesNotMatch(html, /\/fixtures\/logo\.jpg|pc__mark/);
    assert.doesNotMatch(html, /project-cover\.jpg/);
    assert.match(html, /One project/);
    assert.match(html, /https:\/\/example.com\/article/);
  }
});

test("legacy project fallback and image-less awards both render safely", async () => {
  const legacy = await container.renderToString(Credit, {props: {item, project}});
  assert.match(legacy, /project-cover\.jpg/);
  const disabled = await container.renderToString(Credit, {props: {item: {...item, useProjectImage: false}, project}});
  assert.doesNotMatch(disabled, /<img/);
  const award = await container.renderToString(Credit, {props: {item: {...item, kind: "award", url: null}}});
  assert.match(award, /Award/);
  assert.doesNotMatch(award, /<a\b|<img/);
});

test("a magazine cover includes its original frame while project crops remain respected", async () => {
  const cropped = {source: {asset: {_ref: "image-abc123-600x800-jpg"}, crop: {left: .1, right: .1, top: .1, bottom: .1}}, alt: "Full magazine cover"};
  const cover = await container.renderToString(Credit, {props: {item: {...item, image: cropped}, project}});
  assert.doesNotMatch(cover, /rect=/);
  const photograph = await container.renderToString(Credit, {props: {item, project: {...project, hook: cropped}}});
  assert.match(photograph, /rect=/);
});

test("the shared People card includes Alumni portraits and omits a blank role", async () => {
  const person = {name: "Former colleague", prefix: "", tier: "alumni", role: "", portrait: image("portrait"), slug: null, bio: null};
  const html = await container.renderToString(PersonCard, {props: {person}});
  assert.match(html, /portrait\.jpg/);
  assert.match(html, /Former colleague/);
  assert.doesNotMatch(html, /trow__r|<a\b/);
  const profile = await container.renderToString(PersonCard, {props: {person: {...person, role: "Architect", slug: "former-colleague", bio: "Biography"}}});
  assert.match(profile, /href="\/people\/former-colleague\/"/);
  assert.match(profile, /Architect/);
});

const text = content => ({_type: "block", style: "normal", children: [{text: content, marks: []}], markDefs: []});
test("each Press opening mode has a working native destination", async () => {
  const reader = {...item, id: "stable-id", openingMode: "reader", readerContent: [text("Article text")]};
  const html = await container.renderToString(Credit, {props: {item: reader, project}});
  assert.match(html, /href="\/press\/stable-id\/"/);
  assert.match(html, /data-article/);
  assert.doesNotMatch(html, /target="_blank"/);
  const embedded = await container.renderToString(Credit, {props: {item: {...reader, openingMode: "embed"}, project}});
  assert.match(embedded, /href="\/press\/stable-id\/"/);
  const external = await container.renderToString(Credit, {props: {item: {...reader, openingMode: "external"}, project}});
  assert.doesNotMatch(external, /target="_blank"/);
  assert.match(external, /data-article/);
  assert.equal(press.articlePath({...reader, id: "drafts.stable-id"}), "/press/stable-id/");
  assert.equal(press.articlePath({...reader, readerContent: [text(" ")]}), null);
  assert.equal(press.articlePagePath({...reader, openingMode: "external"}), "/press/stable-id/");
});

test("Sanity crop dimensions match the returned frame, while complete artwork ignores crop", async () => {
  const cropped = {source: {asset: {_ref: "image-example-600x800-jpg"}, crop: {left: 0, right: 0, top: .25, bottom: 0}}, alt: "The complete group photograph"};
  const photo = await container.renderToString(Credit, {props: {item, project: {...project, hook: cropped}}});
  assert.match(photo, /width="600" height="600"/);
  const artwork = await container.renderToString(Credit, {props: {item: {...item, image: cropped}}});
  assert.match(artwork, /width="600" height="800"/);
  const fractional = {...cropped, source: {asset: {_ref: "image-example-914x1279-jpg"}, crop: {left: .1, right: .1, top: .22, bottom: .1}}};
  const rounded = await container.renderToString(Credit, {props: {item, project: {...project, hook: fractional}}});
  assert.match(rounded, /width="732" height="870"/);
  assert.match(rounded, /rect=91%2C281%2C732%2C870/);
  assert.match(rounded, /732w/);
});

test("reader text escapes HTML and rejects unsafe link addresses", async () => {
  const body = {...text('<script>alert("test")</script>'), markDefs: [{_key: "unsafe", _type: "link", href: "javascript:alert(1)"}]};
  body.children[0].marks = ["unsafe", "strong", "em"];
  const html = await container.renderToString(PressArticle, {props: {item: {...item, title: "A feature", openingMode: "reader", readerContent: [body, {...image("magazine-page"), _type: "figure"}]}}});
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script|javascript:/);
  assert.match(html, /<strong><em>/);
  assert.match(html, /magazine-page\.jpg/);
  for (const url of ["javascript:alert(1)", "//example.com", "https://user:password@example.com/", "invalid"]) assert.equal(press.articleUrl(url), null);
});

test("publisher frames are deferred, sandboxed and retain a visible source link", async () => {
  const html = await container.renderToString(PressArticle, {props: {item: {...item, title: "Embedded feature", openingMode: "embed"}}});
  assert.match(html, /data-article-frame="https:\/\/example.com\/article"/);
  assert.doesNotMatch(html, /<iframe[^>]*\ssrc=/);
  assert.match(html, /sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"/);
  assert.doesNotMatch(html, /allow-top-navigation/);
  assert.match(html, /If the article does not appear/);
  assert.match(html, /<noscript>/);
});

test("source writers are distinguished from the author of a clearly labelled summary", async () => {
  const html = await container.renderToString(PressArticle, {props: {item: {...item, title: "A verified headline", openingMode: "reader", readerKind: "summary", sourceAuthor: "Publication writer", byline: "Summary by BTL", readerContent: [text("A summary.")]}}});
  assert.match(html, /Original article by Publication writer/);
  assert.match(html, /Article summary/);
  assert.match(html, /Summary by BTL/);
  assert.match(html, /1 October 2026/);
  const embedded = await container.renderToString(PressArticle, {props: {item: {...item, title: "A verified headline", openingMode: "embed", readerKind: "summary", sourceAuthor: "Publication writer"}}});
  assert.match(embedded, /Original article by Publication writer/);
  assert.doesNotMatch(embedded, /Article summary/);
});

test("a complete reader separates card artwork from photography and renders nested editorial content", async () => {
  const html = await container.renderToString(PressArticle, {props: {project, item: {...item,
    title: "A complete feature", openingMode: "reader", image: image("card-artwork"),
    intro: "A proper introduction.", byline: "BTL project notes", articleHero: image("article-opening"),
    articleCredits: {architect: "BTL", photographer: "Photographer", collaborators: ["Studio collaborator"]},
    readerContent: [text("Opening paragraph"), {...text("Design notes"), style:"h2"},
      {...text("Parent"), listItem:"bullet", level:1}, {...text("Child"), listItem:"number", level:2},
      {...text("Sibling"), listItem:"bullet", level:1},
      {_type:"pullQuote", text:"An editorial excerpt", attribution:"BTL notes"},
      {...image("supporting-photo"), _type:"figure", caption:"A caption", credit:"A credit"}],
  }}});
  assert.match(html, /article-opening\.jpg/); assert.doesNotMatch(html, /card-artwork\.jpg/);
  for (const content of ["A proper introduction.", "BTL project notes", "An editorial excerpt", "A caption", "A credit", "Photographer", "Studio collaborator"]) assert.ok(html.includes(content));
  assert.match(html, /<ul>\s*<li>[^]*?Parent[^]*?<ol>\s*<li>[^]*?Child[^]*?<\/li>\s*<\/ol>\s*<\/li>\s*<li>[^]*?Sibling/);
  const fallback = await container.renderToString(PressArticle, {props: {project, item: {...item, title:"Fallback", openingMode:"reader", image:image("card-artwork"), readerContent:[text("A paragraph")]}}});
  assert.match(fallback, /project-cover\.jpg/); assert.doesNotMatch(fallback, /card-artwork\.jpg/);
});
