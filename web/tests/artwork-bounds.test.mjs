import test from 'node:test';
import assert from 'node:assert/strict';
import {alphaBounds} from '../server/artwork-bounds.js';
test('transparent outer padding is trimmed while every visible pixel keeps breathing room',()=>{
  const pixels=Buffer.alloc(40*40*4);
  for(let y=8;y<32;y++) for(let x=10;x<30;x++) pixels[(y*40+x)*4+3]=255;
  pixels[(5*40+2)*4+3]=1; // faint logo edge must not disappear
  assert.deepEqual(alphaBounds(pixels,40,40),{left:0,top:3/40,right:8/40,bottom:6/40});
  assert.equal(alphaBounds(Buffer.alloc(40*40*4,255),40,40),undefined);
  assert.equal(alphaBounds(Buffer.alloc(40*40*4),40,40),undefined);
});
