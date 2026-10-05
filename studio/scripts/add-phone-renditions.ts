/* Give the opening films that already exist a 720p MP4 for phones.
 *
 * New uploads ask Mux for 1080p, 720p and 480p (sanity.config.ts). Films
 * uploaded before that change only have `highest.mp4`. This asks Mux to add a
 * 720p file to each opening-film asset that lacks one, waits for Mux to finish,
 * then refreshes only the stored rendition list on that asset's Sanity record
 * so the Studio and the website see it. Client content (settings, projects) is
 * never edited. Without `--apply` it only reports what it would do.
 *
 *   cd studio
 *   npx sanity exec scripts/add-phone-renditions.ts --with-user-token
 *   npx sanity exec scripts/add-phone-renditions.ts --with-user-token -- --apply
 *
 * Mux credentials are read from the Videos configuration the Studio already
 * holds and stay in memory. Adding a rendition is a Mux storage change on the
 * practice's account. */
import {getCliClient} from 'sanity/cli';

const apply = process.argv.includes('--apply');
const client = getCliClient({apiVersion: '2026-09-01'}).withConfig({useCdn: false, perspective: 'raw'});
const credentials = await client.fetch('*[_id == "secrets.mux"][0]{token,secretKey}');
if (!credentials?.token || !credentials?.secretKey) throw new Error('Connect Mux in the Videos configuration screen first.');
const authorization = `Basic ${Buffer.from(`${credentials.token}:${credentials.secretKey}`).toString('base64')}`;

async function mux(path: string, body?: unknown) {
  const response = await fetch(`https://api.mux.com/video/v1/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {Authorization: authorization, 'Content-Type': 'application/json'},
    ...(body ? {body: JSON.stringify(body)} : {}),
  });
  if (!response.ok) throw new Error(`Mux request ${path} failed (${response.status}). Nothing further was changed.`);
  return (await response.json()).data;
}

type Record = {_id: string; _rev: string; assetId?: string; playbackId?: string};
const records: Record[] = await client.fetch(`*[_id == "settings"][0].heroClips[]{
  "assets": [videoMux.asset->{_id,_rev,assetId,playbackId}, videoPortraitMux.asset->{_id,_rev,assetId,playbackId}]
}.assets[defined(assetId)]`);
const unique = [...new Map(records.map(record => [record._id, record])).values()];
if (!unique.length) throw new Error('No Mux-hosted opening films were found in the published settings.');

const files = (asset: any) => (asset?.static_renditions?.files || []) as {name?: string; status?: string}[];
const report: {playbackId?: string; before: string[]; action: string}[] = [];

for (const record of unique) {
  const asset = await mux(`assets/${record.assetId}`);
  const has720 = files(asset).find(file => file.name === '720p.mp4');
  const before = files(asset).map(file => `${file.name}:${file.status}`);
  if (has720) { report.push({playbackId: record.playbackId, before, action: 'already has 720p'}); continue; }
  if (!apply) { report.push({playbackId: record.playbackId, before, action: 'would add 720p'}); continue; }
  await mux(`assets/${record.assetId}/static-renditions`, {resolution: '720p'});
  report.push({playbackId: record.playbackId, before, action: 'requested 720p'});
}
console.log(JSON.stringify({apply, assets: report}, null, 2));
if (!apply) process.exit(0);

// Wait for Mux, then refresh each record's stored rendition list. A 720p file
// Mux skips (a source smaller than 720p) is reported, not treated as an error.
const deadline = Date.now() + 15 * 60 * 1000;
for (const record of unique) {
  let asset = await mux(`assets/${record.assetId}`);
  while (files(asset).some(file => file.status === 'preparing') && Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    asset = await mux(`assets/${record.assetId}`);
  }
  const state = files(asset).find(file => file.name === '720p.mp4')?.status || 'missing';
  if (state === 'preparing') { console.log(`${record.playbackId}: 720p still preparing; rerun later to refresh the record.`); continue; }
  await client.patch(record._id).ifRevisionId(record._rev)
    .set({'data.static_renditions': asset.static_renditions}).commit();
  console.log(`${record.playbackId}: 720p ${state}; stored rendition list refreshed.`);
}
console.log('Publish any change in the Studio (or redeploy) to rebuild the website with the new files.');
