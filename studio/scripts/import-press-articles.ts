/* Import the client-supplied article bundle. Content lives in Sanity; article
 * text and photograph backups stay outside the public code repository. */
import {getCliClient} from "sanity/cli";
import {readFileSync, mkdirSync, writeFileSync} from "node:fs";
import {resolve} from "node:path";

type Block = {_type: string; _key: string; index?: number; caption?: string; children?: {text: string}[]; [key: string]: unknown};
type Article = {id: string; title: string; date: string; sourceAuthor: string; url: string; intro: string; hero: Block; readerContent: Block[]};
type Doc = {_id: string; _rev: string; readerKind?: string; byline?: string; [key: string]: unknown};
type Figure = {asset: {asset: {_ref: string}}; alt: string; [key: string]: unknown};
const inputIndex = process.argv.indexOf("--input");
if (inputIndex < 0 || !process.argv[inputIndex + 1]) throw new Error("Provide --input with the prepared article JSON file");
const articles: Article[] = JSON.parse(readFileSync(resolve(process.argv[inputIndex + 1]), "utf8"));
const ids = ["placeholder-dezeen", "publication-architectural-digest-5-august-2026"];
if (!Array.isArray(articles) || articles.length !== ids.length || !ids.every(id => articles.filter(a => a.id === id).length === 1)) throw new Error("Expected exactly the two existing Press entries");
for (const article of articles) {
  if (!article.title || !article.sourceAuthor || !article.intro || !/^\d{4}-\d{2}-\d{2}$/.test(article.date)) throw new Error("Missing article metadata");
  const url = new URL(article.url);
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("Use a public HTTPS source URL");
  if (!article.readerContent.some(b => b._type === "block" && b.children?.some(c => c.text.trim()))) throw new Error("Article has no text");
  if (article.readerContent.some(b => !["block", "archiveFigure"].includes(b._type))) throw new Error("Unexpected content block");
}
const client = getCliClient({apiVersion: "2026-09-01"});
const [docs, project] = await Promise.all([
  client.fetch<Doc[]>("*[_id in $ids]", {ids: ids.flatMap(id => [id, `drafts.${id}`])}),
  client.fetch<{images: Figure[]; credits: Record<string, unknown>}>('*[_id == "project-nelly-house"][0]{images,credits}'),
]);
if (!ids.every(id => docs.some(d => d._id === id))) throw new Error("Published features are missing");
function figure(block: Block): Block & Figure {
  const source = Number.isInteger(block.index) ? project.images[block.index!] : undefined;
  if (!source?.asset?.asset?._ref) throw new Error(`Missing archive photograph: ${block.index}`);
  return {...source, _type: "figure", _key: block._key, caption: block.caption ?? "", credit: project.credits.photographer, kind: "photograph"};
}
const patches = docs.map(doc => {
  // Refuse to silently replace work done since the summary import. Check both
  // published and draft records without publishing any other draft fields.
  if (doc.readerKind !== "summary" || doc.byline !== "Summary by BTL Architects") throw new Error(`Review changed reader before import: ${doc._id}`);
  const article = articles.find(a => a.id === doc._id.replace(/^drafts\./, ""))!;
  const {id, hero, ...metadata} = article;
  return {doc, fields: {...metadata, openingMode: "reader", readerKind: "article", byline: "", articleHero: figure(hero),
    articleCredits: {...project.credits, _type: "credits"},
    readerContent: article.readerContent.map(b => b._type === "archiveFigure" ? figure(b) : b)}};
});
const apply = process.argv.includes("--apply");
console.log(JSON.stringify({apply, records: patches.map(({doc, fields}) => ({id: doc._id, title: fields.title, writer: fields.sourceAuthor,
  paragraphs: fields.readerContent.filter(b => b._type === "block" && b.style === "normal").length,
  headings: fields.readerContent.filter(b => b._type === "block" && b.style === "h2").length,
  photographs: fields.readerContent.filter(b => b._type === "figure").length + 1}))}, null, 2));
if (apply) {
  const directory = resolve("../backups"); mkdirSync(directory, {recursive: true});
  const backup = resolve(directory, `press-supplied-articles-${Date.now()}.json`);
  writeFileSync(backup, JSON.stringify(docs, null, 2), {mode: 0o600});
  let tx = client.transaction();
  for (const {doc, fields} of patches) tx = tx.patch(doc._id, p => p.ifRevisionId(doc._rev).set(fields));
  await tx.commit();
  console.log(JSON.stringify({updated: patches.map(p => p.doc._id), backup}));
}
