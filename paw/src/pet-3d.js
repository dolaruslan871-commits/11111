import { makeMeal } from "./meal-props.js";
import { applyPoseV5 } from "./v5-pose.js";
import * as THREE from "./vendor/three.module.js";
import { makeProps } from "./pet-props.js";
import catalog from "./catalog.json" with { type: "json" };
import { renderPet } from "./pet-art.js";

// Original procedural toy sculptures. No remote models, textures or CDN requests.
const TAU = Math.PI * 2;
let detailFactor = 1;
const PALETTES = {
  fox: {
    fur: "#d69261",
    light: "#fff0d6",
    dark: "#685044",
    nose: "#44372e",
    pink: "#dfa99b",
  },
  husky: {
    fur: "#91a0b3",
    light: "#fffaf0",
    dark: "#536277",
    nose: "#283444",
    pink: "#d9b2b5",
  },
  dog: {
    fur: "#e3af70",
    light: "#fff0cf",
    dark: "#aa7046",
    nose: "#46342e",
    pink: "#e9a294",
  },
  cat: {
    fur: "#e9a56d",
    light: "#fff0db",
    dark: "#b96f42",
    nose: "#c57873",
    pink: "#efb3a5",
  },
  croc: {
    fur: "#88b995",
    light: "#dce9b2",
    dark: "#548b73",
    nose: "#496e59",
    pink: "#c7c692",
  },
  kangaroo: {
    fur: "#bc8e68",
    light: "#f3d9b7",
    dark: "#805b40",
    nose: "#44372f",
    pink: "#dfaaa1",
  },
  dinosaur: {
    fur: "#75aea2",
    light: "#e5edbb",
    dark: "#4d7f7c",
    nose: "#405f60",
    pink: "#e1b596",
  },
  owl: {
    fur: "#9c8eb1",
    light: "#f4e9d5",
    dark: "#62566f",
    nose: "#dbac61",
    pink: "#d9afb6",
  },
  rabbit: {
    fur: "#c8bbae",
    light: "#fff3e5",
    dark: "#918375",
    nose: "#c08d91",
    pink: "#e7b5b3",
  },
};
const GAITS = new Set(["walk", "hunt", "carry", "skate", "scooter", "hide"]);
const EMOTIONS = {
  pet: "love",
  play: "happy",
  excited: "excited",
  sad: "sad",
  sleep: "sleepy",
  hunt: "curious",
  stand: "curious",
  eat: "happy",
  carry: "proud",
  wave: "happy",
  angry: "angry",
  "chase-tail": "curious",
};
function material(color, extra = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.67,
    metalness: 0,
    ...extra,
  });
}
function sphere(parent, mat, pos, scale, segments = 24) {
  if (segments >= 20) segments = Math.round(segments * detailFactor);
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(
      1,
      segments,
      Math.max(12, Math.round(segments * 0.7)),
    ),
    mat,
  );
  mesh.position.set(...pos);
  mesh.scale.set(...scale);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}
