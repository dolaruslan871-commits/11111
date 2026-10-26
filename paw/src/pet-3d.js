import * as THREE from './vendor/three.module.js';
import catalog from './catalog.json' with { type: 'json' };
import { renderPet } from './pet-art.js';

// Original procedural toy sculptures. No remote models, textures or CDN requests.
const TAU = Math.PI * 2;
const PALETTES = {
  dog: { fur: '#e3af70', light: '#fff0cf', dark: '#aa7046', nose: '#46342e', pink: '#e9a294' },
  cat: { fur: '#e9a56d', light: '#fff0db', dark: '#b96f42', nose: '#c57873', pink: '#efb3a5' },
  croc: { fur: '#88b995', light: '#dce9b2', dark: '#548b73', nose: '#496e59', pink: '#c7c692' },
};
const GAITS = new Set(['walk', 'hunt', 'carry']);
const EMOTIONS = { pet: 'love', play: 'happy', excited: 'excited', sad: 'sad', sleep: 'sleepy', hunt: 'curious', stand: 'curious', eat: 'happy', carry: 'proud', wave: 'happy' };
function material(color, extra = {}) { return new THREE.MeshStandardMaterial({ color, roughness: .67, metalness: 0, ...extra }); }
function sphere(parent, mat, pos, scale, segments = 24) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, segments, Math.max(12, Math.round(segments * .7))), mat);
  mesh.position.set(...pos); mesh.scale.set(...scale); mesh.castShadow = true; parent.add(mesh); return mesh;
}
function box(parent, mat, pos, scale, rotation = null) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...scale), mat); mesh.position.set(...pos);
  if (rotation) mesh.rotation.set(...rotation); parent.add(mesh); return mesh;
}
function tube(parent, mat, points, radius = .04) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 18, radius, 9, false), mat); parent.add(mesh); return mesh;
}
function cone(parent, mat, pos, radius, height, rotation = null, segments = 24) {
  const mesh = new THREE.Mesh(new THREE.ConeGeometry(radius, height, segments), mat); mesh.position.set(...pos);
  if (rotation) mesh.rotation.set(...rotation); parent.add(mesh); return mesh;
}
function ring(parent, mat, pos, radius, thickness = .025, rotation = null) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, thickness, 8, 28), mat); mesh.position.set(...pos);
  if (rotation) mesh.rotation.set(...rotation); parent.add(mesh); return mesh;
}
function heartShape() {
  const shape = new THREE.Shape(); shape.moveTo(0, -.3); shape.bezierCurveTo(-.5, -.04, -.65, .22, -.38, .36); shape.bezierCurveTo(-.16, .49, 0, .24, 0, .18); shape.bezierCurveTo(0, .24, .16, .49, .38, .36); shape.bezierCurveTo(.65, .22, .5, -.04, 0, -.3); return shape;
}
function heart(parent, mat, pos, size = .12) {
  const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(heartShape(), { depth: .08, bevelEnabled: true, bevelSize: .02, bevelThickness: .02, bevelSegments: 2, steps: 1 }), mat);
  mesh.position.set(...pos); mesh.scale.setScalar(size); parent.add(mesh); return mesh;
}
function item(category, id) {
  const list = catalog.wardrobe?.[category] || catalog[category] || [];
  return list.find(value => value.id === id) || { id, color: '#9db7cb', accent: '#fff1d7', shape: id };
}
function disposeTree(root) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  root.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    for (const mat of [object.material].flat().filter(Boolean)) { materials.add(mat); if (mat.map) textures.add(mat.map); }
  });
  geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
}

