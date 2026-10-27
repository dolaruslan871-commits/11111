// Desktop coordinates are Electron device-independent pixels, including negative
// monitor origins. Rendering and OS discovery are deliberately outside this model.
const finite = (v, fallback = 0) => Number.isFinite(v) ? v : fallback;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(v, Math.max(lo, hi)));
const smooth = (t) => t * t * (3 - 2 * t);
function geometry(area, rect, scale = 1) {
  const k = clamp(finite(scale, 1), .1, 4);
  return {
    left: finite(area.x) - finite(rect.x) * k,
    right: finite(area.x) + Math.max(1, finite(area.width, 1)) - (finite(rect.x) + Math.max(1, finite(rect.width, 1))) * k,
    top: finite(area.y) - finite(rect.y) * k,
    floor: finite(area.y) + Math.max(1, finite(area.height, 1)) - (finite(rect.y) + Math.max(1, finite(rect.height, 1))) * k,
    footX: (finite(rect.x) + Math.max(1, finite(rect.width, 1)) / 2) * k,
    footY: (finite(rect.y) + Math.max(1, finite(rect.height, 1))) * k,
    height: Math.max(1, finite(rect.height, 1)) * k,
  };
}
function clampBody(position, area, rect, scale) {
  const g = geometry(area, rect, scale);
  return { x: clamp(finite(position.x), g.left, g.right), y: clamp(finite(position.y), g.top, g.floor) };
}
function newMotion(position = { x: 0, y: 0 }, now = 0) {
  return { phase: 'grounded', position: { ...position }, velocity: { x: 0, y: 0 }, canopy: 0, since: now, perch: null };
}
function hold(position, now) {
  return { ...newMotion(position, now), phase: 'held' };
}
function perchTarget(window, point, context) {
  if (!window || window.visible === false || window.minimized || !window.bounds) return null;
  const w = window.bounds;
  if (![w.x,w.y,w.width,w.height].every(Number.isFinite) || w.width < 60 || w.height < 35) return null;
  const g = geometry(context.area, context.rect, context.scale);
  // A maximized window has no space above its title bar; do not cut off the pet.
  const y = w.y - g.footY;
  if (y < g.top - 1 || y > g.floor + 1) return null;
  const foot = clamp(point.x, w.x + 20, w.x + w.width - 20);
  return { x: clamp(foot - g.footX, g.left, g.right), y };
}
function windowAt(windows, point, context) {
  for (const window of windows || []) {
    const w = window.bounds;
    if (!w || point.x < w.x || point.x > w.x + w.width || point.y < w.y || point.y > w.y + w.height) continue;
    // OS enumeration is front-to-back. An occluding window cannot be ignored
    // merely because a lower window would offer more headroom.
    return perchTarget(window, point, context) ? window : null;
  }
  return null;
}
function release(state, { area, rect, scale = 1, point, windows = [], now }) {
  const position = clampBody(state.position, area, rect, scale);
  const g = geometry(area, rect, scale);
  const drop = point || { x: position.x + g.footX, y: position.y + g.footY };
  const target = windowAt(windows, drop, { area, rect, scale });
  if (target) {
    return {
      ...state, phase: 'perch', position, velocity: { x: 0, y: 0 }, canopy: 0, since: now,
      perch: { id: String(target.id), offsetX: clamp(drop.x - target.bounds.x, 20, target.bounds.width - 20), from: { ...position }, caughtAt: now },
    };
  }
  const height = g.floor - position.y;
  return { ...state, phase: height <= 1 ? 'land' : 'fall', position, velocity: { x: clamp(state.velocity.x, -100, 100), y: 0 }, canopy: 0, since: now, perch: null };
}
function step(state, seconds, { area, rect, scale = 1, windows = [], windowsKnown = true, now }) {
  const dt = clamp(finite(seconds), 0, .05); // Resume must never teleport through a surface.
  if (!dt || ['grounded', 'held'].includes(state.phase)) return state;
  const g = geometry(area, rect, scale);
  if (state.phase === 'perch') {
    const support = windows.find(window => String(window.id) === state.perch.id);
    const target = support && perchTarget(support, { x: support.bounds.x + state.perch.offsetX }, { area, rect, scale });
    if (!target) {
      if (!windowsKnown) return state; // One slow OS response is not a closed window.
      return release({ ...state, phase: 'held' }, { area, rect, scale, windows: [], now });
    }
    const p = clamp((now - state.perch.caughtAt) / 280, 0, 1);
    const ease = smooth(p);
    let position = p < 1
      ? { x: state.perch.from.x + (target.x - state.perch.from.x) * ease, y: state.perch.from.y + (target.y - state.perch.from.y) * ease }
      : { x: state.position.x + (target.x - state.position.x) * (1 - Math.exp(-18 * dt)), y: state.position.y + (target.y - state.position.y) * (1 - Math.exp(-18 * dt)) };
    if (Math.hypot(position.x-target.x,position.y-target.y)<.1) position={...target};
    return { ...state, position, canopy: Math.max(0, state.canopy - dt * 4), velocity: { x: 0, y: 0 } };
  }
  if (state.phase === 'land') {
    const age = (now - state.since) / 1000;
    const canopy = age >= .44 ? 0 : Math.max(0, state.canopy - dt * 3.2);
    return { ...state, phase: age >= .44 ? 'grounded' : 'land', canopy, position: clampBody({ ...state.position, y: g.floor }, area, rect, scale), velocity: { x: 0, y: 0 } };
  }
  const elapsed = now - state.since;
  const height = g.floor - state.position.y;
  // Small drops simply settle; larger drops get a short natural fall before
  // the canopy opens, then a capped descent (DIP/sec independent of FPS).
  const opening = state.phase === 'parachute' || (elapsed >= 90 && height > 28);
  const canopy = opening ? Math.min(1, state.canopy + dt * 3.6) : 0;
  const terminal = 90 * Math.sqrt(clamp(finite(scale, 1), .6, 1.6));
  let velocityY, travelled;
  if (opening) {
    const averageCanopy = (state.canopy + canopy) / 2;
    const drag = 3 + 12 * averageCanopy;
    const gravity = 1050 * (1 - averageCanopy) ** 2;
    const response = Math.exp(-drag * dt);
    const equilibrium = terminal + gravity / drag;
    velocityY = equilibrium + (state.velocity.y - equilibrium) * response;
    travelled = equilibrium * dt + (state.velocity.y - equilibrium) * (1 - response) / drag;
  } else {
    velocityY = Math.min(760, state.velocity.y + 1050 * dt);
    travelled = (state.velocity.y + velocityY) * .5 * dt;
  }
  const velocityX = state.velocity.x * Math.exp(-dt * (opening ? 5 : 2));
  const position = clampBody({ x: state.position.x + velocityX * dt, y: state.position.y + travelled }, area, rect, scale);
  const oldFoot = state.position.y + g.footY, newFoot = position.y + g.footY;
  const footX = position.x + g.footX;
  const crossings = windows.filter(window => window.bounds && oldFoot <= window.bounds.y && newFoot >= window.bounds.y && footX >= window.bounds.x && footX <= window.bounds.x + window.bounds.width)
    .sort((a,b) => a.bounds.y - b.bounds.y);
  for (const support of crossings) {
    const contact = { x: footX, y: support.bounds.y + 1 };
    if (windowAt(windows, contact, { area, rect, scale })?.id !== support.id) continue;
    const target = perchTarget(support, contact, { area, rect, scale });
    if (!target) continue;
    return { ...state, phase: 'perch', position: target, canopy, velocity: { x: 0, y: 0 }, since: now,
      perch: { id: String(support.id), offsetX: footX - support.bounds.x, from: { ...target }, caughtAt: now } };
  }
  if (position.y >= g.floor - .1) return { ...state, phase: 'land', position: { ...position, y: g.floor }, velocity: { x: 0, y: 0 }, canopy, since: now, perch: null };
  return { ...state, phase: opening ? 'parachute' : 'fall', position, velocity: { x: velocityX, y: velocityY }, canopy };
}
function publicMotion(state) {
  return { phase: state.phase, canopy: state.canopy, velocity: { ...state.velocity }, windowId: state.perch?.id || null };
}
module.exports = { geometry, clampBody, newMotion, hold, windowAt, perchTarget, release, step, publicMotion };
