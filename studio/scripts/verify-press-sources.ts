/* Correct the two existing features from their publisher pages. This replaces
 * seeded project notes with short, explicitly labelled summaries, never a
 * transcription of the publisher's article. Revision guards preserve edits. */
import {getCliClient} from "sanity/cli";
import {mkdirSync, writeFileSync} from "node:fs";
import {resolve} from "node:path";

const client = getCliClient({apiVersion: "2026-09-01"});
const sources = [
  {
    id: "publication-architectural-digest-5-august-2026",
    url: "https://www.architecturaldigest.in/story/a-publisher-and-wildlife-conservationists-wayanad-home-lies-amid-the-wilderness/",
    title: "A publisher and wildlife conservationist's Wayanad home lies amid the wilderness",
    date: "2026-08-05", sourceAuthor: "Vaishnavi Nayel Talawadekar",
    intro: "Architectural Digest visits the Thirunelly home of conservationist Vivek Menon and publisher Karthika V.K. This is a summary of that feature.",
    sections: [
      ["A home in the landscape", "The feature describes a retreat framed by the Brahmagiri Hills, paddy fields and a coffee plantation. BTL worked around mature trees, connecting shaded outdoor spaces with the house."],
      ["Materials with a history", "Earth from the pond excavation became rammed-earth walls. Reclaimed doors and windows, terracotta roofing, bamboo screens and oxide floors bring local materials and salvaged elements together."],
      ["Reading and retreat", "A library and workspace accommodate the owners’ work. Courtyards, a verandah and antique furnishings support everyday life close to nature. The complete article, including the writer’s interviews, is available through the original link."],
    ],
  },
  {
    id: "placeholder-dezeen", url: "https://elledecor.in/btl-architects-kerala-home/",
    title: "On the way to the nelli trees in Kerala", date: "2026-09-28", sourceAuthor: "Disha Kalyankar",
    intro: "ELLE DECOR explores how BTL shaped a 3,500-square-foot Thirunelly home around its trees and terrain. This is a summary of that feature.",
    sections: [
      ["Following the site", "The article traces the design from the nelli trees and changing ground levels. Existing contours guided the plan, while stone from the site was used for terraces and retaining walls."],
      ["Earth and reuse", "Pond excavation supplied earth for the walls. Reused timber doors and windows, bamboo screens and black oxide floors form the material palette, alongside furniture with an earlier life."],
      ["Spaces to slow down", "Bedrooms have their own courtyards, and the library includes a reading nook. A deep verandah extends the living areas towards the landscape. Follow the original link for the full narrative, interviews and publication photographs."],
    ],
  },
];
type Doc = {_id: string; _rev: string; byline?: string; readerKind?: string; readerContent?: Record<string, unknown>[]; [key: string]: unknown};
const docs = await client.fetch<Doc[]>("*[_id in $ids]", {ids: sources.flatMap(s => [s.id, `drafts.${s.id}`])});
if (!sources.every(s => docs.some(d => d._id === s.id))) throw new Error("Expected published features are missing");
const paragraph = (text: string, key: string, style = "normal") => ({_type: "block", _key: key, style, markDefs: [], children: [{_type: "span", _key: `${key}-text`, text, marks: []}]});
const patches = docs.map(doc => {
  if (doc.byline !== "BTL project notes · accompanying the original feature") throw new Error(`Reader changed since the notes seed: ${doc._id}. Review it before replacing content.`);
  const source = sources.find(s => s.id === doc._id.replace(/^drafts\./, ""))!;
  const figures = (doc.readerContent ?? []).filter(b => b._type === "figure");
  const readerContent = source.sections.flatMap(([heading, body], i) => [paragraph(heading, `source-heading-${i}`, "h2"), paragraph(body, `source-body-${i}`), ...(figures[i] ? [figures[i]] : [])]);
  return {doc, fields: {title: source.title, date: source.date, url: source.url, sourceAuthor: source.sourceAuthor,
    readerKind: "summary", byline: "Summary by BTL Architects", intro: source.intro, readerContent}};
});
const apply = process.argv.includes("--apply");
console.log(JSON.stringify({apply, records: patches.map(({doc, fields}) => ({id: doc._id, ...fields})), verifiedOn: "2026-10-02"}, null, 2));
if (apply) {
  const directory = resolve("../backups"); mkdirSync(directory, {recursive: true});
  const backup = resolve(directory, `press-source-verification-${Date.now()}.json`);
  writeFileSync(backup, JSON.stringify(docs, null, 2), {mode: 0o600});
  let tx = client.transaction();
  for (const {doc, fields} of patches) tx = tx.patch(doc._id, p => p.ifRevisionId(doc._rev).set(fields));
  await tx.commit();
  console.log(JSON.stringify({updated: patches.map(p => p.doc._id), backup}));
}