function sculpture(skin, outfit = {}) {
  const palette = PALETTES[skin] || PALETTES.dog;
  const mats = Object.fromEntries(Object.entries(palette).map(([key, color]) => [key, material(color)]));
  mats.black = material('#302d2b', { roughness: .25 }); mats.white = material('#fffef8'); mats.gold = material('#e1b859', { metalness: .3, roughness: .4 });
  const root = new THREE.Group(), torso = new THREE.Group(); root.add(torso);
  const isCroc = skin === 'croc';
  const body = sphere(torso, mats.fur, [0, .8, -.03], isCroc ? [.46, .37, .92] : [.43, .44, .76]);
  body.name = 'body';
  sphere(torso, mats.light, [0, .69, .19], isCroc ? [.37, .28, .71] : [.365, .32, .57]);
  const head = new THREE.Group(); head.position.set(0, isCroc ? 1.05 : 1.21, .68); torso.add(head);
  const faceY = isCroc ? .13 : .04, faceZ = isCroc ? .49 : .42;
  if (isCroc) {
    sphere(head, mats.fur, [0, 0, .12], [.46, .32, .5]);
    sphere(head, mats.fur, [0, -.09, .45], [.42, .21, .58]);
    sphere(head, mats.light, [0, -.23, .48], [.39, .075, .53]);
    for (const x of [-.25, .25]) { sphere(head, mats.fur, [x, .22, .17], [.19, .2, .23]); sphere(head, mats.nose, [x * .65, -.015, .94], [.035, .021, .026]); }
    for (const x of [-.27, .27]) for (const z of [.52, .76]) cone(head, mats.white, [x, -.17, z], .035, .07, [Math.PI, 0, 0], 10);
    for (let i = 0; i < 5; i++) cone(torso, mats.dark, [0, 1.13 - i * .025, .02 - i * .22], .11, .18, null, 4);
  } else {
    sphere(head, mats.fur, [0, .04, 0], [.49, .46, .45]);
    if (skin === 'dog') sphere(head, mats.light, [0, .13, .36], [.13, .31, .065]);
    for (const x of [-.12, .12]) sphere(head, mats.light, [x, -.15, .4], [.22, .15, .18]);
    sphere(head, mats.nose, [0, -.06, .565], skin === 'cat' ? [.065, .047, .05] : [.105, .073, .065]);
    if (skin === 'cat') {
      for (const x of [-.38, .38]) {
        cone(head, mats.fur, [x, .43, -.015], .19, .42, [0, 0, x < 0 ? .25 : -.25], 3);
        cone(head, mats.pink, [x, .43, .065], .115, .25, [0, 0, x < 0 ? .25 : -.25], 3);
      }
      for (const side of [-1, 1]) for (let i = 0; i < 3; i++) tube(head, mats.dark, [[side * .17, -.13 + i * .05, .52], [side * .38, -.16 + i * .08, .5], [side * .57, -.17 + i * .09, .47]], .009);
      for (const side of [-1, 1]) for (let i = 0; i < 3; i++) sphere(torso, mats.dark, [side * .407, .92, -.5 + i * .28], [.015, .13, .047]);
    }
  }
  const ears = [];
  if (skin === 'dog') for (const side of [-1, 1]) {
    const ear = new THREE.Group(); ear.position.set(side * .43, .19, -.015); head.add(ear);
    sphere(ear, mats.dark, [side * .035, -.23, .015], [.16, .33, .15]); sphere(ear, mats.fur, [side * .035, -.24, .12], [.09, .23, .026]); ears.push(ear);
  }
  const eyes = [], brows = [];
  for (const side of [-1, 1]) {
    const eye = new THREE.Group(); eye.position.set(side * (isCroc ? .25 : .19), faceY, faceZ); head.add(eye);
    sphere(eye, mats.light, [0, 0, -.005], [.094, .115, .035]);
    sphere(eye, mats.black, [0, -.004, .028], [.063, .084, .034]);
    sphere(eye, mats.white, [-.018, .027, .057], [.022, .026, .012], 12);
    sphere(eye, mats.white, [.018, -.025, .058], [.009, .01, .006], 10); eyes.push(eye);
    const brow = sphere(head, mats.dark, [side * .19, faceY + .15, faceZ -.017], [.075, .021, .023]); brows.push(brow);
    if (!isCroc) sphere(head, mats.pink, [side * .31, -.12, .35], [.073, .043, .022]);
  }
  const jaw = new THREE.Group(); jaw.position.set(0, isCroc ? -.17 : -.245, isCroc ? .65 : .41); head.add(jaw);
  sphere(jaw, mats.dark, [0, 0, 0], isCroc ? [.26, .013, .13] : [.075, .038, .035]);
  const tongue = sphere(jaw, mats.pink, [0, -.023, .026], isCroc ? [.09, .025, .12] : [.048, .075, .027]); tongue.visible = false;
  const legs = [];
  for (const front of [false, true]) for (const side of [-1, 1]) {
    const hip = new THREE.Group(); hip.name = `${front ? 'front' : 'hind'}-${side < 0 ? 'left' : 'right'}`;
    hip.position.set(side * .305, .64, front ? .48 : -.5); torso.add(hip);
    sphere(hip, mats.fur, [0, -.18, 0], [.14, .27, .15]);
    const foot = sphere(hip, isCroc ? mats.fur : mats.light, [0, -.48, .065], [.155, .12, .205]);
    // Paw-pad undersides become visible when the pet presses the screen.
    sphere(foot, mats.pink, [0, -.91, .08], [.4, .09, .29], 12);
    for (const x of [-.55, 0, .55]) sphere(foot, mats.pink, [x, -.86, .57], [.19, .08, .16], 10);
    for (const x of [-.055, .055]) sphere(hip, mats.dark, [x, -.44, .25], [.007, .015, .016], 10);
    legs.push({ pivot: hip, front, side, base: hip.position.clone() });
  }
  const tail = new THREE.Group(); tail.position.set(0, .83, -.71); torso.add(tail);
  if (isCroc) {
    const tailShape = cone(tail, mats.fur, [.06, -.02, -.53], .26, 1.3, [-Math.PI / 2, 0, -.1]);
    for (let i = 0; i < 4; i++) cone(tail, mats.dark, [.02, .2 - i * .05, -.18 - i * .2], .075 - i * .009, .12 - i * .012, null, 4);
  } else {
    tube(tail, mats.fur, [[0, 0, 0], [.11, .1, -.3], [.2, .43, -.55], [.07, .63, -.6]], skin === 'cat' ? .075 : .105);
    sphere(tail, mats.light, [.07, .63, -.6], skin === 'cat' ? [.08, .08, .08] : [.113, .12, .113]);
  }
  // A tiny collar makes even the undressed friend feel cared for.
  ring(torso, material('#729783'), [0, .96, .58], .35, .044, [Math.PI / 2.8, 0, 0]);
  sphere(torso, mats.gold, [0, .68, .74], [.065, .08, .032]);
  const outfitRoot = new THREE.Group(); torso.add(outfitRoot);
  dress({ root: outfitRoot, head, mats, skin, outfit });
  const paper = new THREE.Group(); paper.position.set(0, -.13, isCroc ? 1.03 : .65); head.add(paper);
  box(paper, material('#fcf7e7'), [0, 0, 0], [.32, .35, .024], [.1, 0, -.13]);
  for (let i = 0; i < 3; i++) box(paper, material('#b9c6b4'), [0, .07 - i * .065, .017], [.19, .012, .008]);
  paper.visible = false;
  const love = new THREE.Group(); love.visible = false; root.add(love);
  for (let i = 0; i < 3; i++) heart(love, material(['#dc8b91','#edb5aa','#c97582'][i]), [(i - 1) * .3, 1.95 + (i % 2) * .15, .74], .17);
  const crumbs = new THREE.Group(); crumbs.visible = false; head.add(crumbs);
  for (let i = 0; i < 7; i++) sphere(crumbs, material(i % 2 ? '#faf3d8' : '#d8ae73'), [(i - 3) * .055, -.3 - (i % 3) * .04, .65], [.018, .022, .015], 8);
  return { root, torso, body, head, eyes, brows, ears, legs, tail, jaw, tongue, love, paper, crumbs };
}

