/* Sanity remains the sole image transformer. Copy its optimized WebP renditions
 * into the static deployment, so visits and browser checks do not spend CMS
 * bandwidth. Asset + crop + quality identify an immutable cache entry. */
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {readdirSync,readFileSync,statSync,mkdirSync,writeFileSync,renameSync,copyFileSync,existsSync} from 'node:fs';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');

export function imagePlan(raw) {
  let url;try {url=new URL(raw);}catch {return null;}
  if(url.origin!=='https://cdn.sanity.io' || url.username || url.password || url.hash) return null;
  const match=/^\/images\/([a-z0-9]+)\/([a-z0-9_-]+)\/([a-zA-Z0-9_-]+)-(\d+)x(\d+)\.(jpg|jpeg|png|webp|avif|tif|tiff|gif)$/.exec(url.pathname);
  if(!match || url.searchParams.get('auto')!=='format') return null;
  const width=Number(url.searchParams.get('w'));
  if(!Number.isInteger(width) || width<1 || width>6000) return null;
  // Social scraper previews stay absolute URLs. They are not visitor requests.
  if(url.searchParams.get('h')==='630' && width===1200) return null;
  const source=new URL(url);source.searchParams.delete('auto');source.searchParams.set('fm','webp');source.searchParams.sort();
  const identity=new URL(source);identity.searchParams.delete('w');
  const group=createHash('sha256').update(identity.href).digest('hex').slice(0,24);
  const name=url.pathname.split('/').pop().replace(/\.[a-z]+$/i,'.webp');
  const path=`/assets/media/${group}/w${width}/${name}`;
  // Preserve width/crop metadata used by the viewer and responsive checks.
  const delivered=path+url.search.replace(/,/g,'%2C');
  return {source:source.href,original:url.href,path,delivered,width,fullWidth:Number(match[4])};
}

