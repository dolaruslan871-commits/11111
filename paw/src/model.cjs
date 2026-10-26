const { ACTIVITIES, sanitizeBehavior } = require("./life.cjs");
const SKINS = new Set([
  "fox",
  "husky",
  "dog",
  "cat",
  "croc",
  "kangaroo",
  "dinosaur",
  "owl",
  "rabbit",
]);
const STATES = new Set([
  ...ACTIVITIES,
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
]);
const OPTIONS = Object.fromEntries(
  Object.entries(require("./catalog.json").wardrobe).map(([key, entries]) => [
    key,
    entries.map((entry) => entry.id),
  ]),
);
const DEFAULTS = {
  skin: "dog",
  muted: false,
  roaming: true,
  alwaysOnTop: true,
  language: "ru",
  theme: "light",
  scale: 1,
  feedMode: "eat",
  behavior: sanitizeBehavior(),
  companion: null,
  autostart: false,
  shortcut: null,
  weatherCity: "",
  outfit: Object.fromEntries(Object.keys(OPTIONS).map((key) => [key, "none"])),
};
function sanitizeSettings(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) input = {};
  const outfit = {};
  for (const [key, values] of Object.entries(OPTIONS))
    outfit[key] = values.includes(input.outfit?.[key])
      ? input.outfit[key]
      : "none";
  return {
    behavior: sanitizeBehavior(input.behavior),
    companion: SKINS.has(input.companion) ? input.companion : null,
    autostart: input.autostart === true,
    skin: SKINS.has(input.skin) ? input.skin : DEFAULTS.skin,
    muted: typeof input.muted === "boolean" ? input.muted : false,
    roaming: typeof input.roaming === "boolean" ? input.roaming : true,
    alwaysOnTop:
      typeof input.alwaysOnTop === "boolean" ? input.alwaysOnTop : true,
    language: ["ru", "uk", "en"].includes(input.language)
      ? input.language
      : "ru",
    theme: input.theme === "dark" ? "dark" : "light",
    scale:
      typeof input.scale === "number" && Number.isFinite(input.scale)
        ? Math.max(0.6, Math.min(1.6, input.scale))
        : 1,
    feedMode: input.feedMode === "carry" ? "carry" : "eat",
    shortcut: sanitizeShortcut(input.shortcut),
    weatherCity:
      typeof input.weatherCity === "string"
        ? input.weatherCity.trim().slice(0, 120)
        : "",
    outfit,
  };
}
function sanitizeShortcut(value) {
  if (
    !value ||
    typeof value !== "object" ||
    typeof value.path !== "string" ||
    !value.path ||
    value.path.length > 4096 ||
    value.path.includes("\0")
  )
    return null;
  return {
    path: value.path,
    name: typeof value.name === "string" ? value.name.slice(0, 100) : "",
  };
}
function petWindowSize(scale = 1) {
  return { width: Math.round(430 * scale), height: Math.round(390 * scale) };
}
function clampPosition(position, area, size) {
  return {
    x: Math.round(
      Math.max(
        area.x,
        Math.min(position.x, area.x + Math.max(0, area.width - size.width)),
      ),
    ),
    y: Math.round(
      Math.max(
        area.y,
        Math.min(position.y, area.y + Math.max(0, area.height - size.height)),
      ),
    ),
  };
}
module.exports = {
  SKINS,
  STATES,
  OPTIONS,
  DEFAULTS,
  sanitizeSettings,
  clampPosition,
  petWindowSize,
};