function box(parent, mat, pos, scale, rotation = null) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...scale), mat);
  mesh.position.set(...pos);
  if (rotation) mesh.rotation.set(...rotation);
  parent.add(mesh);
  return mesh;
}
function tube(parent, mat, points, radius = 0.04) {
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(...p)),
  );
  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(
      curve,
      Math.round(18 * detailFactor),
      radius,
      Math.round(9 * detailFactor),
      false,
    ),
    mat,
  );
  parent.add(mesh);
  return mesh;
}
function cone(
  parent,
  mat,
  pos,
  radius,
  height,
  rotation = null,
  segments = 24,
) {
  const mesh = new THREE.Mesh(
    new THREE.ConeGeometry(radius, height, segments),
    mat,
  );
  mesh.position.set(...pos);
  if (rotation) mesh.rotation.set(...rotation);
  parent.add(mesh);
  return mesh;
}
function ring(parent, mat, pos, radius, thickness = 0.025, rotation = null) {
  const mesh = new THREE.Mesh(
    new THREE.TorusGeometry(radius, thickness, 8, 28),
    mat,
  );
  mesh.position.set(...pos);
  if (rotation) mesh.rotation.set(...rotation);
  parent.add(mesh);
  return mesh;
}
function heartShape() {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.3);
  shape.bezierCurveTo(-0.5, -0.04, -0.65, 0.22, -0.38, 0.36);
  shape.bezierCurveTo(-0.16, 0.49, 0, 0.24, 0, 0.18);
  shape.bezierCurveTo(0, 0.24, 0.16, 0.49, 0.38, 0.36);
  shape.bezierCurveTo(0.65, 0.22, 0.5, -0.04, 0, -0.3);
  return shape;
}
function heart(parent, mat, pos, size = 0.12) {
  const mesh = new THREE.Mesh(
    new THREE.ExtrudeGeometry(heartShape(), {
      depth: 0.08,
      bevelEnabled: true,
      bevelSize: 0.02,
      bevelThickness: 0.02,
      bevelSegments: 2,
      steps: 1,
    }),
    mat,
  );
  mesh.position.set(...pos);
  mesh.scale.setScalar(size);
  parent.add(mesh);
  return mesh;
}
function item(category, id) {
  const list = catalog.wardrobe?.[category] || catalog[category] || [];
  return (
    list.find((value) => value.id === id) || {
      id,
      color: "#9db7cb",
      accent: "#fff1d7",
      shape: id,
    }
  );
}
function disposeTree(root) {
  const geometries = new Set(),
    materials = new Set(),
    textures = new Set();
  root.traverse((object) => {
    if (object.isInstancedMesh) object.dispose();
    if (object.geometry) geometries.add(object.geometry);
    for (const mat of [object.material].flat().filter(Boolean)) {
      materials.add(mat);
      if (mat.map) textures.add(mat.map);
    }
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
  textures.forEach((t) => t.dispose());
}

function sculpture(skin, outfit = {}, detailed = false) {
  detailFactor = detailed ? 2 : 1;
  const palette = PALETTES[skin] || PALETTES.dog;
  const mats = Object.fromEntries(
    Object.entries(palette).map(([key, color]) => [key, material(color)]),
  );
  mats.black = material("#302d2b", { roughness: 0.25 });
  mats.white = material("#fffef8");
  mats.gold = material("#e1b859", { metalness: 0.3, roughness: 0.4 });
  const root = new THREE.Group(),
    torso = new THREE.Group();
  root.add(torso);
  const isCroc = skin === "croc",
    isDino = skin === "dinosaur",
    isOwl = skin === "owl",
    upright = isOwl || skin === "kangaroo" || isDino;
  const bodyScale =
    skin === "fox"
      ? [0.35, 0.4, 0.7]
      : isCroc
        ? [0.46, 0.37, 0.92]
        : isOwl
          ? [0.36, 0.51, 0.32]
          : upright
            ? [0.32, 0.53, 0.4]
            : [0.43, 0.44, 0.76];
  const body = sphere(torso, mats.fur, [0, 0.8, -0.03], bodyScale, 32);
  body.name = "body";
  sphere(
    torso,
    mats.light,
    [0, 0.69, upright ? 0.3 : 0.19],
    isCroc
      ? [0.37, 0.28, 0.71]
      : upright
        ? [0.245, 0.38, 0.16]
        : [0.365, 0.32, 0.57],
  );
  const ears = [];
  const head = new THREE.Group();
  head.position.set(
    0,
    isCroc ? 1.05 : isOwl ? 1.32 : upright ? 1.43 : 1.21,
    upright ? 0.27 : 0.68,
  );
  torso.add(head);
  const headBase = head.position.clone();
  const faceY = isCroc || isDino ? 0.13 : 0.04,
    faceZ = isCroc || isDino ? 0.49 : 0.42;
  if (isCroc || isDino) {
    sphere(head, mats.fur, [0, 0, 0.12], [0.46, 0.32, 0.5]);
    sphere(head, mats.fur, [0, -0.09, 0.45], [0.42, 0.21, 0.58]);
    sphere(head, mats.light, [0, -0.23, 0.48], [0.39, 0.075, 0.53]);
    for (const x of [-0.25, 0.25]) {
      sphere(head, mats.fur, [x, 0.22, 0.17], [0.19, 0.2, 0.23]);
      sphere(head, mats.nose, [x * 0.65, -0.015, 0.94], [0.035, 0.021, 0.026]);
    }
    for (const x of [-0.27, 0.27])
      for (const z of [0.52, 0.76])
        cone(head, mats.white, [x, -0.17, z], 0.035, 0.07, [Math.PI, 0, 0], 10);
    for (let i = 0; i < 5; i++)
      cone(
        torso,
        isDino ? mats.pink : mats.dark,
        [0, 1.13 - i * 0.025, 0.02 - i * 0.22],
        0.11,
        isDino ? 0.26 : 0.18,
        null,
        4,
      );
    if (isDino) {
      head.scale.set(0.88, 0.94, 0.8);
      for (const side of [-1, 1])
        for (let i = 0; i < 4; i++)
          sphere(
            torso,
            mats.dark,
            [side * 0.39, 0.85 + (i % 2) * 0.15, -0.1 - i * 0.12],
            [0.035, 0.045, 0.055],
            12,
          );
    }
  } else if (isOwl) {
    sphere(head, mats.fur, [0, 0, 0], [0.46, 0.4, 0.35], 32);
    for (const side of [-1, 1]) {
      sphere(head, mats.light, [side * 0.195, 0.01, 0.29], [0.22, 0.26, 0.09]);
      cone(
        head,
        mats.dark,
        [side * 0.39, 0.37, -0.05],
        0.14,
        0.28,
        [0, 0, -side * 0.25],
        3,
      );
    }
    cone(head, mats.nose, [0, -0.13, 0.48], 0.085, 0.19, [0, 0, Math.PI], 3);
    for (const side of [-1, 1])
      for (let i = 0; i < 3; i++)
        sphere(
          torso,
          mats.dark,
          [side * 0.18, 0.55 + i * 0.15, 0.44],
          [0.037, 0.057, 0.018],
          12,
        );
  } else {
    sphere(head, mats.fur, [0, 0.04, 0], [0.49, 0.46, 0.45]);
    if (skin === "dog" || skin === "husky")
      sphere(head, mats.light, [0, 0.13, 0.36], [0.13, 0.31, 0.065]);
    for (const x of [-0.12, 0.12])
      sphere(head, mats.light, [x, -0.15, 0.4], [0.22, 0.15, 0.18]);
    sphere(
      head,
      mats.nose,
      [0, -0.06, 0.565],
      skin === "cat" ? [0.065, 0.047, 0.05] : [0.105, 0.073, 0.065],
    );
    if (skin === "rabbit" || skin === "kangaroo") {
      for (const side of [-1, 1]) {
        const ear = new THREE.Group();
        ear.position.set(side * 0.28, 0.32, -0.07);
        head.add(ear);
        const length = skin === "rabbit" ? 0.53 : 0.39;
        sphere(
          ear,
          mats.fur,
          [side * 0.045, length * 0.52, 0],
          [0.12, length, 0.12],
        );
        sphere(
          ear,
          mats.pink,
          [side * 0.045, length * 0.52, 0.095],
          [0.062, length * 0.77, 0.035],
        );
        ear.rotation.z = -side * 0.12;
        ear.userData.hitRegion = "ear";
        ear.userData.baseZ = -side * 0.12;
        ears.push(ear);
      }
      if (skin === "rabbit")
        for (const side of [-1, 1])
          box(
            head,
            mats.white,
            [side * 0.038, -0.265, 0.47],
            [0.064, 0.085, 0.03],
          );
    }
    if (skin === "cat" || skin === "husky" || skin === "fox") {
      for (const x of [-0.38, 0.38]) {
        const ear = new THREE.Group();
        ear.position.set(x, 0.32, -0.015);
        head.add(ear);
        ear.userData.hitRegion = "ear";
        ear.userData.baseZ = 0;
        cone(
          ear,
          mats.fur,
          [0, 0.11, 0],
          0.19,
          0.42,
          [0, 0, x < 0 ? 0.25 : -0.25],
          3,
        );
        cone(
          ear,
          mats.pink,
          [0, 0.11, 0.08],
          0.115,
          0.25,
          [0, 0, x < 0 ? 0.25 : -0.25],
          3,
        );
        ears.push(ear);
      }
      if (skin === "cat")
        for (const side of [-1, 1])
          for (let i = 0; i < 3; i++)
            tube(
              head,
              mats.dark,
              [
                [side * 0.17, -0.13 + i * 0.05, 0.52],
                [side * 0.38, -0.16 + i * 0.08, 0.5],
                [side * 0.57, -0.17 + i * 0.09, 0.47],
              ],
              0.009,
            );
      if (skin === "cat")
        for (const side of [-1, 1])
          for (let i = 0; i < 3; i++)
            sphere(
              torso,
              mats.dark,
              [side * 0.407, 0.92, -0.5 + i * 0.28],
              [0.015, 0.13, 0.047],
            );
    }
  }
  if (skin === "dog")
    for (const side of [-1, 1]) {
      const ear = new THREE.Group();
      ear.position.set(side * 0.43, 0.19, -0.015);
      head.add(ear);
      sphere(ear, mats.dark, [side * 0.035, -0.23, 0.015], [0.16, 0.33, 0.15]);
      sphere(ear, mats.fur, [side * 0.035, -0.24, 0.12], [0.09, 0.23, 0.026]);
      ears.push(ear);
    }
  // Small contour tufts and layered feathers give each silhouette detail without hair shaders.
  if (["fox", "husky", "dog", "cat", "rabbit", "kangaroo"].includes(skin))
    for (const side of [-1, 1])
      for (let i = 0; i < 3; i++) {
        const tuft = sphere(
          head,
          mats.fur,
          [side * (0.37 + i * 0.025), -0.1 - i * 0.035, 0.16],
          [0.085, 0.035, 0.07],
          12,
        );
        tuft.rotation.z = -side * 0.4;
      }
  if (isOwl)
    for (const side of [-1, 1])
      for (let i = 0; i < 4; i++) {
        const feather = sphere(
          torso,
          i % 2 ? mats.fur : mats.dark,
          [side * (0.21 + i * 0.018), 0.58 + i * 0.09, 0.25],
          [0.08, 0.045, 0.035],
          12,
        );
        feather.rotation.z = side * 0.3;
      }
  if (isCroc || isDino)
    for (const side of [-1, 1])
      for (let i = 0; i < 6; i++)
        sphere(
          head,
          mats.dark,
          [side * 0.37, -0.02 + (i % 2) * 0.07, 0.3 + i * 0.07],
          [0.018, 0.025, 0.026],
          10,
        );
  if (skin === "husky") {
    for (const side of [-1, 1]) {
      const mask = sphere(
        head,
        mats.light,
        [side * 0.2, -0.005, 0.354],
        [0.18, 0.18, 0.075],
      );
      mask.rotation.z = side * 0.35;
      sphere(head, mats.dark, [side * 0.25, 0.24, 0.19], [0.15, 0.09, 0.055]);
    }
    for (let i = 0; i < 7; i++)
      sphere(
        torso,
        mats.light,
        [(i - 3) * 0.075, 1.03 + Math.sin(i) * 0.02, 0.46],
        [0.065, 0.15, 0.065],
        12,
      );
  }
  const eyes = [],
    brows = [];
  for (const side of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(
      side * (isCroc || isDino ? 0.25 : isOwl ? 0.225 : 0.19),
      faceY,
      faceZ,
    );
    head.add(eye);
    if (isOwl) eye.scale.setScalar(1.4);
    sphere(eye, mats.light, [0, 0, -0.005], [0.094, 0.115, 0.035]);
    sphere(
      eye,
      material(
        skin === "husky"
          ? "#7bc6ee"
          : skin === "cat"
            ? "#688c72"
            : isOwl
              ? "#b58a46"
              : "#745140",
        { roughness: 0.23 },
      ),
      [0, -0.004, 0.028],
      [0.07, 0.09, 0.034],
    );
    sphere(eye, mats.black, [0, -0.004, 0.05], [0.045, 0.067, 0.018]);
    sphere(eye, mats.white, [-0.018, 0.027, 0.057], [0.022, 0.026, 0.012], 12);
    sphere(eye, mats.white, [0.018, -0.025, 0.058], [0.009, 0.01, 0.006], 10);
    eyes.push(eye);
    const brow = sphere(
      head,
      mats.dark,
      [side * 0.19, faceY + 0.15, faceZ - 0.017],
      [0.075, 0.021, 0.023],
    );
    brows.push(brow);
    if (!isCroc)
      sphere(
        head,
        mats.pink,
        [side * 0.31, -0.12, 0.35],
        [0.073, 0.043, 0.022],
      );
  }
  const jaw = new THREE.Group();
  jaw.position.set(0, isCroc ? -0.17 : -0.245, isCroc ? 0.65 : 0.41);
  head.add(jaw);
  sphere(
    jaw,
    mats.dark,
    [0, 0, 0],
    isCroc ? [0.26, 0.013, 0.13] : [0.075, 0.038, 0.035],
  );
  const tongue = sphere(
    jaw,
    mats.pink,
    [0, -0.023, 0.026],
    isCroc ? [0.09, 0.025, 0.12] : [0.048, 0.075, 0.027],
  );
  tongue.visible = false;
  const legs = [];
  for (const front of [false, true])
    for (const side of [-1, 1]) {
      const hip = new THREE.Group();
      hip.name = `${front ? "front" : "hind"}-${side < 0 ? "left" : "right"}`;
      hip.position.set(
        side * (isOwl ? 0.31 : upright ? 0.235 : 0.305),
        upright && front ? 0.99 : 0.64,
        front ? (upright ? 0.18 : 0.48) : upright ? -0.2 : -0.5,
      );
      torso.add(hip);
      hip.userData.hitRegion = "paw";
      if (isOwl && front) {
        sphere(hip, mats.dark, [side * 0.04, -0.15, -0.05], [0.11, 0.3, 0.11]);
        for (let i = 0; i < 3; i++)
          sphere(
            hip,
            i % 2 ? mats.dark : mats.fur,
            [side * 0.07, -0.19 - i * 0.09, 0.02 - i * 0.07],
            [0.1, 0.21, 0.08],
          );
      } else
        sphere(
          hip,
          mats.fur,
          [0, -0.18, 0],
          !front && skin === "kangaroo"
            ? [0.15, 0.28, 0.21]
            : [0.14, 0.27, 0.15],
        );
      const foot = sphere(
        hip,
        skin === "fox"
          ? mats.dark
          : isCroc || isDino
            ? mats.fur
            : isOwl
              ? mats.nose
              : mats.light,
        [0, -0.48, 0.065],
        !front && skin === "kangaroo"
          ? [0.17, 0.12, 0.34]
          : isOwl && front
            ? [0.07, 0.08, 0.09]
            : [0.155, 0.12, 0.205],
      );
      if (upright && front && !isOwl) hip.scale.setScalar(isDino ? 0.52 : 0.64);
      if (isOwl && front) {
        foot.visible = false;
        hip.userData.hitRegion = "body";
      }
      // Paw-pad undersides become visible when the pet presses the screen.
      sphere(foot, mats.pink, [0, -0.91, 0.08], [0.4, 0.09, 0.29], 12);
      for (const x of [-0.42, 0, 0.42])
        sphere(foot, mats.pink, [x, -0.78, 0.45], [0.15, 0.05, 0.12], 10);
      for (const x of [-0.055, 0.055])
        sphere(hip, mats.dark, [x, -0.44, 0.25], [0.007, 0.015, 0.016], 10);
      legs.push({
        foot,
        footBase: foot.position.clone(),
        pivot: hip,
        front,
        side,
        base: hip.position.clone(),
      });
    }
  const tail = new THREE.Group();
  tail.position.set(0, 0.83, upright ? -0.45 : -0.71);
  torso.add(tail);
  tail.userData.hitRegion = "tail";
  if (skin === "fox") {
    tube(
      tail,
      mats.fur,
      [
        [0, 0, 0],
        [0.12, 0.05, -0.38],
        [0.26, 0.28, -0.68],
        [0.2, 0.47, -0.83],
      ],
      0.18,
    );
    sphere(tail, mats.light, [0.2, 0.47, -0.83], [0.18, 0.21, 0.2]);
  } else if (skin === "husky") {
    tube(
      tail,
      mats.fur,
      [
        [0, 0, 0],
        [0.08, 0.25, -0.35],
        [0.1, 0.57, -0.35],
        [0.06, 0.64, -0.08],
        [0, 0.45, 0.02],
      ],
      0.13,
    );
    sphere(tail, mats.light, [0, 0.45, 0.02], [0.14, 0.15, 0.14]);
  } else if (skin === "rabbit")
    sphere(tail, mats.light, [0, -0.13, -0.13], [0.18, 0.18, 0.18]);
  else if (isOwl) {
    for (const side of [-1, 0, 1])
      sphere(tail, mats.dark, [side * 0.1, -0.2, -0.2], [0.09, 0.11, 0.33]);
  } else if (skin === "kangaroo") {
    tube(
      tail,
      mats.fur,
      [
        [0, -0.07, 0],
        [0.04, -0.28, -0.45],
        [0.05, -0.52, -0.86],
        [0.06, -0.65, -1.07],
      ],
      0.13,
    );
    sphere(tail, mats.light, [0.06, -0.65, -1.07], [0.08, 0.06, 0.08]);
  } else if (isCroc || isDino) {
    const tailShape = cone(tail, mats.fur, [0.06, -0.02, -0.53], 0.26, 1.3, [
      -Math.PI / 2,
      0,
      -0.1,
    ]);
    for (let i = 0; i < 4; i++)
      cone(
        tail,
        mats.dark,
        [0.02, 0.2 - i * 0.05, -0.18 - i * 0.2],
        0.075 - i * 0.009,
        0.12 - i * 0.012,
        null,
        4,
      );
  } else {
    tube(
      tail,
      mats.fur,
      [
        [0, 0, 0],
        [0.11, 0.1, -0.3],
        [0.2, 0.43, -0.55],
        [0.07, 0.63, -0.6],
      ],
      skin === "cat" ? 0.075 : 0.105,
    );
    sphere(
      tail,
      mats.light,
      [0.07, 0.63, -0.6],
      skin === "cat" ? [0.08, 0.08, 0.08] : [0.113, 0.12, 0.113],
    );
  }
  if (skin === "kangaroo") {
    sphere(torso, mats.light, [0, 0.66, 0.355], [0.18, 0.17, 0.045]);
    tube(
      torso,
      mats.dark,
      [
        [-0.15, 0.76, 0.38],
        [0, 0.72, 0.4],
        [0.15, 0.76, 0.38],
      ],
      0.008,
    );
  }
  // Collars are selected by the user through the wardrobe.
  const outfitRoot = new THREE.Group();
  torso.add(outfitRoot);
  const toy = new THREE.Group();
  toy.name = "ground-toy";
  toy.position.set(0.86, 0.2, 0.45);
  root.add(toy);
  dress({ root: outfitRoot, head, mats, skin, outfit, bodyScale, legs, toy });
  const paper = new THREE.Group();
  paper.position.set(0, -0.13, isCroc ? 1.03 : 0.65);
  head.add(paper);
  box(
    paper,
    material("#fcf7e7"),
    [0, 0, 0],
    [0.32, 0.35, 0.024],
    [0.1, 0, -0.13],
  );
  for (let i = 0; i < 3; i++)
    box(
      paper,
      material("#b9c6b4"),
      [0, 0.07 - i * 0.065, 0.017],
      [0.19, 0.012, 0.008],
    );
  paper.visible = false;
  const love = new THREE.Group();
  love.visible = false;
  root.add(love);
  for (let i = 0; i < 3; i++)
    heart(
      love,
      material(["#dc8b91", "#edb5aa", "#c97582"][i]),
      [(i - 1) * 0.3, 1.95 + (i % 2) * 0.15, 0.74],
      0.17,
    );
  const crumbs = new THREE.Group();
  crumbs.visible = false;
  head.add(crumbs);
  for (let i = 0; i < 7; i++)
    sphere(
      crumbs,
      material(i % 2 ? "#faf3d8" : "#d8ae73"),
      [(i - 3) * 0.055, -0.3 - (i % 3) * 0.04, 0.65],
      [0.018, 0.022, 0.015],
      8,
    );
  let ageFur = null;
  if (["dog", "cat", "husky", "fox", "rabbit", "kangaroo"].includes(skin)) {
    const count = 100,
      geo = new THREE.ConeGeometry(0.014, 0.07, 3),
      fur = new THREE.InstancedMesh(geo, mats.fur, count),
      matrix = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const y = 1 - (2 * (i + 0.5)) / count,
        phi = i * 2.399963,
        r = Math.sqrt(1 - y * y),
        x = r * Math.cos(phi),
        z = r * Math.sin(phi);
      matrix.position.set(
        x * bodyScale[0],
        0.8 + y * bodyScale[1],
        -0.03 + z * bodyScale[2],
      );
      matrix.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(x, y, z).normalize(),
      );
      matrix.updateMatrix();
      fur.setMatrixAt(i, matrix.matrix);
    }
    torso.add(fur);
    ageFur = fur;
  }
  const headScale = head.scale.clone();
  const props = makeProps(root);
  const meal = makeMeal(root);
  detailFactor = 1;
  return {
    meal,
    ageFur,
    headScale,
    props,
    root,
    torso,
    body,
    head,
    headBase,
    eyes,
    brows,
    ears,
    legs,
    tail,
    jaw,
    tongue,
    love,
    paper,
    crumbs,
    toy,
  };
}

