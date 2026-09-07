import test from 'node:test';
import assert from 'node:assert/strict';
import { depthToLEDs } from '../public/workers/depth-map.mjs';

test('near surfaces are bright, far surfaces dark, and camera mapping is mirrored', () => {
  assert.deepEqual([...depthToLEDs({data:new Uint8Array([0,255,0,255]),width:2,height:2},2,2)],[1,0,1,0]);
});
test('flat depth stays uniform across the full LED matrix', () => {
  for(const value of [0,128,255]) {
    const output=depthToLEDs({data:new Uint8Array(12).fill(value),width:4,height:3});
    assert.equal(output.length,2107);
    assert.ok([...output].every(v=>Math.abs(v-Math.pow(value/255,1.7))<1e-6));
  }
});
test('wide camera frames are centre-cropped rather than stretched', () => {
  const output=depthToLEDs({data:new Uint8Array([255,0,0,255,255,0,0,255]),width:4,height:2},2,2);
  assert.deepEqual([...output],[0,0,0,0]);
});
test('invalid depth frames are rejected', () => {
  assert.throws(()=>depthToLEDs({data:[],width:2,height:2}));
});