function dress({ root, head, mats, skin, outfit }) {
  const isCroc = skin === 'croc';
  for (const [category, id] of Object.entries(outfit)) {
    if (!id || id === 'none') continue;
    const meta = item(category, id), color = material(meta.color || '#adc5bc'), accent = material(meta.accent || '#f8ecd5');
    const group = new THREE.Group(); group.name = `outfit-${category}-${id}`;
    if (['hat', 'glasses'].includes(category)) head.add(group); else root.add(group);
    if (category === 'hat') {
      group.position.set(0, isCroc ? .39 : .46, -.015);
      if (id === 'party' || id === 'wizard') {
        cone(group, color, [0, .22, 0], .29, id === 'wizard' ? .7 : .58);
        ring(group, accent, [0, -.005, 0], .28, .04, [Math.PI / 2, 0, 0]); sphere(group, accent, [0, .53, 0], [.07, .07, .07]);
        for (let i = 0; i < 5; i++) sphere(group, accent, [Math.sin(i * 2) * .12, .1 + i * .065, .15 - i * .02], [.025, .025, .015], 10);
      } else if (id === 'crown') {
        ring(group, color, [0, .02, 0], .26, .075, [Math.PI / 2, 0, 0]);
        for (let i = 0; i < 7; i++) { const angle = i / 7 * TAU; cone(group, color, [Math.sin(angle) * .26, .16, Math.cos(angle) * .26], .085, .25, null, 4); sphere(group, accent, [Math.sin(angle) * .26, .3, Math.cos(angle) * .26], [.035, .035, .035]); }
      } else if (id === 'headphones') {
        tube(group, color, [[-.42, -.13, 0], [-.4, .3, 0], [0, .42, 0], [.4, .3, 0], [.42, -.13, 0]], .045);
        for (const side of [-1,1]) sphere(group, accent, [side * .45, -.14, 0], [.11, .18, .15]);
      } else if (id === 'flower') {
        for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; flower(group, color, accent, [Math.sin(a) * .34, 0, Math.cos(a) * .29], .09); }
      } else if (id === 'astronaut') {
        sphere(group, color, [0, -.06, 0], [.58, .54, .52]);
        sphere(group, material('#c6e7ec', { transparent:true, opacity:.25, roughness:.12, depthWrite:false }), [0, -.08, .25], [.52, .45, .4]);
        ring(group, accent, [0, -.08, .36], .46, .045);
      } else {
        const scale = id === 'beret' ? [.41,.13,.35] : id === 'bucket' ? [.34,.2,.32] : [.34,.22,.32];
        sphere(group, color, [id === 'beret' ? .045 : 0, .08, 0], scale);
        ring(group, accent, [0, -.03, 0], .31, .045, [Math.PI / 2,0,0]);
        if (id === 'beanie') { sphere(group, accent, [0,.32,0],[.09,.09,.09]); for (let i=0;i<9;i++) box(group, accent, [(i-4)*.055,0,.29],[.012,.1,.01]); }
        if (id === 'cap' || id === 'bucket') sphere(group, color, [0,-.035,.25], [.37,.035,id==='cap'?.33:.23]);
        if (id === 'santa') { cone(group,color,[.04,.28,0],.29,.53,[0,0,-.2]); sphere(group,accent,[.11,.58,0],[.085,.085,.085]); }
        if (id === 'beret') box(group,accent,[.02,.24,0],[.03,.08,.03]);
      }
    } else if (category === 'glasses') {
      group.position.set(0, isCroc ? .14 : .04, isCroc ? .535 : .48);
      for (const side of [-1,1]) {
        if (id === 'monocle' && side < 0) continue;
        if (id === 'heart') { const h = heart(group,color,[side*.19,-.01,.005],.23); h.scale.z=.08; }
        else if (id === 'pixel') { box(group,color,[side*.19,0,0],[.27,.18,.035]); box(group,accent,[side*.19,.01,.021],[.18,.09,.01]); }
        else {
          ring(group,color,[side*.19,0,0],id==='ski'?.145:.125,.023);
          if (['sun','ski','aviator'].includes(id)) sphere(group,material(id==='sun'?'#353e4a':meta.accent || '#d7c9a1',{transparent:true,opacity:.78,roughness:.2}),[side*.19,0,-.006],[.115,.115,.018]);
          if (id === 'star') for(let i=0;i<5;i++){const a=i/5*TAU;cone(group,accent,[side*.19+Math.sin(a)*.13,Math.cos(a)*.13,.005],.035,.08,[0,0,-a],3);}
          if (id === 'rainbow') ring(group,accent,[side*.19,0,.01],.09,.012);
        }
      }
      box(group,color,[0,0,0],[.13,.025,.025]);
      for(const side of [-1,1]) tube(group,color,[[side*.31,0,0],[side*.43,.01,-.13],[side*.43,.015,-.25]],.014);
    } else if (category === 'scarf') {
      group.position.set(0,.99,.54);
      ring(group,color,[0,0,0],.35,.085,[Math.PI/2.5,0,0]);
      if (id === 'bowtie') { for(const side of [-1,1]) sphere(group,color,[side*.115,-.11,.25],[.13,.065,.04]); sphere(group,accent,[0,-.11,.29],[.035,.04,.025]); }
      else { const tail=box(group,color,[.15,-.3,.28],[.14,.34,.055],[0,0,-.15]); if(id==='bandana')cone(group,color,[0,-.23,.29],.2,.3,[0,0,Math.PI],3); for(let i=0;i<3;i++)box(group,accent,[.15,-.21-i*.075,.314],[.135,.017,.01]); }
    } else if (category === 'toy') {
      const mouth = new THREE.Group(); head.add(mouth); group.removeFromParent(); mouth.add(group);
      mouth.position.set(0,-.19,isCroc?1.0:.66);
      if (id === 'bone' || id === 'stick' || id === 'rope') {
        tube(group,color,[[-.3,0,0],[0,.012,0],[.3,0,0]],id==='rope'?.04:.055);
        for(const side of [-1,1]) if(id==='bone')for(const y of [-.045,.045])sphere(group,accent,[side*.3,y,0],[.07,.07,.07]);
        if(id==='rope')for(let i=0;i<9;i++)ring(group,accent,[(i-4)*.055,0,0],.05,.009,[0,Math.PI/2,0]);
      } else if (id === 'ball') {sphere(group,color,[0,-.05,0],[.17,.17,.17]); ring(group,accent,[0,-.05,0],.17,.012,[.5,.3,0]);}
      else if (id==='duck'){sphere(group,color,[0,-.05,0],[.18,.12,.12]);sphere(group,color,[.1,.07,0],[.1,.11,.1]);sphere(group,accent,[.2,.06,.02],[.09,.035,.07]);sphere(group,mats.black,[.13,.09,.085],[.013,.013,.008]);}
      else if(id==='carrot'){cone(group,color,[0,-.04,0],.12,.4,[0,0,-Math.PI/2]);for(let i=0;i<3;i++)sphere(group,accent,[-.23,.04+i*.03,0],[.1,.025,.025]);}
      else if(id==='fish'){sphere(group,color,[0,0,0],[.21,.09,.06]);cone(group,accent,[-.23,0,0],.12,.17,[0,0,-Math.PI/2],3);sphere(group,mats.black,[.13,.025,.055],[.018,.018,.008]);}
      else if(id==='frisbee'){ring(group,color,[0,0,0],.21,.04,[Math.PI/2,0,0]);sphere(group,accent,[0,0,0],[.18,.025,.18]);}
      else if(id==='donut'){ring(group,color,[0,0,0],.13,.065);for(let i=0;i<8;i++){const a=i/8*TAU;box(group,accent,[Math.sin(a)*.13,Math.cos(a)*.13,.06],[.015,.045,.015],[0,0,a]);}}
      else {for(let i=0;i<5;i++){const a=i/5*TAU;cone(group,color,[Math.sin(a)*.1,Math.cos(a)*.1,0],.09,.22,[0,0,-a],3);}sphere(group,accent,[0,0,.04],[.05,.05,.025]);}
    } else if (category === 'clothing') {
      const coat=sphere(group,color,[0,.81,-.03],isCroc?[.474,.383,.86]:[.448,.453,.69]);
      sphere(group,accent,[0,.7,.41],[.29,.24,.16]);
      if(['bee','sailor','pajamas','shirt'].includes(id))for(let i=0;i<4;i++)ring(group,accent,[0,.82,-.52+i*.25],.38,.025,[0,0,0]);
      if(id==='bee'){for(const side of [-1,1])sphere(group,material('#e3edf0',{transparent:true,opacity:.65}),[side*.3,1.14,-.3],[.2,.09,.38]);}
      if(id==='hoodie')sphere(group,color,[0,1.04,.5],[.42,.29,.25]);
      if(id==='raincoat')for(let i=0;i<3;i++)sphere(group,accent,[.06,.9-i*.1,.69],[.02,.02,.015]);
      if(id==='dress'){cone(group,color,[0,.51,-.24],.55,.4,[Math.PI,0,0]);}
      if(id==='spacesuit'){ring(group,accent,[0,.9,.43],.35,.045,[Math.PI/2.5,0,0]);box(group,accent,[0,.95,-.72],[.3,.3,.13]);}
      if(id==='vest')for(const side of [-1,1])box(group,accent,[side*.3,.9,.35],[.08,.23,.035],[0,0,side*.3]);
    } else if (category === 'accessory') {
      if(id==='wings'){for(const side of [-1,1])for(let i=0;i<3;i++)sphere(group,i%2?accent:color,[side*(.5+i*.08),1.0+i*.065,-.22+i*.06],[.24,.09,.13]);}
      else if(id==='cape'){sphere(group,color,[0,.93,-.62],[.53,.16,.55]);sphere(group,accent,[0,.82,-.95],[.42,.025,.12]);}
      else if(id==='halo')ring(head,color,[0,isCroc?.58:.72,0],.32,.026,[Math.PI/2,0,0]);
      else if(id==='bell'){sphere(group,color,[0,.72,.79],[.09,.11,.08]);box(group,mats.black,[0,.69,.865],[.07,.012,.01]);}
      else if(id==='flower')flower(head,color,accent,[.41,.26,.2],.13);
      else if(id==='bow'){for(const side of [-1,1])sphere(head,color,[.3+side*.08,.35,.13],[.1,.07,.045]);sphere(head,accent,[.3,.35,.17],[.03,.04,.025]);}
      else if(id==='badge'){heart(group,color,[0,.85,.71],.15);}
      else if(id==='camera'){box(group,color,[0,.65,.83],[.25,.19,.12]);ring(group,accent,[0,.66,.907],.065,.022);sphere(group,mats.black,[0,.66,.914],[.05,.05,.012]);}
      else {sphere(group,color,[0,1.03,-.34],id==='pouch'?[.2,.15,.2]:[.29,.3,.2]);box(group,accent,[0,.99,-.55],[.22,.11,.04]);tube(group,color,[[-.21,1.12,-.4],[-.35,1.1,-.1],[-.31,.7,.08]],.025);tube(group,color,[[.21,1.12,-.4],[.35,1.1,-.1],[.31,.7,.08]],.025);}
    }
  }
}
function flower(parent, color, accent, position, size) {
  const group=new THREE.Group();group.position.set(...position);parent.add(group);
  for(let i=0;i<5;i++){const a=i/5*TAU;sphere(group,color,[Math.sin(a)*size*.6,Math.cos(a)*size*.6,0],[size*.48,size*.48,size*.23],12);}
  sphere(group,accent,[0,0,size*.15],[size*.34,size*.34,size*.25],12);return group;
}

