/* Give the opening films that already exist a 720p MP4 for phones.
 *
 * New uploads ask Mux for 1080p, 720p and 480p (sanity.config.ts). Films
 * uploaded before that change only have `highest.mp4`, and Mux refuses to add
 * a specific size while `highest` exists ("Advanced static rendition not
 * supported with highest enabled"). So for each opening-film asset this removes
 * `highest`, asks for 1080p and 720p, waits for Mux to finish, then refreshes
 * only the stored rendition list on that asset's Sanity record so the Studio
 * and the website see it. While Mux works (a minute or two for these short
 * clips) the opening shows its stills. Client content (settings, projects) is
 * never edited. Without `--apply` it only reports what it would do.
 * `--only <playbackId>` limits it to one asset, to try a single film first.
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

async function mux(path: string, body?: unknown, method = body ? 'POST' : 'GET') {
  const response = await fetch(`https://api.mux.com/video/v1/${path}`, {
    method,
    headers: {Authorization: authorization, 'Content-Type': 'application/json'},
    ...(body ? {body: JSON.stringify(body)} : {}),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Mux request ${path} failed (${response.status}): ${detail.slice(0, 300)}. Nothing further was changed.`);
  }
  return response.status === 204 ? null : (await response.json()).data;
}

type Record = {_id: string; _rev: string; assetId?: string; playbackId?: string};
const records: Record[] = await client.fetch(`*[_id == "settings"][0].heroClips[]{
  "assets": [videoMux.asset->{_id,_rev,assetId,playbackId}, videoPortraitMux.asset->{_id,_rev,assetId,playbackId}]
}.assets[defined(assetId)]`);
const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
const unique = [...new Map(records.map(record => [record._id, record])).values()]
  .filter(record => !only || record.playbackId === only);
if (!unique.length) throw new Error('No Mux-hosted opening films were found in the published settings.');

const files = (asset: any) => (asset?.static_renditions?.files || []) as {id?: string; name?: string; status?: string}[];
const report: {playbackId?: string; before: string[]; action: string}[] = [];

for (const record of unique) {
  const asset = await mux(`assets/${record.assetId}`);
  const has720 = files(asset).find(file => file.name === '720p.mp4');
  const before = files(asset).map(file => `${file.name}:${file.status}`);
  if (has720) { report.push({playbackId: record.playbackId, before, action: 'already has 720p'}); continue; }
  if (!apply) { report.push({playbackId: record.playbackId, before, action: 'would replace highest with 1080p + 720p'}); continue; }
  for (const highest of files(asset).filter(file => file.name === 'highest.mp4' && file.id))
    await mux(`assets/${record.assetId}/static-renditions/${highest.id}`, undefined, 'DELETE');
  for (const resolution of ['1080p', '720p'])
    if (!files(asset).some(file => file.name === `${resolution}.mp4`))
      await mux(`assets/${record.assetId}/static-renditions`, {resolution});
  report.push({playbackId: record.playbackId, before, action: 'replaced highest with 1080p + 720p'});
}
console.log(JSON.stringify({apply, assets: report}, null, 2));
if (!apply) process.exit(0);

// Wait for Mux, then refresh each record's stored rendition list. A 720p file
// Mux skips (a source smaller than 720p) is reported, not treated as an error.
const deadline = Date.now() + 15 * 60 * 1000;
for (const record of unique) {
  let asset = await mux(`assets/${record.assetId}`);
  while (files(asset).some(file => file.status === 'preparing' || file.status === 'deleting') && Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    asset = await mux(`assets/${record.assetId}`);
  }
  const state = files(asset).map(file => `${file.name}:${file.status}`).join(', ') || 'none';
  if (files(asset).some(file => file.status === 'preparing')) { console.log(`${record.playbackId}: still preparing (${state}); rerun later to refresh the record.`); continue; }
  await client.patch(record._id).ifRevisionId(record._rev)
    .set({'data.static_renditions': asset.static_renditions}).commit();
  console.log(`${record.playbackId}: ${state}; stored rendition list refreshed.`);
}
console.log('Publish any change in the Studio (or redeploy) to rebuild the website with the new files.');
