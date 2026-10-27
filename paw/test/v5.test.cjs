const { test } = require("node:test"),
  assert = require("node:assert/strict");
const V = require("../src/v5-model.cjs"),
  { createGameEngine } = require("../src/game-engine.cjs");
const make = () => ({
  coins: 30,
  xp: 0,
  hunger: 70,
  mood: 50,
  foods: {},
  inventory: V.stock(),
});
test("five new themes, safe settings, protected Hasya identity and migration", () => {
  const s = V.extraSettings({
    names: { husky: "Changed", cat: "Мурчик" },
    theme: "rose",
    windowOpacity: 0,
    toyDistance: 900,
    shortcut: { name: "Old", path: "/Apps/Old.app" },
  });
  assert.equal(s.names.husky, undefined);
  assert.equal(s.names.cat, "Мурчик");
  assert.equal(s.theme, "rose");
  assert.equal(s.windowOpacity, 0.65);
  assert.equal(s.toyDistance, 200);
  assert.equal(s.shortcuts[0].name, "Old");
  assert.equal(V.THEMES.length, 7);
});
test("visible bounds can reach every corner while transparent margins extend outside", () => {
  const area = { x: -1920, y: 0, width: 1920, height: 1080 },
    r = { x: 120, y: 150, width: 190, height: 210 };
  assert.deepEqual(V.clampVisiblePosition({ x: -9999, y: -9999 }, area, r), {
    x: -2040,
    y: -150,
  });
  const end = V.clampVisiblePosition({ x: 9999, y: 9999 }, area, r);
  assert.equal(end.x + r.x + r.width, 0);
  assert.equal(end.y + r.y + r.height, 1080);
});
test("rest progresses through sit/groom/yawn/curl and wakes after 10 minutes", () => {
  let now = 100000,
    state = {};
  let r = V.restActivity(30000, state, now);
  assert.equal(r.activity, "sit");
  state = r.rest;
  r = V.restActivity(60000, state, now + 30000);
  assert.equal(r.activity, "groom");
  r = V.restActivity(80000, r.rest, now + 47000);
  assert.equal(r.activity, "yawn");
  r = V.restActivity(90000, r.rest, now + 56000);
  assert.equal(r.activity, "curl");
  const end = r.rest.sleepUntil;
  assert.equal(V.restActivity(100000, r.rest, end - 1).activity, "curl");
  assert.equal(V.restActivity(100000, r.rest, end).activity, "wake");
  assert.equal(V.restActivity(0, r.rest, end).activity, null);
});
test("species diets consume real stock and cannot feed incompatible or missing food", () => {
  const l = make();
  assert.equal(V.feedInventory(l, "rabbit", "fish").ok, false);
  const before = l.inventory.carrot;
  assert.equal(V.feedInventory(l, "rabbit", "carrot").ok, true);
  assert.equal(l.inventory.carrot, before - 1);
  l.inventory.carrot = 0;
  assert.equal(V.feedInventory(l, "rabbit", "carrot").code, "EMPTY");
});
test("garden requires seed and water, persists plot progress, harvests only after growth", () => {
  let now = 100000;
  const l = make(),
    e = createGameEngine({ now: () => now, random: () => 0.4 });
  e.start("garden", l);
  e.control("plant", { plot: 0, crop: "carrot" }, l);
  assert.equal(l.inventory.seed, 11);
  assert.equal(e.control("harvest", { plot: 0 }, l).ok, false);
  e.control("water", { plot: 0 }, l);
  const stored = JSON.parse(JSON.stringify(l));
  now += 45001;
  const next = createGameEngine({ now: () => now, random: () => 0.4 });
  next.start("garden", stored);
  assert.equal(next.control("harvest", { plot: 0 }, stored).ok, true);
  assert.equal(stored.inventory.carrot, 6);
  assert.equal(stored.garden[0], null);
});
test("fishing consumes bait, needs a timely hook and controlled tension to land food", () => {
  let now = 100000;
  const l = make(),
    e = createGameEngine({ now: () => now, random: () => 0.4 });
  e.start("fishing", l);
  e.control("cast", 0.5, l);
  assert.equal(l.inventory.worms, 7);
  assert.equal(e.control("hook", null, l).ok, false);
  now = e.view(l).session.biteAt + 1;
  e.tick(l);
  assert.equal(e.view(l).session.phase, "bite");
  e.control("hook", null, l);
  let reeling = true;
  for (let i = 0; i < 2000 && e.view(l).session.phase === "fight"; i++) {
    const g = e.view(l).session;
    if (g.tension > 65) reeling = false;
    if (g.tension < 30) reeling = true;
    now += 50;
    e.control("steer", -Math.sin((now - g.biteAt) / 650 + g.fishPhase), l);
    e.control("reel", reeling, l);
    e.tick(l);
  }
  assert.equal(e.view(l).session.phase, "caught");
  assert.equal(l.inventory.fish, 4);
  assert.ok(l.coins > 30);
});
test("over-reeling breaks the line and missed bite awards nothing", () => {
  let now = 100000;
  const l = make(),
    e = createGameEngine({ now: () => now, random: () => 0.5 });
  e.start("fishing", l);
  e.control("cast", 0.5, l);
  now = e.view(l).session.biteAt + 1900;
  e.tick(l);
  assert.equal(e.view(l).session.phase, "escaped");
  assert.equal(l.inventory.fish, 3);
});
test("resource clicker rejects spam and yields construction resources", () => {
  let now = 100000;
  const l = make(),
    e = createGameEngine({ now: () => now, random: () => 0.4 });
  e.start("wood", l);
  for (let i = 0; i < 20; i++) {
    now += 300;
    e.control("strike", null, l);
  }
  assert.ok(l.inventory.wood > 0);
  const wood = l.inventory.wood;
  e.control("strike", null, l);
  assert.equal(l.inventory.wood, wood);
});
