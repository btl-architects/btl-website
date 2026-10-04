import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import sharp from 'sharp';
import {imagePlan,cacheImages} from '../tools/cache-images.mjs';
const image='https://cdn.sanity.io/images/aur12nrf/production/abcdef-8064x4536.jpg?rect=1%2C2%2C8000%2C4000&w=1080&q=82&auto=format&fit=max';
const bytes=await sharp({create:{width:4,height:2,channels:3,background:'#7799aa'}}).webp().toBuffer();

test('static renditions preserve quality, cropping and source identity',()=>{
  const plan=imagePlan(image),source=new URL(plan.source);
  assert.equal(source.searchParams.get('rect'),'1,2,8000,4000');
  assert.equal(source.searchParams.get('q'),'82');assert.equal(source.searchParams.get('fit'),'max');assert.equal(source.searchParams.get('fm'),'webp');
  assert.equal(source.searchParams.get('auto'),null);
  const wider=imagePlan(image.replace('w=1080','w=3500'));
  assert.equal(plan.path.replace('/w1080/','/w3500/'),wider.path);
  assert.notEqual(imagePlan(image.replace('q=82','q=90')).path,plan.path);
  assert.notEqual(imagePlan(image.replace('rect=1','rect=10')).path,plan.path);
});

test('delivery excludes unbounded originals, vectors, credentials and other hosts',()=>{
  for(const raw of [image.replace('cdn.sanity.io','evil.example'),image.replace('https://','http://'),image.replace('https://','https://secret@'),image.replace('.jpg','.svg'),image.replace('w=1080','w=99999'),image.replace('w=1080&',''),image+'#fragment']) assert.equal(imagePlan(raw),null,raw);
});

test('cached bytes serve repeated builds without new downloads, including zoom and escaped markup',async()=>{
  const root=mkdtempSync(join(tmpdir(),'btl-media-'));
  try {
    const dist=join(root,'dist'),cache=join(root,'cache');mkdirSync(dist);
    const html=`<body data-zoom-widths="3500,6000"><img src="${image.replace(/&/g,'&amp;')}" srcset="${image.replace(/&/g,'&amp;')} 1080w"><div data-gallery="{&quot;src&quot;:&quot;${image.replace(/&/g,'&amp;')}&quot;}"></div>`;
    writeFileSync(join(dist,'index.html'),html);
    const requests=[];const fetchImage=async(url)=>{requests.push(url);return new Response(bytes,{headers:{'Content-Type':'image/webp'}});};
    const result=await cacheImages({dist,cache,fetchImage});
    assert.equal(result.images,3);assert.equal(result.fetched,3);
    assert.deepEqual(requests.map(s=>Number(new URL(s).searchParams.get('w'))).sort((a,b)=>a-b),[1080,3500,6000]);
    const plan=imagePlan(image),delivered=readFileSync(join(dist,'index.html'),'utf8');
    assert.ok(delivered.includes(plan.delivered.replace(/&/g,'&amp;')));assert.ok(delivered.includes('&quot;}'));
    assert.ok(!delivered.includes('https://cdn.sanity.io'));assert.deepEqual(readFileSync(join(dist,plan.path)),bytes);
    writeFileSync(join(dist,'index.html'),html);
    const second=await cacheImages({dist,cache,fetchImage:()=>{throw new Error('Cache should avoid the network');}});
    assert.equal(second.reused,3);assert.equal(second.fetched,0);
    writeFileSync(join(cache,plan.path),'corrupt');writeFileSync(join(dist,'index.html'),html);
    const repaired=await cacheImages({dist,cache,fetchImage});assert.equal(repaired.fetched,1);
  }finally{rmSync(root,{recursive:true,force:true});}
});

test('invalid image responses fail before any HTML is rewritten',async()=>{
  const root=mkdtempSync(join(tmpdir(),'btl-media-'));
  try {
    const dist=join(root,'dist');mkdirSync(dist);const html=`<img src="${image}">`;writeFileSync(join(dist,'index.html'),html);
    await assert.rejects(cacheImages({dist,cache:join(root,'cache'),zoomWidths:[],fetchImage:async()=>new Response('<script>bad</script>',{headers:{'Content-Type':'image/webp'}})}),/could not cache/);
    assert.equal(readFileSync(join(dist,'index.html'),'utf8'),html);assert.ok(!existsSync(join(dist,imagePlan(image).path)));
  }finally{rmSync(root,{recursive:true,force:true});}
});

test('opening images preload a complete AVIF ladder and reuse it on repeat builds',async()=>{
  const root=mkdtempSync(join(tmpdir(),'btl-media-'));
  const modern=await sharp({create:{width:4,height:2,channels:3,background:'#7799aa'}}).avif().toBuffer();
  try {
    const dist=join(root,'dist'),cache=join(root,'cache');mkdirSync(dist);
    const srcset=`${image} 1080w, ${image.replace('w=1080','w=2160')} 2160w`;
    const html=`<link rel="preload" as="image" imagesrcset="${srcset}" imagesizes="100vw"><img fetchpriority="high" src="${image}" srcset="${srcset}" sizes="100vw">`;
    const build=async(fetchImage)=>{writeFileSync(join(dist,'index.html'),html);return cacheImages({dist,cache,zoomWidths:[],fetchImage});};
    const first=await build(async(url)=>new Response(new URL(url).searchParams.has('fm') ? bytes : modern,{headers:{'Content-Type':new URL(url).searchParams.has('fm')?'image/webp':'image/avif'}}));
    assert.equal(first.avifFetched,2);
    const delivered=readFileSync(join(dist,'index.html'),'utf8');
    assert.match(delivered,/<picture[^>]*><source type="image\/avif"/);
    assert.match(delivered,/<link[^>]*type="image\/avif"[^>]*\.avif\?/);
    assert.match(delivered,/<img[^>]*\.webp\?/);
    const repeat=await build(()=>{throw new Error('All formats must reuse their cache');});
    assert.equal(repeat.fetched,0);assert.equal(repeat.avifFetched,0);assert.equal(repeat.avifReused,2);
  }finally{rmSync(root,{recursive:true,force:true});}
});

test('an incomplete AVIF ladder keeps WebP and existing art direction unchanged',async()=>{
  const root=mkdtempSync(join(tmpdir(),'btl-media-'));
  const modern=await sharp({create:{width:4,height:2,channels:3,background:'#7799aa'}}).avif().toBuffer();
  try {
    const dist=join(root,'dist');mkdirSync(dist);
    const srcset=`${image} 1080w, ${image.replace('w=1080','w=2160')} 2160w`;
    writeFileSync(join(dist,'index.html'),`<img fetchpriority="high" src="${image}" srcset="${srcset}"><picture><source media="(max-width: 600px)" srcset="${image}"><img fetchpriority="high" src="${image}"></picture>`);
    await cacheImages({dist,cache:join(root,'cache'),zoomWidths:[],fetchImage:async(url)=>{
      const ready=!new URL(url).searchParams.has('fm') && new URL(url).searchParams.get('w')==='1080';
      return new Response(ready?modern:bytes,{headers:{'Content-Type':ready?'image/avif':'image/webp'}});
    }});
    const delivered=readFileSync(join(dist,'index.html'),'utf8');
    assert.equal((delivered.match(/<picture/g)||[]).length,1);
    assert.ok(!delivered.includes('type="image/avif"'));
    assert.match(delivered,/<source media="\(max-width: 600px\)"/);
  }finally{rmSync(root,{recursive:true,force:true});}
});
