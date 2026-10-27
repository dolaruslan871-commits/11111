// Continuous facial intent shared by every species. No timers, random rolls,
// allocations of textures, or saved game mutations occur in the render loop.
export const EMOTION_NAMES = Object.freeze([
  "content", "curious", "joy", "affection", "drowsy", "sleeping", "bored",
  "lonely", "relieved", "proud", "focused", "startled", "playful", "hungry",
  "annoyed", "peaceful",
]);

const CHANNELS = ["smile", "eyeOpen", "eyeSoftness", "brow", "earLift", "headTilt", "breath", "excitement", "gazeFocus", "tension"];
const PROFILE_VALUES = {
  content:  [.15, .92, .20, 0,     0,     0,     .35, .10, .50, .05],
  curious:  [.10, 1,   .05, .28,   .55,   .08,   .40, .22, .95, .10],
  joy:      [.85, .82, .65, .25,   .55,   .025,  .50, .75, .60, .02],
  affection:[.70, .62, .90, -.15,  .05,  -.07,   .42, .30, .75, .01],
  drowsy:   [.08, .48, .80, -.25, -.28,  -.025,  .22, .02, .18, .01],
  sleeping: [.10, .10, 1,   -.35, -.40,  -.035,  .16, 0,   0,   0],
  bored:    [-.12,.66, .52, -.12, -.34,   .025,  .26, .03, .18, .10],
  lonely:   [-.30,.74, .58, -.45, -.46,  -.055,  .30, .06, .52, .25],
  relieved: [.45, .72, .68, -.10, -.02,  -.015,  .30, .12, .45, .01],
  proud:    [.55, .86, .25, .12,   .40,   .015,  .45, .34, .72, .03],
  focused:  [.02, .81, .05, -.05,  .28,   .02,   .35, .12, 1,   .18],
  startled: [-.12,1,   0,   .90,   .90,  -.025,  .65, .88, 1,   .80],
  playful:  [.62, .97, .20, .35,   .70,   .065,  .58, .68, .90, .08],
  hungry:   [-.15,.84, .35, -.25, -.12,  -.015,  .32, .16, .72, .18],
  annoyed:  [-.55,.62, .08, -.72, -.50,   .035,  .48, .32, .85, .62],
  peaceful: [.28, .72, .72, -.18, -.12,  -.025,  .24, .02, .25, 0],
};
export const EMOTION_PROFILES = Object.freeze(Object.fromEntries(
  Object.entries(PROFILE_VALUES).map(([name, values]) => [name,
    Object.freeze(Object.fromEntries(CHANNELS.map((channel, index) => [channel, values[index]]))),
  ]),
));

const clamp = (value, min = 0, max = 1, fallback = min) => Number.isFinite(value)
  ? Math.max(min, Math.min(max, value)) : fallback;
const smoothstep = (low, high, value) => {
  const x = clamp((value - low) / (high - low));
  return x * x * (3 - 2 * x);
};

