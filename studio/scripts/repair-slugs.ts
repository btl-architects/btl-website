/* Audit current editorial names, then update only address fields on request.
 * This development cleanup does not add redirects, at the user's request.
 * Draft content remains a draft; every mutation has a revision guard. */
import {getCliClient} from 'sanity/cli';
import {mkdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

type Doc = {_id:string; _rev:string; _type:string; title?:string; name?:string; label?:string;
  tier?:string; bio?:string; slug?:{current?:string}; previousSlugs?:string[]};
const client = getCliClient({apiVersion:'2026-09-01'}).withConfig({useCdn:false,perspective:'raw'});
const docs = await client.fetch<Doc[]>('*[_type in ["project","person","category","location"]] | order(_id) {_id,_rev,_type,title,name,label,tier,bio,slug,previousSlugs}');
const baseId = (doc:Doc) => doc._id.replace(/^drafts\./,'');
function fromName(name:string, limit:number) {
  return name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,limit).replace(/-$/,'');
}
const skipped:string[] = [];
const desired = new Map<string,string>();
for (const doc of docs) {
  // Founders have a principal profile and a separate roster record. Do not
  // create a second competing profile address for the same person.
  if (doc._type === 'person' && !doc.slug?.current && !doc.bio && doc.tier !== 'principal' &&
      docs.some(other => other._type === 'person' && other.tier === 'principal' && other.name === doc.name && other.slug?.current)) {
    skipped.push(doc._id); continue;
  }
  const label = doc.title || doc.name || doc.label || '';
  const slug = fromName(label,['category','location'].includes(doc._type) ? 40 : 96);
  if (!slug || doc._type === 'project' && ['type','place'].includes(slug)) throw new Error(`Cannot generate a safe address for ${doc._id}`);
  desired.set(doc._id,slug);
}
// A published/draft pair represents one route. Other records must never
// compete for a current address or a published project's redirect alias.
for (const doc of docs) {
  const slug = desired.get(doc._id);
  if (!slug) continue;
  const conflict = docs.find(other => other._type === doc._type && baseId(other) !== baseId(doc) &&
    ((desired.get(other._id) || other.slug?.current) === slug || doc._type === 'project' &&
      (other.slug?.current === slug || other.previousSlugs?.includes(slug))));
  if (conflict) throw new Error(`Address ${slug} conflicts with ${conflict._id}; no changes applied.`);
}
const changes = docs.filter(doc => desired.has(doc._id) && desired.get(doc._id) !== doc.slug?.current).map(doc => {
  if (doc._type === 'person' && doc.bio && doc.slug?.current) throw new Error(`Profile ${doc._id} needs a redirect before its published address changes.`);
  const current = desired.get(doc._id)!;
  const fields:Record<string,unknown> = {slug:{_type:'slug',current}};
  return {doc,fields};
});
const apply = process.argv.includes('--apply');
console.log(JSON.stringify({apply,reviewed:docs.length,changes:changes.map(({doc,fields}) => ({id:doc._id,name:doc.title || doc.name || doc.label,from:doc.slug?.current || null,...fields})),
  existingFounderProfilesRetained:skipped},null,2));
if (apply && changes.length) {
  const directory=resolve('../backups'); mkdirSync(directory,{recursive:true});
  const backup=resolve(directory,`slugs-before-repair-${Date.now()}.json`);
  writeFileSync(backup,JSON.stringify(changes.map(({doc}) => doc),null,2),{mode:0o600});
  let transaction = client.transaction();
  for (const {doc,fields} of changes) transaction=transaction.patch(doc._id,patch => patch.ifRevisionId(doc._rev).set(fields));
  await transaction.commit();
  console.log(JSON.stringify({updated:changes.map(({doc}) => doc._id),backup}));
}
