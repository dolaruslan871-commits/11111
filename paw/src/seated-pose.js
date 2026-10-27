import * as THREE from "./vendor/three.module.js";
const SEATED = new Set(["sit","groom","yawn","eat","grateful"]);
const mix = (a,b,t) => a+(b-a)*t;
const hinge = new THREE.Vector3(1,0,0);

// Move the pelvis down first, then bring the hind paws forward. Feet stay
// attached to their leg pivots; a separate world-space foot translation caused
// the disconnected, slanted paws in the previous sitting pose.
export function applySeatedPose(pet,state,time,reduced=false) {
  const target = SEATED.has(state.activity), previous=pet.sitting;
  if (!previous || previous.target!==target) {
    pet.sitting={target,from:previous?.blend || 0,started:time,blend:previous?.blend || 0};
  }
  const sit=pet.sitting,progress=Math.max(0,Math.min(1,(time-sit.started)/.42));
  const eased=progress*progress*(3-2*progress);
  sit.blend=reduced || state.studioQuality ? Number(target) : mix(sit.from,Number(target),eased);
  const t=sit.blend;
  if(t<=0)return;
  const bird=state.skin==="owl",biped=["owl","kangaroo","dinosaur"].includes(state.skin);
  pet.root.position.y=mix(pet.root.position.y,0,t);
  pet.torso.rotation.x=mix(pet.torso.rotation.x,bird?0:biped?-.12:-.55,t);
  pet.torso.rotation.z=mix(pet.torso.rotation.z,0,t);
  pet.torso.position.y=mix(pet.torso.position.y,bird?-.035:biped?-.17:-.13,t);
  pet.torso.position.z=mix(pet.torso.position.z,biped?.02:.46,t);
  pet.root.updateMatrixWorld(true);
  const localTarget=new THREE.Vector3(),worldTarget=new THREE.Vector3();
  for(const leg of pet.legs) {
    if(state.activity==="groom"&&leg.front&&(state.skin==="rabbit"||biped||leg.side>0))continue;
    let angle,position;
    if(bird&&leg.front)continue;
    if(biped&&leg.front) {
      angle=-.38;
      position=[leg.side*.23,.8,.34];
    } else if(leg.front) {
      angle=0;
      position=[leg.side*.245,.60,.55];
    } else {
      angle=bird?0:-1.05;
      // The center of each sole is one foot-radius above the floor. Compute
      // the hip from the attached foot's rest offset and the desired pitch.
      const offset=leg.footBase.clone().applyAxisAngle(hinge,angle);
      const pawZ=bird?-.05:biped?.18:.13;
      position=[leg.side*(bird?.235:biped?.30:.37),leg.foot.scale.y-offset.y,pawZ-offset.z];
    }
    worldTarget.set(...position);pet.root.localToWorld(worldTarget);
    localTarget.copy(worldTarget);pet.torso.worldToLocal(localTarget);
    leg.pivot.position.lerp(localTarget,t);
    leg.pivot.rotation.x=mix(leg.pivot.rotation.x,angle-pet.torso.rotation.x,t);
    leg.pivot.rotation.y=mix(leg.pivot.rotation.y,0,t);
    leg.pivot.rotation.z=mix(leg.pivot.rotation.z,0,t);
    if(!biped || !leg.front) {
      leg.foot.rotation.x=-leg.pivot.rotation.x-pet.torso.rotation.x;
      leg.foot.rotation.z=-leg.pivot.rotation.z-pet.torso.rotation.z;
    }
  }
  pet.tail.rotation.x=mix(pet.tail.rotation.x,.25,t);
  pet.tail.rotation.y=mix(pet.tail.rotation.y,.5+Math.sin(time*.8)*.04,t);
}