// Resolving a target is deterministic: repeated state broadcasts cannot pick a
// different face, and a quiet pet's expression gradually follows its needs.
export function resolveEmotion(state = {}) {
  if (!state || typeof state !== "object") state = {};
  const life = state.life || {};
  const memory = life.autonomy || {};
  const energy = clamp(life.energy, 0, 100, 80);
  const hunger = clamp(life.hunger, 0, 100, 25);
  const mood = clamp(life.mood, 0, 100, 75);
  const friendship = clamp(life.friendship, 0, 100, 5);
  const weights = Object.fromEntries(EMOTION_NAMES.map(name => [name, 0]));
  const add = (name, amount) => { weights[name] += Math.max(0, amount); };
  add("content", .55 + clamp(memory.comfort, 0, 100, 65) / 150);
  add("peaceful", .12 + clamp(memory.calmAffinity, 0, 100, 50) / 300);
  add("drowsy", 1.2 * (1 - smoothstep(15, 55, energy)));
  add("hungry", .95 * smoothstep(55, 95, hunger));
  add("bored", .8 * smoothstep(15, 70, clamp(memory.boredom, 0, 100, 12)));
  add("lonely", .7 * smoothstep(20, 80, clamp(memory.loneliness, 0, 100, 5)));
  add("lonely", .65 * (1 - smoothstep(15, 50, mood)));
  add("affection", friendship / 500);
  add("joy", clamp(memory.greeting, 0, 1) * 2.8);
  const phase = state.motion?.phase || state.activity || "idle";
  const activity = state.activity || "idle";
  const sleeping = ["sleep", "curl", "home"].includes(activity) && !state.approachingHouse;
  if (sleeping) {
    for (const name of EMOTION_NAMES) weights[name] *= .05;
    add("sleeping", 8);
  } else if (["held", "fall", "falling"].includes(phase)) {
    add("startled", phase === "held" ? 1.5 : 3.2);
    add("curious", .7);
  } else if (phase === "parachute") {
    add("relieved", 2.5);
    add("curious", 1.2);
  } else if (["land", "landing"].includes(phase)) {
    add("relieved", 2.2);
    add("proud", .9);
  } else {
    const activityEmotions = {
      pet: ["affection", 4], grateful: ["affection", 3.5],
      play: ["playful", 3], ball: ["playful", 3], butterflies: ["curious", 3],
      hunt: ["focused", 2.4], fish: ["focused", 2.5], detective: ["curious", 2.8],
      excited: ["joy", 3.6], wave: ["joy", 2.5], cake: ["joy", 3],
      dance: ["playful", 2.8], roll: ["playful", 2.5], "chase-tail": ["playful", 3],
      eat: ["relieved", 2.5], drink: ["relieved", 2],
      yawn: ["drowsy", 4], wake: ["drowsy", 2],
      groom: ["peaceful", 2.5], sit: ["peaceful", 1.5], perch: ["peaceful", 1.6],
      stretch: ["relieved", 2], break: ["peaceful", 1.8],
      sad: ["lonely", 3.5], angry: ["annoyed", 4],
      carry: ["proud", 2.5], build: ["focused", 2.5],
      draw: ["focused", 2.5], read: ["focused", 2.4], gamepad: ["focused", 2.5],
      sniff: ["curious", 2.5], stand: ["curious", 2], chirp: ["joy", 2],
      skate: ["proud", 2], scooter: ["playful", 2], jetpack: ["startled", 1.2],
    };
    const intent = activityEmotions[activity];
    if (intent) add(intent[0], intent[1]);
  }
  const sum = Object.values(weights).reduce((total, weight) => total + weight, 0) || 1;
  for (const name of EMOTION_NAMES) weights[name] /= sum;
  const channels = Object.fromEntries(CHANNELS.map(channel => [channel,
    EMOTION_NAMES.reduce((value, name) => value + EMOTION_PROFILES[name][channel] * weights[name], 0),
  ]));
  const dominant = EMOTION_NAMES.reduce((best, name) => weights[name] > weights[best] ? name : best, "content");
  return { weights, channels, dominant };
}

export function createEmotionMixer(initialState = {}, { response = 1.15 } = {}) {
  let current = resolveEmotion(initialState);
  const tau = clamp(response, .6, 2.5, 1.15);
  return {
    update(deltaSeconds, state = initialState) {
      const target = resolveEmotion(state);
      // Use elapsed time rather than a per-frame lerp. A resumed tab advances at
      // most 100ms, so suspend/resume cannot instantly snap the face to a new one.
      const dt = clamp(deltaSeconds, 0, .1);
      const amount = 1 - Math.exp(-dt / tau);
      for (const name of EMOTION_NAMES)
        current.weights[name] += (target.weights[name] - current.weights[name]) * amount;
      for (const name of CHANNELS)
        current.channels[name] += (target.channels[name] - current.channels[name]) * amount;
      current.dominant = EMOTION_NAMES.reduce((best, name) => current.weights[name] > current.weights[best] ? name : best, "content");
      return current;
    },
    snapshot() {
      return { weights: { ...current.weights }, channels: { ...current.channels }, dominant: current.dominant };
    },
    reset(state = initialState) { current = resolveEmotion(state); return current; },
  };
}
