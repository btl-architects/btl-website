/* One-time, guarded content update. No draft is published wholesale. */
import {getCliClient} from "sanity/cli";
import {readFileSync, mkdirSync, writeFileSync} from "node:fs";
import {resolve} from "node:path";

const client = getCliClient({apiVersion: "2026-09-01"});
const ids = ["settings", "drafts.settings", "placeholder-dezeen", "drafts.placeholder-dezeen",
  "publication-architectural-digest-5-august-2026", "drafts.publication-architectural-digest-5-august-2026"];
const docs = await client.fetch<{_id: string; _rev: string; _type: string; publication?: string; [key: string]: unknown}[]>("*[_id in $ids]", {ids});
if (!docs.some(d => d._id === "settings")) throw new Error("Settings document missing");
console.log(JSON.stringify({settings: docs.filter(d => d._type === "settings").map(d => d._id), publications: docs.filter(d => d._type === "publication").map(d => ({id: d._id, name: d.publication})), apply: process.argv.includes("--apply")}));
if (process.argv.includes("--apply")) {
  const imageAt = process.argv.indexOf("--image");
  const imagePath = imageAt >= 0 ? process.argv[imageAt + 1] : undefined;
  if (!imagePath) throw new Error("Pass --image with the full-resolution JPEG");
  const backupDir = resolve("../backups");
  mkdirSync(backupDir, {recursive: true});
  const backup = resolve(backupDir, `client-feedback-${Date.now()}.json`);
  writeFileSync(backup, JSON.stringify(docs, null, 2), {mode: 0o600});
  const asset = await client.assets.upload("image", readFileSync(imagePath), {filename: "btl-team-group.jpg", contentType: "image/jpeg"});
  const figure = {_type: "figure", alt: "The btl team gathered at the studio beside a floral arrangement.", rights: "client-supplied",
    asset: {_type: "image", asset: {_type: "reference", _ref: asset._id},
      crop: {_type: "sanity.imageCrop", top: .28, bottom: .015, left: 0, right: 0},
      hotspot: {_type: "sanity.imageHotspot", x: .5, y: .67, width: 1, height: .62}}};
  let transaction = client.transaction();
  for (const doc of docs) {
    transaction = doc._type === "settings" ? transaction.patch(doc._id, p => p.ifRevisionId(doc._rev).set({teamImage: figure})) :
      transaction.patch(doc._id, p => p.ifRevisionId(doc._rev).unset(["logo"]).setIfMissing({openingMode: "external"}));
  }
  await transaction.commit();
  console.log(JSON.stringify({updated: docs.map(d => d._id), asset: asset._id, backup, foundersUnchanged: true}));
}
