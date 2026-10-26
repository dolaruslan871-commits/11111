// Generated from life.cjs.
// Deterministic pet life simulation. All dates are local; progress is saved by main.
const DAY = 86400000;
const ACTIVITIES = [
  "idle",
  "walk",
  "sleep",
  "eat",
  "play",
  "hunt",
  "pet",
  "stand",
  "wave",
  "stretch",
  "sad",
  "excited",
  "carry",
  "angry",
  "chase-tail",
  "dance",
  "draw",
  "fish",
  "butterflies",
  "ball",
  "hide",
  "skate",
  "scooter",
  "jetpack",
  "float",
  "detective",
  "gift",
  "build",
  "home",
  "umbrella",
  "fan",
  "read",
  "gamepad",
  "cake",
  "attention",
  "drink",
  "break",
];
const BEHAVIOR = {
  active: 55,
  curious: 65,
  lazy: 30,
  walkFrequency: 55,
  attentionFrequency: 25,
  quietStart: 22,
  quietEnd: 8,
  nightSleep: true,
  weatherReactions: true,
  seasons: true,
  reminders: true,
  breakMinutes: 50,
  waterMinutes: 60,
  windowInteraction: false,
  appReactions: false,
  transport: "auto",
  zeroGravity: false,
};
const clamp = (x, a = 0, b = 100) => Math.max(a, Math.min(b, Number(x) || 0));
function sanitizeBehavior(value = {}) {
  const b = { ...BEHAVIOR };
  for (const k of [
    "active",
    "curious",
    "lazy",
    "walkFrequency",
    "attentionFrequency",
  ])
    if (Number.isFinite(value[k])) b[k] = clamp(value[k]);
  for (const k of ["quietStart", "quietEnd"])
    if (Number.isFinite(value[k])) b[k] = Math.round(clamp(value[k], 0, 23));
  for (const k of ["breakMinutes", "waterMinutes"])
    if (Number.isFinite(value[k])) b[k] = Math.round(clamp(value[k], 5, 240));
  for (const k of [
    "nightSleep",
    "weatherReactions",
    "seasons",
    "reminders",
    "windowInteraction",
    "appReactions",
    "zeroGravity",
  ])
    if (typeof value[k] === "boolean") b[k] = value[k];
  if (["auto", "walk", "skate", "scooter", "jetpack"].includes(value.transport))
    b.transport = value.transport;
  return b;
}
function createLife(input = {}, now = Date.now()) {
  if (!input || typeof input !== "object" || Array.isArray(input)) input = {};
  return {
    bornAt:
      Number.isFinite(input.bornAt) && input.bornAt > 0
        ? Math.min(now, input.bornAt)
        : now,
    lastTick: now,
    mood: clamp(input.mood ?? 75),
    energy: clamp(input.energy ?? 80),
    hunger: clamp(input.hunger ?? 25),
    friendship: clamp(input.friendship ?? 5),
    xp: Math.max(0, Number(input.xp) || 0),
    coins: Math.max(0, Math.floor(Number(input.coins) || 0)),
    house: clamp(input.house ?? 0),
    lastGift: typeof input.lastGift === "string" ? input.lastGift : "",
    gifts: Array.isArray(input.gifts)
      ? input.gifts.filter((x) => typeof x === "string").slice(-200)
      : [],
    foods:
      input.foods && typeof input.foods === "object"
        ? Object.fromEntries(
            Object.entries(input.foods)
              .filter(
                ([k, v]) =>
                  ["carrot", "cookie", "berries"].includes(k) &&
                  Number.isFinite(v),
              )
              .map(([k, v]) => [k, clamp(v, 0, 100000)]),
          )
        : {},
    birthday: /^\d{2}-\d{2}$/.test(input.birthday || "") ? input.birthday : "",
    celebrated: typeof input.celebrated === "string" ? input.celebrated : "",
    lastBreak: now,
    lastWater: now,
    lastAttention: now,
  };
}
function quiet(b, date) {
  const h = date.getHours();
  return b.quietStart === b.quietEnd
    ? false
    : b.quietStart < b.quietEnd
      ? h >= b.quietStart && h < b.quietEnd
      : h >= b.quietStart || h < b.quietEnd;
}
function season(date) {
  return [
    "winter",
    "winter",
    "spring",
    "spring",
    "spring",
    "summer",
    "summer",
    "summer",
    "autumn",
    "autumn",
    "autumn",
    "winter",
  ][date.getMonth()];
}
function snapshot(life, now = Date.now()) {
  const age = Math.max(0, Math.floor((now - life.bornAt) / DAY));
  return {
    ...life,
    age,
    growth: 0.84 + 0.16 * Math.pow(Math.min(age / 56, 1), 0.65),
    stage: age < 14 ? "baby" : age < 56 ? "young" : "adult",
    level: 1 + Math.floor(life.xp / 100),
    houseLevel:
      life.house < 25 ? 0 : life.house < 60 ? 1 : life.house < 100 ? 2 : 3,
    favorite:
      Object.entries(life.foods).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      "carrot",
  };
}
function tickLife(life, { now = Date.now(), activity = "idle" } = {}) {
  const minutes = clamp((now - life.lastTick) / 60000, 0, 5);
  life.lastTick = now;
  const sleeping = ["sleep", "home"].includes(activity);
  life.energy = clamp(life.energy + (sleeping ? 2.4 : -0.32) * minutes);
  life.hunger = clamp(life.hunger + 0.25 * minutes);
  life.mood = clamp(life.mood + (life.hunger > 80 ? -0.5 : -0.04) * minutes);
  return life;
}
function interact(life, kind) {
  if (kind === "pet") {
    life.friendship = clamp(life.friendship + 1);
    life.mood = clamp(life.mood + 4);
    life.xp += 2;
  }
  if (["play", "ball", "fish", "butterflies", "hide"].includes(kind)) {
    life.mood = clamp(life.mood + 3);
    life.energy = clamp(life.energy - 1);
  }
  if (kind === "angry") life.mood = clamp(life.mood - 3);
  return life;
}
function feedFood(life, food) {
  if (!["carrot", "cookie", "berries"].includes(food))
    throw new Error("Unknown food");
  life.foods[food] = (life.foods[food] || 0) + 1;
  life.hunger = clamp(life.hunger - 25);
  life.mood = clamp(life.mood + 8);
  life.xp += 3;
  return life;
}
function dateKey(now) {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function dailyGift(life, items, now = Date.now(), random = Math.random) {
  const key = dateKey(now);
  if (life.lastGift === key) return { ok: false, reason: "already" };
  life.lastGift = key;
  const options = items.filter((x) => !life.gifts.includes(x));
  if (options.length && random() < 0.65) {
    const id = options[Math.floor(random() * options.length)];
    life.gifts.push(id);
    return { ok: true, item: id, coins: 0 };
  }
  const coins = 15 + Math.floor(random() * 21);
  life.coins += coins;
  return { ok: true, coins };
}
function chooseActivity(
  life,
  b,
  {
    now = Date.now(),
    idle = 0,
    returned = false,
    weather = null,
    nearCursor = false,
    random = Math.random,
  } = {},
) {
  const date = new Date(now),
    isQuiet = quiet(b, date),
    hour = date.getHours();
  if (returned) {
    life.mood = clamp(life.mood + 5);
    return "excited";
  }
  if (b.zeroGravity) return "float";
  if (idle > 180 || (b.nightSleep && (hour >= 23 || hour < 7)))
    return snapshot(life, now).houseLevel ? "home" : "sleep";
  if (life.energy < 18) return "sleep";
  if (b.reminders && !isQuiet) {
    if (now - life.lastWater > b.waterMinutes * 60000) {
      life.lastWater = now;
      return "drink";
    }
    if (now - life.lastBreak > b.breakMinutes * 60000) {
      life.lastBreak = now;
      return "break";
    }
  }
  if (b.weatherReactions && weather?.ok && random() < 0.3) {
    if (weather.code >= 71 && weather.code <= 77) return "stretch";
    if (weather.code >= 51) return "umbrella";
    if (weather.temperature >= 29) return "fan";
  }
  const key = dateKey(now);
  if (
    life.birthday &&
    key.slice(5) === life.birthday &&
    life.celebrated !== key
  ) {
    life.celebrated = key;
    return "cake";
  }
  if (nearCursor && !isQuiet && random() < b.curious / 100) return "hunt";
  if (isQuiet) return random() < 0.6 ? "idle" : "read";
  if (life.hunger > 75) return "attention";
  if (
    now - life.lastAttention > 600000 &&
    random() < b.attentionFrequency / 100
  ) {
    life.lastAttention = now;
    return "attention";
  }
  if (random() < b.lazy / 160) return "sleep";
  if (random() < b.walkFrequency / 100) {
    if (b.transport !== "auto") return b.transport;
    return ["walk", "walk", "skate", "scooter", "jetpack"][
      Math.floor(random() * 5)
    ];
  }
  const options = [
    "idle",
    "play",
    "draw",
    "stretch",
    "build",
    "dance",
    ...(b.windowInteraction ? ["hide", "stand"] : []),
  ];
  return options[Math.floor(random() * options.length)];
}
export {
  ACTIVITIES,
  BEHAVIOR,
  sanitizeBehavior,
  createLife,
  snapshot,
  tickLife,
  interact,
  feedFood,
  dailyGift,
  chooseActivity,
  quiet,
  season,
  dateKey,
};
