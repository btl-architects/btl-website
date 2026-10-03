/* Replace only the founders photograph; preserve all other published/draft fields. */
import {getCliClient} from 'sanity/cli';
import {createReadStream, mkdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const client = getCliClient({apiVersion: '2026-09-01'}).withConfig({useCdn: false, perspective: 'raw'});
const previous = 'image-41bb50e2cafd7431c15e3e1f95be7b5008216970-914x1279-jpg';
type Image = {asset: {asset: {_ref: string}; [key: string]: unknown}; [key: string]: unknown};
const docs = await client.fetch<{_id: string; _rev: string; foundersImage: Image}[]>(
  '*[_id in ["settings", "drafts.settings"]]{_id,_rev,foundersImage}');
if (!docs.some(doc => doc._id === 'settings')) throw new Error('Published settings missing');
for (const doc of docs) if (doc.foundersImage?.asset?.asset?._ref !== previous)
  throw new Error(`Founders photograph changed; review ${doc._id} before replacing it`);
const imageAt = process.argv.indexOf('--image');
const path = imageAt >= 0 ? process.argv[imageAt + 1] : undefined;
console.log(JSON.stringify({apply: process.argv.includes('--apply'), records: docs.map(doc => doc._id)}));
if (process.argv.includes('--apply')) {
  if (!path) throw new Error('Pass --image with the camera original');
  const directory = resolve('../backups'); mkdirSync(directory, {recursive: true});
  const backup = resolve(directory, `founders-original-${Date.now()}.json`);
  writeFileSync(backup, JSON.stringify(docs, null, 2), {mode: 0o600});
  const asset = await client.assets.upload('image', createReadStream(path), {filename: 'btl-founders-original.jpg'});
  const dimensions = asset.metadata?.dimensions;
  if (dimensions?.width !== 4640 || dimensions?.height !== 6960) throw new Error('Unexpected original dimensions; settings unchanged');
  let transaction = client.transaction();
  for (const doc of docs) transaction = transaction.patch(doc._id, patch => patch.ifRevisionId(doc._rev).set({
    foundersImage: {...doc.foundersImage, asset: {...doc.foundersImage.asset,
      asset: {_type: 'reference', _ref: asset._id},
      crop: {_type: 'sanity.imageCrop', left: .08, right: .08, top: .28, bottom: .06},
      hotspot: {_type: 'sanity.imageHotspot', x: .5, y: .61, width: .84, height: .66}}},
  }));
  await transaction.commit();
  console.log(JSON.stringify({updated: docs.map(doc => doc._id), asset: asset._id, dimensions, backup}));
}
