const SKINS = new Set(['dog', 'cat', 'croc']);
const STATES = new Set(['idle', 'walk', 'sleep', 'eat', 'play', 'hunt', 'pet', 'stand', 'wave', 'stretch', 'sad', 'excited', 'carry']);
const OPTIONS = Object.fromEntries(Object.entries(require('./catalog.json').wardrobe).map(([key, entries]) => [key, entries.map(entry => entry.id)]));
const DEFAULTS = { skin: 'dog', muted: false, roaming: true, alwaysOnTop: true, language: 'ru', theme: 'light', scale: 1, feedMode: 'eat', outfit: Object.fromEntries(Object.keys(OPTIONS).map(key => [key, 'none'])) };
function sanitizeSettings(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) input = {};
  const outfit = {};
  for (const [key, values] of Object.entries(OPTIONS)) outfit[key] = values.includes(input.outfit?.[key]) ? input.outfit[key] : 'none';
  return { skin: SKINS.has(input.skin) ? input.skin : DEFAULTS.skin, muted: typeof input.muted === 'boolean' ? input.muted : false, roaming: typeof input.roaming === 'boolean' ? input.roaming : true,
    alwaysOnTop: typeof input.alwaysOnTop === 'boolean' ? input.alwaysOnTop : true,
    language: ['ru','uk','en'].includes(input.language) ? input.language : 'ru', theme: input.theme === 'dark' ? 'dark' : 'light',
    scale: typeof input.scale === 'number' && Number.isFinite(input.scale) ? Math.max(.6, Math.min(1.6, input.scale)) : 1,
    feedMode: input.feedMode === 'carry' ? 'carry' : 'eat', outfit };
}
function petWindowSize(scale = 1) { return { width: Math.round(430 * scale), height: Math.round(390 * scale) }; }
function clampPosition(position, area, size) {
  return {
    x: Math.round(Math.max(area.x, Math.min(position.x, area.x + Math.max(0, area.width - size.width)))),
    y: Math.round(Math.max(area.y, Math.min(position.y, area.y + Math.max(0, area.height - size.height)))),
  };
}
module.exports = { SKINS, STATES, OPTIONS, DEFAULTS, sanitizeSettings, clampPosition, petWindowSize };
