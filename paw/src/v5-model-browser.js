// Generated from v5-model.cjs.
const THEMES = ["light", "dark", "ocean", "lavender", "rose", "sand", "coffee"];
const FOOD = {
  dog: ["kibble", "fish", "meat"],
  husky: ["kibble", "fish", "meat"],
  cat: ["fish", "meat"],
  croc: ["fish", "meat"],
  fox: ["fish", "berries", "meat"],
  kangaroo: ["carrot", "cabbage", "berries"],
  rabbit: ["carrot", "cabbage"],
  dinosaur: ["meat", "fish"],
  owl: ["grain", "worms", "fish"],
};
const FOOD_NAMES = {
  fish: ["Рыба", "Риба", "Fish"],
  meat: ["Мясо", "М’ясо", "Meat"],
  kibble: ["Корм", "Корм", "Kibble"],
  carrot: ["Морковь", "Морква", "Carrot"],
  cabbage: ["Капуста", "Капуста", "Cabbage"],
  berries: ["Ягоды", "Ягоди", "Berries"],
  grain: ["Зерно", "Зерно", "Grain"],
  worms: ["Червячки", "Хробачки", "Worms"],
};
const clamp = (n, min, max, fallback) =>
  Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
function extraSettings(input = {}) {
  const names = {};
  for (const skin of Object.keys(FOOD))
    if (skin !== "husky" && typeof input.names?.[skin] === "string")
      names[skin] = input.names[skin]
        .replace(/[\x00-\x1f\x7f]/g, "")
        .trim()
        .slice(0, 32);
  return {
    welcomeVersion: input.welcomeVersion === "0.5" ? "0.5" : null,
    languageConfirmed: input.languageConfirmed === true || input.welcomeVersion === "0.5",
    names,
    theme: THEMES.includes(input.theme) ? input.theme : "light",
    uiMode: input.uiMode === "detailed" ? "detailed" : "simple",
    glass: input.glass !== false,
    windowOpacity: clamp(input.windowOpacity, 0.65, 1, 1),
    glassOpacity: clamp(input.glassOpacity, 0.55, 1, 0.9),
    toyDistance: clamp(input.toyDistance, 30, 200, 90),
    showHouse: input.showHouse !== false,
    shortcuts: Array.isArray(input.shortcuts)
      ? input.shortcuts
          .slice(0, 24)
          .filter(
            (s) =>
              s &&
              typeof s.path === "string" &&
              s.path.length < 4096 &&
              !s.path.includes("\0"),
          )
          .map((s) => ({
            path: s.path,
            name: String(s.name || "App").slice(0, 100),
          }))
      : input.shortcut
        ? [input.shortcut]
        : [],
    player:
      input.player &&
      typeof input.player.path === "string" &&
      input.player.path.length < 4096 &&
      !input.player.path.includes("\0")
        ? {
            path: input.player.path,
            name: String(input.player.name || "Player").slice(0, 100),
          }
        : null,
    browser:
      input.browser &&
      typeof input.browser.path === "string" &&
      input.browser.path.length < 4096 &&
      !input.browser.path.includes("\0")
        ? {
            path: input.browser.path,
            name: String(input.browser.name || "Browser").slice(0, 100),
          }
        : null,
  };
}
// Window margins may be outside the work area; the visible animal may not.
function clampVisiblePosition(position, area, rect) {
  return {
    x: Math.round(
      Math.max(
        area.x - rect.x,
        Math.min(position.x, area.x + area.width - rect.x - rect.width),
      ),
    ),
    y: Math.round(
      Math.max(
        area.y - rect.y,
        Math.min(position.y, area.y + area.height - rect.y - rect.height),
      ),
    ),
  };
}
function restActivity(
  idleMs,
  rest = { since: null, sleepUntil: null, wokeAt: null },
  now = Date.now(),
) {
  if (idleMs < 20000)
    return {
      activity: null,
      rest: { since: null, sleepUntil: null, wokeAt: null },
    };
  if (rest.wokeAt && now - rest.wokeAt < 90000)
    return { activity: "wake", rest };
  if (rest.sleepUntil) {
    if (now >= rest.sleepUntil)
      return {
        activity: "wake",
        rest: { since: now, sleepUntil: null, wokeAt: now },
      };
    return { activity: "curl", rest };
  }
  const since = rest.since ?? now,
    elapsed = now - since;
  if (elapsed < 25000) return { activity: "sit", rest: { ...rest, since } };
  if (elapsed < 45000) return { activity: "groom", rest: { ...rest, since } };
  if (elapsed < 55000) return { activity: "yawn", rest: { ...rest, since } };
  return {
    activity: "curl",
    rest: { since, sleepUntil: now + 600000, wokeAt: null },
  };
}
function stock(input = {}) {
  const defaults = {
    fish: 3,
    meat: 3,
    kibble: 3,
    carrot: 3,
    cabbage: 3,
    berries: 3,
    grain: 3,
    worms: 8,
    seed: 12,
    wood: 0,
    stone: 0,
  };
  return Object.fromEntries(
    Object.entries(defaults).map(([k, v]) => [
      k,
      Number.isFinite(input[k]) ? Math.floor(clamp(input[k], 0, 100000, v)) : v,
    ]),
  );
}
function feedInventory(life, skin, food) {
  if (!FOOD[skin]?.includes(food))
    return {
      ok: false,
      code: "DIET",
      message: "Этот корм не подходит питомцу.",
    };
  life.inventory = stock(life.inventory);
  if (!life.inventory[food])
    return {
      ok: false,
      code: "EMPTY",
      message: "Еда закончилась. Добудь её в играх.",
    };
  life.inventory[food]--;
  life.hunger = Math.max(0, life.hunger - 28);
  life.mood = Math.min(100, life.mood + 10);
  life.foods[food] = (life.foods[food] || 0) + 1;
  life.xp += 4;
  return { ok: true };
}
export {
  THEMES,
  FOOD,
  FOOD_NAMES,
  extraSettings,
  clampVisiblePosition,
  restActivity,
  stock,
  feedInventory,
};
