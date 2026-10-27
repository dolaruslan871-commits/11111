import {petAge} from './pet-calendar.js';
import {personality} from './activity-policy.js';
// Deterministic pet life simulation. All dates are local; progress is saved by main.
const DAY = 86400000;
const ACTIVITIES = [
  "idle",
  "sit",
  "groom",
  "yawn",
  "curl",
  "wake",
  "grateful",
  "sniff",
  "scratch",
  "shake",
  "roll",
  "chirp",
  "walk",
  "sleep",
  "eat",
  "play",
  "hunt",
  "pet",

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
  "held",
  "fall",
  "parachute",
  "land",
  "perch",
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
    homeUpgrades: Number.isInteger(input.homeUpgrades) ? Math.max(0, Math.min(3, input.homeUpgrades)) : 0,
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
                  [
                    "carrot",
                    "cookie",
                    "berries",
                    "fish",
                    "meat",
                    "kibble",
                    "cabbage",
                    "grain",
                    "worms",
                  ].includes(k) && Number.isFinite(v),
              )
              .map(([k, v]) => [k, clamp(v, 0, 100000)]),
          )
        : {},
    birthday: /^\d{2}-\d{2}$/.test(input.birthday || "") ? input.birthday : "",
    celebrated: typeof input.celebrated === "string" ? input.celebrated : "",
    lastBreak: now,
    lastWater: now,
    lastAttention: now,
    autonomy: createAutonomy(input.autonomy, now),
  };
}

// A small, versioned memory is additive to the existing progress file. Currency,
// inventory, age and the established need decay rates are deliberately unchanged.
function createAutonomy(input = {}, now = Date.now()) {
  if (!input || typeof input !== "object" || Array.isArray(input)) input = {};
  const timestamp = (key) => Number.isFinite(input[key])
    ? Math.max(0, Math.min(now, input[key])) : 0;
  return {
    version: 1,
    updatedAt: now,
    lastInteractionAt: timestamp("lastInteractionAt") || now,
    lastWelcomeAt: timestamp("lastWelcomeAt"),
    comfort: clamp(input.comfort ?? 65),
    boredom: clamp(input.boredom ?? 12),
    loneliness: clamp(input.loneliness ?? 5),
    playAffinity: clamp(input.playAffinity ?? 50),
    calmAffinity: clamp(input.calmAffinity ?? 50),
    // Runtime edges must not survive a restart as an unfinished greeting/nap.
    idleSeconds: 0,
    away: false,
    pendingWelcome: false,
    welcomeUntil: 0,
    reunionStage: null,
    restSince: 0,
    sleepSince: 0,
    wakeUntil: 0,
    managedActivity: null,
    activity: "idle",
    activitySince: now,
  };
}

function observeAutonomy(life, { now = Date.now(), idle, activity = "idle" } = {}) {
  if (!life.autonomy || life.autonomy.version !== 1)
    life.autonomy = createAutonomy(life.autonomy, now);
  const memory = life.autonomy;
  const seconds = Math.max(0, Math.min(300, (now - memory.updatedAt) / 1000 || 0));
  memory.updatedAt = now;
  const minutes = seconds / 60;
  if (memory.activity !== activity) {
    memory.activity = activity;
    memory.activitySince = now;
    if (memory.managedActivity !== activity && !(memory.managedActivity === "curl" && activity === "home"))
      memory.managedActivity = null;
  }
  if (Number.isFinite(idle)) {
    const nextIdle = Math.max(0, Math.min(86400, idle));
    if (nextIdle >= 45) memory.away = true;
    if (memory.away && nextIdle < 2 && memory.idleSeconds >= 45) {
      memory.away = false;
      if (!memory.lastWelcomeAt || now - memory.lastWelcomeAt >= 90000) {
        memory.pendingWelcome = true;
        memory.lastWelcomeAt = now;
        memory.welcomeUntil = now + 10000;
        memory.loneliness = Math.max(0, memory.loneliness - 3);
        // Preserve the established return-home mood bonus, once per return.
        life.mood = clamp(life.mood + 5);
      }
    }
    memory.idleSeconds = nextIdle;
  }
  const sleeping = ["sleep", "home", "curl"].includes(activity);
  const engaged = ["play", "ball", "fish", "butterflies", "gamepad", "draw", "dance", "hunt", "pet", "groom", "sniff", "chase-tail"].includes(activity);
  memory.boredom = clamp(memory.boredom + (sleeping ? -.18 : engaged ? -3.5 : 2) * minutes);
  const unattended = now - memory.lastInteractionAt > 5 * 60000;
  memory.loneliness = clamp(memory.loneliness + (activity === "pet" ? -4 : unattended ? (memory.away ? .08 : .22) : -.3) * minutes);
  const comfortTarget = clamp(life.mood * .62 + (100 - life.hunger) * .20 + life.energy * .18);
  memory.comfort += (comfortTarget - memory.comfort) * (1 - Math.exp(-seconds / 900));
  if (memory.pendingWelcome && now > memory.welcomeUntil) memory.pendingWelcome = false;
  return memory;
}

