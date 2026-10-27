import * as THREE from "./vendor/three.module.js";

// All textures are made locally. A library belongs to one sculpture so a wardrobe
// change can dispose every GPU texture without leaving a global texture cache.
function random(seed = 17) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
function canvas(size = 512) {
  const c = document.createElement("canvas"); c.width = c.height = size;
  return [c, c.getContext("2d")];
}
function texture(c, color = false) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  return t;
}
function microSurface(kind, size = 512) {
  const [c, ctx] = canvas(size), rng = random(42);
  ctx.scale(size / 512, size / 512);
  ctx.fillStyle = "#bababa"; ctx.fillRect(0, 0, 512, 512);
  if (kind === "scales") {
    for (let y = -24; y < 540; y += 28) for (let x = -24; x < 540; x += 32) {
      const xx = x + ((Math.round(y / 28) & 1) ? 16 : 0);
      const value = Math.round(130 + rng() * 55);
      ctx.fillStyle = `rgb(${value},${value},${value})`;
      ctx.strokeStyle = "#686868"; ctx.lineWidth = 2.3;
      ctx.beginPath(); ctx.ellipse(xx, y, 15, 13, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "#e0e0e0"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(xx - 1, y - 2, 11, 8, 0, Math.PI, Math.PI * 1.8); ctx.stroke();
    }
  } else {
    for (let i = 0; i < 10000; i++) {
      const x = rng() * 512, y = rng() * 512;
      ctx.strokeStyle = `rgba(${rng() > .5 ? "255,255,255" : "45,45,45"},${.08 + rng() * .2})`;
      ctx.lineWidth = .6 + rng() * .7;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 2, y + 4, x - 1 + rng() * 5, y + 8 + rng() * 12); ctx.stroke();
    }
    if (kind === "feathers") for (let y = -40; y < 560; y += 48) for (let x = -30; x < 550; x += 42) {
      const xx = x + (Math.round(y / 48) % 2) * 21;
      ctx.strokeStyle = "#727272"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(xx - 20, y); ctx.quadraticCurveTo(xx - 16, y + 24, xx, y + 42); ctx.quadraticCurveTo(xx + 17, y + 24, xx + 20, y); ctx.stroke();
      ctx.strokeStyle = "#dedede"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(xx, y); ctx.lineTo(xx, y + 38); ctx.stroke();
    }
  }
  return texture(c);
}
function clothTextures(base, accent, pattern, size = 512) {
  const [c, ctx] = canvas(size), [b, bc] = canvas(size);
  ctx.scale(size / 512, size / 512); bc.scale(size / 512, size / 512);
  const rng = random(351), n = 512;
  ctx.fillStyle = base; ctx.fillRect(0, 0, n, n);
  bc.fillStyle = "#808080"; bc.fillRect(0, 0, n, n);
  if (["bee", "sailor", "shirt", "striped"].includes(pattern)) {
    ctx.fillStyle = accent;
    for (let y = 0; y < n; y += 96) ctx.fillRect(0, y, n, pattern === "bee" ? 42 : 22);
  }
  if (["pajamas", "dream", "polka", "cozy"].includes(pattern)) {
    ctx.fillStyle = accent;
    for (let y = 36; y < n; y += 76) for (let x = 32; x < n; x += 80) {
      ctx.beginPath(); ctx.arc(x + (Math.round(y / 76) % 2) * 28, y, 6, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (pattern === "christmas") {
    ctx.strokeStyle = accent; ctx.lineWidth = 4;
    for (let y = 40; y < n; y += 100) for (let x = 40; x < n; x += 100) {
      for (let i = 0; i < 3; i++) {
        const a = i * Math.PI / 3, dx = Math.cos(a) * 15, dy = Math.sin(a) * 15;
        ctx.beginPath(); ctx.moveTo(x - dx, y - dy); ctx.lineTo(x + dx, y + dy); ctx.stroke();
      }
    }
  }
  if (pattern === "halloween") {
    ctx.fillStyle = accent;
    for (let y = 40; y < n; y += 110) for (let x = 40; x < n; x += 110) {
      ctx.beginPath(); ctx.moveTo(x, y + 4); ctx.lineTo(x - 18, y - 10); ctx.lineTo(x - 15, y + 7); ctx.lineTo(x - 5, y + 3); ctx.lineTo(x, y + 12); ctx.lineTo(x + 5, y + 3); ctx.lineTo(x + 15, y + 7); ctx.lineTo(x + 18, y - 10); ctx.closePath(); ctx.fill();
    }
  }
  const knit = ["sweater", "beanie", "winter", "christmas", "coral", "sage", "blue", "lavender", "mustard", "cozy"].includes(pattern);
  for (let y = -8; y < n + 8; y += knit ? 8 : 4) for (let x = -8; x < n + 8; x += knit ? 8 : 4) {
    const brightness = rng() > .5;
    ctx.strokeStyle = brightness ? "rgba(255,255,255,.12)" : "rgba(0,0,0,.1)";
    ctx.lineWidth = knit ? 1.6 : .65;
    bc.strokeStyle = brightness ? "#bdbdbd" : "#484848"; bc.lineWidth = knit ? 2 : 1;
    for (const target of [ctx, bc]) {
      target.beginPath(); target.moveTo(x, y); target.lineTo(x + 3, y + 5); target.lineTo(x + 6, y); target.stroke();
    }
  }
  return { map: texture(c, true), bumpMap: texture(b) };
}
export function createSurfaces(skin, palette, quality = {}) {
  const textureSize = quality.textureSize || 512, anisotropy = quality.anisotropy || 1;
  const Surface = quality.physicalMaterials === false ? THREE.MeshStandardMaterial : THREE.MeshPhysicalMaterial;
  const mammal = !["croc", "dinosaur", "owl"].includes(skin);
  const surface = microSurface(mammal ? "fur" : skin === "owl" ? "feathers" : "scales", textureSize);
  surface.anisotropy = anisotropy;
  // The height field also supplies bounded inter-fibre/scale cavity AO. Use the
  // existing primary UV set and the same GPU texture; no SSAO pass, UV2 copy or
  // alpha-desktop composition is needed. Ground contact is handled separately.
  surface.channel = 0;
  const mats = {};
  for (const [name, color] of Object.entries(palette)) {
    const coat = ["fur", "light", "dark"].includes(name);
    const physical = quality.physicalMaterials !== false;
    mats[name] = new Surface({ color, roughness: coat ? (mammal ? .83 : .64) : name === "nose" ? .31 : .48, metalness: 0,
      envMapIntensity: coat ? .36 : .8,
      ...(coat ? { bumpMap: surface, bumpScale: mammal ? .006 : .014, aoMap: surface, aoMapIntensity: quality.id === "low" ? .12 : .28 } : {}),
      ...(physical ? (coat ? { sheen: mammal ? .35 : .06, sheenRoughness: .82, sheenColor: new THREE.Color(color), clearcoat: mammal ? 0 : .12, clearcoatRoughness: .65 } : { clearcoat: name === "nose" ? .5 : .18, clearcoatRoughness: .25, ior: 1.42 }) : {}),
    });
    if (coat) mats[name].userData.coat = true;
  }
  const fabrics = new Map();
  function wardrobe(meta, category, isAccent = false) {
    const id = meta.base || meta.id;
    const fabric = ["clothing", "scarf"].includes(category) || category === "hat" && !["crown", "headphones", "astronaut", "flower", "pumpkin"].includes(id) || category === "accessory" && ["backpack", "pouch", "traveler", "cape", "bow"].includes(id);
    const color = (isAccent ? meta.accent : meta.color) || (isAccent ? "#f8ecd5" : "#adc5bc");
    if (!fabric) return new THREE.MeshPhysicalMaterial({color, roughness: category === "glasses" ? .28 : .43, metalness: ["crown", "bell", "halo"].includes(id) ? .65 : .06, clearcoat: .28});
    const key = [color, meta.accent, isAccent ? "trim" : id].join(":");
    if (!fabrics.has(key)) {
      const t = clothTextures(color, meta.accent || "#f8ecd5", isAccent ? "trim" : id, textureSize);
      t.map.anisotropy = t.bumpMap.anisotropy = anisotropy;
      const mat = new THREE.MeshPhysicalMaterial({color: "white", ...t, roughness: id === "raincoat" ? .39 : .9, aoMap: t.bumpMap, aoMapIntensity: .18, metalness: 0, sheen: .45, sheenColor: new THREE.Color(color), sheenRoughness: .8, bumpScale: id === "raincoat" ? .002 : .009});
      mat.userData.fabric = true;
      fabrics.set(key, mat);
    }
    return fabrics.get(key);
  }
  return {mats, wardrobe, mammal, eyes: new Map(), quality,eyeColor:palette.eye};
}

export function makeEyes(eye, skin, quality = {}, library = {}) {
  const colors = { cat: "#55a5d8", husky: "#78c7ec", owl: "#ddaa48", fox: "#bc8846", rabbit: "#9d7384", dog: "#946044", kangaroo: "#78503d", dinosaur: "#d5a14c", croc: "#b8a35a" };
  const irisSize = quality.irisSize || 512, cache = library.eyes || new Map();
  let irisTexture = cache.get(skin);
  if (!irisTexture) {
    const [c, ctx] = canvas(irisSize), rng = random(38);
    ctx.scale(irisSize / 256, irisSize / 256);
    const iris = ctx.createRadialGradient(128, 128, 20, 128, 128, 126);
    iris.addColorStop(0, "#101a24"); iris.addColorStop(.25, library.eyeColor || colors[skin] || colors.dog); iris.addColorStop(.7, library.eyeColor || colors[skin] || colors.dog); iris.addColorStop(.92, "#344754"); iris.addColorStop(1, "#152531");
    ctx.fillStyle = iris; ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 540; i++) {
      const a = rng() * Math.PI * 2, r = 35 + rng() * 38;
      ctx.strokeStyle = rng() > .5 ? "rgba(255,255,255,.22)" : "rgba(8,20,40,.34)";
      ctx.lineWidth = .5 + rng() * 1.1; ctx.beginPath(); ctx.moveTo(128 + Math.sin(a) * r, 128 + Math.cos(a) * r); ctx.lineTo(128 + Math.sin(a + .018) * 122, 128 + Math.cos(a + .018) * 122); ctx.stroke();
    }
    irisTexture = texture(c, true); irisTexture.anisotropy = quality.anisotropy || 1;
    cache.set(skin, irisTexture);
  }
  const segments = quality.id === "ultra" ? 56 : quality.id === "low" ? 24 : 40;
  const sclera = new THREE.Mesh(new THREE.SphereGeometry(1, segments, Math.round(segments * .7)), new THREE.MeshPhysicalMaterial({ color: "#fff8ed", roughness: .23, clearcoat: .8, clearcoatRoughness: .13, envMapIntensity: .75 }));
  sclera.scale.set(.119, skin === "cat" ? .108 : .132, .027); eye.add(sclera);
  const irisGeometry = new THREE.CircleGeometry(1, segments);
  const irisPoints = irisGeometry.attributes.position;
  for (let i = 0; i < irisPoints.count; i++) irisPoints.setZ(i, -.004 * (1 - irisPoints.getX(i) ** 2 - irisPoints.getY(i) ** 2));
  irisGeometry.computeVertexNormals();
  const iris = new THREE.Mesh(irisGeometry, new THREE.MeshPhysicalMaterial({ map: irisTexture, roughness: .28, clearcoat: .45, envMapIntensity: .6 }));
  iris.scale.set(.097, skin === "cat" ? .093 : .11, 1); iris.position.set(0, -.004, .031); eye.add(iris);
  const pupil = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshPhysicalMaterial({ color: "#06101a", roughness: .12, clearcoat: .9, envMapIntensity: .7 }));
  pupil.position.set(0, -.005, .036); pupil.scale.set(skin === "cat" ? .039 : .05, .073, .004); eye.add(pupil);
  const cornea = new THREE.Mesh(new THREE.SphereGeometry(1, segments, 24), new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: .035, clearcoat: 1, clearcoatRoughness: .025, ior: 1.38, transparent: true, opacity: .12, depthWrite: false, envMapIntensity: 1.5 }));
  cornea.scale.set(.101, skin === "cat" ? .096 : .117, .014); cornea.position.set(0, -.004, .032); eye.add(cornea);
  for (const [x, y, radius] of [[-.028, .044, .019], [.03, -.032, .006]]) {
    const glint = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false }));
    glint.position.set(x, y, .047); glint.scale.set(radius, radius * 1.35, .005); eye.add(glint);
  }
  // Thin orbital rims sit in the fur; they frame a shallow cornea, rather than
  // mounting a full eyeball on the outside of the face.
  for(const upper of [true,false]) {
    const lid=new THREE.Mesh(new THREE.TorusGeometry(1,.065,6,32,Math.PI),library.mats?.fur || sclera.material);
    lid.scale.set(.121,skin==='cat'?.111:.135,.075);lid.position.z=.015;
    if(!upper)lid.rotation.z=Math.PI;
    eye.add(lid);
  }
  eye.userData.corneaDepth=.046;
  eye.userData.iris = iris; eye.userData.pupil = pupil;
  eye.userData.noSurfaceDetail = true;
}

