const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const lifeAPI = require("../src/life.cjs");
const at = new Date(2026, 5, 15, 12).getTime();
const dataModule = name => import("data:text/javascript;base64," + Buffer.from(fs.readFileSync(path.join(__dirname, "../src", name))).toString("base64"));
const near = (actual, expected, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);

test("0.6.2 progress keeps its established fields, rewards and need rates", () => {
  const input = { bornAt: at - 80 * 86400000, mood: 77, energy: 81, hunger: 26, friendship: 42, coins: 907, xp: 601, house: 93, homeUpgrades: 2, gifts: ["hat:bow"], foods: { fish: 33 }, birthday: "06-15", celebrated: "2025-06-15", lastGift: "2026-06-14" };
  const life = lifeAPI.createLife(input, at);
  for (const [key, value] of Object.entries(input)) assert.deepEqual(life[key], value, key);
  lifeAPI.tickLife(life, { now: at + 60000, idle: 0 });
  near(life.energy, 80.68); near(life.hunger, 26.25); near(life.mood, 76.96);
  assert.equal(life.coins, 907); assert.equal(life.xp, 601);
  lifeAPI.interact(life, "pet", at + 61000);
  near(life.friendship, 43); near(life.mood, 80.96); assert.equal(life.xp, 603);
});

test("new memory restores personality without replaying a saved greeting", () => {
  const life = lifeAPI.createLife({}, at);
  life.autonomy.playAffinity = 67;
  life.autonomy.calmAffinity = 71;
  life.autonomy.boredom = 44;
  life.autonomy.pendingWelcome = true;
  life.autonomy.welcomeUntil = at + 8000;
  const reloaded = lifeAPI.createLife(JSON.parse(JSON.stringify(lifeAPI.snapshot(life, at))), at + 300000);
  assert.equal(reloaded.autonomy.playAffinity, 67);
  assert.equal(reloaded.autonomy.calmAffinity, 71);
  assert.equal(reloaded.autonomy.boredom, 44);
  assert.equal(reloaded.autonomy.pendingWelcome, false);
  assert.equal(reloaded.autonomy.reunionStage, null);
  assert.equal(lifeAPI.autonomousDecision(reloaded, undefined, { now: at + 300000, idle: 0 }), null);
});

test("returning to a sleeping pet gives one gentle wake followed by one greeting", () => {
  const life = lifeAPI.createLife({}, at);
  lifeAPI.observeAutonomy(life, { now: at, idle: 90, activity: "curl" });
  const returnedAt = at + 1000;
  const wake = lifeAPI.autonomousDecision(life, undefined, { now: returnedAt, idle: 0, activity: "curl" });
  assert.equal(wake.activity, "wake"); assert.equal(wake.reason, "return-wake");
  assert.equal(lifeAPI.autonomousDecision(life, undefined, { now: returnedAt + 100, idle: 0, activity: "wake", activityUntil: returnedAt + wake.duration }), null);
  const greetAt = returnedAt + wake.duration;
  const greeting = lifeAPI.autonomousDecision(life, undefined, { now: greetAt, idle: 0, activity: "wake", activityUntil: greetAt });
  assert.equal(greeting.activity, "wave");
  for (let i = 1; i < 100; i++) {
    assert.equal(lifeAPI.autonomousDecision(life, undefined, { now: greetAt + i * 20, idle: 0, activity: "wave", activityUntil: greetAt + 5200 }), null);
  }
  assert.equal(life.mood, 80, "the existing +5 return bonus happens once, not on each tick");
  lifeAPI.observeAutonomy(life, { now: returnedAt + 50000, idle: 46, activity: "idle" });
  assert.equal(lifeAPI.autonomousDecision(life, undefined, { now: returnedAt + 51000, idle: 0, activity: "idle" }), null, "90-second welcome cooldown");
});

test("rest progression holds each pose and does not restart animation every tick", () => {
  const life = lifeAPI.createLife({}, at);
  let current = "idle", until = 0;
  const decisions = [];
  for (let elapsed = 0; elapsed <= 65000; elapsed += 1000) {
    const result = lifeAPI.autonomousDecision(life, undefined, { now: at + elapsed, idle: 80 + elapsed / 1000, activity: current, activityUntil: until });
    if (result) { decisions.push(result.activity); current = result.activity; until = at + elapsed + result.duration; }
  }
  assert.deepEqual(decisions, ["sit", "groom", "yawn", "curl"]);
});

test("care, games and physical carrying retain priority over autonomous decisions", () => {
  const life = lifeAPI.createLife({}, at);
  for (const activity of ["pet", "eat", "carry", "grateful", "held", "fall", "parachute", "land", "perch"]) {
    assert.equal(lifeAPI.autonomousDecision(life, undefined, { now: at + 60000, idle: 180, activity, activityUntil: at + 90000 }), null, activity);
  }
  assert.equal(lifeAPI.autonomousDecision(life, undefined, { now: at + 100000, idle: 180, activity: "idle", blocked: true }), null);
});

