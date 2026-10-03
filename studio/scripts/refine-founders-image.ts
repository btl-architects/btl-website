/* Update the image crop and principal ordering without publishing other edits. */
import {getCliClient} from 'sanity/cli';
import {mkdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const client = getCliClient({apiVersion:'2026-09-01'}).withConfig({useCdn:false, perspective:'raw'});
const settings = await client.fetch<any[]>('*[_id in ["settings","drafts.settings"]]{_id,_rev,foundersImage}');
const people = await client.fetch<any[]>('*[_type == "person" && tier == "principal"]{_id,_rev,name,order,active}');
console.log(JSON.stringify({settings, people}));
if (process.argv.includes('--apply')) {
  const expected = 'image-f02a9dfae0ce9f6a8cf965f8c19e1a686cd1e30f-4640x6960-jpg';
  if (!settings.some(doc => doc._id === 'settings') || settings.some(doc => doc.foundersImage?.asset?.asset?._ref !== expected))
    throw new Error('Founders image changed; review the current image before adjusting its crop.');
  const founders = people.filter(doc => /^(Faizan Hussain|Thressia Paul)$/.test(doc.name) && doc.active);
  for (const name of ['Faizan Hussain','Thressia Paul'])
    if (founders.filter(doc => doc.name === name && !doc._id.startsWith('drafts.')).length !== 1)
      throw new Error(`Expected one active principal named ${name}`);
  const directory = resolve('../backups'); mkdirSync(directory,{recursive:true});
  const backup = resolve(directory,`founders-crop-order-${Date.now()}.json`);
  writeFileSync(backup,JSON.stringify({settings,people:founders},null,2),{mode:0o600});
  let tx = client.transaction();
  for (const doc of settings) tx = tx.patch(doc._id,p => p.ifRevisionId(doc._rev).set({
    'foundersImage.asset.crop':{_type:'sanity.imageCrop',left:.08,right:.08,top:.28,bottom:.18},
    'foundersImage.asset.hotspot':{_type:'sanity.imageHotspot',x:.5,y:.55,width:.84,height:.54},
  }));
  for (const doc of founders) tx = tx.patch(doc._id,p => p.ifRevisionId(doc._rev).set({order:doc.name === 'Faizan Hussain' ? 0 : 1}));
  await tx.commit();
  console.log(JSON.stringify({updated:settings.map(doc => doc._id),order:founders.map(doc => ({name:doc.name,order:doc.name === 'Faizan Hussain' ? 0 : 1})),backup}));
}