// Return only a scheduled transition. Calling this every native tick does not
// roll random choices or restart an animation; explicit actions retain priority.
function autonomousDecision(life, behavior = BEHAVIOR, {
  now = Date.now(), idle = 0, activity = "idle", activityUntil = 0, blocked = false,
} = {}) {
  const memory = observeAutonomy(life, { now, idle, activity });
  if (blocked || ["held", "fall", "falling", "parachute", "land", "landing", "perch"].includes(activity)) return null;
  const result = (next, duration, reason) => {
    memory.managedActivity = next;
    return { activity: next, duration, reason };
  };
  const busy = ["eat", "carry", "grateful", "pet", "cake", "gift", "attention", "drink", "break"].includes(activity) && now < activityUntil;
  if (busy) return null;
  if (memory.pendingWelcome) {
    memory.pendingWelcome = false;
    memory.restSince = 0;
    memory.sleepSince = 0;
    if (["sleep", "home", "curl", "yawn"].includes(activity)) {
      memory.reunionStage = "wake";
      return result("wake", 2600, "return-wake");
    }
    memory.reunionStage = null;
    return result("wave", 5200, "return-greeting");
  }
  if (memory.reunionStage === "wake") {
    if (now < activityUntil) return null;
    memory.reunionStage = null;
    return result("wave", 5200, "return-greeting");
  }
  const owned = memory.managedActivity === activity || (memory.managedActivity === "curl" && activity === "home");
  if (!owned && now < activityUntil) return null;
  if (idle < 14 + personality(behavior).active * 38 - personality(behavior).lazy * 8) {
    const wasResting = memory.restSince > 0 || memory.sleepSince > 0;
    memory.restSince = 0;
    memory.sleepSince = 0;
    memory.wakeUntil = 0;
    if (wasResting && owned && ["sit", "groom", "yawn", "curl", "sleep", "home"].includes(activity))
      return result("wake", 2600, "gentle-wake");
    return null;
  }
  if (memory.wakeUntil > now) {
    if (activity !== "wake") return result("wake", memory.wakeUntil - now, "rest-stretch");
    return null;
  }
  if (!memory.restSince) memory.restSince = now;
  const elapsed = now - memory.restSince;
  let next = elapsed < 25000 ? "sit" : elapsed < 47000 ? "groom" : elapsed < 58000 ? "yawn" : "curl";
  if (["curl", "sleep", "home"].includes(next)) {
    if (!memory.sleepSince) memory.sleepSince = now;
    // A rested friend occasionally wakes and stretches even when nobody moves
    // the mouse. It does not get trapped forever in a 650-second forced action.
    if (now - memory.sleepSince >= 600000 && life.energy >= 72) {
      memory.restSince = 0;
      memory.sleepSince = 0;
      memory.wakeUntil = now + 15000;
      return result("wake", 15000, "rest-cycle");
    }
  }
  if (next === activity || (next === "curl" && activity === "home")) return null;
  // Avoid overriding a just-started explicit action with an automatic pose.
  if (!owned && now - memory.activitySince < 6000) return null;
  return result(next, 650000, "rest-sequence");
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
  const ageInfo=petAge(life.bornAt,now);
  return {
    ...life,
    autonomy: {
      ...(life.autonomy || createAutonomy({}, now)),
      greeting: clamp(((life.autonomy?.welcomeUntil || 0) - now) / 100, 0, 100) / 100,
    },
    ...ageInfo,
    level: 1 + Math.floor(life.xp / 100),
    houseLevel:
      life.house < 25 ? 0 : life.house < 60 ? 1 : life.house < 100 ? 2 : 3,
    favorite:
      Object.entries(life.foods).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      "carrot",
  };
}
function tickLife(life, { now = Date.now(), activity = "idle", idle } = {}) {
  const minutes = clamp((now - life.lastTick) / 60000, 0, 5);
  life.lastTick = now;
  const sleeping = ["sleep", "home", "curl"].includes(activity);
  life.energy = clamp(life.energy + (sleeping ? 2.4 : -0.32) * minutes);
  life.hunger = clamp(life.hunger + 0.25 * minutes);
  life.mood = clamp(life.mood + (life.hunger > 80 ? -0.5 : -0.04) * minutes);
  observeAutonomy(life, { now, idle, activity });
  return life;
}
function interact(life, kind, now = Date.now()) {
  const memory = observeAutonomy(life, { now, activity: kind });
  memory.lastInteractionAt = now;
  memory.boredom = Math.max(0, memory.boredom - 1);
  if (kind === "pet") {
    memory.loneliness = Math.max(0, memory.loneliness - 2);
    memory.calmAffinity = clamp(memory.calmAffinity + .2);
  }
  if (["play", "ball", "fish", "butterflies", "hide"].includes(kind))
    memory.playAffinity = clamp(memory.playAffinity + .3);
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
  const traits = personality(b);
  if (random() < traits.lazy * .72 + (1-traits.active)*.18)
    return random() < traits.lazy * .6 ? 'curl' : 'sit';
  if (random() < traits.curious * .22) return 'sniff';
  if (random() < traits.active * .32) return 'play';
  const memory = life.autonomy || createAutonomy({}, now);
  // Boredom and remembered play preference alter probabilities slowly, without
  // changing any rewards, need rates, or manually selected activities.
  if (memory.boredom > 35 && random() < Math.min(.7, .2 + memory.boredom / 200))
    return random() < .55 ? "play" : "sniff";
  if (life.mood < 35 && random() < .45) return random() < .5 ? "groom" : "sit";
  if (random() < b.lazy / 160 && life.energy < 65) return "yawn";
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
    "groom",
    "sniff",
    "sit",
    ...(memory.playAffinity > 60 ? ["play", "play"] : []),
    ...(memory.calmAffinity > 60 ? ["groom", "sit"] : []),

  ];
  return options[Math.floor(random() * options.length)];
}
export {
  ACTIVITIES,
  BEHAVIOR,
  sanitizeBehavior,
  createLife,
  createAutonomy,
  observeAutonomy,
  autonomousDecision,
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
