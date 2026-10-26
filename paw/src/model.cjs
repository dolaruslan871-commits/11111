const SKINS = new Set(['dog', 'cat', 'croc']);
const STATES = new Set(['idle', 'walk', 'sleep', 'eat', 'play', 'hunt', 'pet']);
const OPTIONS = {
  hat: ['none', 'beanie', 'party'],
  glasses: ['none', 'round', 'sun'],
  scarf: ['none', 'coral', 'sage'],
  toy: ['none', 'bone', 'ball'],
};
const DEFAULTS = { skin: 'dog', muted: false, roaming: true, outfit: { hat: 'none', glasses: 'none', scarf: 'none', toy: 'none' } };
function sanitizeSettings(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) input = {};
  const outfit = {};
  for (const [key, values] of Object.entries(OPTIONS)) outfit[key] = values.includes(input.outfit?.[key]) ? input.outfit[key] : 'none';
  return { skin: SKINS.has(input.skin) ? input.skin : DEFAULTS.skin, muted: typeof input.muted === 'boolean' ? input.muted : false, roaming: typeof input.roaming === 'boolean' ? input.roaming : true, outfit };
}
function clampPosition(position, area, size) {
  return {
    x: Math.round(Math.max(area.x, Math.min(position.x, area.x + Math.max(0, area.width - size.width)))),
    y: Math.round(Math.max(area.y, Math.min(position.y, area.y + Math.max(0, area.height - size.height)))),
  };
}
module.exports = { SKINS, STATES, OPTIONS, DEFAULTS, sanitizeSettings, clampPosition };
