import * as THREE from "./vendor/three.module.js";

// Garments share the pet's body proportions and animated leg pivots.
export function dressGarment({group, color, accent, mats, id, bodyScale, legs, upright, builders}) {
  const {sphere, tube, ring, box, cone} = builders;
  const scale = bodyScale.map(v => v * 1.075), origin = new THREE.Vector3(0,.8,-.03);
  const coat = sphere(group,color,origin.toArray(),scale,40);
  coat.name = "tailored-coat";
  const positions=coat.geometry.attributes.position, normals=coat.geometry.attributes.normal;
  for(let i=0;i<positions.count;i++) {
    const x=positions.getX(i), y=positions.getY(i), z=positions.getZ(i);
    const folds=(Math.sin(y*22+x*5)*Math.cos(z*17)+Math.sin(x*29-z*9)*.3)*.006*(1-y*y);
    positions.setXYZ(i,x+normals.getX(i)*folds,y+normals.getY(i)*folds,z+normals.getZ(i)*folds);
  }
  positions.needsUpdate=true;coat.geometry.computeVertexNormals();
  // Ellipse on a real garment surface, with a second fine line for topstitching.
  const edge=(axial,radius=1,mat=accent,thickness=.012) => {
    const points=[];
    const r=Math.sqrt(1-axial*axial)*radius;
    for(let i=0;i<=56;i++) {
      const a=i/56*Math.PI*2;
      points.push(upright ? [Math.sin(a)*scale[0]*r,.8+axial*scale[1],-.03+Math.cos(a)*scale[2]*r] : [Math.sin(a)*scale[0]*r,.8+Math.cos(a)*scale[1]*r,-.03+axial*scale[2]]);
    }
    return tube(group,mat,points,thickness);
  };
  edge(-.72,1.012,accent,.023);edge(-.66,1.014,accent,.005);
  edge(.72,1.012,accent,.024);edge(.65,1.015,accent,.005);
  // Side-panel seams are on the shell, so they do not float beside the body.
  for(const side of [-1,1]) {
    const points=[];
    for(let i=0;i<=16;i++) {
      const a=-.68+i/16*1.36, r=Math.sqrt(1-a*a)*1.012;
      points.push(upright ? [side*scale[0]*r*.9,.8+a*scale[1],-.03+scale[2]*r*.435] : [side*scale[0]*r*.9,.8+scale[1]*r*.435,-.03+a*scale[2]]);
    }
    tube(group,accent,points,.0055);
  }
  for(const leg of legs) if(leg.front) {
    const sleeve=sphere(leg.pivot,color,[0,-.12,0],[.158,.22,.171],28);
    sleeve.name="tailored-sleeve";
    ring(leg.pivot,accent,[0,-.278,0],.117,.023,[Math.PI/2,0,0]);
    ring(leg.pivot,accent,[0,-.25,0],.131,.005,[Math.PI/2,0,0]);
  }
  const front=scale[2]-.03;
  if(["hoodie","sweater","christmas","pajamas","shirt","sailor","halloween"].includes(id)) {
    const pocket=sphere(group,color,[0,.75,front+.002],[scale[0]*.5,.106,.026],28);
    pocket.name="kangaroo-pocket";
    tube(group,accent,[[-scale[0]*.4,.79,front+.026],[0,.82,front+.03],[scale[0]*.4,.79,front+.026]],.006);
    for(const side of [-1,1]) tube(group,accent,[[side*scale[0]*.4,.78,front+.025],[side*scale[0]*.28,.72,front+.028]],.01);
  }
  if(id==="hoodie") {
    const hood = new THREE.Mesh(new THREE.TorusGeometry(.29,.085,14,48,Math.PI*1.8),color);
    hood.position.set(0,upright?1.2:1.08,upright?.24:.47);hood.rotation.z=Math.PI*.6;hood.rotation.x=-.3;hood.scale.y=.85;
    hood.castShadow=true;group.add(hood);
    for(const side of [-1,1]) {
      tube(group,accent,[[side*.15,upright?1.2:1.08,upright?.43:.64],[side*.14,.98,front+.03],[side*.18,.85,front+.03]],.011);
      ring(group,mats.gold,[side*.15,1.02,front+.028],.021,.005);
      sphere(group,mats.gold,[side*.18,.85,front+.03],[.013,.027,.012],12);
    }
  }
  if(["raincoat","vest","shirt","spacesuit"].includes(id)) {
    tube(group,accent,[[0,.96,front*.84],[0,.83,front+.02],[0,.64,front*.93]],.008);
    for(let i=0;i<3;i++) {
      const y=.7+i*.09, z=-.03+scale[2]*Math.sqrt(Math.max(.01,1-((y-.8)/scale[1])**2));
      sphere(group,id==="raincoat"?mats.gold:accent,[.065,y,z+.014],[.019,.019,.01],12);
    }
  }
  if(id==="bee") for(const side of [-1,1]) {
    const wing=sphere(group,new THREE.MeshPhysicalMaterial({color:"#eaf6ff",transparent:true,opacity:.6,roughness:.22,clearcoat:1,side:THREE.DoubleSide}),[side*.34,1.14,-.3],[.23,.07,.35],28);
    wing.rotation.z=side*.3;
    tube(group,accent,[[side*.2,1.14,-.3],[side*.4,1.19,-.44],[side*.47,1.18,-.2]],.005);
  }
  if(id==="sailor") {
    for(const side of [-1,1]) {
      const collar=box(group,accent,[side*.14,1.1,upright?.3:.51],[.23,.035,.24],[0,0,side*.23]);
      collar.name="sailor-collar";
    }
    tube(group,color,[[0,1.09,front*.8],[0,.93,front+.03],[.05,.88,front+.02]],.025);
  }
  if(id==="vest") for(const side of [-1,1]) {
    box(group,accent,[side*.18,.8,front*.93],[.11,.13,.035],[0,0,-side*.08]);
    tube(group,color,[[side*.12,.86,front*.96],[side*.23,.86,front*.96]],.006);
  }
  if(id==="dress") {
    const skirt=cone(group,color,[0,.52,-.23],.55,.4,[Math.PI,0,0],48);
    const p=skirt.geometry.attributes.position;
    for(let i=0;i<p.count;i++) {const a=Math.atan2(p.getZ(i),p.getX(i)), f=1+Math.cos(a*14)*.045;p.setXYZ(i,p.getX(i)*f,p.getY(i),p.getZ(i)*f);}
    p.needsUpdate=true;skirt.geometry.computeVertexNormals();
    ring(group,accent,[0,.33,-.23],.545,.014,[Math.PI/2,0,0]);
    for(const side of [-1,1]) sphere(group,accent,[side*.07,.8,front+.025],[.09,.05,.018]);
  }
  if(id==="spacesuit") {
    box(group,accent,[0,.95,-scale[2]],[.29,.32,.14]);
    const panel=box(group,accent,[0,.9,front],[.19,.13,.035]);panel.name="suit-control-panel";
    for(let i=0;i<3;i++) sphere(group,new THREE.MeshStandardMaterial({color:["#70b5c8","#efb76b","#b4d394"][i]}),[(i-1)*.045,.9,front+.024],[.013,.013,.006],10);
  }
  if(id==="halloween") {
    for(const side of [-1,1]) cone(group,mats.black,[side*.12,.94,front*.91],.045,.06,[0,0,Math.PI],3);
    tube(group,mats.black,[[-.13,.87,front*.98],[0,.84,front+.01],[.13,.87,front*.98]],.012);
  }
  return coat;
}

