import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const code=await readFile('web/src/bridge.js','utf8');
function makeBridge(){const w={}; w.parent=w;vm.runInNewContext(code,{window:w,structuredClone});return w.AkiraBridge}
test('room context cannot be mutated by a consumer',()=>{
  const bridge=makeBridge();bridge.setContext({id:'123',minor:true});
  bridge.getContext().minor=false;
  assert.equal(bridge.getContext().minor,true);
});
test('switching rooms removes previous room listeners and retains app listeners',()=>{
  const bridge=makeBridge();let stale=0,current=0,app=0;
  bridge.onApp(()=>app++);bridge.onRoom(()=>stale++);
  bridge.setContext({id:'new'});const off=bridge.onRoom(()=>current++);
  bridge.toRoom({t:'gift'});bridge.toApp({t:'min'});off();bridge.toRoom({t:'gift'});
  assert.equal(stale,0);assert.equal(current,1);assert.equal(app,1);
});
test('cross-origin embedding cannot obtain a parent bridge',()=>{
  const w={parent:{get location(){throw new Error('cross origin')}}};
  vm.runInNewContext(code,{window:w,structuredClone});
  assert.equal(w.AkiraBridge.getContext(),null);
});