function pose(pet, state, time, reduced) {
  const activity=state.activity || 'idle', walking=GAITS.has(activity), emotion=state.emotion || EMOTIONS[activity] || 'content';
  const speed=activity==='hunt'?9:6, phase=time*speed, breathing=Math.sin(time*2.2)*.012;
  const stand=activity==='stand'||activity==='wave', sleeping=activity==='sleep';
  pet.root.rotation.y = walking ? (state.direction < 0 ? -.95 : .95) : -.12;
  pet.root.position.y=sleeping?-.25:stand?.09:activity==='excited'?Math.abs(Math.sin(time*5))*.18:0;
  pet.torso.rotation.x=stand?-.58:sleeping?.08:activity==='stretch'?.14:0;
  pet.torso.scale.y=1+breathing;
  pet.body.position.y=.8+(walking?Math.cos(phase*2)*.025:0);
  pet.head.rotation.x=sleeping?.27:activity==='eat'?.17+Math.sin(time*12)*.08:walking?Math.sin(phase)*.035:Math.sin(time*.8)*.025;
  pet.head.rotation.z=emotion==='curious'?.15:emotion==='sad'?-.08:activity==='pet'?Math.sin(time*3)*.09:Math.sin(time*.7)*.025;
  pet.head.position.y=(state.skin==='croc'?1.05:1.21)+(sleeping?-.12:0)+(walking?Math.cos(phase*2)*.014:0);
  pet.tail.rotation.z=sleeping?-.15:Math.sin(time*(emotion==='happy'||emotion==='excited'||emotion==='love'?12:3.5))*(sleeping?.015:.25);
  pet.tail.rotation.x=sleeping?.4:emotion==='sad'?.5:0;
  pet.tail.rotation.y=Math.sin(time*3)*.08;
  pet.ears.forEach((ear,i)=>{ear.rotation.z=(i?1:-1)*(emotion==='sad'?.2:0)+Math.sin(time*2+i)*.04;});
  for(const leg of pet.legs){
    const offset=(leg.front?0:Math.PI)+(leg.side<0?Math.PI:0), stride=Math.sin(phase+offset);
    leg.pivot.position.copy(leg.base);
    leg.pivot.rotation.set(0,0,0);
    if(walking&&!reduced){leg.pivot.rotation.x=stride*.48;leg.pivot.position.y+=Math.max(0,Math.cos(phase+offset))*.075;}
    if(stand){leg.pivot.rotation.x=leg.front?-1.9:.58;leg.pivot.rotation.z=leg.front?-leg.side*.12:0;if(activity==='wave'&&leg.front&&leg.side>0)leg.pivot.rotation.z=.25+Math.sin(time*7)*.35;}
    if(sleeping){leg.pivot.rotation.x=leg.front?-.6:.55;leg.pivot.position.y-=.1;}
    if(activity==='stretch'&&leg.front){leg.pivot.rotation.x=-.5;leg.pivot.position.y-=.06;}
  }
  const blink=(Math.sin(time*1.1)>.993 || Math.sin(time*.76+2)>.997), eyeHeight=sleeping?.075:blink?.08:emotion==='happy'||emotion==='love'?.72:emotion==='sad'?.75:1;
  pet.eyes.forEach(eye=>eye.scale.y=eyeHeight);
  pet.brows.forEach((brow,i)=>brow.rotation.z=emotion==='sad'?(i?-.32:.32):emotion==='curious'?(i?.25:0):0);
  pet.jaw.rotation.x=activity==='eat'?Math.sin(time*14)*.28:0;
  pet.tongue.visible=['play','pet','excited'].includes(activity)&&state.skin!=='croc';
  pet.paper.visible=activity==='carry';
  pet.paper.rotation.z=Math.sin(time*4)*.045;
  pet.crumbs.visible=activity==='eat';
  pet.crumbs.children.forEach((crumb,i)=>{crumb.position.y=-.26-((time*1.7+i*.1)% .4);crumb.position.x=(i-3)*.065+Math.sin(time*6+i)*.02;});
  pet.love.visible=activity==='pet'||emotion==='love';pet.love.children.forEach((h,i)=>{h.position.y=1.9+(i%2)*.12+Math.sin(time*2+i)*.1;h.rotation.y=Math.sin(time+i)*.2;});
}