export function finishTailoring({group,category,id,color,accent,mats,builders}) {
  const {sphere,tube,ring,box}=builders;
  if(category==="hat") {
    if(["cap","beanie","winter","bucket","beret","santa"].includes(id)) {
      const y=id==="beret"?.08:.08;
      for(let i=0;i<6;i++) {
        const angle=i*Math.PI/3,points=[];
        for(let j=0;j<=10;j++) {const a=j/10*Math.PI/2;points.push([Math.cos(angle)*.336*Math.cos(a),y+.218*Math.sin(a),Math.sin(angle)*.316*Math.cos(a)]);}
        tube(group,accent,points,.0035);
      }
      if(id==="cap") {
        sphere(group,accent,[0,.304,0],[.022,.016,.022],12);
        for(const side of [-1,1])ring(group,mats.gold,[side*.225,.14,.23],.013,.0035);
        tube(group,accent,[[-.26,-.018,.37],[0,-.014,.565],[.26,-.018,.37]],.004);
      }
      if(["beanie","winter","santa"].includes(id))for(let i=0;i<24;i++) {
        const a=i/24*Math.PI*2;
        tube(group,accent,[[Math.sin(a)*.315,-.045,Math.cos(a)*.315],[Math.sin(a)*.323,.005,Math.cos(a)*.323],[Math.sin(a)*.31,.04,Math.cos(a)*.31]],.005);
      }
      if(id==="bucket")for(let i=0;i<2;i++)ring(group,accent,[0,-.02+i*.024,0],.34+i*.009,.004,[Math.PI/2,0,0]);
    }
    if(id==="headphones")for(const side of [-1,1]) {
      sphere(group,color,[side*.46,-.14,.02],[.115,.137,.12],24);
      sphere(group,accent,[side*.51,-.14,.025],[.045,.085,.07],20);
    }
    if(["party","wizard","witch"].includes(id)) {
      const points=[];for(let i=0;i<=24;i++){const y=i/24*.52,r=.285*(1-y/.7);points.push([r*Math.sin(y*5),y,r*Math.cos(y*5)]);}
      tube(group,accent,points,.004);
    }
  }
  if(category==="glasses")for(const side of [-1,1]) {
    if(id==="monocle"&&side<0)continue;
    box(group,mats.gold,[side*.32,0,-.03],[.022,.025,.035]);
    if(["sun","ski","aviator"].includes(id))tube(group,accent,[[side*.23,.07,.016],[side*.19,.09,.02],[side*.15,.075,.016]],.006);
  }
  if(category==="scarf"&&id!=="bowtie"&&id!=="bandana") {
    for(let i=0;i<7;i++)tube(group,color,[[.1+i*.018,-.456,.3],[.105+i*.018,-.5,.304],[.1+i*.018,-.525,.305]],.005);
    for(const side of [-1,1])tube(group,accent,[[.15+side*.061,-.145,.312],[.15+side*.061,-.28,.312],[.15+side*.061,-.45,.312]],.003);
  }
  if(category==="accessory"&&["backpack","pouch"].includes(id)) {
    const width=id==="pouch"?.15:.23;
    tube(group,accent,[[-width,.92,-.52],[-width,1.12,-.48],[0,1.18,-.5],[width,1.12,-.48],[width,.92,-.52]],.006);
    box(group,mats.gold,[0,.99,-.58],[.033,.045,.012]);
    tube(group,color,[[-.08,1.27,-.3],[-.08,1.35,-.3],[.08,1.35,-.3],[.08,1.27,-.3]],.015);
  }
  if(category==="accessory"&&id==="camera") {
    tube(group,color,[[-.11,.72,.8],[-.25,1.03,.58],[.25,1.03,.58],[.11,.72,.8]],.012);
    box(group,mats.gold,[.08,.76,.83],[.035,.02,.025]);
  }
}