async function validImage(bytes,format='webp') {
  if(!bytes || bytes.length>25*1024*1024 || format==='webp' && !webpBytes(bytes)) return false;
  try {const meta=await sharp(bytes).metadata();return meta.width>0 && meta.height>0 && (format==='avif' ? meta.format==='heif' && meta.compression==='av1' : meta.format==='webp');}catch{return false;}
}
export function webpBytes(bytes) {
  return bytes.length>=12 && bytes.toString('ascii',0,4)==='RIFF' && bytes.toString('ascii',8,12)==='WEBP' && bytes.readUInt32LE(4)+8===bytes.length;
}
function* htmlFiles(dir) {
  for(const entry of readdirSync(dir)) {
    const file=join(dir,entry);if(statSync(file).isDirectory()) yield* htmlFiles(file);
    else if(entry.endsWith('.html')) yield file;
  }
}
export async function cacheImages({dist=join(ROOT,'dist'),cache=join(ROOT,'node_modules/.astro/btl-media-v1'),fetchImage=fetch,zoomWidths}={}) {
  const pages=[...htmlFiles(dist)].map(path=>({path,html:readFileSync(path,'utf8')}));
  const plans=new Map();const aliases=new Map();const critical=new Map();
  // Only standalone priority photographs need an extra format. Existing
  // art-directed pictures keep their authored source selection.
  for(const page of pages) {
    let inPicture=0;const images=[];
    for(const token of page.html.matchAll(/<\/?picture\b[^>]*>|<img\b[^>]*>/g)) {
      const tag=token[0];
      if(tag.startsWith('</picture')) {inPicture--;continue;}
      if(tag.startsWith('<picture')) {inPicture++;continue;}
      if(inPicture || !/fetchpriority="high"/.test(tag)) continue;
      const candidates=[...tag.matchAll(/https:\/\/cdn\.sanity\.io\/images\/[^\s"'<>]+/g)].map(m=>m[0].split(/&quot;|&#34;|&#x22;/i)[0].replace(/&amp;/g,'&')).map(imagePlan).filter(Boolean);
      if(candidates.length) images.push({tag,plans:[...new Map(candidates.map(p=>[p.path,p])).values()]});
    }
    critical.set(page.path,images);
  }
  for(const page of pages) {
    const rungs=zoomWidths ?? (page.html.match(/data-zoom-widths="([\d,]+)"/)?.[1] ?? '').split(',').map(Number).filter(w=>w>0);
    for(const match of page.html.matchAll(/https:\/\/cdn\.sanity\.io\/images\/[^\s"'<>]+/g)) {
      const encoded=match[0].split(/&quot;|&#34;|&#x22;/i)[0],raw=encoded.replace(/&amp;/g,'&');const plan=imagePlan(raw);
      if(!plan) continue;
      plans.set(plan.path,plan);aliases.set(encoded,encoded.includes('&amp;') ? plan.delivered.replace(/&/g,'&amp;') : plan.delivered);
      // The viewer can request either zoom rung from ANY fitted rendition.
      for(const width of new Set(rungs.length ? rungs.filter(w=>w<plan.fullWidth).concat(Math.min(plan.fullWidth,Math.max(...rungs))) : [])) {
        const zoom=new URL(raw);zoom.searchParams.set('w',String(width));const next=imagePlan(zoom.href);
        if(next) plans.set(next.path,next);
      }
    }
  }
  console.log(`[media] preparing ${plans.size} optimized renditions`);
  let fetched=0,reused=0,bytes=0;const pending=[...plans.values()];
  await Promise.all(Array.from({length:4},async()=>{
    while(pending.length) {
      const plan=pending.pop(),cached=join(cache,plan.path),target=join(dist,plan.path);
      let body=existsSync(cached) ? readFileSync(cached) : null;
      if(await validImage(body)) reused++;
      else {
        for(let attempt=0;attempt<3;attempt++) {
          try {
            const response=await fetchImage(plan.source,{headers:{Accept:'image/webp'},signal:AbortSignal.timeout(30000),redirect:'error'});
            if(!response.ok || response.headers.get('content-type')?.split(';')[0]!=='image/webp') throw new Error('Unexpected image response');
            body=Buffer.from(await response.arrayBuffer());
            if(!await validImage(body)) throw new Error('Invalid or oversized WebP');
            break;
          }catch(error){body=null;if(attempt===2) throw new Error(`[media] could not cache ${plan.source}`,{cause:error});}
        }
        mkdirSync(dirname(cached),{recursive:true});writeFileSync(cached+'.tmp',body);renameSync(cached+'.tmp',cached);fetched++;
      }
      mkdirSync(dirname(target),{recursive:true});copyFileSync(cached,target);bytes+=body.length;
    }
  }));
  // AVIF is asynchronous in Sanity: use it for opening photographs only when
  // every candidate is ready. Otherwise the complete WebP ladder stays valid.
  const avif=new Set();let avifFetched=0,avifReused=0;
  const openings=[...new Map([...critical.values()].flatMap(images=>images.flatMap(i=>i.plans)).map(p=>[p.path,p])).values()];
  await Promise.all(Array.from({length:4},async()=>{
    while(openings.length) {
      const plan=openings.pop(),path=plan.path.replace(/\.webp$/,'.avif'),cached=join(cache,path);
      let body=existsSync(cached) ? readFileSync(cached) : null;
      if(await validImage(body,'avif')) avifReused++;
      else {
        try {
          const response=await fetchImage(plan.original,{headers:{Accept:'image/avif,image/webp'},signal:AbortSignal.timeout(30000),redirect:'error'});
          if(!response.ok || response.headers.get('content-type')?.split(';')[0]!=='image/avif') continue;
          body=Buffer.from(await response.arrayBuffer());if(!await validImage(body,'avif')) continue;
          mkdirSync(dirname(cached),{recursive:true});writeFileSync(cached+'.tmp',body);renameSync(cached+'.tmp',cached);avifFetched++;
        }catch{continue;}
      }
      const target=join(dist,path);mkdirSync(dirname(target),{recursive:true});copyFileSync(cached,target);avif.add(plan.path);
    }
  }));
  // Never publish HTML pointing at files until every required file exists.
  const replacements=[...aliases].sort((a,b)=>b[0].length-a[0].length);
  const rewrite=raw=>{for(const [from,to] of replacements) raw=raw.split(from).join(to);return raw;};
  for(const page of pages) {
    let html=rewrite(page.html);
    for(const image of critical.get(page.path)) {
      if(!image.plans.every(plan=>avif.has(plan.path))) continue;
      const tag=rewrite(image.tag);
      const srcset=/\ssrcset="([^"]+)"/.exec(tag)?.[1] ?? /\ssrc="([^"]+)"/.exec(tag)?.[1];
      const sizes=/\ssizes="([^"]+)"/.exec(tag)?.[1];
      const modern=srcset.replace(/\.webp\?/g,'.avif?');
      html=html.replace(tag,`<picture style="display:contents"><source type="image/avif" srcset="${modern}"${sizes ? ` sizes="${sizes}"` : ''}>${tag}</picture>`);
      html=html.replace(/<link\b[^>]*>/g,link=>link.includes('as="image"') && link.includes(`imagesrcset="${srcset}"`) ? link.replace(`imagesrcset="${srcset}"`,`type="image/avif" imagesrcset="${modern}"`) : link);
    }
    const visibleRemote=/<(?:img|source)\b[^>]*(?:src|srcset)="https:\/\/cdn\.sanity\.io\//.test(html);
    if(!visibleRemote) html=html.replace(/<link\b[^>]*rel="preconnect"[^>]*href="https:\/\/cdn\.sanity\.io"[^>]*>/g,'');
    writeFileSync(page.path,html);
  }
  const result={images:plans.size,fetched,reused,bytes,avifFetched,avifReused};console.log('[media] '+JSON.stringify(result));return result;
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) await cacheImages();
