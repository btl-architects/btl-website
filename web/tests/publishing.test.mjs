import test from 'node:test';
import assert from 'node:assert/strict';
import {buildMode,visibleProjects,routedProjects,enquiryKey} from '../server/build-mode.js';
import {resolveRedirects} from '../server/redirects.js';
import {protectPreview} from '../server/preview.js';
const content=['draft','published','archived'].map(lifecycle=>({lifecycle}));
test('published and archived routes survive while only published projects are indexed',()=>{
  assert.deepEqual(visibleProjects(content).map(p=>p.lifecycle),['published']);
  assert.deepEqual(routedProjects(content).map(p=>p.lifecycle),['published','archived']);
  assert.equal(visibleProjects(content,true).length,2);assert.equal(routedProjects(content,true).length,3);
});
test('preview cannot fall back silently or run on main',()=>{
  assert.throws(()=>buildMode({SANITY_PROJECT_ID:'test',SANITY_PREVIEW:'true'}),/TOKEN/);
  assert.throws(()=>buildMode({SANITY_PROJECT_ID:'test',SANITY_PREVIEW:'true',SANITY_PREVIEW_TOKEN:'test',CF_PAGES_BRANCH:'main'}),/production/);
  assert.throws(()=>buildMode({SANITY_PROJECT_ID:'test',SANITY_PREVIEW:'true',SANITY_PREVIEW_TOKEN:'test',NETLIFY:'true',CONTEXT:'deploy-preview'}),/authentication/);
});
test('published branch previews are not indexable and still read only published content',()=>{
  for (const env of [{CF_PAGES_BRANCH:'feature'}, {CONTEXT:'deploy-preview',NETLIFY:'true'}]) {
    const mode=buildMode({SANITY_PROJECT_ID:'test',...env});
    assert.equal(mode.preview,false); assert.equal(mode.noindex,true); assert.equal(mode.client.perspective,'published');
  }
  assert.equal(buildMode({SANITY_PROJECT_ID:'test',CF_PAGES_BRANCH:'main'}).noindex,false);
});
test('published previews are public but emit a noindex header without needing a password',async()=>{
  const response=await protectPreview({request:new Request('https://preview.example/'),env:{ASSETS:{fetch:async()=>Response.json({preview:false,noindex:true})}},next});
  assert.equal(response.status,200); assert.equal(response.headers.get('X-Robots-Tag'),'noindex, nofollow');
});
test('redirect chains include static and CMS rules',()=>{
  assert.deepEqual(resolveRedirects([{from:'/old',to:'/middle'},{from:'/middle',to:'/new'}],new Set(['/new/'])),[{from:'/old/',to:'/new/',permanent:true},{from:'/middle/',to:'/new/',permanent:true}]);
});
test('redirect graph rejects duplicates, cycles, self redirects, missing and shadowed routes',()=>{
  const pages=new Set(['/new/']);
  for(const rows of [
    [{from:'/old',to:'/new'},{from:'/OLD/',to:'/new'}],
    [{from:'/a',to:'/b'},{from:'/b',to:'/a'}],
    [{from:'/old',to:'/old'}], [{from:'/old',to:'/missing'}], [{from:'/new',to:'/elsewhere'}],
    [{from:'/old',to:'//evil.example'}], [{from:'/old',to:'/new?lost=1'}]
  ]) assert.throws(()=>resolveRedirects(rows,pages));
});
function preview(previewFlag, password='a-long-test-password') {
  return {ASSETS:{fetch:async()=>Response.json({preview:previewFlag,noindex:previewFlag})},PREVIEW_PASSWORD:password};
}
const next=async()=>new Response('<h1>Draft content</h1>');
test('draft output requires authentication regardless of URL',async()=>{
  const request=new Request('https://preview.example/projects/draft/');
  assert.equal((await protectPreview({request,env:preview(true),next})).status,401);
  assert.equal((await protectPreview({request,env:preview(true,''),next})).status,503);
});
test('authorized preview preserves response and marks every response private',async()=>{
  const request=new Request('https://preview.example/',{headers:{Authorization:'Basic '+btoa('preview:a-long-test-password')}});
  const response=await protectPreview({request,env:preview(true),next});
  assert.equal(await response.text(),'<h1>Draft content</h1>');assert.equal(response.headers.get('Cache-Control'),'no-store');assert.match(response.headers.get('X-Robots-Tag'),/noindex/);
});
test('production needs no preview password; missing marker fails closed',async()=>{
  const request=new Request('https://btldesigns.in/');
  assert.equal((await protectPreview({request,env:preview(false,''),next})).status,200);
  assert.equal((await protectPreview({request,env:{ASSETS:{fetch:async()=>new Response('missing',{status:404})}},next})).status,503);
});
test('incomplete markers and indexable draft markers fail closed',async()=>{
  for (const marker of [{preview:false}, {preview:true,noindex:false}, {preview:false,noindex:'false'}]) {
    const response=await protectPreview({request:new Request('https://preview.example/'),env:{ASSETS:{fetch:async()=>Response.json(marker)}},next});
    assert.equal(response.status,503);
    assert.equal(response.headers.get('Cache-Control'),'no-store');
    assert.notEqual(await response.text(),'<h1>Draft content</h1>');
  }
});
test('preview authentication accepts a case-insensitive scheme and UTF-8 credentials',async()=>{
  for (const password of ['a-long-ascii-password','pässwörd—0123456789']) {
    const authorization='basic '+Buffer.from('preview:'+password,'utf8').toString('base64');
    const response=await protectPreview({request:new Request('https://preview.example/asset.jpg',{headers:{authorization}}),env:preview(true,password),next});
    assert.equal(response.status,200);
    assert.equal(response.headers.get('Cache-Control'),'no-store');
    assert.match(response.headers.get('X-Robots-Tag'),/noindex/);
  }
});
test('invalid preview credential configuration fails privately instead of throwing',async()=>{
  for (const env of [{...preview(true),PREVIEW_USERNAME:'invalid:user'},preview(true,'long-password-with\ncontrol')]) {
    const response=await protectPreview({request:new Request('https://preview.example/'),env,next});
    assert.equal(response.status,503);
    assert.equal(response.headers.get('Cache-Control'),'no-store');
    assert.match(response.headers.get('X-Robots-Tag'),/noindex/);
  }
});
/* The form sends from the browser, so "a preview never sends real email" is
   now decided by whether the build is given the key at all. */
test('only a production build carries the enquiry key',()=>{
  const key={ENQUIRY_ACCESS_KEY:' real-key '};
  assert.equal(enquiryKey({...key,CF_PAGES:'1',CF_PAGES_BRANCH:'main'}),'real-key');
  assert.equal(enquiryKey({...key,CF_PAGES:'1',CF_PAGES_BRANCH:'redesign'}),'', 'branch builds get no key');
  assert.equal(enquiryKey({...key,CF_PAGES:'1',CF_PAGES_BRANCH:'main',SANITY_PREVIEW:'true'}),'', 'draft previews get no key');
  assert.equal(enquiryKey({CF_PAGES:'1',CF_PAGES_BRANCH:'main'}),'', 'no key configured means none');
  assert.equal(enquiryKey({...key}),'real-key', 'a local or CI build uses a key only if one is given');
  assert.equal(enquiryKey({...key,CONTEXT:'production'}),'real-key');
  for (const CONTEXT of ['deploy-preview','branch-deploy','dev']) assert.equal(enquiryKey({...key,CONTEXT}),'');
});
