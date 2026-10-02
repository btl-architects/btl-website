/* Replace the two previously imported full articles with brief original
 * summaries. Preserve Press artwork, links, source credits and unrelated drafts. */
import {getCliClient} from "sanity/cli";
import {mkdirSync, writeFileSync} from "node:fs";
import {resolve} from "node:path";

const summaries = [
  {
    id: "publication-architectural-digest-5-august-2026", writer: "Vaishnavi Nayel Talawadekar",
    intro: "Architectural Digest features Nelly House, a home designed by BTL in Thirunelly, Wayanad.",
    hero: 0, heroCaption: "The entrance to Nelly House.",
    sections: [
      {heading: "A response to the site", text: "The feature explores a home designed for a conservationist and a publisher. Its plan preserves existing trees and connects rooms with courtyards and a shaded verandah, keeping everyday life close to the surrounding landscape.", photo: 3, caption: "The verandah."},
      {heading: "Materials and daily life", text: "Earth excavated on site forms the walls, alongside salvaged timber, doors, windows and roof tiles. A library and workspace provide quieter places within a house arranged for both retreat and gathering.", photo: 6, caption: "The library nook."},
    ],
  },
  {
    id: "placeholder-dezeen", writer: "Disha Kalyankar",
    intro: "ELLE DECOR features Nelly House and its relationship with the trees and terrain of Thirunelly.",
    hero: 5, heroCaption: "The living room at Nelly House.",
    sections: [
      {heading: "The landscape shapes the plan", text: "The feature looks at how existing nelli trees and changes in ground level guided the design. Courtyards bring light and planting beside the bedrooms, while site stone helps form terraces and retaining walls.", photo: 9, caption: "The courtyard beside the main bedroom."},
      {heading: "Spaces for reading and company", text: "Rammed earth, reused timber and bamboo connect the building with its setting. A library nook offers space to read; the verandah extends the shared rooms outdoors. The complete feature presents the publisher’s account of the home.", photo: 6, caption: "The library nook."},
    ],
  },
];
type Figure = {asset: {asset: {_ref: string}}; alt: string; [key: string]: unknown};
type Doc = {_id: string; _rev: string; readerKind?: string; byline?: string; sourceAuthor?: string; [key: string]: unknown};
const client = getCliClient({apiVersion: "2026-09-01"});
const [docs, project] = await Promise.all([
  client.fetch<Doc[]>("*[_id in $ids]", {ids: summaries.flatMap(s => [s.id, `drafts.${s.id}`])}),
  client.fetch<{images: Figure[]; credits: Record<string, unknown>}>('*[_id == "project-nelly-house"][0]{images,credits}'),
]);
if (!summaries.every(s => docs.some(d => d._id === s.id))) throw new Error("Expected published features are missing");
function image(index: number, caption: string, key: string) {
  const source = project.images[index];
  if (!source?.asset?.asset?._ref) throw new Error(`Missing project photograph ${index}`);
  return {...source, _type: "figure", _key: key, caption, credit: project.credits.photographer, kind: "photograph"};
}
const paragraph = (text: string, key: string, style = "normal") => ({_type: "block", _key: key, style, markDefs: [], children: [{_type: "span", _key: `${key}-text`, text, marks: []}]});
const patches = docs.map(doc => {
  const summary = summaries.find(s => s.id === doc._id.replace(/^drafts\./, ""))!;
  if (doc.readerKind !== "article" || doc.byline !== "" || doc.sourceAuthor !== summary.writer) throw new Error(`Review changed article before replacing it: ${doc._id}`);
  const readerContent = summary.sections.flatMap((s, i) => [paragraph(s.heading, `summary-heading-${i}`, "h2"), paragraph(s.text, `summary-body-${i}`), image(s.photo, s.caption, `summary-image-${i}`)]);
  return {doc, fields: {readerKind: "summary", byline: "Summary by BTL Architects", intro: summary.intro,
    readerPublishedAt: "2026-10-02", articleHero: image(summary.hero, summary.heroCaption, "summary-opening"), readerContent}};
});
const apply = process.argv.includes("--apply");
console.log(JSON.stringify({apply, records: patches.map(({doc, fields}) => ({id: doc._id, readerKind: fields.readerKind, intro: fields.intro,
  text: fields.readerContent.filter(b => b._type === "block"), photographs: 3}))}, null, 2));
if (apply) {
  const directory = resolve("../backups"); mkdirSync(directory, {recursive: true});
  const backup = resolve(directory, `press-summary-switch-${Date.now()}.json`);
  writeFileSync(backup, JSON.stringify(docs, null, 2), {mode: 0o600});
  let tx = client.transaction();
  for (const {doc, fields} of patches) tx = tx.patch(doc._id, p => p.ifRevisionId(doc._rev).set(fields));
  await tx.commit();
  console.log(JSON.stringify({updated: patches.map(p => p.doc._id), backup}));
}
