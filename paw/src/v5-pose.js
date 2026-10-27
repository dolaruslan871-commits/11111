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
    pet.root.position.y = bird ? 0 : -0.4;
    pet.torso.rotation.set(bird ? 0 : 0.12, bird ? 0 : 0.38, bird ? 0 : 1.05);
    pet.torso.scale.y = bird ? 1 : 0.78;
    pet.head.position.y = bird ? pet.headBase.y - 0.1 : 0.98;
    pet.head.position.z = bird ? pet.headBase.z : 0.29;
    pet.head.position.x = bird ? 0 : 0.22;
    pet.head.rotation.set(0.38, bird ? 0.3 : 0.65, -0.1);
    pet.tail.rotation.set(0.4, -1.2, bird ? 0 : 0.3);
    for (const leg of pet.legs) {
      leg.pivot.rotation.x = bird ? 0 : leg.front ? -1.0 : 1.1;
      if (!bird) leg.pivot.position.y -= 0.16;
    }
    if (bird)
      pet.legs
        .filter((l) => !l.front)
        .forEach((l, i) => {
          l.pivot.position.y += i ? 0.17 : 0;
          if (i) l.pivot.rotation.x = 0.8;
        });
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
  if (a === "eat" && state.meal) {
    pet.head.position.y = pet.headBase.y - 0.18;
    pet.head.rotation.x = 0.45 + Math.sin(time * 11) * 0.09;
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
    pet.torso.rotation.z = time * 2;
    pet.root.position.y = -0.18;
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
  pet.love.position.set(0.2, 0.25, 0.3);
  pet.love.children.forEach((heart, i) => {
    heart.position.x = (i - 1) * 0.45;
    heart.position.y = 2.05 + Math.sin(time * 2 + i) * 0.12;
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
