const test=require('node:test');
const assert=require('node:assert/strict');
const {EventEmitter}=require('node:events');
const {PassThrough}=require('node:stream');
const vm=require('node:vm');
const {normalizeWindows,createWindowTracker,macScript,windowsScript}=require('../src/window-tracker.cjs');
test('Win32 window list keeps signed monitor positions and stable HWND ids',()=>{
 const rows=normalizeWindows(['9007199|122|-1920|-200|1200|900|Code'],'win32',5);
 assert.equal(rows[0].id,'9007199');assert.equal(rows[0].bounds.x,-1920);
});
test('native list discards own windows, missing bounds and invalid geometry',()=>{
 const rows=normalizeWindows([
  {id:'own',pid:5,bounds:{x:0,y:0,width:100,height:100}},
  {id:'bad',pid:6,bounds:{x:NaN,y:0,width:100,height:100}},
  {id:'tiny',pid:6,bounds:{x:0,y:0,width:30,height:30}},
  {id:'good',pid:6,bounds:{x:0,y:0,width:400,height:300}},
 ],'darwin',5);
 assert.deepEqual(rows.map(x=>x.id),['good']);
});
test('mac native script uses actual window identity and has valid JS syntax/newline framing',()=>{
 const source=macScript(123);
 assert.doesNotThrow(()=>new Function(source));
 assert.match(source,/CGWindowListCopyWindowInfo/);assert.match(source,/kCGWindowNumber/);
 assert.ok(source.includes("+'\\n'"));
});
test('mac observer writes actual JSON newline-delimited snapshots',()=>{
 const writes=[];
 function dollar(value){return {dataUsingEncoding:()=>value};}
 dollar.NSFileHandle={fileHandleWithStandardOutput:{writeData:value=>writes.push(value)}};
 dollar.CGWindowListCopyWindowInfo=()=>[{kCGWindowNumber:42,kCGWindowLayer:0,kCGWindowOwnerPID:9,kCGWindowAlpha:1,kCGWindowOwnerName:'Editor',kCGWindowBounds:{X:10,Y:420,Width:800,Height:500}}];
 dollar.NSThread={sleepForTimeInterval:()=>{throw new Error('stop after snapshot');}};
 assert.throws(()=>vm.runInNewContext(macScript(123),{ObjC:{import(){},deepUnwrap:v=>v},$:dollar},{timeout:1000}),/stop after snapshot/);
 assert.equal(writes.length,1);assert.ok(writes[0].endsWith('\n'));
 assert.equal(JSON.parse(writes[0])[0].id,'42');
});
test('Windows observer filters minimized/cloaked/own windows in the native process',()=>{
 const source=windowsScript(123);
 for(const token of ['IsIconic','IsWindowVisible','Cloak(h,14','pid==self','Frame(h,9','Start-Sleep -Milliseconds 500'])assert.ok(source.includes(token),token);
});
test('one persistent observer handles chunked snapshots, becomes stale and stops cleanly',()=>{
 let now=1000,spawns=0,killed=0;
 const child=new EventEmitter();child.stdout=new PassThrough();child.stderr=new PassThrough();child.kill=()=>{killed++;};
 const tracker=createWindowTracker({platform:'darwin',selfPid:5,now:()=>now,spawnProcess:()=>{spawns++;return child;}});
 tracker.start();tracker.start();assert.equal(spawns,1);
 child.stdout.write('[{"id":"45","pid":6,"bounds":{"x":0,"y":400,');
 child.stdout.write('"width":500,"height":300}}]\n');
 assert.equal(tracker.snapshot().supported,true);assert.equal(tracker.snapshot().windows[0].id,'45');
 now+=2600;assert.equal(tracker.snapshot().supported,false);
 tracker.stop();assert.equal(killed,1);
});
test('unsupported OS never spawns a fake window service',()=>{
 let spawns=0;const tracker=createWindowTracker({platform:'linux',spawnProcess:()=>spawns++});
 tracker.start();assert.equal(spawns,0);assert.equal(tracker.snapshot().supported,false);
});
test('native failure backs off instead of spawning a helper every tick',()=>{
 let now=20000,spawns=0;
 const child=new EventEmitter();child.stdout=new PassThrough();child.stderr=new PassThrough();child.kill=()=>{};
 const tracker=createWindowTracker({platform:'darwin',now:()=>now,spawnProcess:()=>{spawns++;return child;}});
 tracker.start();child.emit('error',new Error('unsupported'));tracker.start();
 assert.equal(spawns,1);now+=16000;tracker.start();assert.equal(spawns,2);tracker.stop();
});
test('stopping and restarting an observer preserves Node process and replaces its worker',()=>{
 const original=process;let spawned=0,killed=0;
 const tracker=createWindowTracker({platform:'darwin',spawnProcess:()=>{
  spawned++;const child=new EventEmitter();child.stdout=new PassThrough();child.stderr=new PassThrough();child.kill=()=>{killed++;};return child;
 }});
 tracker.start();tracker.stop();tracker.start();tracker.stop();
 assert.equal(spawned,2);assert.equal(killed,2);assert.equal(global.process,original);assert.equal(typeof process.pid,'number');
});