function dress({ root, head, mats, skin, outfit, bodyScale, legs, toy }) {
  const isCroc = skin === "croc",
    upright = ["owl", "kangaroo", "dinosaur"].includes(skin);
  for (const [category, selectedId] of Object.entries(outfit)) {
    if (!selectedId || selectedId === "none") continue;
    const meta = item(category, selectedId),
      id = meta.base || selectedId,
      color = material(meta.color || "#adc5bc"),
      accent = material(meta.accent || "#f8ecd5");
    const group = new THREE.Group();
    group.name = `outfit-${category}-${id}`;
    if (["hat", "glasses"].includes(category)) head.add(group);
    else root.add(group);
    if (category === "hat") {
      group.position.set(0, isCroc ? 0.39 : 0.46, -0.015);
      if (id === "party" || id === "wizard" || id === "witch") {
        cone(group, color, [0, 0.22, 0], 0.29, id === "party" ? 0.58 : 0.7);
        if (id === "witch") {
          sphere(group, color, [0, -0.035, 0], [0.46, 0.025, 0.39]);
          box(group, accent, [0, 0.12, 0.2], [0.11, 0.08, 0.045]);
        }
        ring(group, accent, [0, -0.005, 0], 0.28, 0.04, [Math.PI / 2, 0, 0]);
        sphere(group, accent, [0, 0.53, 0], [0.07, 0.07, 0.07]);
        for (let i = 0; i < 5; i++)
          sphere(
            group,
            accent,
            [Math.sin(i * 2) * 0.12, 0.1 + i * 0.065, 0.15 - i * 0.02],
            [0.025, 0.025, 0.015],
            10,
          );
      } else if (id === "pumpkin") {
        sphere(group, color, [0, 0.13, 0], [0.36, 0.26, 0.33]);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU;
          sphere(
            group,
            color,
            [Math.sin(a) * 0.2, 0.13, Math.cos(a) * 0.2],
            [0.16, 0.24, 0.15],
          );
        }
        tube(
          group,
          accent,
          [
            [0, 0.36, 0],
            [0.04, 0.45, 0],
            [0.1, 0.47, 0.02],
          ],
          0.035,
        );
      } else if (id === "crown") {
        ring(group, color, [0, 0.02, 0], 0.26, 0.075, [Math.PI / 2, 0, 0]);
        for (let i = 0; i < 7; i++) {
          const angle = (i / 7) * TAU;
          cone(
            group,
            color,
            [Math.sin(angle) * 0.26, 0.16, Math.cos(angle) * 0.26],
            0.085,
            0.25,
            null,
            4,
          );
          sphere(
            group,
            accent,
            [Math.sin(angle) * 0.26, 0.3, Math.cos(angle) * 0.26],
            [0.035, 0.035, 0.035],
          );
        }
      } else if (id === "headphones") {
        tube(
          group,
          color,
          [
            [-0.42, -0.13, 0],
            [-0.4, 0.3, 0],
            [0, 0.42, 0],
            [0.4, 0.3, 0],
            [0.42, -0.13, 0],
          ],
          0.045,
        );
        for (const side of [-1, 1])
          sphere(group, accent, [side * 0.45, -0.14, 0], [0.11, 0.18, 0.15]);
      } else if (id === "flower") {
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * TAU;
          flower(
            group,
            color,
            accent,
            [Math.sin(a) * 0.34, 0, Math.cos(a) * 0.29],
            0.09,
          );
        }
      } else if (id === "astronaut") {
        sphere(group, color, [0, -0.06, 0], [0.58, 0.54, 0.52]);
        sphere(
          group,
          material("#c6e7ec", {
            transparent: true,
            opacity: 0.25,
            roughness: 0.12,
            depthWrite: false,
          }),
          [0, -0.08, 0.25],
          [0.52, 0.45, 0.4],
        );
        ring(group, accent, [0, -0.08, 0.36], 0.46, 0.045);
      } else {
        const scale =
          id === "beret"
            ? [0.41, 0.13, 0.35]
            : id === "bucket"
              ? [0.34, 0.2, 0.32]
              : [0.34, 0.22, 0.32];
        sphere(group, color, [id === "beret" ? 0.045 : 0, 0.08, 0], scale);
        ring(group, accent, [0, -0.03, 0], 0.31, 0.045, [Math.PI / 2, 0, 0]);
        if (id === "beanie" || id === "winter") {
          sphere(group, accent, [0, 0.32, 0], [0.09, 0.09, 0.09]);
          for (let i = 0; i < 9; i++)
            box(group, accent, [(i - 4) * 0.055, 0, 0.29], [0.012, 0.1, 0.01]);
        }
        if (id === "winter")
          for (const side of [-1, 1]) {
            sphere(group, color, [side * 0.31, -0.12, 0], [0.085, 0.18, 0.12]);
            tube(
              group,
              accent,
              [
                [side * 0.31, -0.26, 0.02],
                [side * 0.32, -0.39, 0.01],
              ],
              0.018,
            );
            sphere(
              group,
              accent,
              [side * 0.32, -0.4, 0.01],
              [0.035, 0.055, 0.035],
            );
          }
        if (id === "cap" || id === "bucket")
          sphere(
            group,
            color,
            [0, -0.035, 0.25],
            [0.37, 0.035, id === "cap" ? 0.33 : 0.23],
          );
        if (id === "santa") {
          cone(group, color, [0.04, 0.28, 0], 0.29, 0.53, [0, 0, -0.2]);
          sphere(group, accent, [0.11, 0.58, 0], [0.085, 0.085, 0.085]);
        }
        if (id === "beret")
          box(group, accent, [0.02, 0.24, 0], [0.03, 0.08, 0.03]);
      }
    } else if (category === "glasses") {
      group.position.set(0, isCroc ? 0.14 : 0.04, isCroc ? 0.535 : 0.48);
      for (const side of [-1, 1]) {
        if (id === "monocle" && side < 0) continue;
        if (id === "heart") {
          const h = heart(group, color, [side * 0.19, -0.01, 0.005], 0.23);
          h.scale.z = 0.08;
        } else if (id === "pixel") {
          box(group, color, [side * 0.19, 0, 0], [0.27, 0.18, 0.035]);
          box(group, accent, [side * 0.19, 0.01, 0.021], [0.18, 0.09, 0.01]);
        } else {
          ring(
            group,
            color,
            [side * 0.19, 0, 0],
            id === "ski" ? 0.145 : 0.125,
            0.023,
          );
          if (["sun", "ski", "aviator"].includes(id))
            sphere(
              group,
              material(id === "sun" ? "#353e4a" : meta.accent || "#d7c9a1", {
                transparent: true,
                opacity: 0.78,
                roughness: 0.2,
              }),
              [side * 0.19, 0, -0.006],
              [0.115, 0.115, 0.018],
            );
          if (id === "star")
            for (let i = 0; i < 5; i++) {
              const a = (i / 5) * TAU;
              cone(
                group,
                accent,
                [side * 0.19 + Math.sin(a) * 0.13, Math.cos(a) * 0.13, 0.005],
                0.035,
                0.08,
                [0, 0, -a],
                3,
              );
            }
          if (id === "rainbow")
            ring(group, accent, [side * 0.19, 0, 0.01], 0.09, 0.012);
        }
      }
      box(group, color, [0, 0, 0], [0.13, 0.025, 0.025]);
      for (const side of [-1, 1])
        tube(
          group,
          color,
          [
            [side * 0.31, 0, 0],
            [side * 0.43, 0.01, -0.13],
            [side * 0.43, 0.015, -0.25],
          ],
          0.014,
        );
    } else if (category === "scarf") {
      group.position.set(0, upright ? 1.15 : 0.99, upright ? 0.28 : 0.54);
      ring(
        group,
        color,
        [0, 0, 0],
        upright ? 0.255 : 0.35,
        upright ? 0.055 : 0.075,
        [Math.PI / 2.5, 0, 0],
      );
      if (id === "bowtie") {
        for (const side of [-1, 1])
          sphere(
            group,
            color,
            [side * 0.115, -0.11, 0.25],
            [0.13, 0.065, 0.04],
          );
        sphere(group, accent, [0, -0.11, 0.29], [0.035, 0.04, 0.025]);
      } else {
        const tail = box(
          group,
          color,
          [0.15, -0.3, 0.28],
          [0.14, 0.34, 0.055],
          [0, 0, -0.15],
        );
        if (id === "bandana")
          cone(group, color, [0, -0.23, 0.29], 0.2, 0.3, [0, 0, Math.PI], 3);
        for (let i = 0; i < 3; i++)
          box(
            group,
            accent,
            [0.15, -0.21 - i * 0.075, 0.314],
            [0.135, 0.017, 0.01],
          );
      }
      if (id === "christmas")
        for (let i = 0; i < 3; i++) {
          ring(group, accent, [0, -0.01 + i * 0.025, 0], 0.352, 0.012, [
            Math.PI / 2.5,
            0,
            0,
          ]);
          for (const x of [0.11, 0.18])
            sphere(
              group,
              accent,
              [x, -0.2 - i * 0.075, 0.322],
              [0.012, 0.012, 0.009],
              8,
            );
        }
      if (id === "halloween")
        for (let i = 0; i < 3; i++)
          box(
            group,
            accent,
            [0.15, -0.2 - i * 0.075, 0.323],
            [0.12, 0.035, 0.01],
            [0, 0, 0.1],
          );
      if (id === "polka")
        for (let i = 0; i < 6; i++)
          sphere(
            group,
            accent,
            [0.12 + (i % 2) * 0.055, -0.19 - Math.floor(i / 2) * 0.09, 0.322],
            [0.017, 0.017, 0.008],
            10,
          );
    } else if (category === "toy") {
      group.removeFromParent();
      toy.add(group);
      if (id === "bone" || id === "stick" || id === "rope") {
        tube(
          group,
          color,
          [
            [-0.3, 0, 0],
            [0, 0.012, 0],
            [0.3, 0, 0],
          ],
          id === "rope" ? 0.04 : 0.055,
        );
        for (const side of [-1, 1])
          if (id === "bone")
            for (const y of [-0.045, 0.045])
              sphere(group, accent, [side * 0.3, y, 0], [0.07, 0.07, 0.07]);
        if (id === "rope")
          for (let i = 0; i < 9; i++)
            ring(group, accent, [(i - 4) * 0.055, 0, 0], 0.05, 0.009, [
              0,
              Math.PI / 2,
              0,
            ]);
      } else if (id === "ball") {
        sphere(group, color, [0, -0.05, 0], [0.17, 0.17, 0.17]);
        ring(group, accent, [0, -0.05, 0], 0.17, 0.012, [0.5, 0.3, 0]);
      } else if (id === "duck") {
        sphere(group, color, [0, -0.05, 0], [0.18, 0.12, 0.12]);
        sphere(group, color, [0.1, 0.07, 0], [0.1, 0.11, 0.1]);
        sphere(group, accent, [0.2, 0.06, 0.02], [0.09, 0.035, 0.07]);
        sphere(group, mats.black, [0.13, 0.09, 0.085], [0.013, 0.013, 0.008]);
      } else if (id === "carrot") {
        cone(group, color, [0, -0.04, 0], 0.12, 0.4, [0, 0, -Math.PI / 2]);
        for (let i = 0; i < 3; i++)
          sphere(
            group,
            accent,
            [-0.23, 0.04 + i * 0.03, 0],
            [0.1, 0.025, 0.025],
          );
      } else if (id === "fish") {
        sphere(group, color, [0, 0, 0], [0.21, 0.09, 0.06]);
        cone(group, accent, [-0.23, 0, 0], 0.12, 0.17, [0, 0, -Math.PI / 2], 3);
        sphere(group, mats.black, [0.13, 0.025, 0.055], [0.018, 0.018, 0.008]);
      } else if (id === "frisbee") {
        ring(group, color, [0, 0, 0], 0.21, 0.04, [Math.PI / 2, 0, 0]);
        sphere(group, accent, [0, 0, 0], [0.18, 0.025, 0.18]);
      } else if (id === "donut") {
        ring(group, color, [0, 0, 0], 0.13, 0.065);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * TAU;
          box(
            group,
            accent,
            [Math.sin(a) * 0.13, Math.cos(a) * 0.13, 0.06],
            [0.015, 0.045, 0.015],
            [0, 0, a],
          );
        }
      } else if (id === "christmas-tree") {
        box(group, material("#8d6747"), [0, -0.03, 0], [0.07, 0.28, 0.07]);
        for (let i = 0; i < 3; i++)
          cone(group, color, [0, 0.11 + i * 0.17, 0], 0.28 - i * 0.065, 0.35);
        for (let i = 0; i < 9; i++) {
          const a = i * 2.4,
            y = 0.03 + i * 0.046,
            r = 0.23 - i * 0.014;
          sphere(
            group,
            i % 2 ? accent : material("#c75357"),
            [Math.sin(a) * r, y, Math.cos(a) * r],
            [0.034, 0.034, 0.034],
            12,
          );
        }
        const star = heart(group, accent, [0, 0.62, 0], 0.12);
        star.rotation.z = Math.PI;
      } else if (id === "pumpkin") {
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * TAU;
          sphere(
            group,
            color,
            [Math.sin(a) * 0.13, 0, Math.cos(a) * 0.13],
            [0.15, 0.22, 0.15],
          );
        }
        tube(
          group,
          accent,
          [
            [0, 0.18, 0],
            [0, 0.27, 0],
            [0.07, 0.3, 0.02],
          ],
          0.026,
        );
        for (const side of [-1, 1])
          cone(
            group,
            mats.black,
            [side * 0.09, 0.04, 0.235],
            0.05,
            0.08,
            [0, 0, Math.PI],
            3,
          );
        box(group, mats.black, [0, -0.06, 0.24], [0.15, 0.035, 0.012]);
      } else if (id === "ghost") {
        sphere(group, color, [0, 0.07, 0], [0.18, 0.22, 0.14]);
        cone(group, color, [0, -0.08, 0], 0.23, 0.34);
        for (const side of [-1, 1])
          sphere(
            group,
            mats.black,
            [side * 0.06, 0.1, 0.13],
            [0.026, 0.038, 0.012],
          );
        sphere(group, accent, [0, -0.005, 0.15], [0.025, 0.035, 0.01]);
      } else {
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * TAU;
          cone(
            group,
            color,
            [Math.sin(a) * 0.1, Math.cos(a) * 0.1, 0],
            0.09,
            0.22,
            [0, 0, -a],
            3,
          );
        }
        sphere(group, accent, [0, 0, 0.04], [0.05, 0.05, 0.025]);
      }
    } else if (category === "clothing") {
      const coat = sphere(
        group,
        color,
        [0, 0.8, -0.03],
        bodyScale.map((value) => value * 1.035),
        32,
      );
      for (const leg of legs)
        if (leg.front) {
          const sleeve = sphere(
            leg.pivot,
            color,
            [0, -0.09, 0],
            [0.151, 0.19, 0.16],
          );
          ring(leg.pivot, accent, [0, -0.22, 0], 0.145, 0.014, [
            Math.PI / 2,
            0,
            0,
          ]);
        }
      sphere(
        group,
        accent,
        [0, 0.7, upright ? bodyScale[2] * 0.82 : 0.41],
        [upright ? 0.21 : 0.29, 0.24, upright ? 0.055 : 0.16],
      );
      if (["bee", "sailor", "pajamas", "shirt"].includes(id)) {
        const c = document.createElement("canvas");
        c.width = c.height = 128;
        const ctx = c.getContext("2d");
        ctx.fillStyle = meta.color || "#a8b7c9";
        ctx.fillRect(0, 0, 128, 128);
        ctx.fillStyle = meta.accent || "#f4ead5";
        for (let i = 0; i < 8; i++) ctx.fillRect(0, i * 16, 128, 4);
        coat.material.map = new THREE.CanvasTexture(c);
        coat.material.needsUpdate = true;
      }
      if (id === "bee") {
        for (const side of [-1, 1])
          sphere(
            group,
            material("#e3edf0", { transparent: true, opacity: 0.65 }),
            [side * 0.3, 1.14, -0.3],
            [0.2, 0.09, 0.38],
          );
      }
      if (id === "hoodie")
        sphere(group, color, [0, 1.04, 0.5], [0.42, 0.29, 0.25]);
      if (id === "raincoat")
        for (let i = 0; i < 3; i++)
          sphere(
            group,
            accent,
            [0.06, 0.9 - i * 0.1, 0.69],
            [0.02, 0.02, 0.015],
          );
      if (id === "dress") {
        cone(group, color, [0, 0.51, -0.24], 0.55, 0.4, [Math.PI, 0, 0]);
      }
      if (id === "spacesuit") {
        ring(group, accent, [0, 0.9, 0.43], 0.35, 0.045, [Math.PI / 2.5, 0, 0]);
        box(group, accent, [0, 0.95, -0.72], [0.3, 0.3, 0.13]);
      }
      if (id === "vest")
        for (const side of [-1, 1])
          box(
            group,
            accent,
            [side * 0.3, 0.9, 0.35],
            [0.08, 0.23, 0.035],
            [0, 0, side * 0.3],
          );
      if (id === "christmas") {
        for (const side of [-1, 1])
          for (let i = 0; i < 3; i++)
            sphere(
              group,
              accent,
              [side * 0.425, 0.72 + i * 0.09, -0.31 + (i % 2) * 0.14],
              [0.012, 0.018, 0.018],
              10,
            );
        for (let i = 0; i < 3; i++)
          ring(group, accent, [0, 0.8, -0.4 + i * 0.28], 0.443, 0.012);
      }
      if (id === "halloween") {
        for (const side of [-1, 1])
          cone(
            group,
            mats.black,
            [side * 0.17, 0.89, 0.66],
            0.09,
            0.12,
            [0, 0, Math.PI],
            3,
          );
        box(group, mats.black, [0, 0.68, 0.67], [0.25, 0.045, 0.012]);
        for (const side of [-1, 1])
          sphere(
            group,
            accent,
            [side * 0.43, 0.82, -0.2],
            [0.018, 0.33, 0.055],
          );
      }
    } else if (category === "accessory") {
      if (id === "bat-wings") {
        for (const side of [-1, 1]) {
          const wing = new THREE.Shape();
          wing.moveTo(0, 0);
          wing.quadraticCurveTo(0.4, 0.4, 0.8, 0.18);
          wing.quadraticCurveTo(0.6, 0.16, 0.64, -0.08);
          wing.quadraticCurveTo(0.43, 0.08, 0.36, -0.2);
          wing.quadraticCurveTo(0.21, -0.03, 0, -0.2);
          wing.lineTo(0, 0);
          const mesh = new THREE.Mesh(
            new THREE.ExtrudeGeometry(wing, {
              depth: 0.025,
              bevelEnabled: false,
            }),
            color,
          );
          mesh.position.set(side * 0.28, 1.0, -0.22);
          mesh.scale.x = side;
          group.add(mesh);
        }
      } else if (id === "wings") {
        for (const side of [-1, 1])
          for (let i = 0; i < 3; i++)
            sphere(
              group,
              i % 2 ? accent : color,
              [side * (0.5 + i * 0.08), 1.0 + i * 0.065, -0.22 + i * 0.06],
              [0.24, 0.09, 0.13],
            );
      } else if (id === "cape") {
        sphere(group, color, [0, 0.93, -0.62], [0.53, 0.16, 0.55]);
        sphere(group, accent, [0, 0.82, -0.95], [0.42, 0.025, 0.12]);
      } else if (id === "halo")
        ring(head, color, [0, isCroc ? 0.58 : 0.72, 0], 0.32, 0.026, [
          Math.PI / 2,
          0,
          0,
        ]);
      else if (id === "bell") {
        sphere(group, color, [0, 0.72, 0.79], [0.09, 0.11, 0.08]);
        box(group, mats.black, [0, 0.69, 0.865], [0.07, 0.012, 0.01]);
      } else if (id === "flower")
        flower(head, color, accent, [0.41, 0.26, 0.2], 0.13);
      else if (id === "bow") {
        for (const side of [-1, 1])
          sphere(
            head,
            color,
            [0.3 + side * 0.08, 0.35, 0.13],
            [0.1, 0.07, 0.045],
          );
        sphere(head, accent, [0.3, 0.35, 0.17], [0.03, 0.04, 0.025]);
      } else if (id === "badge") {
        heart(group, color, [0, 0.85, 0.71], 0.15);
      } else if (id === "camera") {
        box(group, color, [0, 0.65, 0.83], [0.25, 0.19, 0.12]);
        ring(group, accent, [0, 0.66, 0.907], 0.065, 0.022);
        sphere(group, mats.black, [0, 0.66, 0.914], [0.05, 0.05, 0.012]);
      } else {
        sphere(
          group,
          color,
          [0, 1.03, -0.34],
          id === "pouch" ? [0.2, 0.15, 0.2] : [0.29, 0.3, 0.2],
        );
        box(group, accent, [0, 0.99, -0.55], [0.22, 0.11, 0.04]);
        tube(
          group,
          color,
          [
            [-0.21, 1.12, -0.4],
            [-0.35, 1.1, -0.1],
            [-0.31, 0.7, 0.08],
          ],
          0.025,
        );
        tube(
          group,
          color,
          [
            [0.21, 1.12, -0.4],
            [0.35, 1.1, -0.1],
            [0.31, 0.7, 0.08],
          ],
          0.025,
        );
      }
    }
  }
}
function flower(parent, color, accent, position, size) {
  const group = new THREE.Group();
  group.position.set(...position);
  parent.add(group);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    sphere(
      group,
      color,
      [Math.sin(a) * size * 0.6, Math.cos(a) * size * 0.6, 0],
      [size * 0.48, size * 0.48, size * 0.23],
      12,
    );
  }
  sphere(
    group,
    accent,
    [0, 0, size * 0.15],
    [size * 0.34, size * 0.34, size * 0.25],
    12,
  );
  return group;
}