test("a house-mapped curl remains managed and wakes naturally without repeat broadcasts", () => {
  const life = lifeAPI.createLife({}, at);
  life.energy = 90;
  let activity = "idle", activityUntil = 0;
  const decisions = [];
  for (let elapsed = 0; elapsed <= 670000; elapsed += 1000) {
    const result = lifeAPI.autonomousDecision(life, undefined, { now: at + elapsed, idle: 80 + elapsed / 1000, activity, activityUntil });
    if (result) {
      decisions.push(result.activity);
      activity = result.activity === "curl" ? "home" : result.activity;
      activityUntil = at + elapsed + result.duration;
    }
  }
  assert.deepEqual(decisions.slice(0, 5), ["sit", "groom", "yawn", "curl", "wake"]);
  assert.equal(decisions.filter(value => value === "curl").length, 1);
});

test("a long suspend caps simulation updates and keeps memory finite", () => {
  const life = lifeAPI.createLife({}, at);
  lifeAPI.tickLife(life, { now: at + 50 * 86400000, idle: 86400 });
  near(life.energy, 80 - .32 * 5);
  near(life.hunger, 25 + .25 * 5);
  for (const key of ["comfort", "boredom", "loneliness", "playAffinity", "calmAffinity"]) {
    assert.ok(Number.isFinite(life.autonomy[key]) && life.autonomy[key] >= 0 && life.autonomy[key] <= 100, key);
  }
  const broken = lifeAPI.createLife({ autonomy: { boredom: Infinity, comfort: -500, loneliness: NaN, playAffinity: 1000 } }, at);
  assert.equal(broken.autonomy.comfort, 0);
  assert.equal(broken.autonomy.playAffinity, 100);
});

test("boredom and play memories bias autonomous choices without changing saves or rewards", () => {
  const life = lifeAPI.createLife({}, at);
  life.autonomy.boredom = 75;
  assert.equal(lifeAPI.chooseActivity(life, lifeAPI.sanitizeBehavior({ nightSleep: false, reminders: false }), { now: at, random: () => .1 }), "play");
  assert.equal(life.coins, 0); assert.equal(life.xp, 0);
  for (let i = 0; i < 40; i++) lifeAPI.interact(life, "play", at + i);
  assert.ok(life.autonomy.playAffinity > 60);
});

test("native and browser life models keep identical simulation behavior", async () => {
  const browser = await dataModule("life-browser.js");
  assert.deepEqual(Object.keys(browser).sort(), Object.keys(lifeAPI).sort());
  const a = lifeAPI.createLife({}, at), b = browser.createLife({}, at);
  for (let i = 0; i < 120; i++) {
    const options = { now: at + i * 1000, idle: i < 70 ? 80 : 0, activity: i < 70 ? "curl" : "wave" };
    lifeAPI.tickLife(a, options); browser.tickLife(b, options);
    assert.deepEqual(lifeAPI.snapshot(a, options.now), browser.snapshot(b, options.now));
  }
});

test("sixteen expressive intents are normalized, deterministic and bounded", async () => {
  const { EMOTION_NAMES, resolveEmotion } = await dataModule("emotion-model.js");
  assert.equal(EMOTION_NAMES.length, 16);
  for (const activity of [...lifeAPI.ACTIVITIES, null]) {
    const state = { activity, life: { energy: 50, mood: 65, hunger: 55, autonomy: { boredom: 40, loneliness: 20 } } };
    const result = resolveEmotion(state);
    assert.deepEqual(resolveEmotion(state), result);
    near(Object.values(result.weights).reduce((sum, value) => sum + value, 0), 1);
    for (const [channel, value] of Object.entries(result.channels)) {
      assert.ok(Number.isFinite(value));
      assert.ok(value >= (channel === "headTilt" ? -.12 : ["smile", "brow", "earLift"].includes(channel) ? -1 : 0));
      assert.ok(value <= (channel === "headTilt" ? .12 : 1));
    }
  }
  for (const state of [null, {}, { life: { energy: NaN, hunger: Infinity, mood: -Infinity } }]) {
    for (const value of Object.values(resolveEmotion(state).channels)) assert.ok(Number.isFinite(value));
  }
});

test("emotion blending is smooth, interruption-safe and independent of render frame rate", async () => {
  const { createEmotionMixer } = await dataModule("emotion-model.js");
  const normal = { activity: "idle" }, happy = { activity: "excited" }, asleep = { activity: "sleep" };
  const mixer = createEmotionMixer(normal);
  const before = mixer.snapshot().channels;
  const oneFrame = { ...mixer.update(1 / 60, happy).channels };
  assert.ok(Math.abs(oneFrame.smile - before.smile) < .02);
  const paused = { ...mixer.update(120, asleep).channels };
  assert.ok(paused.eyeOpen > .7, "a resumed process does not snap eyelids shut");
  const a = createEmotionMixer(normal), b = createEmotionMixer(normal);
  for (let i = 0; i < 120; i++) a.update(1 / 60, happy);
  for (let i = 0; i < 240; i++) b.update(1 / 120, happy);
  for (const key of Object.keys(a.snapshot().channels)) near(a.snapshot().channels[key], b.snapshot().channels[key]);
  const changed = a.snapshot().channels.smile;
  a.update(1 / 60, asleep);
  assert.ok(Math.abs(a.snapshot().channels.smile - changed) < .02, "new intent continues from the current face");
});
