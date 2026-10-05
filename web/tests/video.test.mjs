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
test('desktops prefer the 1080p file and phones the 720p file, with highest as the fallback for older assets', () => {
  const sized = (id, names) => ({status:'ready', data:{playback_ids:[{id,policy:'public'}], static_renditions:{files:names.map(name=>({name,ext:'mp4',status:'ready'}))}}});
  const full = sized('land1', ['1080p.mp4','720p.mp4','480p.mp4']);
  assert.deepEqual(clipVideoSources({videoMode:'mux',videoMux:full}), {video:'https://stream.mux.com/land1/1080p.mp4',videoPortrait:'https://stream.mux.com/land1/720p.mp4'});
  // The portrait cut is preferred for phones, at its own phone size.
  assert.equal(clipVideoSources({videoMode:'mux',videoMux:full,videoPortraitMux:sized('port1',['1080p.mp4','720p.mp4'])}).videoPortrait,'https://stream.mux.com/port1/720p.mp4');
  // Older assets with only `highest` keep working on both screens.
  assert.deepEqual(clipVideoSources({videoMode:'mux',videoMux:ready}), {video:'https://stream.mux.com/public123/highest.mp4',videoPortrait:'https://stream.mux.com/public123/highest.mp4'});
  // Mux skips upscaling: a small upload with only 480p still plays.
  assert.equal(muxVideoUrl(sized('small1',['480p.mp4'])),'https://stream.mux.com/small1/480p.mp4');
  // A 720p file still being prepared is not offered to phones yet.
  const preparing = {...full,data:{...full.data,static_renditions:{files:[{name:'1080p.mp4',ext:'mp4',status:'ready'},{name:'720p.mp4',ext:'mp4',status:'preparing'}]}}};
  assert.equal(clipVideoSources({videoMode:'mux',videoMux:preparing}).videoPortrait,'https://stream.mux.com/land1/1080p.mp4');
});