function pose(pet, state, time, reduced) {
  if (state.approachingHouse || state.approachingToy)
    state = { ...state, activity: "walk" };
  const activity = state.activity || "idle",
    walking = GAITS.has(activity),
    emotion =
      state.emotion ||
      EMOTIONS[activity] ||
      (state.life?.mood < 25
        ? "sad"
        : state.life?.mood > 85
          ? "happy"
          : "content");
  const speed =
      (activity === "hunt"
        ? 9
        : state.skin === "rabbit" || state.skin === "kangaroo"
          ? 7
          : 6) *
      (0.75 + (state.behavior?.active ?? 55) / 200),
    phase = time * speed,
    breathing = Math.sin(time * 2.2) * 0.012;
  const stand = ["wave"].includes(activity),
    sleeping = ["sleep", "home", "curl"].includes(activity);
  const facing = Number.isFinite(state.viewRotation)
    ? state.viewRotation
    : walking
      ? state.direction < 0
        ? -0.95
        : 0.95
      : -0.12;
  pet.props.update(state, time);
  const growth = state.life?.growth || 1;
  pet.root.scale.setScalar(growth);
  pet.head.scale.copy(pet.headScale).multiplyScalar(1 + (1 - growth) * 0.55);
  pet.root.rotation.z = activity === "float" ? Math.sin(time * 0.8) * 0.5 : 0;
  pet.root.rotation.x = activity === "float" ? Math.sin(time * 0.5) * 0.4 : 0;
  pet.root.rotation.y = facing + (activity === "chase-tail" ? time * 4.5 : 0);
  pet.root.position.y = sleeping
    ? -0.18
    : activity === "jetpack" || activity === "float"
      ? 0.25 + Math.sin(time * 2) * 0.08
      : stand
        ? 0.09
        : activity === "excited" || activity === "dance"
          ? Math.abs(Math.sin(time * 5)) * 0.15
          : walking && ["rabbit", "kangaroo"].includes(state.skin)
            ? Math.abs(Math.sin(phase)) * 0.1
            : 0;
  const peeking = activity === "home" && Math.sin(time * 0.7) > 0.35;
  pet.torso.visible = activity !== "home" || peeking;
  pet.torso.scale.x = pet.torso.scale.z = activity === "home" ? 0.45 : 1;
  pet.torso.position.x = activity === "home" ? -0.85 : 0;
  pet.torso.position.z = activity === "home" ? -0.1 : 0;
  pet.torso.rotation.x = stand
    ? -0.58
    : sleeping
      ? 0.12
      : activity === "stretch"
        ? 0.14
        : 0;
  pet.torso.rotation.z = sleeping
    ? 0.13
    : activity === "dance"
      ? Math.sin(time * 5) * 0.1
      : 0;
  pet.torso.scale.y = (activity === "home" ? 0.45 : 1) * (1 + breathing);
  // Move the complete skeleton, so fitted clothing shares every body transform.
  pet.torso.position.y = walking
    ? Math.cos(phase * 2) * 0.025
    : activity === "angry"
      ? Math.sin(time * 14) * 0.012
      : 0;
  pet.body.position.y = 0.8;
  pet.head.rotation.x = sleeping
    ? 0.27
    : activity === "eat"
      ? 0.17 + Math.sin(time * 12) * 0.08
      : walking
        ? Math.sin(phase) * 0.035
        : Math.sin(time * 0.8) * 0.025;
  pet.head.rotation.z =
    emotion === "curious"
      ? 0.15
      : emotion === "sad"
        ? -0.08
        : activity === "pet"
          ? Math.sin(time * 3) * 0.09
          : activity === "angry"
            ? Math.sin(time * 12) * 0.04
            : Math.sin(time * 0.7) * 0.025;
  pet.head.rotation.y =
    activity === "play"
      ? Math.sin(time * 2) * 0.13 + 0.26
      : activity === "chase-tail"
        ? 0.65
        : state.gaze?.x
          ? state.gaze.x * 0.18
          : 0;
  pet.head.position.y =
    pet.headBase.y +
    (sleeping ? -0.12 : 0) +
    (walking ? Math.cos(phase * 2) * 0.014 : 0);
  pet.tail.rotation.z = sleeping
    ? -0.15
    : Math.sin(
        time *
          (emotion === "happy" || emotion === "excited" || emotion === "love"
            ? 12
            : 3.5),
      ) * (sleeping ? 0.015 : 0.25);
  pet.tail.rotation.x = sleeping ? 0.4 : emotion === "sad" ? 0.5 : 0;
  pet.tail.rotation.y = Math.sin(time * 3) * 0.08;
  pet.ears.forEach((ear, i) => {
    ear.rotation.z =
      (ear.userData.baseZ || 0) +
      (i ? 1 : -1) * (emotion === "sad" ? 0.2 : 0) +
      Math.sin(time * 2 + i) * 0.04;
  });
  for (const leg of pet.legs) {
    const offset = (leg.front ? 0 : Math.PI) + (leg.side < 0 ? Math.PI : 0),
      stride = Math.sin(phase + offset);
    leg.pivot.position.copy(leg.base);
    leg.pivot.rotation.set(0, 0, 0);
    // The airborne foot swings forward; the planted foot pushes backward.
    if (walking && !reduced) {
      leg.pivot.rotation.x =
        -stride * (["skate", "scooter"].includes(activity) ? 0.12 : 0.48);
      leg.pivot.position.y += Math.max(0, Math.cos(phase + offset)) * 0.075;
    }
    if (stand) {
      leg.pivot.rotation.x = leg.front ? -1.9 : 0.58;
      leg.pivot.rotation.z = leg.front ? -leg.side * 0.12 : 0;
      if (activity === "wave" && leg.front && leg.side > 0)
        leg.pivot.rotation.z = 0.25 + Math.sin(time * 7) * 0.35;
    }
    if (sleeping) {
      leg.pivot.rotation.x = leg.front ? -0.6 : 0.55;
      leg.pivot.position.y -= 0.1;
    }
    if (activity === "stretch" && leg.front) {
      leg.pivot.rotation.x = -0.5;
      leg.pivot.position.y -= 0.06;
    }
    if (
      [
        "play",
        "dance",
        "draw",
        "fish",
        "ball",
        "drink",
        "build",
        "gift",
        "cake",
        "attention",
      ].includes(activity) &&
      leg.front &&
      leg.side > 0
    ) {
      leg.pivot.rotation.x = -0.5 - Math.max(0, Math.sin(time * 3)) * 0.55;
      leg.pivot.rotation.z = 0.48;
    }
    if (activity === "angry" && leg.front)
      leg.pivot.position.y +=
        Math.max(0, Math.sin(time * 10 + leg.side)) * 0.06;
    if (activity === "chase-tail") {
      leg.pivot.rotation.x = -stride * 0.55;
      leg.pivot.position.y += Math.max(0, Math.cos(phase + offset)) * 0.08;
    }
  }
  const blink =
      Math.sin(time * 1.1) > 0.993 || Math.sin(time * 0.76 + 2) > 0.997,
    eyeHeight = peeking
      ? 0.9
      : sleeping
        ? 0.075
        : blink
          ? 0.08
          : emotion === "happy" || emotion === "love"
            ? 0.72
            : emotion === "sad"
              ? 0.75
              : 1;
  pet.eyes.forEach((eye) => (eye.scale.y = eyeHeight));
  pet.brows.forEach(
    (brow, i) =>
      (brow.rotation.z =
        emotion === "angry"
          ? i
            ? 0.45
            : -0.45
          : emotion === "sad"
            ? i
              ? -0.32
              : 0.32
            : emotion === "curious"
              ? i
                ? 0.25
                : 0
              : 0),
  );
  pet.jaw.rotation.x = activity === "eat" ? Math.sin(time * 14) * 0.28 : 0;
  pet.tongue.visible =
    ["play", "pet", "excited"].includes(activity) && state.skin !== "croc";
  pet.paper.visible = activity === "carry";
  pet.paper.rotation.z = Math.sin(time * 4) * 0.045;
  pet.crumbs.visible = activity === "eat";
  pet.crumbs.children.forEach((crumb, i) => {
    crumb.position.y = -0.26 - ((time * 1.7 + i * 0.1) % 0.4);
    crumb.position.x = (i - 3) * 0.065 + Math.sin(time * 6 + i) * 0.02;
  });
  pet.love.visible = activity === "pet" || emotion === "love";
  pet.love.children.forEach((h, i) => {
    h.position.y = 1.9 + (i % 2) * 0.12 + Math.sin(time * 2 + i) * 0.1;
    h.rotation.y = Math.sin(time + i) * 0.2;
  });
  pet.toy.position.set(
    0.86 + (activity === "play" ? Math.sin(time * 3) * 0.17 : 0),
    0.2 -
      pet.root.position.y +
      (activity === "play" ? Math.abs(Math.sin(time * 3)) * 0.12 : 0),
    0.45,
  );
  pet.toy.rotation.z = activity === "play" ? Math.sin(time * 3) * 0.3 : 0;
  applyPoseV5(pet, state, time);
}

