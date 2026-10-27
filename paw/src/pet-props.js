import * as T from "./vendor/three.module.js";
const mat = (c) => new T.MeshStandardMaterial({ color: c, roughness: 0.65 });
export function makeProps(root) {
  const groups = {};
  const group = (name) => {
    const g = new T.Group();
    g.name = name;
    root.add(g);
    groups[name] = g;
    return g;
  };
  const ball = (g, c, x, y, z, a, b, d) => {
    const m = new T.Mesh(new T.SphereGeometry(1, 16, 12), mat(c));
    m.position.set(x, y, z);
    m.scale.set(a, b, d);
    g.add(m);
    return m;
  };
  const box = (g, c, x, y, z, a, b, d) => {
    const m = new T.Mesh(new T.BoxGeometry(a, b, d), mat(c));
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };
  const line = (g, c, pts, r = 0.025) => {
    const m = new T.Mesh(
      new T.TubeGeometry(
        new T.CatmullRomCurve3(pts.map((p) => new T.Vector3(...p))),
        12,
        r,
        6,
      ),
      mat(c),
    );
    g.add(m);
    return m;
  };
  const cone = (g, c, x, y, z, r, h) => {
    const m = new T.Mesh(new T.ConeGeometry(r, h, 24), mat(c));
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };
  let g = group("scratch");
  line(
    g,
    "#a88967",
    [
      [-0.43, 0.55, 0.92],
      [0.43, 0.55, 0.92],
    ],
    0.12,
  );
  for (const x of [-0.31, 0.31])
    box(g, "#79614c", x, 0.24, 0.92, 0.08, 0.48, 0.12);
  for (let i = 0; i < 8; i++)
    line(
      g,
      "#d2bc97",
      [
        [i * 0.09 - 0.32, 0.64, 0.88],
        [i * 0.09 - 0.32, 0.62, 0.99],
      ],
      0.012,
    );
  g = group("umbrella");
  line(g, "#caa66c", [
    [0.45, 0.45, 0.3],
    [0.42, 1.9, 0.3],
    [0.3, 2.15, 0.3],
  ]);
  const canopy = new T.Mesh(
    new T.SphereGeometry(0.75, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    mat("#ffc75f"),
  );
  canopy.position.set(0.28, 1.92, 0.3);
  canopy.scale.y = 0.55;
  g.add(canopy);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    line(
      g,
      "#fff0b6",
      [
        [0.28, 2.33, 0.3],
        [0.28 + Math.sin(a) * 0.48, 2.21, 0.3 + Math.cos(a) * 0.48],
        [0.28 + Math.sin(a) * 0.75, 1.92, 0.3 + Math.cos(a) * 0.75],
      ],
      0.009,
    );
  }
  g = group("fan");
  for (let i = 0; i < 7; i++) {
    const a = (i - 3) * 0.23;
    const blade = ball(
      g,
      i % 2 ? "#ffaeac" : "#f6d28c",
      0.6 + Math.sin(a) * 0.2,
      0.95 + Math.cos(a) * 0.16,
      0.8,
      0.08,
      0.26,
      0.024,
    );
    blade.rotation.z = -a;
  }
  box(g, "#86604b", 0.6, 0.78, 0.8, 0.035, 0.2, 0.03);
  g = group("skate");
  ball(g, "#9c94de", 0, 0.06, 0, 0.56, 0.055, 0.32);
  for (const x of [-0.38, 0.38])
    for (const z of [-0.24, 0.24])
      ball(g, "#e6d6f3", x, 0.015, z, 0.1, 0.1, 0.07);
  groups.skate.scale.set(0.8, 1, 2.6);
  g = group("scooter");
  box(g, "#79b5c9", 0, 0.05, 0, 0.45, 0.06, 0.9);
  for (const z of [-0.38, 0.38])
    ball(g, "#44454e", 0, 0.03, z, 0.13, 0.13, 0.08);
  line(g, "#a7bac4", [
    [0, 0.08, 0.38],
    [0, 0.9, 0.55],
    [0, 1.15, 0.55],
  ]);
  line(
    g,
    "#d2b4dc",
    [
      [-0.25, 1.15, 0.55],
      [0.25, 1.15, 0.55],
    ],
    0.04,
  );
  g = group("jetpack");
  for (const x of [-0.23, 0.23]) {
    ball(g, "#b1c8de", x, 0.9, -0.65, 0.16, 0.35, 0.16);
    cone(g, "#ffb14f", x, 0.38, -0.65, 0.09, 0.5);
  }
  box(g, "#8b8eb2", 0, 0.96, -0.6, 0.3, 0.3, 0.17);
  g = group("read");
  box(g, "#b38d70", 0.2, 0.62, 0.75, 0.52, 0.07, 0.35);
  box(g, "#f7e9d6", 0.2, 0.66, 0.75, 0.46, 0.03, 0.31);
  line(
    g,
    "#7b6462",
    [
      [-0.32, 1.28, 1],
      [0.32, 1.28, 1],
    ],
    0.016,
  );
  for (const x of [-0.17, 0.17]) {
    const m = new T.Mesh(
      new T.TorusGeometry(0.12, 0.014, 7, 24),
      mat("#7b6462"),
    );
    m.position.set(x, 1.28, 1);
    g.add(m);
  }
  g = group("gamepad");
  ball(g, "#a99bd7", 0, 0.67, 0.92, 0.35, 0.15, 0.08);
  for (const x of [-0.2, 0.2])
    ball(g, "#535165", x, 0.72, 1, 0.055, 0.055, 0.025);
  for (const x of [0.15, 0.24])
    ball(g, "#f5c78a", x, 0.63, 1, 0.027, 0.027, 0.02);
  g = group("fish");
  line(
    g,
    "#c49a6a",
    [
      [0.3, 0.4, 0.7],
      [0.55, 1.4, 0.9],
      [0.85, 1.8, 1],
    ],
    0.025,
  );
  line(
    g,
    "#bbdbe2",
    [
      [0.85, 1.8, 1],
      [1, 1, 1],
      [1, 0.25, 1],
    ],
    0.007,
  );
  ball(g, "#99d4e3", 0.85, 0.03, 0.8, 0.58, 0.025, 0.38);
  ball(g, "#eead77", 1, 0.15, 1, 0.12, 0.05, 0.04);
  g = group("ball");
  ball(g, "#e6a08c", 0.9, 0.17, 0.8, 0.18, 0.18, 0.18);
  line(
    g,
    "#fff2d7",
    [
      [0.74, 0.17, 0.88],
      [0.9, 0.34, 0.8],
      [1.06, 0.17, 0.72],
    ],
    0.012,
  );
  g = group("butterflies");
  for (let i = 0; i < 3; i++) {
    const bug = new T.Group();
    bug.position.set((i - 1) * 0.6, 1.8 + i * 0.15, 0.6);
    g.add(bug);
    for (const side of [-1, 1])
      ball(
        bug,
        ["#f5c475", "#bca2dd", "#92cbbb"][i],
        side * 0.06,
        0,
        0,
        0.07,
        0.1,
        0.025,
      );
  }
  g = group("draw");
  box(g, "#ba8e62", 0.7, 0.55, 0.5, 0.035, 0.7, 0.035);
  box(g, "#fff4e7", 0.7, 0.95, 0.52, 0.7, 0.6, 0.04);
  const heart = new T.Shape();
  heart.moveTo(0, -0.12);
  heart.bezierCurveTo(-0.3, 0, -0.18, 0.22, 0, 0.1);
  heart.bezierCurveTo(0.18, 0.22, 0.3, 0, 0, -0.12);
  const h = new T.Mesh(new T.ShapeGeometry(heart), mat("#df8ca0"));
  h.position.set(0.7, 0.98, 0.55);
  g.add(h);
  line(
    g,
    "#bd8262",
    [
      [0.3, 0.5, 0.6],
      [0.5, 0.9, 0.7],
    ],
    0.018,
  );
  g = group("gift");
  box(g, "#cfa4d6", 0.7, 0.24, 0.75, 0.42, 0.42, 0.4);
  box(g, "#f8e3a3", 0.7, 0.25, 0.75, 0.07, 0.44, 0.42);
  box(g, "#f8e3a3", 0.7, 0.25, 0.75, 0.44, 0.44, 0.07);
  for (const side of [-1, 1])
    ball(g, "#f8e3a3", 0.7 + side * 0.07, 0.49, 0.75, 0.09, 0.06, 0.04);
  g = group("cake");
  ball(g, "#f4d4a8", 0.65, 0.27, 0.7, 0.26, 0.19, 0.26);
  ball(g, "#fff0e4", 0.65, 0.43, 0.7, 0.27, 0.04, 0.27);
  box(g, "#ce9edf", 0.65, 0.56, 0.7, 0.035, 0.2, 0.035);
  cone(g, "#ffd26e", 0.65, 0.72, 0.7, 0.035, 0.09);
  g = group("detective");
  ball(g, "#9c7a5e", 0, 1.89, 0.25, 0.42, 0.08, 0.38);
  ball(g, "#a88b6e", 0, 2, 0.23, 0.29, 0.17, 0.28);
  line(
    g,
    "#907464",
    [
      [0.45, 0.5, 0.6],
      [0.65, 0.9, 0.75],
    ],
    0.02,
  );
  const lens = new T.Mesh(
    new T.TorusGeometry(0.16, 0.025, 8, 24),
    mat("#d6b575"),
  );
  lens.position.set(0.68, 1.05, 0.8);
  g.add(lens);
  g = group("drink");
  ball(g, "#99c7df", 0.6, 0.35, 0.75, 0.12, 0.3, 0.12);
  box(g, "#e9f1e9", 0.6, 0.66, 0.75, 0.15, 0.05, 0.15);
  g = group("break");
  box(g, "#c4b6dd", 0.55, 0.04, 0.7, 0.6, 0.04, 0.5);
  g = group("attention");
  for (let i = 0; i < 3; i++)
    ball(
      g,
      "#f2c87f",
      0.45 + (i - 1) * 0.15,
      1.95 + (i % 2) * 0.12,
      0.4,
      0.035,
      0.055,
      0.035,
    );
  g = group("build");
  line(
    g,
    "#ad805e",
    [
      [0.5, 0.3, 0.8],
      [0.5, 0.95, 0.8],
    ],
    0.035,
  );
  box(g, "#8d99aa", 0.5, 1, 0.8, 0.3, 0.12, 0.12);
  g = group("house");
  g.position.set(-0.85, 0, -0.3);
  box(g, "#c7a180", 0, 0.32, 0, 0.85, 0.64, 0.65);
  cone(g, "#9b849d", 0, 0.92, 0, 0.72, 0.6);
  box(g, "#4f4448", 0, 0.24, 0.334, 0.34, 0.48, 0.015);
  box(g, "#ffe4a3", 0.3, 0.42, 0.34, 0.17, 0.2, 0.02);
  box(g, "#a98b6d", 0.3, 0.42, 0.36, 0.02, 0.2, 0.02);
  box(g, "#a98b6d", 0.3, 0.42, 0.36, 0.17, 0.02, 0.02);
  g = group("box");
  g.position.set(-0.8, 0, -0.2);
  box(g, "#c9a27b", 0, 0.21, 0, 0.67, 0.42, 0.6);
  box(g, "#725943", 0, 0.425, 0, 0.55, 0.018, 0.48);
  g = group("snow");
  for (let i = 0; i < 16; i++)
    ball(
      g,
      "#e9f2ff",
      Math.sin(i * 3.7) * 1.2,
      1 + i * 0.13,
      Math.cos(i) * 0.6,
      0.014,
      0.014,
      0.014,
    );
  g = group("leaves");
  for (let i = 0; i < 9; i++) {
    const m = ball(
      g,
      i % 2 ? "#e8ad66" : "#c79967",
      Math.sin(i * 3) * 1.2,
      1 + i * 0.18,
      Math.cos(i) * 0.5,
      0.05,
      0.018,
      0.09,
    );
    m.rotation.z = i;
  }
  g = group("flowers");
  for (let i = 0; i < 5; i++) {
    const x = (i - 2) * 0.4;
    line(
      g,
      "#82a98d",
      [
        [x, 0, 0.9],
        [x, 0.16, 0.9],
      ],
      0.01,
    );
    for (let j = 0; j < 5; j++) {
      const a = (j * Math.PI * 2) / 5;
      ball(
        g,
        "#ebbdca",
        x + Math.sin(a) * 0.04,
        0.18 + Math.cos(a) * 0.04,
        0.9,
        0.035,
        0.035,
        0.02,
      );
    }
    ball(g, "#f6d87c", x, 0.18, 0.92, 0.025, 0.025, 0.015);
  }
  for (const g of Object.values(groups)) g.visible = false;
  return {
    groups,
    update(state, time) {
      for (const [name, g] of Object.entries(groups))
        g.visible =
          state.activity === name ||
          (name === "ball" && state.activity === "play");
      const level = state.life?.houseLevel || 0;
      groups.house.visible = level >= 2;
      groups.house.scale.setScalar(level === 2 ? 0.75 : 1);
      groups.box.visible = level === 1 || state.activity === "build";
      if (state.activity === "home") {
        groups.house.visible = level >= 2;
        groups.box.visible = level === 1;
      }
      const season = state.behavior?.seasons !== false ? state.season : null;
      groups.snow.visible = season === "winter";
      groups.leaves.visible = season === "autumn";
      groups.flowers.visible = season === "spring";
      for (const key of ["snow", "leaves"])
        groups[key].children.forEach((m, i) => {
          m.position.y = 2.5 - ((time * 0.22 + i * 0.19) % 2.5);
          m.rotation.z = time * 0.4 + i;
        });
      groups.build.rotation.z = Math.sin(time * 5) * 0.2;
      groups.fan.rotation.z = Math.sin(time * 8) * 0.15;
      groups.ball.position.x = Math.sin(time * 3) * 0.18;
      groups.ball.position.y = Math.abs(Math.sin(time * 3)) * 0.15;
      groups.butterflies.children.forEach((m, i) => {
        m.position.y = 1.6 + Math.sin(time * 2 + i) * 0.25;
        m.rotation.y = Math.sin(time * 12 + i) * 0.4;
      });
      groups.jetpack.children.forEach((m, i) => {
        if (i % 2) m.scale.y = 0.8 + Math.sin(time * 25) * 0.2;
      });
    },
  };
}
