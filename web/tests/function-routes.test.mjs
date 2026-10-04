import test from 'node:test';
import assert from 'node:assert/strict';
import {functionRoutes} from '../server/function-routes.js';
import {buildIdentity} from '../server/build-identity.js';

test('draft pages and all their assets stay inside authenticated Function coverage', () => {
  assert.deepEqual(functionRoutes({preview:true,noindex:true}), {version:1,include:['/*'],exclude:[]});
});
test('public branch previews keep noindex middleware on every route', () => {
  assert.deepEqual(functionRoutes({preview:false,noindex:true}), {version:1,include:['/*'],exclude:[]});
});
test('production static pages and resource requests avoid the preview Function', () => {
  assert.deepEqual(functionRoutes({preview:false,noindex:false}), {version:1,include:['/build-status.json'],exclude:[]});
});
test('missing, malformed or indexable draft markers cannot weaken routing', () => {
  for (const marker of [null,{}, {preview:false}, {preview:'false',noindex:false}, {preview:false,noindex:'false'}, {preview:true,noindex:false}]) assert.throws(() => functionRoutes(marker));
});
test('hosted build identity carries only source metadata and rejects a malformed SHA', () => {
  const sha='a'.repeat(40);
  const identity=buildIdentity({CF_PAGES_COMMIT_SHA:sha,GITHUB_SHA:'b'.repeat(40),SANITY_PREVIEW_TOKEN:'do-not-expose'});
  assert.equal(identity.sourceSha,sha);
  assert.equal(identity.sourceDirty,null);
  assert.ok(Number.isFinite(Date.parse(identity.builtAt)));
  assert.deepEqual(Object.keys(identity).sort(),['builtAt','sourceDirty','sourceSha']);
  assert.throws(() => buildIdentity({CF_PAGES_COMMIT_SHA:'unverified-source'}));
});
