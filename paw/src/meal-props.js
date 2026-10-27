import * as T from "./vendor/three.module.js";
export function makeMeal(root, skin = "dog") {
  const group = new T.Group();
  const distance={cat:1.65,owl:1.35,croc:2.02,dinosaur:1.65,rabbit:1.65,kangaroo:1.4}[skin]||1.85;
  group.position.set(0, 0.025, distance);
  group.name='meal-on-floor';
  root.add(group);
  const material = (color) =>
    new T.MeshStandardMaterial({ color, roughness: 0.7 });
  const ball = (p, c, x, y, z, sx, sy, sz) => {
    const m = new T.Mesh(new T.SphereGeometry(1, 14, 10), material(c));
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    p.add(m);
    return m;
  };
  const cone = (p, c, x, y, z, r, h, rot = 0) => {
    const m = new T.Mesh(new T.ConeGeometry(r, h, 14), material(c));
    m.position.set(x, y, z);
    m.rotation.z = rot;
    p.add(m);
    return m;
  };
  const bowl = new T.Group();
  group.add(bowl);
  const rim = new T.Mesh(
    new T.TorusGeometry(0.28, 0.038, 10, 32),
    material("#b5c2cc"),
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.14;
  bowl.add(rim);
  ball(bowl, "#97aab9", 0, 0.06, 0, 0.29, 0.1, 0.29);
  ball(bowl, "#695b51", 0, 0.13, 0, 0.235, 0.018, 0.235);
  const foods = {};
  for (const key of [
    "fish",
    "meat",
    "kibble",
    "carrot",
    "cabbage",
    "berries",
    "grain",
    "worms",
  ]) {
    const f = new T.Group();
    foods[key] = f;
    f.position.y = 0.15;
    group.add(f);
    if (key === "fish") {
      ball(f, "#9cb8c1", 0, 0.04, 0, 0.22, 0.065, 0.09);
      const tail = cone(f, "#7f9fac", -0.25, 0.04, 0, 0.09, 0.14, -Math.PI / 2);
      ball(f, "#34444d", 0.14, 0.075, 0.065, 0.016, 0.016, 0.01);
    }
    if (key === "carrot") {
      cone(f, "#efab62", 0, 0.04, 0, 0.08, 0.4, -1.1);
      for (let i = 0; i < 3; i++)
        ball(f, "#89ac77", 0.2, 0.15, i * 0.035 - 0.035, 0.12, 0.018, 0.025);
    }
    if (key === "cabbage")
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const leaf = ball(
          f,
          i % 2 ? "#a7c981" : "#82ab6b",
          Math.sin(a) * 0.1,
          0.07,
          Math.cos(a) * 0.1,
          0.12,
          0.13,
          0.07,
        );
        leaf.rotation.y = a;
      }
    if (key === "meat") {
      ball(f, "#d59d8f", 0, 0.02, 0, 0.19, 0.05, 0.15);
      ball(f, "#ead5bc", 0.03, 0.075, 0, 0.055, 0.008, 0.06);
    }
    if (["kibble", "grain", "berries", "worms"].includes(key))
      for (let i = 0; i < 12; i++) {
        const a = i * 2.399,
          r = Math.sqrt(i / 12) * 0.17;
        const m = ball(
          f,
          key === "berries"
            ? "#a386b5"
            : key === "grain"
              ? "#dfc88d"
              : key === "worms"
                ? "#bda2a0"
                : "#b08c65",
          Math.sin(a) * r,
          0.02 + (i % 3) * 0.017,
          Math.cos(a) * r,
          key === "grain" ? 0.014 : 0.025,
          key === "worms" ? 0.012 : 0.022,
          key === "worms" ? 0.06 : 0.022,
        );
        m.rotation.y = i;
      }
  }
  group.visible = false;
  const world=new T.Vector3(),vertex=new T.Vector3(),bowlWorld=new T.Vector3(),headWorld=new T.Vector3();
  let clearance=null;
  function keepMuzzleAboveRim(pet) {
    pet.root.updateMatrixWorld(true);group.getWorldPosition(bowlWorld);
    const scale=pet.root.getWorldScale(new T.Vector3()).y,radius=.31*scale,top=bowlWorld.y+.14*scale;
    let low=Infinity;
    pet.head.traverse(mesh=>{
      if(!mesh.isMesh||!mesh.visible||mesh.name==='groomed-fur')return;
      for(let o=mesh;o&&o!==pet.head;o=o.parent)if(!o.visible||o.name?.startsWith('outfit-'))return;
      const positions=mesh.geometry?.attributes.position;if(!positions)return;
      for(let i=0;i<positions.count;i+=2) {
        vertex.fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld);
        if((vertex.x-bowlWorld.x)**2+(vertex.z-bowlWorld.z)**2<radius*radius)low=Math.min(low,vertex.y);
      }
    });
    if(Number.isFinite(low)) {
      const lift=Math.max(0,top+.018-low);
      if(lift>0){pet.head.getWorldPosition(headWorld);headWorld.y+=lift;pet.torso.worldToLocal(headWorld);pet.head.position.copy(headWorld);pet.head.updateMatrixWorld(true);}
      clearance=low+lift-top;
    } else clearance=null;
  }
  return {
    group,
    inspect:()=>({visible:group.visible,distance,bowlTop:.165,worldY:group.getWorldPosition(world).y,clearance}),
    placeOnFloor(pet) {
      if(!group.visible)return;
      // The body is grounded independently. The bowl never inherits its bob,
      // corrective lift or the head's feeding transform.
      pet.root.updateMatrixWorld(true);
      world.set(0,0,distance);pet.root.localToWorld(world);world.y=.025;
      pet.root.worldToLocal(world);group.position.copy(world);
      keepMuzzleAboveRim(pet);
    },
    update(state) {
      const meal = state.meal;
      group.visible = state.activity === "eat" && !!meal && !state.habitatKind;
      if (!group.visible) return;
      const floor = ["carrot", "cabbage", "berries"].includes(meal.food);
      bowl.visible = !floor;
      for (const [key, f] of Object.entries(foods)) {
        f.visible = key === meal.food;
        f.position.y = floor ? 0.04 : 0.15;
        f.scale.setScalar(
          Math.max(
            0.02,
            1 - (Date.now() - meal.started) / (meal.ends - meal.started),
          ),
        );
      }
    },
  };
}
