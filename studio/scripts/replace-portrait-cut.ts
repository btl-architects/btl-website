/* Replace one opening clip's phone (portrait) film and its portrait still.
 *
 * Made for clip 4, "thirunelly 2" (2026-11-22): its uploaded portrait cut was
 * framed on the left roof edge and missed the house with the tree through its
 * roof. The new cut is a 9:16 crop of the clip's own 1080p landscape film,
 * centred on that house. The landscape film is not touched.
 *
 * Uploads the MP4 to Mux the way the Studio's Videos field does (public
 * playback, 1080p / 720p / 480p MP4s), waits for Mux, records the asset, uploads
 * the still, backs up the published settings to ../backups, then points the
 * clip at both with a revision guard. Without --apply it only reports.
 *
 *   cd studio
 *   npx sanity exec scripts/replace-portrait-cut.ts --with-user-token -- \
 *     --clip b23da7fdbeb1 --film <portrait.mp4> --still <portrait.jpg> [--apply]
 *
 * To undo: restore videoPortraitMux / posterPortrait for the clip from the
 * backup file this writes; the previous Mux asset is left in place. */
import {getCliClient} from 'sanity/cli';
import {createReadStream, mkdirSync, readFileSync, statSync, writeFileSync} from 'node:fs';
import {basename, resolve} from 'node:path';

const arg = (name: string) => process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : null;
const clipKey = arg('--clip'), film = arg('--film'), still = arg('--still');
const apply = process.argv.includes('--apply');
if (!clipKey || !film || !still) throw new Error('Pass --clip <key> --film <portrait.mp4> --still <portrait.jpg>.');
statSync(film); statSync(still);

const client = getCliClient({apiVersion: '2026-09-01'}).withConfig({useCdn: false, perspective: 'raw'});
const settings = await client.fetch('*[_id == "settings"][0]{_id,_rev,heroClips}');
const draft = await client.fetch('*[_id == "drafts.settings"][0]._id');
if (draft) throw new Error('Settings has unpublished edits in the Studio. Publish or discard them first, so this change is not reverted by them.');
const index = settings.heroClips.findIndex((clip: any) => clip._key === clipKey);
if (index < 0) throw new Error(`No opening clip with key ${clipKey}.`);
const clip = settings.heroClips[index];
console.log(JSON.stringify({clip: clip.label, position: index + 1, film: basename(film), bytes: statSync(film).size, still: basename(still), apply}));
if (!apply) process.exit(0);

const credentials = await client.fetch('*[_id == "secrets.mux"][0]{token,secretKey}');
if (!credentials?.token || !credentials?.secretKey) throw new Error('Connect Mux in the Videos configuration screen first.');
const authorization = `Basic ${Buffer.from(`${credentials.token}:${credentials.secretKey}`).toString('base64')}`;
async function mux(path: string, body?: unknown) {
  const response = await fetch(`https://api.mux.com/video/v1/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {Authorization: authorization, 'Content-Type': 'application/json'},
    ...(body ? {body: JSON.stringify(body)} : {}),
  });
  if (!response.ok) throw new Error(`Mux ${path} failed (${response.status}): ${(await response.text()).slice(0, 300)}. Website films are unchanged.`);
  return (await response.json()).data;
}
const wait = (ms: number) => new Promise(done => setTimeout(done, ms));

// 1. Upload the film to Mux.
const upload = await mux('uploads', {cors_origin: '*', new_asset_settings: {
  playback_policies: ['public'], video_quality: 'basic', max_resolution_tier: '1080p',
  static_renditions: [{resolution: '1080p'}, {resolution: '720p'}, {resolution: '480p'}],
}});
const put = await fetch(upload.url, {method: 'PUT', headers: {'Content-Type': 'video/mp4'}, body: readFileSync(film)});
if (!put.ok) throw new Error(`Mux upload failed (${put.status}). Website films are unchanged.`);

// 2. Wait for the asset and its MP4 files.
let assetId: string | undefined;
const deadline = Date.now() + 10 * 60 * 1000;
while (!assetId && Date.now() < deadline) { await wait(3000); assetId = (await mux(`uploads/${upload.id}`)).asset_id; }
if (!assetId) throw new Error('Mux did not create an asset in time. Website films are unchanged.');
let asset = await mux(`assets/${assetId}`);
const files = () => asset.static_renditions?.files ?? [];
while ((asset.status !== 'ready' || !files().some((f: any) => f.name === '720p.mp4' && f.status === 'ready') ||
        files().some((f: any) => f.status === 'preparing')) && Date.now() < deadline) {
  if (asset.status === 'errored') throw new Error('Mux could not process this film. Website films are unchanged.');
  await wait(5000); asset = await mux(`assets/${assetId}`);
}
if (asset.status !== 'ready') throw new Error(`Mux asset ${assetId} is still processing; rerun later. Website films are unchanged.`);

// 3. Record the asset the way the Studio's Videos plugin does.
const keyed = (value: any): any => Array.isArray(value) ? value.map((item, i) => item && typeof item === 'object' ? {...keyed(item), _key: String(i)} : item)
  : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, keyed(v)])) : value;
const record = {_id: `mux-${asset.id}`, _type: 'mux.videoAsset', assetId: asset.id,
  playbackId: asset.playback_ids.find((p: any) => p.policy === 'public').id,
  status: asset.status, filename: basename(film), data: asset};
await client.createIfNotExists(keyed(record));

// 4. The still.
const image = await client.assets.upload('image', createReadStream(still), {filename: basename(still)});

// 5. Back up, then point the clip at both — only if nobody changed settings meanwhile.
const directory = resolve('../backups'); mkdirSync(directory, {recursive: true});
const backup = resolve(directory, `opening-before-portrait-${clipKey}-${Date.now()}.json`);
writeFileSync(backup, JSON.stringify(settings, null, 2), {mode: 0o600});
await client.patch(settings._id).ifRevisionId(settings._rev).set({
  [`heroClips[_key=="${clipKey}"].videoPortraitMux`]: {_type: 'mux.video', asset: {_type: 'reference', _weak: true, _ref: record._id}},
  [`heroClips[_key=="${clipKey}"].posterPortrait`]: {_type: 'image', asset: {_type: 'reference', _ref: image._id}},
}).commit();
console.log(JSON.stringify({updated: clip.label, playbackId: record.playbackId,
  files: files().map((f: any) => `${f.name}:${f.status}`), still: image._id, backup}));