export function mountPet3D(container, initialState = {}, options = {}) {
  let companion = null;
  let state = { skin: "dog", activity: "idle", outfit: {}, ...initialState },
    disposed = false,
    pet,
    signature = "",
    frame,
    lastRender = 0,
    start = performance.now(),
    renderer,
    viewRotation = null,
    captureSize = null,
    elevation = 0.35,
    cameraZoom = 1,
    frameTime = null;
  const reduced =
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches || false;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1.8, 1.8, 1.7, -1.7, 0.1, 30);
  camera.position.set(3.6, 2.4, 5.5);
  camera.lookAt(0, 0.92, 0);
  scene.add(new THREE.HemisphereLight("#fff8e7", "#b8b8aa", 2.8));
  const key = new THREE.DirectionalLight("#fff3df", 3.4);
  key.position.set(-3, 5, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight("#d2e6ed", 2);
  rim.position.set(3, 2, -3);
  scene.add(rim);
  const shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const ctx = shadowCanvas.getContext("2d"),
    gradient = ctx.createRadialGradient(64, 64, 5, 64, 64, 62);
  gradient.addColorStop(0, "rgba(54,65,45,.22)");
  gradient.addColorStop(0.45, "rgba(54,65,45,.12)");
  gradient.addColorStop(1, "rgba(54,65,45,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas),
    shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 2.9),
      new THREE.MeshBasicMaterial({
        map: shadowTexture,
        transparent: true,
        depthWrite: false,
      }),
    );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.006;
  scene.add(shadow);
  function fallback(reason) {
    if (disposed) return;
    container.dataset.renderer = "fallback";
    container.dataset.skin = state.skin;
    container.dataset.activity = state.activity;
    container.innerHTML = `<div class="pet-3d-fallback">${renderPet(state.skin, state.activity, state.outfit)}<span class="renderer-note">3D недоступно · ${reason}</span></div>`;
  }
  try {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
      premultipliedAlpha: true,
    });
    renderer.setClearColor(0, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.domElement.className = "pet-3d";
    renderer.domElement.setAttribute("role", "img");
    renderer.domElement.setAttribute("aria-label", "Объёмный питомец Paw");
    renderer.domElement.style.cssText =
      "display:block;width:100%;height:100%;pointer-events:none;";
    container.replaceChildren(renderer.domElement);
    container.dataset.renderer = "webgl";
  } catch {
    fallback("WebGL не поддерживается");
    disposeTree(scene);
    return {
      update(next) {
        state = { ...state, ...next };
        fallback("WebGL не поддерживается");
      },
      setRotation() {},
      hitTest(x, y) {
        const b = container.getBoundingClientRect();
        if (y > b.top + b.height * 0.74) return "paw";
        return x > b.left + b.width * 0.75 ? "tail" : "body";
      },
      dispose() {
        disposed = true;
        container.replaceChildren();
      },
      inspect() {
        return {
          renderer: "fallback",
          skin: state.skin,
          activity: state.activity,
        };
      },
    };
  }
  function resize() {
    if (disposed) return;
    const width =
        captureSize?.width || Math.max(1, container.clientWidth || 240),
      height =
        captureSize?.height || Math.max(1, container.clientHeight || 230),
      aspect = width / height;
    const zoom = (state.companion ? 1.6 : 1.36) / cameraZoom;
    camera.left = -zoom * aspect;
    camera.right = zoom * aspect;
    camera.top = zoom;
    camera.bottom = -zoom;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();
  const contextLost = (event) => {
    event.preventDefault();
    cancelAnimationFrame(frame);
    fallback("контекст потерян");
  };
  renderer.domElement.addEventListener("webglcontextlost", contextLost);
  function rebuild() {
    const visualOutfit = { ...state.outfit };
    const key = `${state.skin}:${state.companion}:${!!state.studioQuality}:${JSON.stringify(visualOutfit)}`;
    if (key === signature) return;
    signature = key;
    if (companion) {
      scene.remove(companion.root);
      disposeTree(companion.root);
      companion = null;
    }
    if (pet) {
      scene.remove(pet.root);
      disposeTree(pet.root);
    }
    pet = sculpture(state.skin, visualOutfit, state.studioQuality);
    scene.add(pet.root);
    if (state.companion) {
      companion = sculpture(state.companion, {});
      scene.add(companion.root);
    }
    container.dataset.skin = state.skin;
    container.dataset.activity = state.activity;
    container.dataset.legs = state.skin === "owl" ? "2" : "4";
    container.dataset.outfit = Object.entries(state.outfit || {})
      .filter(([, id]) => id && id !== "none")
      .map(([category, id]) => `${category}:${id}`)
      .join(",");
    renderer.domElement.dataset.skin = state.skin;
    renderer.domElement.dataset.activity = state.activity;
  }
  function draw(now) {
    if (disposed) return;
    frame = requestAnimationFrame(draw);
    if (
      frameTime !== null ||
      document.hidden ||
      !container.isConnected ||
      now - lastRender < 1000 / (reduced ? 12 : 30)
    )
      return;
    lastRender = now;
    rebuild();
    const time = (now - start) / 1000;
    pose(pet, { ...state, viewRotation }, reduced ? 0 : time, reduced);
    if (companion) {
      // The pair alternates meeting, play, a chase, a brief disagreement and rest.
      const cycle = time % 65,
        rest = ["sleep", "home", "curl"].includes(state.activity),
        chasing = !rest && cycle >= 22 && cycle < 39,
        quarrel = !rest && cycle >= 43 && cycle < 47;
      const companionActivity = rest
        ? "sleep"
        : chasing
          ? "walk"
          : quarrel
            ? "angry"
            : cycle < 8
              ? "wave"
              : cycle < 22
                ? "play"
                : cycle > 55
                  ? "sleep"
                  : "idle";
      pose(
        companion,
        {
          ...state,
          skin: state.companion,
          activity: companionActivity,
          life: { ...state.life, houseLevel: 0 },
          viewRotation: chasing ? time * 2 : -0.3,
        },
        time + 0.7,
        reduced,
      );
      companion.root.scale.setScalar(0.62 * (state.life?.growth || 1));
      companion.root.position.x = chasing
        ? Math.sin(time * 2) * 0.7
        : -0.75 + Math.sin(time * 0.5) * 0.08;
      companion.root.position.z = chasing ? Math.cos(time * 2) * 0.35 : 0.35;
      pet.root.position.x = chasing ? Math.sin(time * 2 + 1.4) * 0.7 : 0.5;
      pet.root.position.z = chasing ? Math.cos(time * 2 + 1.4) * 0.35 : 0;
      pet.root.scale.multiplyScalar(0.82);
      if (chasing) {
        pose(
          pet,
          { ...state, activity: "walk", viewRotation: time * 2 + 1.4 },
          time,
          reduced,
        );
        pet.root.position.x = Math.sin(time * 2 + 1.4) * 0.7;
        pet.root.position.z = Math.cos(time * 2 + 1.4) * 0.35;
        pet.root.scale.multiplyScalar(0.82);
      } else if (quarrel) {
        pet.head.rotation.y = -0.45;
        pet.brows.forEach((b, i) => (b.rotation.z = i ? 0.4 : -0.4));
      }
    } else {
      pet.root.position.x = pet.root.position.z = 0;
    }
    renderer.render(scene, camera);
  }
  rebuild();
  pose(pet, state, 0, reduced);
  renderer.render(scene, camera);
  frame = requestAnimationFrame(draw);
  return {
    update(next) {
      if (disposed) return;
      state = {
        ...state,
        ...next,
        outfit: next.outfit ? { ...next.outfit } : state.outfit,
      };
      rebuild();
      pose(
        pet,
        { ...state, viewRotation },
        reduced ? 0 : (performance.now() - start) / 1000,
        reduced,
      );
      container.dataset.activity = state.activity;
      renderer.domElement.dataset.activity = state.activity;
    },
    setRotation(angle) {
      if (disposed) return;
      viewRotation = Number.isFinite(angle) ? angle : null;
      pose(
        pet,
        { ...state, viewRotation },
        reduced ? 0 : (performance.now() - start) / 1000,
        reduced,
      );
      renderer.render(scene, camera);
    },
    hitTest(clientX, clientY) {
      if (disposed) return "body";
      const bounds = container.getBoundingClientRect();
      const ray = new THREE.Raycaster();
      ray.setFromCamera(
        new THREE.Vector2(
          ((clientX - bounds.left) / bounds.width) * 2 - 1,
          (-(clientY - bounds.top) / bounds.height) * 2 + 1,
        ),
        camera,
      );
      pet.root.updateMatrixWorld(true);
      const hits = ray.intersectObject(pet.torso, true);
      for (const hit of hits) {
        for (let object = hit.object; object; object = object.parent)
          if (object.userData.hitRegion) return object.userData.hitRegion;
        return "body";
      }
      return "body";
    },
    setCamera({ angle, elevation: height, zoom } = {}) {
      if (Number.isFinite(angle)) viewRotation = angle;
      if (Number.isFinite(height))
        elevation = Math.max(0.05, Math.min(1.2, height));
      if (Number.isFinite(zoom))
        cameraZoom = Math.max(0.7, Math.min(1.5, zoom));
      camera.position.set(3.6, 1 + Math.sin(elevation) * 5, 5.5);
      camera.lookAt(0, 0.92, 0);
      resize();
    },
    renderFrame(time) {
      frameTime = Number.isFinite(time) ? time : null;
      if (frameTime === null) return;
      pose(pet, { ...state, viewRotation }, frameTime, false);
      renderer.render(scene, camera);
    },
    canvas: renderer.domElement,
    setCaptureSize(width, height) {
      if (width && height) {
        captureSize = { width, height };
        renderer.setPixelRatio(1);
      } else {
        captureSize = null;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      }
      resize();
      renderer.render(scene, camera);
    },
    async snapshot(width, height, background = "#eae6f0") {
      const old = scene.background;
      scene.background =
        background === "transparent" ? null : new THREE.Color(background);
      captureSize = { width, height };
      renderer.setPixelRatio(1);
      resize();
      renderer.render(scene, camera);
      const blob = await new Promise((resolve) =>
        renderer.domElement.toBlob(resolve, "image/png"),
      );
      scene.background = old;
      captureSize = null;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      resize();
      return blob;
    },
    setBackground(color) {
      scene.background =
        color === "transparent" ? null : new THREE.Color(color);
    },
    measure() {
      pet.root.updateMatrixWorld(true);
      const bounds = new THREE.Box3();
      if (companion) companion.root.updateMatrixWorld(true);
      for (const body of [pet.torso, companion?.torso].filter(Boolean))
        body.traverse((object) => {
          if (!object.isMesh) return;
          for (let p = object; p; p = p.parent) if (!p.visible) return;
          object.geometry.computeBoundingBox();
          bounds.union(
            object.geometry.boundingBox
              .clone()
              .applyMatrix4(object.matrixWorld),
          );
        });
      const r = container.getBoundingClientRect();
      let left = 1,
        top = 1,
        right = -1,
        bottom = -1;
      for (const x of [bounds.min.x, bounds.max.x])
        for (const y of [bounds.min.y, bounds.max.y])
          for (const z of [bounds.min.z, bounds.max.z]) {
            const p = new THREE.Vector3(x, y, z).project(camera);
            left = Math.min(left, p.x);
            right = Math.max(right, p.x);
            top = Math.min(top, p.y);
            bottom = Math.max(bottom, p.y);
          }
      const px = Math.max(0, ((left + 1) / 2) * r.width),
        py = Math.max(0, ((1 - bottom) / 2) * r.height);
      return {
        x: r.x + px,
        y: r.y + py,
        width: Math.min(r.width - px, ((right - left) / 2) * r.width),
        height: Math.min(r.height - py, ((bottom - top) / 2) * r.height),
      };
    },
    inspect() {
      return {
        renderer: "webgl",
        skin: state.skin,
        activity: state.activity,
        rotation: pet.root.rotation.y,
        companion: !!companion,
        props: Object.entries(pet.props.groups)
          .filter(([, g]) => g.visible)
          .map(([k]) => k),
        toyOnGround: pet.toy.parent === pet.root,
        toyVisible: pet.toy.visible,
        bodyRotation: pet.torso.rotation.z,
        bodyY: pet.root.position.y,
        earCount: pet.ears.length,
        wings: pet.legs.filter((l) => l.front).map((l) => l.pivot.rotation.z),
        legs: pet.legs.map((leg) => ({
          name: leg.pivot.name,
          angle: leg.pivot.rotation.x,
        })),
        triangles: renderer.info.render.triangles,
        geometries: renderer.info.memory.geometries,
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener("webglcontextlost", contextLost);
      disposeTree(scene);
      renderer.dispose();
      renderer.forceContextLoss();
      container.replaceChildren();
    },
  };
}
