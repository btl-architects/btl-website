import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {clipVideoMode, clipVideoSources, muxVideoUrl} from '../../shared/video.ts';
const ready = {status:'ready', data:{playback_ids:[{id:'public123',policy:'public'}], static_renditions:{files:[{name:'highest.mp4',ext:'mp4',status:'ready'}]}}};
test('empty clips use Mux while saved legacy clips and explicit manual choices retain their mode', () => {
  assert.equal(clipVideoMode(), 'mux');
  assert.equal(clipVideoMode({}), 'mux');
  assert.equal(clipVideoMode({video:'legacy.mp4'}), 'file');
  assert.equal(clipVideoMode({videoMode:'file'}), 'file');
  assert.equal(clipVideoMode({video:'legacy.mp4',videoMux:ready}), 'mux');
  assert.equal(clipVideoSources({videoMux:ready}).video, 'https://stream.mux.com/public123/highest.mp4');
});
test('existing prepared films retain their URLs and portrait fallback', () => {
  assert.deepEqual(clipVideoSources({video:'https://cdn.sanity.io/landscape.mp4'}), {video:'https://cdn.sanity.io/landscape.mp4',videoPortrait:'https://cdn.sanity.io/landscape.mp4'});
  assert.equal(clipVideoSources({video:'landscape',videoPortrait:'portrait'}).videoPortrait,'portrait');
});
test('automatic processing uses a ready public MP4 and the separate portrait', () => {
  const portrait = {...ready,data:{...ready.data,playback_ids:[{id:'portrait456',policy:'public'}]}};
  assert.deepEqual(clipVideoSources({videoMode:'mux',video:'legacy',videoMux:ready,videoPortraitMux:portrait}), {video:'https://stream.mux.com/public123/highest.mp4',videoPortrait:'https://stream.mux.com/portrait456/highest.mp4'});
  assert.equal(clipVideoSources({videoMode:'mux',videoMux:ready}).videoPortrait,'https://stream.mux.com/public123/highest.mp4');
});
test('processing, private and malformed Mux assets never become player sources', () => {
  for (const asset of [null, {...ready,status:'preparing'}, {...ready,data:{...ready.data,static_renditions:{files:[{name:'highest.mp4',ext:'mp4',status:'preparing'}]}}}, {...ready,data:{...ready.data,playback_ids:[{id:'signed123',policy:'signed'}]}}, {...ready,data:{...ready.data,playback_ids:[{id:'../unsafe',policy:'public'}]}}]) assert.equal(muxVideoUrl(asset),null);
  assert.equal(clipVideoSources({videoMode:'mux',video:'legacy',videoMux:{...ready,status:'errored'}}).video,'');
});
