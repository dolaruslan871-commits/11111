const { test } = require("node:test");
const assert = require("node:assert/strict");
const L = require("../src/life.cjs");
const day = 86400000,
  base = new Date(2026, 4, 3, 12).getTime();
test("growth uses calendar weeks, survives restart and remains bounded", () => {
  const life = L.createLife({}, base);
  const newborn = L.snapshot(life, base);
  assert.equal(L.snapshot(life, base + 3600000).growth, newborn.growth);
  assert.equal(L.snapshot(life, base + day).age, 1);
  assert.ok(L.snapshot(life, base + 7 * day).growth > newborn.growth);
  assert.equal(L.snapshot(life, base + 7 * day).stage, "baby");
  assert.equal(L.snapshot(life, base + 14 * day).stage, "young");
  assert.equal(L.snapshot(life, base + 56 * day).growth, 1);
  assert.equal(
    L.snapshot(
      L.createLife(JSON.parse(JSON.stringify(life)), base + 70 * day),
      base + 70 * day,
    ).age,
    70,
  );
  assert.equal(L.snapshot(life, base - day).growth, newborn.growth);
});
test("idle sleeps, return celebrates, low energy rests", () => {
  const l = L.createLife({}, base),
    b = L.sanitizeBehavior();
  assert.equal(L.chooseActivity(l, b, { now: base, idle: 181 }), "sleep");
  assert.equal(
    L.chooseActivity(l, b, { now: base, returned: true }),
    "excited",
  );
  l.energy = 1;
  assert.equal(L.chooseActivity(l, b, { now: base }), "sleep");
});
test("quiet hours cross midnight and prevent attention reminders", () => {
  const b = L.sanitizeBehavior({
    quietStart: 22,
    quietEnd: 8,
    nightSleep: false,
    reminders: true,
  });
  for (const hour of [22, 23, 0, 7]) {
    const now = new Date(2026, 4, 3, hour).getTime();
    assert.ok(L.quiet(b, new Date(now)));
    const l = L.createLife({}, now);
    l.lastBreak = 0;
    l.lastWater = 0;
    assert.ok(
      ["idle", "read"].includes(
        L.chooseActivity(l, b, { now, random: () => 0.1 }),
      ),
    );
  }
  assert.equal(L.quiet(b, new Date(2026, 4, 3, 12)), false);
});
test("weather changes behavior using actual weather codes", () => {
  const l = L.createLife({}, base),
    b = L.sanitizeBehavior({ reminders: false });
  assert.equal(
    L.chooseActivity(l, b, {
      now: base,
      weather: { ok: true, code: 61, temperature: 18 },
      random: () => 0.1,
    }),
    "umbrella",
  );
  assert.equal(
    L.chooseActivity(l, b, {
      now: base,
      weather: { ok: true, code: 0, temperature: 32 },
      random: () => 0.1,
    }),
    "fan",
  );
});
test("gifts are once per LOCAL date and cannot award duplicate items", () => {
  const l = L.createLife({}, base);
  assert.equal(L.dailyGift(l, ["hat:test"], base, () => 0).item, "hat:test");
  assert.equal(L.dailyGift(l, ["hat:test"], base + 1000, () => 0).ok, false);
  const next = L.dailyGift(l, ["hat:test"], base + day, () => 0);
  assert.equal(next.coins, 15);
  assert.deepEqual(l.gifts, ["hat:test"]);
});
test("life stats recover with food, petting and sleep without exceeding bounds", () => {
  const l = L.createLife({ hunger: 90, energy: 1, mood: 10 }, base);
  L.feedFood(l, "carrot");
  assert.equal(l.hunger, 65);
  L.interact(l, "pet");
  assert.ok(l.friendship > 5);
  L.tickLife(l, { now: base + 60000, activity: "sleep" });
  assert.ok(l.energy > 1);
  assert.throws(() => L.feedFood(l, "file"));
  for (let i = 0; i < 200; i++) L.feedFood(l, "cookie");
  assert.ok(l.mood <= 100);
  assert.ok(l.hunger >= 0);
});
test("behavior settings sanitize malformed input and preserve preferences", () => {
  const b = L.sanitizeBehavior({
    active: 999,
    quietEnd: -3,
    nightSleep: false,
    transport: "hacked",
    windowInteraction: true,
  });
  assert.equal(b.active, 100);
  assert.equal(b.quietEnd, 0);
  assert.equal(b.nightSleep, false);
  assert.equal(b.transport, "auto");
  assert.equal(b.windowInteraction, true);
});
test("reminders trigger only after configured intervals", () => {
  const l = L.createLife({}, base),
    b = L.sanitizeBehavior();
  assert.equal(L.chooseActivity(l, b, { now: base + 61 * 60000 }), "drink");
  assert.equal(L.chooseActivity(l, b, { now: base + 61 * 60000 }), "break");
});
test("birthday celebration occurs once per year", () => {
  const l = L.createLife({ birthday: "05-03" }, base);
  const b = L.sanitizeBehavior({ reminders: false });
  assert.equal(
    L.chooseActivity(l, b, { now: base, random: () => 0.9 }),
    "cake",
  );
  assert.notEqual(
    L.chooseActivity(l, b, { now: base + 1000, random: () => 0.9 }),
    "cake",
  );
});
