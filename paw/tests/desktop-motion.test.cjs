const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../src/desktop-motion.cjs');
const area = {x:0,y:0,width:1440,height:900};
const rect = {x:80,y:120,width:260,height:240};
const context = {area,rect,scale:1};
const win = {id:'42',name:'Editor',visible:true,bounds:{x:300,y:420,width:700,height:400}};
function drop(position, point, windows=[]) { return M.release(M.hold(position,0),{...context,point,windows,now:0}); }
function simulate(state, until, windows=[]) {
  for(let t=16;t<=until;t+=16) state=M.step(state,.016,{...context,windows,now:t});
  return state;
}
test('desktop bounds keep visible body within a negative-origin HiDPI monitor',()=>{
  const a={x:-1920,y:-200,width:1920,height:1080};
  const p=M.clampBody({x:-9999,y:9999},a,rect,1.6);
  assert.equal(p.x+rect.x*1.6,a.x);
  assert.equal(p.y+(rect.y+rect.height)*1.6,a.y+a.height);
});
test('pickup has zero velocity and carries no stale support',()=>{
  const state=M.hold({x:400,y:200},100);
  assert.equal(state.phase,'held');assert.equal(state.perch,null);
  assert.deepEqual(state.velocity,{x:0,y:0});
});
test('ordinary release from height starts a brief fall, then a parachute',()=>{
  let s=drop({x:300,y:70});assert.equal(s.phase,'fall');
  s=simulate(s,160);assert.equal(s.phase,'parachute');assert.ok(s.canopy>0&&s.canopy<1);
});
test('parachute brakes descent and reaches exact ground without overshooting',()=>{
  let s=drop({x:300,y:70});s=simulate(s,1600);
  assert.equal(s.phase,'parachute');assert.ok(s.velocity.y<170);
  s=simulate(s,14000);assert.equal(s.phase,'grounded');
  assert.equal(s.position.y,540);assert.equal(s.canopy,0);
});
test('tiny release settles without opening a parachute',()=>{
  const s=simulate(drop({x:300,y:536}),700);
  assert.equal(s.phase,'grounded');assert.equal(s.position.y,540);assert.equal(s.canopy,0);
});
test('release inside an actual window catches its top with a stable id',()=>{
  const s=drop({x:350,y:260},{x:550,y:600},[win]);
  assert.equal(s.phase,'perch');assert.equal(s.perch.id,'42');
  const settled=simulate(s,600,[win]);assert.ok(Math.abs(settled.position.y-60)<.1);
  assert.equal(settled.position.y+360,win.bounds.y);
});
test('catching a window glides rather than teleporting upward',()=>{
  let s=drop({x:350,y:260},{x:550,y:600},[win]);
  assert.equal(s.position.y,260);
  s=M.step(s,.016,{...context,windows:[win],now:100});
  assert.ok(s.position.y>60&&s.position.y<260);
});
test('closing or minimizing a supporting window deploys a parachute',()=>{
  const perched=simulate(drop({x:350,y:260},{x:550,y:600},[win]),600,[win]);
  let s=M.step(perched,.016,{...context,windows:[],windowsKnown:true,now:700});
  assert.equal(s.phase,'fall');
  s=M.step(s,.016,{...context,windows:[],now:850});assert.equal(s.phase,'parachute');
  const minimized=M.step(perched,.016,{...context,windows:[{...win,minimized:true}],now:700});
  assert.equal(minimized.phase,'fall');
});
test('one missing native response does not falsely detach the pet',()=>{
  const perched=simulate(drop({x:350,y:260},{x:550,y:600},[win]),600,[win]);
  const s=M.step(perched,.016,{...context,windows:[],windowsKnown:false,now:700});
  assert.equal(s.phase,'perch');assert.deepEqual(s.position,perched.position);
});
test('perched pet follows movement of its exact supporting window',()=>{
  const perched=simulate(drop({x:350,y:260},{x:550,y:600},[win]),600,[win]);
  const moved={...win,bounds:{...win.bounds,x:400,y:500}};
  const s=M.step(perched,.016,{...context,windows:[moved],now:800});
  assert.ok(s.position.x>perched.position.x);assert.ok(s.position.y>perched.position.y);
});
test('offscreen/maximized window tops do not clip the character',()=>{
  const top={...win,bounds:{...win.bounds,y:20}};
  assert.equal(drop({x:300,y:200},{x:550,y:300},[top]).phase,'fall');
});
test('occluding front window prevents catching a hidden lower window',()=>{
  const front={...win,id:'front',bounds:{x:0,y:0,width:1400,height:880}};
  assert.equal(drop({x:300,y:200},{x:550,y:600},[front,win]).phase,'fall');
});
test('falling onto a window from above lands on the window instead of through it',()=>{
  let s=drop({x:350,y:0});
  s=simulate(s,1500,[win]);assert.equal(s.phase,'perch');assert.equal(s.perch.id,'42');
  assert.ok(Math.abs(s.position.y+360-win.bounds.y)<.1);
});
test('large suspended-app delta is capped instead of teleporting',()=>{
  const s=drop({x:350,y:0});
  const next=M.step(s,90,{...context,windows:[],now:90000});
  assert.ok(next.position.y<10);assert.notEqual(next.phase,'grounded');
});
test('landing after system suspend fully folds the canopy',()=>{
  const state={...M.newMotion({x:350,y:540}),phase:'land',canopy:1,since:0};
  const next=M.step(state,60,{...context,now:60000});
  assert.equal(next.phase,'grounded');assert.equal(next.canopy,0);
});
test('public motion carries only render data, never native window contents',()=>{
  const s=drop({x:350,y:260},{x:550,y:600},[win]);
  assert.deepEqual(Object.keys(M.publicMotion(s)).sort(),['canopy','phase','velocity','windowId']);
});
test('parachute terminal speed and trajectory agree at30/60/120FPS',()=>{
  const large={...context,area:{...area,height:2000},windows:[]};
  const trajectories=[];
  for(const fps of [30,60,120]){
    let s=M.release(M.hold({x:300,y:0},0),{...large,now:0});
    for(let frame=1;frame<=fps*3;frame++)s=M.step(s,1/fps,{...large,now:frame/fps*1000});
    assert.equal(s.phase,'parachute');assert.ok(Math.abs(s.velocity.y-90)<.001);
    trajectories.push(s.position.y);
  }
  assert.ok(Math.max(...trajectories)-Math.min(...trajectories)<3,'three-second trajectories differ by under3DIP');
});
