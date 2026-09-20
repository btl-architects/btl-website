import test from 'node:test';
import assert from 'node:assert/strict';
import {buildMode,visibleProjects,routedProjects} from '../server/build-mode.js';
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
  return {ASSETS:{fetch:async()=>Response.json({preview:previewFlag})},PREVIEW_PASSWORD:password};
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
test('draft previews cannot send real enquiries',async()=>{
  const request=new Request('https://preview.example/api/enquiry',{headers:{Authorization:'Basic '+btoa('preview:a-long-test-password')}});
  assert.equal((await protectPreview({request,env:preview(true),next})).status,503);
});
