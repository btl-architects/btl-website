/* One-time original BTL notes. Deploy the compatible reader before applying.
 * Revision guards protect concurrent edits; no draft is published wholesale. */
import {getCliClient} from "sanity/cli";
import {mkdirSync, writeFileSync} from "node:fs";
import {resolve} from "node:path";

const client = getCliClient({apiVersion: "2026-09-01"});
const pressIds = ["publication-architectural-digest-5-august-2026", "placeholder-dezeen"];
type Figure = {_key?: string; alt: string; kind?: string; asset: unknown; rights: string; [key: string]: unknown};
type Doc = {_id: string; _rev: string; _type: string; readerContent?: unknown[]; social?: {label: string; url: string; _key?: string}[]; [key: string]: unknown};
const ids = ["settings", "drafts.settings", ...pressIds.flatMap(id => [id, `drafts.${id}`])];
const [docs, project] = await Promise.all([
  client.fetch<Doc[]>("*[_id in $ids]", {ids}),
  client.fetch<{images: Figure[]; credits: {architect: string; photographer: string; collaborators: string[]}}>(' *[_id == "project-nelly-house"][0]{images,credits}'),
]);
if (!docs.some(d => d._id === "settings") || !pressIds.every(id => docs.some(d => d._id === id))) throw new Error("Expected published records missing");
if (docs.some(d => d._type === "publication" && d.readerContent?.length)) throw new Error("A reader is already authored; refusing to replace it");
const image = (index: number, caption: string, key: string) => {
  const source = project?.images[index];
  if (!source?.asset) throw new Error(`Project photograph ${index + 1} is missing`);
  return {...source, _type: "figure", _key: key, caption, kind: "photograph", credit: project.credits.photographer};
};
const paragraph = (text: string, key: string, style = "normal") => ({_type: "block", _key: key, style, markDefs: [], children: [{_type: "span", _key: `${key}-text`, text, marks: []}]});
const notes = [
  {
    intro: "Nelly House in Thirunelly, Wayanad, is shaped by the ground and trees already there. BTL project notes accompany the Architectural Digest feature, with photographs from the project archive.",
    articleHero: image(0, "The entrance to Nelly House.", "ad-opening"),
    readerContent: [
      paragraph("A house within the landscape", "ad-heading-1", "h2"),
      paragraph("Paddy fields, a coffee plantation and the Brahmagiri Hills form the setting. The plan works around mature trees, leaving the landscape present in the rooms and the spaces between them.", "ad-body-1"),
      image(3, "The verandah connects the rooms with the landscape.", "ad-verandah"),
      paragraph("Earth and memory", "ad-heading-2", "h2"),
      paragraph("Soil excavated for the pond becomes rammed-earth walls. Reclaimed timber, old doors and windows, and terracotta roofing bring existing materials into the new building. The palette gives the house a close relationship with its site.", "ad-body-2"),
      {_type: "pullQuote", _key: "ad-quote", text: "The landscape remains present in the rooms and the spaces between them."},
      paragraph("Spaces for retreat", "ad-heading-3", "h2"),
      paragraph("The library, shaded verandah and private courtyards offer different places to pause. Water and planting sit alongside the living spaces. These notes introduce the project; the source link below opens the complete published feature.", "ad-body-3"),
      image(5, "The living room, in the house’s earthen palette.", "ad-living"),
    ],
  },
  {
    intro: "At Nelly House, the existing nelli trees help organise a home for reading, writing and company. These BTL project notes accompany the ELLE DECOR coverage, using photographs already held in the project archive.",
    articleHero: image(5, "The living room at Nelly House.", "elle-opening"),
    readerContent: [
      paragraph("Beginning with the trees", "elle-heading-1", "h2"),
      paragraph("The plan responds to the mature trees and the contours of the site in Thirunelly. Bedrooms open onto individual courtyards. The spaces hold the trees close to daily life while giving each room a quieter outlook.", "elle-body-1"),
      image(9, "The courtyard beside the main bedroom.", "elle-courtyard"),
      paragraph("Materials with another life", "elle-heading-2", "h2"),
      paragraph("Earth from the pond excavation forms the walls. Stone, bamboo, terracotta and reclaimed timber sit alongside reused doors, windows and furniture. Existing materials carry their texture and history into the house.", "elle-body-2"),
      {_type: "pullQuote", _key: "elle-quote", text: "The spaces hold the trees close to daily life."},
      paragraph("A place to read and gather", "elle-heading-3", "h2"),
      paragraph("A library nook offers a place to settle with a book. The verandah extends everyday living outdoors, while the living and dining spaces make room for company. The full ELLE DECOR article is linked below for the publisher’s account.", "elle-body-3"),
      image(6, "The library nook, with a view beyond its window.", "elle-library"),
    ],
  },
];
const patches = docs.map(doc => {
  if (doc._type === "settings") {
    const social = (doc.social ?? []).map(s => s.label.toLowerCase() === "instagram" ? {...s, url: "https://www.instagram.com/btl.architects/"} : s);
    if (!social.some(s => s.label.toLowerCase() === "instagram")) social.push({_key: "Instagram", label: "Instagram", url: "https://www.instagram.com/btl.architects/"});
    return {doc, fields: {social}};
  }
  const index = pressIds.indexOf(doc._id.replace(/^drafts\./, ""));
  return {doc, fields: {...notes[index], openingMode: "reader", readerPublishedAt: "2026-10-02", byline: "BTL project notes · accompanying the original feature", articleCredits: {...project.credits, _type: "credits"}}};
});
const apply = process.argv.includes("--apply");
console.log(JSON.stringify({apply, records: patches.map(({doc, fields}) => ({id: doc._id, fields: Object.keys(fields)})), notes}, null, 2));
if (apply) {
  const directory = resolve("../backups"); mkdirSync(directory, {recursive: true});
  const backup = resolve(directory, `press-hardening-${Date.now()}.json`);
  writeFileSync(backup, JSON.stringify(docs, null, 2), {mode: 0o600});
  let tx = client.transaction();
  for (const {doc, fields} of patches) tx = tx.patch(doc._id, p => p.ifRevisionId(doc._rev).set(fields));
  await tx.commit();
  console.log(JSON.stringify({updated: patches.map(p => p.doc._id), backup, unrelatedDraftsPreserved: true}));
}