export function mountPet3D(container, initialState = {}, options = {}) {
  let state={ skin:'dog',activity:'idle',outfit:{},...initialState }, disposed=false, pet, signature='', frame, lastRender=0, start=performance.now(), renderer;
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches || false;
  const scene=new THREE.Scene();
  const camera=new THREE.OrthographicCamera(-1.8,1.8,1.7,-1.7,.1,30);camera.position.set(3.6,2.4,5.5);camera.lookAt(0,.92,0);
  scene.add(new THREE.HemisphereLight('#fff8e7','#b8b8aa',2.8));
  const key=new THREE.DirectionalLight('#fff3df',3.4);key.position.set(-3,5,4);scene.add(key);
  const rim=new THREE.DirectionalLight('#d2e6ed',2);rim.position.set(3,2,-3);scene.add(rim);
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=128;shadowCanvas.height=128;
  const ctx=shadowCanvas.getContext('2d'), gradient=ctx.createRadialGradient(64,64,5,64,64,62);gradient.addColorStop(0,'rgba(54,65,45,.22)');gradient.addColorStop(.45,'rgba(54,65,45,.12)');gradient.addColorStop(1,'rgba(54,65,45,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
  const shadowTexture=new THREE.CanvasTexture(shadowCanvas),shadow=new THREE.Mesh(new THREE.PlaneGeometry(2.6,2.9),new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.006;scene.add(shadow);
  function fallback(reason){
    if(disposed)return;
    container.dataset.renderer='fallback';container.dataset.skin=state.skin;container.dataset.activity=state.activity;
    container.innerHTML=`<div class="pet-3d-fallback">${renderPet(state.skin,state.activity,state.outfit)}<span class="renderer-note">3D недоступно · ${reason}</span></div>`;
  }
  try {
    renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power',premultipliedAlpha:true});
    renderer.setClearColor(0,0);renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
    renderer.domElement.className='pet-3d';renderer.domElement.setAttribute('role','img');renderer.domElement.setAttribute('aria-label','Объёмный питомец Paw');renderer.domElement.style.cssText='display:block;width:100%;height:100%;pointer-events:none;';
    container.replaceChildren(renderer.domElement);container.dataset.renderer='webgl';
  } catch {
    fallback('WebGL не поддерживается');disposeTree(scene);
    return{update(next){state={...state,...next};fallback('WebGL не поддерживается');},dispose(){disposed=true;container.replaceChildren();},inspect(){return{renderer:'fallback',skin:state.skin,activity:state.activity};}};
  }
  function resize(){if(disposed)return;const width=Math.max(1,container.clientWidth||240),height=Math.max(1,container.clientHeight||230),aspect=width/height;camera.left=-1.67*aspect;camera.right=1.67*aspect;camera.top=1.67;camera.bottom=-1.67;camera.updateProjectionMatrix();renderer.setSize(width,height,false);}
  const observer=new ResizeObserver(resize);observer.observe(container);resize();
  const contextLost=event=>{event.preventDefault();cancelAnimationFrame(frame);fallback('контекст потерян');};renderer.domElement.addEventListener('webglcontextlost',contextLost);
  function rebuild(){
    const key=`${state.skin}:${JSON.stringify(state.outfit||{})}`;if(key===signature)return;signature=key;
    if(pet){scene.remove(pet.root);disposeTree(pet.root);}pet=sculpture(state.skin,state.outfit);scene.add(pet.root);
    container.dataset.skin=state.skin;container.dataset.activity=state.activity;container.dataset.legs='4';
    container.dataset.outfit=Object.entries(state.outfit||{}).filter(([,id])=>id&&id!=='none').map(([category,id])=>`${category}:${id}`).join(',');
    renderer.domElement.dataset.skin=state.skin;renderer.domElement.dataset.activity=state.activity;
  }
  function draw(now){
    if(disposed)return;
    frame=requestAnimationFrame(draw);
    if(document.hidden||now-lastRender<1000/(reduced?12:30))return;
    lastRender=now;rebuild();const time=(now-start)/1000;pose(pet,state,reduced?0:time,reduced);renderer.render(scene,camera);
  }
  rebuild();pose(pet,state,0,reduced);renderer.render(scene,camera);frame=requestAnimationFrame(draw);
  return{
    update(next){if(disposed)return;state={...state,...next,outfit:next.outfit?{...next.outfit}:state.outfit};rebuild();container.dataset.activity=state.activity;renderer.domElement.dataset.activity=state.activity;},
    inspect(){return{renderer:'webgl',skin:state.skin,activity:state.activity,legs:pet.legs.map(leg=>({name:leg.pivot.name,angle:leg.pivot.rotation.x})),triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries};},
    dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(frame);observer.disconnect();renderer.domElement.removeEventListener('webglcontextlost',contextLost);disposeTree(scene);renderer.dispose();renderer.forceContextLoss();container.replaceChildren();},
  };
}
