import {getCliClient} from 'sanity/cli';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const client=getCliClient({apiVersion:'2026-09-01'}).withConfig({useCdn:false,perspective:'raw'});
const founders=[
  {id:'person-faizan-hussain',duplicate:'92ac1bb8-9b3e-48f2-a156-d4a21f667ea0',name:'Faizan Hussain'},
  {id:'person-thressia-paul',duplicate:'5ef1f3ce-b195-489e-8cfc-2e77c11b6296',name:'Thressia Paul'},
];
const publications=[
  {id:'placeholder-dezeen',slug:'elle-decor-nelly-house'},
  {id:'publication-architectural-digest-5-august-2026',slug:'architectural-digest-nelly-house'},
];
const ids=[...founders.flatMap(p=>[p.id,p.duplicate]),...publications.map(p=>p.id)];
const docs=await client.fetch<any[]>('*[_id in $ids]',{ids:ids.flatMap(id=>[id,'drafts.'+id])});
if(docs.some(doc=>doc._id.startsWith('drafts.'))) throw new Error('These records have unfinished edits; review them before consolidating.');
const refs=await client.fetch<any[]>('*[references($ids)]{_id,_type}',{ids:founders.map(p=>p.duplicate)});
if(refs.length) throw new Error('Duplicate records have incoming references; redirect those before consolidating.');
const changes:{doc:any;fields:Record<string,unknown>}[]=founders.flatMap(person=>{
  const original=docs.find(d=>d._id===person.id), duplicate=docs.find(d=>d._id===person.duplicate);
  if(!original || !duplicate || original.name!==person.name || duplicate.name!==person.name || original.tier!=='principal' || duplicate.tier!=='team') throw new Error('Founder records changed; review before merging.');
  if(original.bio && duplicate.bio && original.bio!==duplicate.bio) throw new Error('Conflicting biographies need review.');
  return [{doc:original,fields:{role:duplicate.role,portrait:duplicate.portrait,bio:original.bio || duplicate.bio || '',
    order:duplicate.order,homeOrder:original.order,showInTeam:true,showRoleOnHome:false}}];
});
for(const item of publications) {
  const doc=docs.find(d=>d._id===item.id);
  if(!doc || doc.slug?.current && doc.slug.current!==item.slug) throw new Error('Press address changed; review before migration.');
  const conflict=await client.fetch<number>('count(*[_type=="publication" && !(_id in [$id,"drafts."+$id]) && (slug.current==$slug || $slug in previousSlugs || _id==$slug)])',{id:item.id,slug:item.slug});
  if(conflict) throw new Error('Press address is already reserved.');
  changes.push({doc,fields:{slug:{_type:'slug',current:item.slug},previousSlugs:[...new Set([...(doc.previousSlugs||[]),...(doc.slug?.current && doc.slug.current!==item.slug ? [doc.slug.current] : [])])]}});
}
console.log(JSON.stringify({changes:changes.map(({doc,fields})=>({id:doc._id,fields})),removeDuplicateRecords:founders.map(p=>p.duplicate),apply:process.argv.includes('--apply')},null,2));
if(process.argv.includes('--apply')) {
  mkdirSync('../backups',{recursive:true});
  const backup=resolve('../backups',`people-press-before-consolidation-${Date.now()}.json`);
  writeFileSync(backup,JSON.stringify(docs,null,2),{mode:0o600});
  let tx=client.transaction();
  for(const {doc,fields} of changes) tx=tx.patch(doc._id,p=>p.ifRevisionId(doc._rev).set(fields));
  for(const person of founders) {
    const duplicate=docs.find(d=>d._id===person.duplicate);
    tx=tx.patch(duplicate._id,p=>p.ifRevisionId(duplicate._rev).set({name:duplicate.name})).delete(duplicate._id);
  }
  await tx.commit(); console.log(JSON.stringify({updated:changes.map(c=>c.doc._id),backup}));
}
