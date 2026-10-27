import * as T from "./vendor/three.module.js";
import {homeStatus} from "./home-model-browser.js";

export function disposeHome(root) {
  const geometries=new Set(),materials=new Set(),textures=new Set();
  root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of [o.material].flat().filter(Boolean)){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});
  geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());
}

function surface(color, kind = "wood") {
  const c=document.createElement("canvas");c.width=c.height=256;
  const ctx=c.getContext("2d");ctx.fillStyle="#929292";ctx.fillRect(0,0,256,256);
  for(let i=0;i<220;i++) {
    const x=(i*73)%256,y=(i*37)%256;
    ctx.strokeStyle=i%2?"#b6b6b6":"#6f6f6f";ctx.lineWidth=kind==="cloth"?.7:1.3;
    ctx.beginPath();ctx.moveTo(x,y);
    if(kind==="wood")ctx.bezierCurveTo(x+18,y+1,x-22,y+35,x+3,y+70);
    else if(kind==="cloth"){ctx.lineTo(x+3,y+4);ctx.lineTo(x+6,y);}
    else ctx.lineTo(x+8,y+5);
    ctx.stroke();
  }
  const bump=new T.CanvasTexture(c);bump.wrapS=bump.wrapT=T.RepeatWrapping;
  return new T.MeshPhysicalMaterial({color,roughness:kind==="cloth"?.95:.72,bumpMap:bump,bumpScale:kind==="wood"?.012:.007,sheen:kind==="cloth"?.4:0,sheenColor:new T.Color(color)});
}
function mesh(g,geo,mat,pos=[0,0,0],scale) {
  const m=new T.Mesh(geo,mat);m.position.set(...pos);if(scale)m.scale.set(...scale);m.castShadow=m.receiveShadow=true;g.add(m);return m;
}
const sphere=(g,mat,p,s)=>mesh(g,new T.SphereGeometry(1,28,20),mat,p,s);
const box=(g,mat,p,s)=>mesh(g,new T.BoxGeometry(...s),mat,p);
function line(g,mat,pts,r=.015){return mesh(g,new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(p=>new T.Vector3(...p))),32,r,7),mat);}
function ring(g,mat,p,r,w=.025){return mesh(g,new T.TorusGeometry(r,w,10,48),mat,p);}
function roundedRect(w,h,r) {
  const s=new T.Shape(),x=-w/2,y=-h/2;
  s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;
}
function cushion(g,mat,p,w,d,h=.1){const m=mesh(g,new T.ExtrudeGeometry(roundedRect(w,d,.13),{depth:h,steps:1,bevelEnabled:true,bevelSize:.035,bevelThickness:.035,bevelSegments:4}),mat,p);m.rotation.x=-Math.PI/2;return m;}
function arch(w,h) {
  const p=new T.Path();p.moveTo(-w/2,0);p.lineTo(-w/2,h-w/2);p.absarc(0,h-w/2,w/2,Math.PI,0,true);p.lineTo(w/2,0);p.closePath();return p;
}
function archWall(g,mat,w,h,depth,opening=.52) {
  const s=new T.Shape();s.moveTo(-w/2,0);s.lineTo(w/2,0);s.lineTo(w/2,h*.65);s.quadraticCurveTo(w/2,h,0,h);s.quadraticCurveTo(-w/2,h,-w/2,h*.65);s.closePath();s.holes.push(arch(opening,h*.68));
  return mesh(g,new T.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:3,steps:1,curveSegments:24}),mat,[0,.1,.28]);
}
function leaf(g,mat,p,scale=.1,turn=0) {const m=sphere(g,mat,p,[scale*.38,scale,scale*.14]);m.rotation.z=turn;return m;}
function plant(g,stem,green,p,flowerMat=null) {
  const group=new T.Group();group.position.set(...p);g.add(group);
  line(group,stem,[[0,0,0],[.015,.13,0],[0,.28,0]],.009);
  for(const side of [-1,1])for(let i=0;i<3;i++)leaf(group,green,[side*(.04+i*.008),.08+i*.055,0],.07,-side*.9);
  if(flowerMat)for(let i=0;i<6;i++){const a=i*Math.PI/3;sphere(group,flowerMat,[Math.sin(a)*.035,.29+Math.cos(a)*.035,0],[.025,.03,.017]);}
}
function plaque(g,wood,trim,p,shape="paw") {
  sphere(g,wood,p,[.15,.09,.025]);
  if(shape==="paw") {
    sphere(g,trim,[p[0],p[1]-.015,p[2]+.026],[.033,.025,.007]);
    for(let i=0;i<3;i++)sphere(g,trim,[p[0]+(i-1)*.035,p[1]+.025+((i===1)?.012:0),p[2]+.027],[.012,.016,.007]);
  }
}
export function makeHome(skin="dog", life={}, appearance={}) {
  const status=homeStatus(life),root=new T.Group(),layers=[];
  root.name=`home-${skin}`;root.userData={skin,...status};
  const base=new T.Color(appearance.houseColor||'#bd885a');
  const timber=surface(base),lightWood=surface(base.clone().lerp(new T.Color('#fff4dc'),.42)),darkWood=surface(base.clone().multiplyScalar(.48)),stone=surface(base.clone().lerp(new T.Color('#8b9ba6'),.55),'stone'),sand=surface('#cfbda0','stone');
  const cloth=surface(appearance.houseAccent || (skin==="husky"?"#7b9fb7":skin==="cat"?"#c598ae":"#e4c5a5"),"cloth"),cream=surface("#f3e3c9","cloth");
  const green=new T.MeshStandardMaterial({color:"#658c63",roughness:.93}),leafGreen=new T.MeshStandardMaterial({color:"#8cad72",roughness:.9});
  const gold=new T.MeshPhysicalMaterial({color:"#d3ae6d",metalness:.55,roughness:.3});
  const flowerMat=new T.MeshStandardMaterial({color:"#d9a7b6"});
  const layer=(level,upgrade=0)=>{const g=new T.Group();g.name=`home-stage-${level}-upgrade-${upgrade}`;g.visible=status.visualStage>=level&&status.upgrades>=upgrade;layers.push(g);root.add(g);return g;};
  let g=layer(1);
  if(skin==="husky") {
    cushion(g,cream,[0,.035,0],1.5,1.15,.035);
    for(let i=0;i<14;i++)for(const side of [-1,1])line(g,cream,[[(i-6.5)*.085,.035,side*.59],[(i-6.5)*.085,.03,side*.67]],.009);
    g=layer(2);cushion(g,cloth,[0,.105,0],1.12,.9,.11);
    g=layer(3);for(const side of [-1,1])sphere(g,cloth,[side*.48,.3,-.02],[.115,.19,.42]);sphere(g,cloth,[0,.32,-.38],[.48,.2,.12]);
    g=layer(4);cushion(g,cream,[0,.22,.02],.85,.67,.06);
    for(let i=0;i<18;i++){const a=i/18*Math.PI*2;sphere(g,cream,[Math.sin(a)*.47,.4,Math.cos(a)*.34-.02],[.009,.009,.009]);}
    g=layer(5);cushion(g,cloth,[.23,.29,-.13],.4,.32,.08);plaque(g,darkWood,gold,[0,.2,.475]);
  } else if(skin==="dog") {
    for(let i=0;i<9;i++)box(g,lightWood,[(i-4)*.14,.08,0],[.135,.12,1.05]);
    g=layer(2);for(const x of [-.52,.52])for(const z of [-.37,.37])box(g,timber,[x,.47,z],[.065,.74,.065]);
    g=layer(3);archWall(g,timber,1.08,.94,.06,.5);
    for(const side of [-1,1])box(g,timber,[side*.51,.46,-.05],[.055,.73,.7]);box(g,timber,[0,.46,-.42],[1.05,.73,.055]);
    for(const side of [-1,1]){const roof=box(g,stone,[side*.3,1.02,-.04],[.73,.065,1.03]);roof.rotation.z=-side*.48;}
    g=layer(4);for(let i=0;i<7;i++)for(const side of [-1,1])line(g,darkWood,[[side*.55,.18+i*.098,.33],[side*.55,.18+i*.098,-.39]],.004);
    line(g,lightWood,[[-.275,.1,.365],[-.275,.48,.365],[0,.73,.365],[.275,.48,.365],[.275,.1,.365]],.024);
    g=layer(5);plaque(g,darkWood,gold,[0,.89,.375]);cushion(g,cloth,[0,.15,.04],.54,.54,.035);
  } else if(skin==="cat") {
    cushion(g,cream,[0,.035,0],1.4,1.05,.045);
    g=layer(2);cushion(g,darkWood,[0,.11,0],.93,.8,.1);
    g=layer(3);archWall(g,cloth,.94,.87,.09,.5);box(g,cloth,[0,.48,-.3],[.9,.76,.08]);for(const side of [-1,1])sphere(g,cloth,[side*.41,.46,.0],[.085,.38,.35]);sphere(g,cloth,[0,.87,0],[.45,.085,.35]);
    for(const side of [-1,1]){const ear=mesh(g,new T.ConeGeometry(.12,.24,3),cloth,[side*.31,.97,.3]);ear.rotation.z=-side*.25;}
    g=layer(4);cushion(g,cream,[0,.16,.03],.56,.58,.045);plaque(g,lightWood,gold,[0,.78,.39]);
    g=layer(5);box(g,lightWood,[.64,.08,-.13],[.24,.1,.4]);mesh(g,new T.CylinderGeometry(.055,.055,.65,20),cream,[.64,.43,-.13]);
    for(let i=0;i<28;i++){const r=ring(g,lightWood,[.64,.13+i*.021,-.13],.058,.005);r.rotation.x=Math.PI/2;}
    cushion(g,cloth,[.64,.77,-.13],.39,.36,.035);
  } else if(skin==="owl") {
    sphere(g,darkWood,[0,.07,0],[.65,.08,.51]);
    g=layer(2);archWall(g,darkWood,.85,1.24,.08,.44);box(g,darkWood,[0,.67,-.3],[.75,1.13,.13]);for(const side of [-1,1])sphere(g,timber,[side*.37,.65,-.02],[.11,.61,.34]);
    g=layer(3);sphere(g,timber,[0,1.28,-.02],[.47,.12,.39]);line(g,darkWood,[[-.38,.99,-.17],[-.65,1.27,-.1],[-.77,1.37,-.03]],.045);line(g,timber,[[.25,1.1,-.15],[.58,1.35,-.06],[.68,1.43,0]],.035);
    g=layer(4);line(g,lightWood,[[-.3,.18,.5],[.3,.18,.5]],.045);for(let i=0;i<8;i++){const a=i/8*Math.PI*2;leaf(g,leafGreen,[Math.sin(a)*.4,1.31+Math.cos(a)*.12,-.04],.18,-a);}
    g=layer(5);for(let i=0;i<16;i++){const a=i/16*Math.PI*2;line(g,lightWood,[[Math.sin(a)*.21,.14,Math.cos(a)*.17+.08],[Math.sin(a+.4)*.24,.19,Math.cos(a+.4)*.2+.08]],.012);}plaque(g,timber,gold,[0,1.09,.39]);
  } else if(skin==="kangaroo") {
    sphere(g,sand,[0,.04,0],[.86,.06,.64]);cushion(g,cream,[0,.1,.04],1.12,.82,.035);
    g=layer(2);for(const x of [-.57,.57])for(const z of [-.38,.38])mesh(g,new T.CylinderGeometry(.035,.045,.98,16),timber,[x,.59,z]);
    g=layer(3);const canopy=box(g,cloth,[0,1.13,0],[1.4,.035,1.05]);canopy.rotation.z=.06;for(const z of [-.53,.53])line(g,cream,[[-.7,1.09,z],[0,1.13,z],[.7,1.18,z]],.015);
    g=layer(4);cushion(g,cloth,[.25,.17,-.15],.5,.36,.06);box(g,lightWood,[-.46,.21,-.33],[.23,.27,.16]);
    g=layer(5);plant(g,darkWood,green,[-.66,.1,-.24]);plant(g,darkWood,leafGreen,[.68,.1,.13]);plaque(g,darkWood,gold,[0,1.04,.54]);
  } else if(skin==="croc") {
    const water=new T.MeshPhysicalMaterial({color:"#6daeb0",roughness:.16,metalness:.08,clearcoat:1,clearcoatRoughness:.12});
    sphere(g,stone,[0,.045,0],[.85,.07,.65]);sphere(g,water,[0,.1,0],[.79,.028,.59]);
    g=layer(2);sphere(g,sand,[.12,.13,-.04],[.49,.09,.38]);
    g=layer(3);for(let i=0;i<9;i++){const a=(i/8)*Math.PI;sphere(g,stone,[Math.cos(a)*.58,.2+Math.sin(i)*.03,-Math.sin(a)*.4],[.16,.12,.12]);}
    g=layer(4);for(const side of [-1,1]){plant(g,darkWood,leafGreen,[side*.64,.1,-.1]);for(let i=0;i<3;i++)line(g,darkWood,[[side*.63+i*.03,.12,-.2],[side*.65+i*.025,.48+i*.05,-.23]],.007);}
    g=layer(5);for(let i=0;i<3;i++){const lily=sphere(g,green,[-.4+i*.24,.134,.31],[.1,.006,.075]);leaf(g,flowerMat,[-.4+i*.24,.16,.31],.035,.8);}line(g,timber,[[-.16,.27,-.24],[.15,.26,-.3],[.44,.25,-.23]],.065);
  } else {
    const rabbit=skin==="rabbit",fox=skin==="fox";
    sphere(g,rabbit?green:fox?darkWood:stone,[0,.07,0],[.8,.08,.59]);
    g=layer(2);for(const side of [-1,1])sphere(g,rabbit?green:stone,[side*.46,.33,-.05],[.21,.3,.43]);sphere(g,sand,[0,.13,.07],[.48,.035,.36]);
    g=layer(3);archWall(g,rabbit?green:fox?darkWood:stone,1.24,.95,.14,.57);sphere(g,rabbit?green:stone,[0,.89,-.03],[.65,.15,.43]);box(g,rabbit?green:stone,[0,.47,-.4],[1.02,.78,.1]);
    g=layer(4);line(g,fox?lightWood:sand,[[-.31,.1,.44],[-.31,.54,.44],[0,.77,.44],[.31,.54,.44],[.31,.1,.44]],.035);
    if(fox){for(let i=0;i<7;i++)line(g,timber,[[.65-i*.21,.77,-.32],[.54-i*.18,1.02,.1],[.49-i*.16,.83,.38]],.035);}
    if(rabbit)for(let i=0;i<14;i++)leaf(g,leafGreen,[(i%7-3)*.14,.83+(i%3)*.05,Math.floor(i/7)*.3-.15],.1,(i%3-1)*.4);
    if(!fox&&!rabbit)for(let i=0;i<6;i++)sphere(g,i%2?stone:sand,[(i-2.5)*.2,.92+Math.sin(i)*.07,.27],[.14,.13,.12]);
    g=layer(5);plant(g,darkWood,leafGreen,[-.65,.1,.2],rabbit?flowerMat:null);plant(g,darkWood,green,[.62,.1,.16]);cushion(g,cream,[0,.17,.07],.49,.5,.02);
    if(rabbit){for(let i=0;i<3;i++){const carrot=mesh(g,new T.ConeGeometry(.03,.12,12),new T.MeshStandardMaterial({color:"#d99058"}),[.52+i*.07,.12,.4]);carrot.rotation.z=.5;leaf(g,leafGreen,[.55+i*.07,.2,.4],.06,-.4);}}
    if(fox)for(let i=0;i<3;i++){const x=-.62-i*.07;mesh(g,new T.CylinderGeometry(.012,.015,.09,12),cream,[x,.14,.35]);sphere(g,flowerMat,[x,.19,.35],[.045,.027,.04]);}
  }
  g=layer(5,1);cushion(g,cloth,[0,skin==="croc"?.24:.15,.48],.58,.32,.035);
  for(let i=0;i<7;i++)line(g,cream,[[(i-3)*.07,.16,.62],[(i-3)*.07,.15,.68]],.006);
  g=layer(5,2);for(const side of [-1,1]){cushion(g,timber,[side*.69,.09,.31],.2,.2,.09);plant(g,darkWood,leafGreen,[side*.69,.2,.31],flowerMat);}
  g=layer(5,3);line(g,darkWood,[[.62,.1,-.28],[.62,.63,-.28],[.5,.72,-.28]],.012);
  const lamp=new T.MeshPhysicalMaterial({color:"#ffe1a2",emissive:"#ffcb70",emissiveIntensity:.4,roughness:.45});sphere(g,lamp,[.5,.64,-.28],[.055,.07,.055]);ring(g,gold,[.5,.64,-.28],.057,.008);
  // Materials shared by hidden and visible stages remain owned by this root.
  // Unused materials (different species' props) are disposed immediately.
  const used=new Set();root.traverse(o=>{if(o.material)used.add(o.material);});
  for(const mat of [timber,lightWood,darkWood,stone,sand,cloth,cream,green,leafGreen,gold,flowerMat])if(!used.has(mat)){for(const v of Object.values(mat))if(v?.isTexture)v.dispose();mat.dispose();}
  root.userData.palette={structure:base.getHexString(),accent:appearance.houseAccent||null};
  return root;
}
