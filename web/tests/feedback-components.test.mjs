import {strict as assert} from "node:assert";
import {after, before, test} from "node:test";
import {createServer} from "vite";
import {getViteConfig} from "astro/config";
import {experimental_AstroContainer} from "astro/container";

let server, container, Credit, PersonCard;
before(async () => {
  const config = await getViteConfig({server: {middlewareMode: true}, logLevel: "error"})({command: "serve", mode: "test"});
  server = await createServer(config);
  // Astro starts its dev application asynchronously. Let it finish before
  // closing this test server, so teardown cannot disconnect its module loader.
  await server[Symbol.for("astro.devServerAppReady")];
  container = await experimental_AstroContainer.create();
  Credit = (await server.ssrLoadModule("/src/components/Credit.astro")).default;
  PersonCard = (await server.ssrLoadModule("/src/components/PersonCard.astro")).default;
});
after(async () => {await server?.close();});

const image = (name) => ({static: {src: `/fixtures/${name}.jpg`, width: 600, height: 800}, alt: name});
const item = {publication: "Magazine", short: "", kind: "press", date: "2026-10-01", url: "https://example.com/article", logo: null, image: null, useProjectImage: true};
const project = {title: "One project", hook: image("project-cover")};

test("Press entries sharing a project render their independent covers and separate logo", async () => {
  for (const name of ["cover-one", "cover-two"]) {
    const html = await container.renderToString(Credit, {props: {item: {...item, image: image(name), logo: image("logo")}, project}});
    assert.match(html, new RegExp(`/fixtures/${name}\\.jpg`));
    assert.match(html, /pc--custom/);
    assert.match(html, /\/fixtures\/logo\.jpg/);
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
