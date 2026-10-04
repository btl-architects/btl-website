import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const sha='a'.repeat(40), origin='https://a1b2c3d4.btl-website-3wo.pages.dev';
function runFinder(marker, target=origin) {
  const dir=mkdtempSync(join(tmpdir(),'btl-deployed-identity-'));
  const output=join(dir,'github-env');
  const mock=`globalThis.fetch=async(url,options={})=>{
    if(String(url).startsWith('https://api.github.com/')) {
      if(options.headers?.Authorization!=='Bearer test-token') throw Error('Expected GitHub-only test authorization');
      return Response.json({check_runs:[{id:1,name:'Cloudflare Pages',status:'completed',conclusion:'success',output:{summary:'<a href="${target}">Preview</a>'}}]});
    }
    if(String(url)!=='${target}/build-status.json' || options.headers?.Authorization) throw Error('Unexpected target or credential forwarding');
    return Response.json(${JSON.stringify(marker)});
  };`;
  try {
    const result=spawnSync(process.execPath,['--import','data:text/javascript,'+encodeURIComponent(mock),'tools/wait-deployed-preview.mjs'],{cwd:new URL('../',import.meta.url),encoding:'utf8',env:{...process.env,DEPLOYMENT_SHA:sha,GITHUB_REPOSITORY:'btl-architects/btl-website',GITHUB_TOKEN:'test-token',GITHUB_ENV:output}});
    return {...result,output:existsSync(output)?readFileSync(output,'utf8'):''};
  } finally {rmSync(dir,{recursive:true,force:true});}
}
test('deployment finder writes only a verified immutable source target and never forwards the GitHub token',()=>{
  const result=runFinder({preview:false,noindex:true,sourceSha:sha,sourceDirty:null});
  assert.equal(result.status,0,result.stderr);
  assert.equal(result.output,`PERFORMANCE_ORIGIN=${origin}\n`);
});
test('branch aliases and unrelated hosts cannot become supposedly immutable targets',()=>{
  for(const target of ['https://feature.btl-website-3wo.pages.dev','https://main.btl-website-3wo.pages.dev','https://a1b2c3d4.other-project.pages.dev']) {
    const result=runFinder({preview:false,noindex:true,sourceSha:sha},target);
    assert.notEqual(result.status,0);assert.equal(result.output,'');
    assert.match(result.stderr,/immutable preview URL/);
  }
});
test('a successful hosting check cannot make stale, dirty, draft or malformed output the performance target',()=>{
  for(const marker of [
    {preview:false,noindex:true,sourceSha:'b'.repeat(40)},
    {preview:false,noindex:true,sourceSha:sha,sourceDirty:true},
    {preview:true,noindex:true,sourceSha:sha},
    {preview:false,noindex:'true',sourceSha:sha},
    {preview:false,noindex:true},
  ]) {
    const result=runFinder(marker);
    assert.notEqual(result.status,0);
    assert.equal(result.output,'');
    assert.match(result.stderr,/marker does not identify/);
  }
});
