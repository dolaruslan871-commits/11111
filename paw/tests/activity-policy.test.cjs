const {test}=require('node:test');const assert=require('node:assert/strict');
const policy=require('../src/activity-policy.cjs');
const {sanitizeSettings}=require('../src/model.cjs');
const life=require('../src/life.cjs');
test('a single selected pose survives every autonomous request',()=>{
 for(const pose of ['sit','sleep','curl','idle'])for(const action of policy.ACTIONS)
  assert.equal(policy.resolveActivity(action,{allowedActivities:[pose]}),pose);
});
test('paused locomotion is rejected at every action entry point',()=>{
 for(const action of policy.TRAVEL)assert.equal(policy.resolveActivity(action,{roaming:false}), 'idle');
 assert.equal(policy.resolveActivity('hide',{}),'idle');
 assert.equal(policy.resolveActivity('home',{roaming:false}),'home');
});
test('drag physics and feeding override the pose briefly',()=>{
 const s={allowedActivities:['sit'],roaming:false};
 for(const action of policy.PHYSICS)assert.equal(policy.resolveActivity(action,s),action);
 assert.equal(policy.resolveActivity('eat',s,true),'eat');
 assert.equal(policy.resolveActivity('idle',s),'sit');
});
test('empty, old and malformed preferences migrate without lost progress',()=>{
 assert.deepEqual(policy.sanitizeActions([]),['idle']);
 assert.deepEqual(policy.sanitizeActions(['hide','sit','sit','invalid']),['sit']);
 const old=sanitizeSettings({skin:'cat',names:{cat:'Moti'},outfit:{hat:'beanie'}});
 assert.equal(old.skin,'cat');assert.equal(old.names.cat,'Moti');assert.equal(old.outfit.hat,'beanie');
 assert(old.allowedActivities.includes('sit'));assert(!old.allowedActivities.includes('hide'));
});
test('home size and colors are constrained at the persistence boundary',()=>{
 const s=sanitizeSettings({houseScale:1e20,houseColor:'url(test)',houseAccent:'#ABCDEF'});
 assert.equal(s.houseScale,1.8);assert.equal(s.houseColor,'#bd885a');assert.equal(s.houseAccent,'#ABCDEF');
 assert.equal(sanitizeSettings({houseScale:NaN}).houseScale,1);
});
test('personality affects rest and activity probabilities across seeded samples',()=>{
 function counts(behavior){let seed=17;const random=()=>((seed=(1664525*seed+1013904223)>>>0)/2**32);const result={};
  const pet=life.createLife({},Date.UTC(2026,9,27,12));
  const b={...life.BEHAVIOR,quietStart:0,quietEnd:0,nightSleep:false,reminders:false,walkFrequency:0,...behavior};
  for(let i=0;i<3000;i++){const action=life.chooseActivity(pet,b,{now:Date.UTC(2026,9,27,12),random});result[action]=(result[action]||0)+1;}
  return result;
 }
 const lazy=counts({lazy:100,active:0,curious:0}),active=counts({lazy:0,active:100,curious:0});
 assert((lazy.sit||0)+(lazy.curl||0)>1800);assert((active.play||0)>(lazy.play||0)*3);
 assert(policy.personality({active:100,lazy:0}).pace>policy.personality({active:0,lazy:100}).pace*2);
 const curious=counts({lazy:0,active:0,curious:100}),calm=counts({lazy:0,active:0,curious:0});
 assert(curious.sniff>calm.sniff*1.8);
});
test('CommonJS and browser policy and life exports stay equivalent',async()=>{
 const browser=await import('../src/activity-policy.js');
 assert.deepEqual(browser.ACTIONS,policy.ACTIONS);
 assert.deepEqual(browser.allowedActions({roaming:false}),policy.allowedActions({roaming:false}));
 const model=await import('../src/v5-model-browser.js');assert.deepEqual(model.extraSettings({houseScale:1.2}),require('../src/v5-model.cjs').extraSettings({houseScale:1.2}));
 const browserLife=await import('../src/life-browser.js');assert.deepEqual(browserLife.sanitizeBehavior({lazy:100}),life.sanitizeBehavior({lazy:100}));
});
