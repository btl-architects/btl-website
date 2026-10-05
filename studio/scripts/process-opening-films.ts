/* Verify the Mux connection, or process existing opening sources on request.
 * Credentials stay in memory; backups contain opening content only. */
import {getCliClient} from 'sanity/cli';
import {mkdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {muxVideoUrl} from '../../shared/video.ts';
const client = getCliClient({apiVersion:'2026-09-01'}).withConfig({useCdn:false,perspective:'raw'});
const credentials = await client.fetch('*[_id == "secrets.mux"][0]{token,secretKey}');
if (!credentials?.token || !credentials?.secretKey) throw new Error('Connect Mux in the Videos configuration screen first.');
const authorization = `Basic ${Buffer.from(`${credentials.token}:${credentials.secretKey}`).toString('base64')}`;
async function mux(path: string, body?: unknown) {
  const response = await fetch(`https://api.mux.com/video/v1/${path}`, {
    method:body ? 'POST' : 'GET',
    headers:{Authorization:authorization,'Content-Type':'application/json'},
    ...(body ? {body:JSON.stringify(body)} : {}),
  });
  if (!response.ok) throw new Error(`Mux ${body ? 'processing' : 'connection'} request failed (${response.status}). Check the environment, Video permissions and plan in Mux. Existing website films are unchanged.`);
  return (await response.json()).data;
}
const existing = await mux('assets?limit=10');
const settings = await client.fetch('*[_id == "settings"][0]{_id,_rev,heroClips}');
const draft = await client.fetch('*[_id == "drafts.settings"][0]{_id,_rev,heroClips}');
if (draft && JSON.stringify(draft.heroClips) !== JSON.stringify(settings.heroClips)) throw new Error('Opening sequence has unfinished edits. Review them before processing published sources.');
console.log(JSON.stringify({connected:true,existingAssets:existing.length,clips:settings.heroClips.map((clip: any) => ({key:clip._key,label:clip.label,mode:clip.videoMode || 'file'})),apply:process.argv.includes('--apply')}));
if (process.argv.includes('--apply')) {
  const directory=resolve('../backups'); mkdirSync(directory,{recursive:true});
  const backup=resolve(directory,`opening-before-mux-${Date.now()}.json`);
  writeFileSync(backup,JSON.stringify(settings,null,2),{mode:0o600});
  const clips = structuredClone(settings.heroClips);
  const created: any[] = [];
  // Keep a interrupted run's IDs locally so processing can be resumed/reviewed.
  const progress = resolve(directory,`opening-mux-progress-${Date.now()}.json`);
  for (const clip of clips) {
    if (clip.videoMode === 'mux') continue;
    if (!clip.video?.asset?._ref) throw new Error('Each existing clip needs a landscape source before processing. Existing website films are unchanged.');
    for (const [source,destination] of [['video','videoMux'],['videoPortrait','videoPortraitMux']]) {
      const ref = clip[source]?.asset?._ref;
      if (!ref) continue;
      const file = await client.fetch('*[_id == $id][0]{url,originalFilename}',{id:ref});
      if (!file?.url?.startsWith('https://cdn.sanity.io/files/')) throw new Error('Expected an existing Sanity film source.');
      const asset = await mux('assets',{inputs:[{url:file.url}],playback_policies:['public'],video_quality:'basic',max_resolution_tier:'1080p',static_renditions:[{resolution:'1080p'},{resolution:'720p'},{resolution:'480p'}]});
      created.push({clip:clip._key,source,id:asset.id});
      writeFileSync(progress,JSON.stringify(created,null,2),{mode:0o600});
      console.log(JSON.stringify({clip:clip.label,cut:source,asset:asset.id,status:asset.status}));
      let ready = asset;
      const deadline = Date.now()+180000;
      while (!muxVideoUrl({status:ready.status,data:ready}) && Date.now()<deadline) {
        if (ready.status === 'errored' || ready.static_renditions?.files?.some((file: any) => file.status === 'errored'))
          throw new Error('Mux could not process this film. Existing website films are unchanged.');
        await new Promise(resolve => setTimeout(resolve,5000));
        ready = await mux(`assets/${asset.id}`);
      }
      const url = muxVideoUrl({status:ready.status,data:ready});
      if (!url) throw new Error(`Processing is still pending. Existing films are unchanged; asset IDs are recorded in ${progress}.`);
      const document = {_id:`mux-${ready.id}`,_type:'mux.videoAsset',assetId:ready.id,
        playbackId:ready.playback_ids.find((id: any) => id.policy === 'public').id,
        status:ready.status,filename:file.originalFilename || `${clip.label || 'Opening film'}-${source}`,data:ready};
      // Mux arrays persisted in Sanity need stable item keys, as in the plugin.
      const keyed = (value: any): any => Array.isArray(value) ? value.map((item,index) => item && typeof item === 'object' ? {...keyed(item),_key:String(index)} : item)
        : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key,item]) => [key,keyed(item)])) : value;
      await client.createIfNotExists(keyed(document));
      clip[destination] = {_type:'mux.video',asset:{_type:'reference',_weak:true,_ref:document._id}};
      console.log(JSON.stringify({clip:clip.label,cut:source,status:'ready',duration:ready.duration,url}));
    }
    clip.videoMode = 'mux';
  }
  // Revision guard prevents replacing a sequence another editor changed.
  let tx = client.transaction().patch(settings._id,p => p.ifRevisionId(settings._rev).set({heroClips:clips}));
  if (draft) tx = tx.patch(draft._id,p => p.ifRevisionId(draft._rev).set({heroClips:clips}));
  await tx.commit();
  console.log(JSON.stringify({updated:settings._id,backup,progress,processed:created.length}));
}
