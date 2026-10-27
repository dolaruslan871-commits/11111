// Shared rules for native autonomy, the preview and the animated rig.
const ACTIONS = ['idle','sit','sleep','curl','groom','yawn','wake','grateful','pet','play','walk','dance','sniff','scratch','shake','roll','chirp','skate','scooter','jetpack','float','excited','sad','angry','chase-tail','hunt','stretch','wave','ear-scratch','nose-boop','draw','fish','butterflies','ball','detective','gift','build','home','umbrella','fan','read','gamepad','cake','attention','drink','break','eat','carry'];
const TRAVEL = new Set(['walk','hunt','skate','scooter','jetpack','float','carry']);
const PHYSICS = new Set(['held','fall','parachute','land','perch']);
function sanitizeActions(value) {
  if (!Array.isArray(value)) return [...ACTIONS];
  const selected = ACTIONS.filter(id => value.includes(id));
  return selected.length ? selected : ['idle'];
}
function allowedActions(settings = {}) {
  const actions = sanitizeActions(settings.allowedActivities);
  const valid = settings.roaming === false ? actions.filter(id => !TRAVEL.has(id)) : actions;
  return valid.length ? valid : ['idle'];
}
function resolveActivity(request, settings = {}, temporary = false) {
  if (PHYSICS.has(request)) return request;
  if (request === 'hide') request = 'idle';
  // Care completes normally even if its decorative action was deselected.
  if (temporary && ['eat','carry','build','gift','grateful'].includes(request)) return request;
  const actions = allowedActions(settings);
  return actions.includes(request) ? request : actions.includes('idle') ? 'idle' : actions[0];
}
function personality(behavior = {}) {
  const unit = (key, fallback) => Math.max(0, Math.min(1, (behavior[key] ?? fallback) / 100));
  const active = unit('active',55), lazy = unit('lazy',30), curious = unit('curious',65);
  return {active,lazy,curious,pace:.45 + active * 1.2 - lazy * .2,
    alertness: .25 + curious * .65 - lazy * .16,
    restWeight: .1 + lazy * 1.8 + (1-active) * .6};
}
function personalityActivity(key, behavior = {}) {
  if (key === 'lazy') return behavior.lazy >= 65 ? 'curl' : behavior.lazy >= 30 ? 'sit' : 'play';
  if (key === 'curious') return behavior.curious >= 45 ? 'sniff' : 'sit';
  if (key === 'walkFrequency') return behavior.walkFrequency >= 50 ? 'walk' : 'sit';
  if (key === 'attentionFrequency') return behavior.attentionFrequency >= 50 ? 'wave' : 'idle';
  return behavior.active >= 65 ? 'play' : behavior.active <= 30 ? 'sit' : 'stretch';
}
export {ACTIONS,TRAVEL,PHYSICS,sanitizeActions,allowedActions,resolveActivity,personality,personalityActivity};
