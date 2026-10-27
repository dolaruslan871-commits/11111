import { applySeatedPose } from "./seated-pose.js";
import * as THREE from "./vendor/three.module.js";
const REST = new Set([
  "sit",
  "groom",
  "yawn",
  "curl",
  "sleep",
  "home",
  "eat",
  "grateful",
]);
export function applyPoseV5(pet, state, time, reduced = false) {
  for (const l of pet.legs)
    if (l.foot) {
      l.foot.position.copy(l.footBase);
      l.foot.rotation.set(0, 0, 0);
    }
  const a = state.activity,
    skin = state.skin,
    bird = skin === "owl",
    biped = ["kangaroo", "dinosaur", "owl"].includes(skin),
    walk = ["walk", "hunt", "carry"].includes(a),
    sleep = ["curl", "sleep", "home"].includes(a),
    phase = time * (a === "hunt" ? 10 : 6),
    sad = state.emotion === "sad" || state.life?.mood < 25,
    happy =
      ["pet", "grateful", "excited", "play"].includes(a) ||
      state.life?.mood > 80;
  pet.meal?.update(state);
  if (a === "home" && !state.habitat?.nearHouse) {
    pet.torso.visible = true;
    pet.torso.scale.x = pet.torso.scale.z = 1;
    pet.torso.position.x = pet.torso.position.z = 0;
  }
  pet.head.position.x = pet.headBase.x;
  pet.head.position.z = pet.headBase.z;
  pet.torso.rotation.y = 0;
  if (pet.ageFur) {
    const growth = Math.min(1, (state.life?.age || 0) / 56);
    pet.ageFur.visible =
      growth > 0.08 &&
      (!state.outfit?.clothing || state.outfit.clothing === "none");
    pet.ageFur.scale.setScalar(0.8 + growth * 0.2);
  }
  if (sleep) {
    pet.root.position.y=0;
    pet.torso.visible=true;pet.torso.scale.x=pet.torso.scale.z=1;
    pet.torso.position.set(0,bird?-.08:-.35,bird?0:.1);
    pet.torso.rotation.set(bird?0:.03,bird?0:.08,0);
    pet.torso.scale.y=bird?1:.88;
    pet.head.position.set(bird?0:.04,bird?pet.headBase.y-.08:.82,bird?pet.headBase.z:.85);
    pet.head.rotation.set(.12,bird?.15:.22,.06);
    pet.tail.rotation.set(.12,-.9,-.05);
    for(const leg of pet.legs){
      if(bird)continue;
      leg.pivot.rotation.set(leg.front?-1.2:1.15,0,leg.side*.06);
      leg.foot.rotation.x=-leg.pivot.rotation.x;
    }
  }
  if (a === "wave") {
    pet.torso.rotation.x = 0;
    for (const l of pet.legs)
      if (l.front)
        l.pivot.rotation.x = l.side > 0 ? -1.2 + Math.sin(time * 6) * 0.12 : 0;
  }
  if (a === "groom") {
    const arm = pet.legs.find((l) => l.front && l.side === 1);
    if (arm) {
      arm.pivot.rotation.x = -1.65;
      arm.pivot.position.y += 0.1;
    }
    pet.head.rotation.x = 0.3;
    pet.head.rotation.y = 0.32;
    pet.tongue.visible = Math.sin(time * 9) > 0;
    pet.jaw.rotation.x = Math.max(0, Math.sin(time * 9)) * 0.15;
  }
  if (a === "eat") {
    const lean=.5-.5*Math.cos(Math.min(1,(state.actionTime||0)/.85)*Math.PI);
    pet.torso.rotation.x=.10*lean;pet.torso.position.y=-.06*lean;
    // Reach past the forepaws. The nose stops above the rim, never inside it.
    const height=skin==='croc'?.56:skin==='owl'?.72:biped?.78:skin==='cat'?.70:skin==='rabbit'?.86:.83;
    const reach=skin==='croc'?.99:skin==='owl'?.96:biped?.99:skin==='cat'?1.15:1.26;
    pet.head.position.y=pet.headBase.y+(height-pet.headBase.y)*lean;
    pet.head.position.z=pet.headBase.z+(reach-pet.headBase.z)*lean;
    pet.head.rotation.set((skin==='croc'?.32:skin==='cat'?.62:.65)*lean+Math.sin(time*7)*.018*lean,0,0);
    pet.jaw.rotation.x=(.055+Math.sin(time*11)*.025)*lean;
    pet.crumbs.visible=false;pet.tongue.visible=false;
  }
  if(a==='ear-scratch'){
    const arm=pet.legs.find(l=>l.front&&l.side===1);
    if(arm){arm.pivot.rotation.x=-2.75+Math.sin(time*18)*.12;arm.pivot.rotation.z=-.35;arm.pivot.position.y+=.27;arm.pivot.position.z+=.12;}
    pet.head.rotation.z=.22;pet.head.rotation.y=.28;
    if(pet.ears[1])pet.ears[1].rotation.z+=Math.sin(time*18)*.08;
  }
  if(a==='nose-boop'){
    const pulse=Math.exp(-(state.actionTime||0)*1.8);
    pet.head.position.z-=.08*pulse;pet.head.rotation.y+=Math.sin(time*38)*.12*pulse;
    pet.ears.forEach((e,i)=>e.rotation.z+=(i?1:-1)*.1*pulse);
    pet.jaw.rotation.x=.05;
  }
  if (a === "groom" && bird) {
    pet.head.rotation.y = -0.8;
    pet.head.rotation.x = 0.28;
  }
  if (a === "groom" && skin === "rabbit") {
    pet.legs.filter((l) => l.front).forEach((l) => (l.pivot.rotation.x = -1.7));
    pet.head.rotation.x = 0.3 + Math.sin(time * 4) * 0.06;
  }
  if (a === "groom" && skin === "kangaroo") {
    pet.head.rotation.x = 0.45;
    pet.legs.filter((l) => l.front).forEach((l) => (l.pivot.rotation.x = -0.7));
  }
  if (a === "yawn") {
    pet.head.rotation.x = -0.28;
    pet.jaw.scale.y = 1 + Math.max(0, Math.sin(time * 1.7)) * 3;
    pet.tongue.visible = true;
    pet.eyes.forEach((e) => (e.scale.y = 0.28));
  } else pet.jaw.scale.y = 1;
  if (a === "wake") {
    pet.torso.rotation.x = 0.18;
    pet.head.rotation.x = -0.12;
    for (const l of pet.legs) if (l.front) l.pivot.rotation.x = -0.55;
  }
  if (a === "scratch" && skin === "cat") {
    pet.head.rotation.x = 0.15;
    for (const l of pet.legs)
      if (l.front)
        l.pivot.rotation.x = -1.3 + Math.sin(time * 10 + l.side) * 0.3;
  }
  if (a === "sniff") {
    pet.head.rotation.x = 0.4 + Math.sin(time * 6) * 0.06;
    pet.head.rotation.y = Math.sin(time * 2) * 0.22;
  }
  if (a === "shake") {
    pet.torso.rotation.z = Math.sin(time * 22) * 0.12;
    pet.head.rotation.y = Math.sin(time * 22 + 0.4) * 0.2;
  }
  if (a === "roll") {
    const p=Math.min(1,(state.actionTime||0)/1.65), ease=p*p*(3-2*p);
    pet.torso.rotation.z = reduced ? 0 : ease*Math.PI*2;
    pet.root.position.y = .12*Math.sin(p*Math.PI);
    for(const leg of pet.legs)leg.pivot.rotation.x=leg.front?-1.1:1.05;
  }
  if (a === "grateful") {
    pet.head.rotation.x = Math.sin(time * 4) * 0.15;
    pet.love.visible = true;
  }
  if (walk && bird) {
    pet.root.position.y = 0.22 + Math.sin(time * 4) * 0.04;
    for (const l of pet.legs)
      if (l.front) {
        l.pivot.rotation.z = l.side * (0.9 + Math.sin(time * 11) * 0.55);
        l.pivot.rotation.x = 0.1;
      } else l.pivot.rotation.x = 0.75;
  } else if (walk && skin === "croc") {
    pet.root.position.y = -0.25;
    pet.torso.rotation.z = Math.sin(phase) * 0.025;
    pet.tail.rotation.y = Math.sin(phase) * 0.18;
    pet.legs.forEach((l) => {
      l.pivot.rotation.z = l.side * 0.4;
      l.pivot.rotation.x =
        Math.sin(phase + (l.side > 0 ? 3.14 : 0) + (l.front ? 0 : 3.14)) * 0.25;
    });
  } else if (walk && ["kangaroo", "rabbit"].includes(skin)) {
    pet.root.position.y = Math.max(0, Math.sin(phase)) * 0.27;
    pet.torso.rotation.x = Math.sin(phase) * 0.1;
    pet.legs.forEach((l) => {
      l.pivot.rotation.x =
        Math.sin(phase + (l.front ? 0.5 : 0)) * (l.front ? 0.25 : 0.65);
    });
  }
  if (a === "skate") {
    pet.root.position.y = 0.08;
    pet.legs.forEach((l) => {
      l.pivot.position.copy(l.base);
      l.pivot.rotation.set(0, 0, 0);
      if (!l.front && l.side > 0) {
        l.pivot.rotation.x = Math.sin(time * 5) * 0.65;
        l.pivot.position.y -= Math.max(0, -Math.sin(time * 5)) * 0.09;
      }
    });
  }
  if (a === "scooter") {
    pet.root.position.y = 0.1;
    for (const l of pet.legs) {
      l.pivot.position.copy(l.base);
      if (l.front) {
        l.pivot.rotation.x = -2.2;
        l.pivot.position.y += biped ? 0 : 0.25;
        l.pivot.position.z -= 0.2;
      } else if (l.side > 0) l.pivot.rotation.x = Math.sin(time * 5) * 0.55;
    }
  }
  if (a === "jetpack") {
    pet.root.position.y = 0.35 + Math.sin(time * 2) * 0.08;
    pet.torso.rotation.x = -0.12;
    pet.legs.forEach((l) => (l.pivot.rotation.x = l.front ? -0.2 : 0.5));
  }
  if (sad) {
    pet.tail.rotation.x = 0.75;
    pet.ears.forEach((ear, i) => (ear.rotation.z = (i ? 1 : -1) * 0.55));
  } else if (happy) {
    pet.tail.rotation.y = Math.sin(time * 13) * 0.4;
    pet.ears.forEach(
      (ear, i) =>
        (ear.rotation.z =
          (ear.userData.baseZ || 0) + Math.sin(time * 4 + i) * 0.035),
    );
  }
  pet.love.position.set(.35, .65, -.15);
  pet.love.children.forEach((heart, i) => {
    heart.position.x = (i - 1) * 0.45;
    heart.position.y = 2.15 + (i%2)*.15 + Math.sin(time * 2 + i) * 0.12;
    heart.scale.setScalar(.7);
  });
  const resting = REST.has(a) || a === "play";
  pet.toy.visible =
    !!state.outfit?.toy &&
    state.outfit.toy !== "none" &&
    resting &&
    !state.desktopPet;
  pet.toy.position.x = 0.9 + (state.toyDistance || 90) / 180;
  pet.toy.position.z = 0.6;
  if (state.desktopPet) {
    pet.props.groups.house.visible = false;
    pet.props.groups.box.visible = false;
  }
  applySeatedPose(pet,state,time,reduced);
  if (state.habitatKind) {
    pet.torso.visible = false;
    pet.love.visible = false;
    for (const g of Object.values(pet.props.groups)) g.visible = false;
    pet.toy.visible = state.habitatKind === "toy";
    if (pet.toy.visible) {
      pet.toy.position.set(0, 0.2, 0);
      pet.toy.rotation.z = a === "play" ? Math.sin(time * 4) * 0.4 : 0;
    } else {
      const group =
        state.life?.houseLevel >= 2
          ? pet.props.groups.house
          : pet.props.groups.box;
      group.visible = true;
      group.position.set(0, 0, 0);
    }
    pet.root.position.set(0, 0, 0);
    pet.root.rotation.set(0, 0, 0);
    pet.root.scale.setScalar(1);
  }
}
