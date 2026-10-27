const {test}=require('node:test');const assert=require('node:assert/strict');
const {petAge,milestoneDate}=require('../src/pet-calendar.cjs');
const life=require('../src/life.cjs');
test('first visit starts at day one; next calendar day advances age',()=>{
 const born=new Date(2026,9,27,23,58).getTime();
 assert.equal(petAge(born,born).age,1);
 assert.equal(petAge(born,new Date(2026,9,28,0,1).getTime()).age,2);
});
test('restart preserves birth date, age, currencies and inventory',()=>{
 const born=new Date(2026,9,1,10).getTime(),now=new Date(2026,9,27,12).getTime();
 const saved={bornAt:born,coins:731,xp:212,foods:{fish:9},friendship:41};
 const restarted=life.createLife(saved,now),view=life.snapshot(restarted,now);
 assert.equal(restarted.bornAt,born);assert.equal(view.age,27);assert.equal(view.coins,731);assert.equal(view.friendship,41);
 assert.deepEqual(view.foods,{fish:9});
});
test('growth is gradual, capped and consistent with milestone dates',()=>{
 const born=new Date(2026,8,1,12).getTime();
 const ages=[0,7,14,28,56,1000].map(d=>petAge(born,milestoneDate(born,d).getTime()));
 assert.equal(ages[0].growth,.84);assert.equal(ages[4].growth,1);assert.equal(ages[5].growth,1);
 assert.equal(ages[0].stage,'baby');assert.equal(ages[2].stage,'young');assert.equal(ages[4].stage,'adult');
 for(let i=1;i<5;i++)assert(ages[i].growth>ages[i-1].growth);
});
test('clock reversal cannot produce negative age or size',()=>{
 const now=Date.now();assert.equal(petAge(now+86400000,now).age,1);assert.equal(petAge(NaN,now).age,1);
});
test('calendar day counting remains stable across DST changes',()=>{
 const old=process.env.TZ;process.env.TZ='Europe/Kyiv';
 try {
  const before=new Date(2026,9,24,23,30).getTime(),after=new Date(2026,9,26,0,30).getTime();
  assert.equal(petAge(before,after).age,3);
 } finally {if(old===undefined)delete process.env.TZ;else process.env.TZ=old;}
});