// Tapered curved ribbons, batched per animated parent. No alpha blending or
// per-hair draw calls. Their local geometry follows the head, ears, paws and tail.
export function addFur(torso, skin, outfit, detailed, quality = {}) {
  if (quality.maxFur === 0) return {strands: 0, batches: 0};
  if (["croc", "dinosaur", "owl"].includes(skin)) return {strands: 0, batches: 0};
  const clothed = outfit.clothing && outfit.clothing !== "none";
  const sources = [];
  torso.traverse(mesh => {
    if (!mesh.isMesh || !mesh.visible || !mesh.material?.userData.coat) return;
    for (let p = mesh; p; p = p.parent) if (p.userData.noSurfaceDetail) return;
    if (clothed && mesh.parent === torso) return;
    sources.push(mesh);
  });
  const rng = random(61), groups = new Map();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const na = new THREE.Vector3(), nb = new THREE.Vector3(), nc = new THREE.Vector3();
  const normalMatrix = new THREE.Matrix3(), base = new THREE.Vector3(), normal = new THREE.Vector3();
  const tangent = new THREE.Vector3(), bitangent = new THREE.Vector3(), groom = new THREE.Vector3();
  const color = new THREE.Color(), position = new THREE.Vector3();
  let strands = 0;
  const maxFur = quality.maxFur || (detailed ? 12000 : 6500);
  // Bound the whole sculpture's hair budget, proportionally to surface area.
  const estimateArea = mesh => {
    mesh.geometry.computeBoundingBox();
    const size = mesh.geometry.boundingBox.getSize(new THREE.Vector3()).multiply(mesh.scale).multiplyScalar(.5);
    const p = 1.6075;
    return 4 * Math.PI * Math.pow((Math.pow(size.x * size.y, p) + Math.pow(size.x * size.z, p) + Math.pow(size.y * size.z, p)) / 3, 1 / p);
  };
  const areaBudget = sources.reduce((sum, mesh) => sum + estimateArea(mesh), 0);
  const density = Math.min(quality.furDensity || (detailed ? 3000 : 1600), maxFur / Math.max(.01, areaBudget)) * .94;
  const length = {cat: .041, dog: .046, husky: .063, fox: .061, rabbit: .048, kangaroo: .026}[skin] || .04;
  furSources: for (const mesh of sources) {
    mesh.updateMatrix(); normalMatrix.getNormalMatrix(mesh.matrix);
    const pos = mesh.geometry.attributes.position, norms = mesh.geometry.attributes.normal, indices = mesh.geometry.index;
    const group = groups.get(mesh.parent) || {positions: [], normals: [], colors: []};
    groups.set(mesh.parent, group);
    const n = indices ? indices.count : pos.count;
    for (let i = 0; i < n; i += 3) {
      const ia = indices ? indices.getX(i) : i, ib = indices ? indices.getX(i+1) : i+1, ic = indices ? indices.getX(i+2) : i+2;
      a.fromBufferAttribute(pos,ia).applyMatrix4(mesh.matrix); b.fromBufferAttribute(pos,ib).applyMatrix4(mesh.matrix); c.fromBufferAttribute(pos,ic).applyMatrix4(mesh.matrix);
      const area = tangent.subVectors(b,a).cross(bitangent.subVectors(c,a)).length() * .5;
      if (!area) continue;
      const expected = Math.min(area * density, 120), count = Math.floor(expected) + (rng() < expected % 1 ? 1 : 0);
      na.fromBufferAttribute(norms,ia).applyMatrix3(normalMatrix).normalize(); nb.fromBufferAttribute(norms,ib).applyMatrix3(normalMatrix).normalize(); nc.fromBufferAttribute(norms,ic).applyMatrix3(normalMatrix).normalize();
      for (let j = 0; j < count; j++) {
        if (strands >= maxFur) break furSources;
        let u = rng(), v = rng(); if (u+v > 1) {u=1-u;v=1-v;}
        base.copy(a).multiplyScalar(1-u-v).addScaledVector(b,u).addScaledVector(c,v);
        normal.copy(na).multiplyScalar(1-u-v).addScaledVector(nb,u).addScaledVector(nc,v).normalize();
        // Fur lies along the surface instead of sticking straight out like spikes.
        groom.set(normal.x * .45, -.6, -.45); groom.addScaledVector(normal,-groom.dot(normal)).normalize();
        if (groom.lengthSq() < .1) groom.set(1,0,0).cross(normal).normalize();
        tangent.crossVectors(normal,groom).normalize();
        const len = length * (.6 + rng() * .8), width = (detailed ? .00075 : .0011) * (.65 + rng() * .7), shade = .94 + rng() * .16;
        const centers = [base.clone().addScaledVector(normal,-.002), base.clone().addScaledVector(normal,len*.43).addScaledVector(groom,len*.3), base.clone().addScaledVector(normal,len*.6).addScaledVector(groom,len*.83)];
        const widths = [width,width*.48,0];
        color.copy(mesh.material.color).multiplyScalar(shade);
        const push = (step, side) => {
          position.copy(centers[step]).addScaledVector(tangent,widths[step]*side);
          group.positions.push(position.x,position.y,position.z);
          group.normals.push(normal.x,normal.y,normal.z);
          const light = step === 0 ? .94 : step === 2 ? 1.08 : 1;
          group.colors.push(color.r*light,color.g*light,color.b*light);
        };
        push(0,-1);push(0,1);push(1,1);push(0,-1);push(1,1);push(1,-1);push(1,-1);push(1,1);push(2,0);
        strands++;
      }
    }
  }
  const mat = new THREE.MeshPhysicalMaterial({vertexColors:true, roughness:.95, side:THREE.DoubleSide,sheen:1,sheenColor:new THREE.Color("#ffe8ce"),sheenRoughness:.8});
  mat.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace("#include <normal_fragment_begin>",THREE.ShaderChunk.normal_fragment_begin.replace("float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;","float faceDirection = 1.0;"));
  };
  for (const [parent, g] of groups) {
    if (!g.positions.length) continue;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position",new THREE.Float32BufferAttribute(g.positions,3));geo.setAttribute("normal",new THREE.Float32BufferAttribute(g.normals,3));geo.setAttribute("color",new THREE.Float32BufferAttribute(g.colors,3));
    geo.computeBoundingSphere();
    const hair = new THREE.Mesh(geo,mat);hair.name="groomed-fur";hair.userData.strands=g.positions.length/27;
    hair.raycast=()=>{};parent.add(hair);
  }
  if (!strands) mat.dispose();
  return {strands, batches:groups.size};
}

export function studioEnvironment(renderer) {
  const [c,ctx] = canvas(512);
  const gradient = ctx.createLinearGradient(0,0,0,512);
  gradient.addColorStop(0,"#d2def0");gradient.addColorStop(.45,"#aeb4be");gradient.addColorStop(.55,"#666978");gradient.addColorStop(1,"#393b49");
  ctx.fillStyle=gradient;ctx.fillRect(0,0,512,512);
  ctx.fillStyle="#ffffff";ctx.fillRect(50,100,65,170);ctx.fillRect(340,80,34,155);
  const input = new THREE.CanvasTexture(c); input.mapping=THREE.EquirectangularReflectionMapping;input.colorSpace=THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer), target=pmrem.fromEquirectangular(input);
  input.dispose();pmrem.dispose();
  return target;
}
