// Original, self-contained animal-inspired voices. These are synthesized sounds,
// not recordings (the dinosaur voice is deliberately imaginary).
let audio, output;
let requestId = 0, lastStarted = -Infinity, lastKey = '';
const voices = new Set(), buffers = new Map();
const TAU = Math.PI * 2;
const SKINS = new Set(['fox','husky','dog', 'cat', 'croc', 'kangaroo', 'dinosaur', 'owl', 'rabbit']);
const clock = () => globalThis.performance?.now?.() ?? Date.now();

function context() {
  if (audio?.state === 'closed') { audio = null; buffers.clear(); }
  if (audio) return audio;
  const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!Audio) return null;
  audio = new Audio({ latencyHint: 'interactive' });
  // Keep voices quiet, remove sub-bass, and limit the sum of overlapping calls.
  const highpass = audio.createBiquadFilter();
  highpass.type = 'highpass'; highpass.frequency.value = 110; highpass.Q.value = .5;
  const limiter = audio.createDynamicsCompressor();
  limiter.threshold.value = -18; limiter.knee.value = 12; limiter.ratio.value = 8;
  limiter.attack.value = .005; limiter.release.value = .13;
  output = audio.createGain(); output.gain.value = .58;
  output.connect(highpass); highpass.connect(limiter); limiter.connect(audio.destination);
  return audio;
}

function release(voice) {
  if (!voices.has(voice)) return;
  voices.delete(voice);
  try {
    const now = audio.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
    voice.gain.gain.linearRampToValueAtTime(0, now + .025);
    voice.source.stop(now + .03);
  } catch { voice.source.disconnect(); voice.gain.disconnect(); }
}

/** Silence an in-flight call as well as calls waiting for audio permission. */
export function stopPetSounds() {
  requestId++;
  for (const voice of [...voices]) release(voice);
  lastStarted = -Infinity; lastKey = '';
}

/** Call from a pointer/key gesture to unlock audio without playing a sound. */
export function unlockPetAudio() {
  try {
    const ctx = context();
    if (ctx?.state === 'suspended') return ctx.resume().catch(() => {});
  } catch {}
}

function smooth(value) { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); }
function envelope(t, duration, attack = .018, release = .06) {
  return smooth(t / attack) * smooth((duration - t) / release);
}
function interpolate(points, t) {
  for (let i = 1; i < points.length; i++) {
    if (t <= points[i][0]) {
      const [a, x] = points[i - 1], [b, y] = points[i];
      return x + (y - x) * smooth((t - a) / (b - a));
    }
  }
  return points.at(-1)[1];
}

function synthesize(skin, emotion) {
  const key = `${skin}:${emotion}`;
  if (buffers.has(key)) return buffers.get(key);
  const rate = audio.sampleRate, duration = skin === 'cat' ? .98 : skin === 'owl' ? 1.06 : .82;
  const buffer = audio.createBuffer(1, Math.ceil(rate * duration), rate);
  const samples = buffer.getChannelData(0);
  const gentle = emotion === 'sad' ? .6 : emotion === 'pet' ? .8 : 1;
  let seed = 9137;
  for (const letter of key) seed = (seed * 31 + letter.charCodeAt(0)) >>> 0;
  const noise = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2147483648 - 1; };

  function voiced(start, length, pitch, level, formants = [900, 1800], vibrato = .008) {
    let phase = 0;
    const offset = Math.round(start * rate), count = Math.min(Math.ceil(length * rate), samples.length - offset);
    for (let i = 0; i < count; i++) {
      const t = i / rate, position = t / length;
      const fundamental = interpolate(pitch, position) * (1 + vibrato * Math.sin(TAU * 6.1 * t));
      phase += TAU * fundamental / rate;
      let sample = 0, weight = 0;
      // Smooth harmonic excitation through two broad vocal resonances. Unlike
      // the previous falling sawtooth, it never drops into a buzzy bass sweep.
      for (let harmonic = 1; harmonic <= 9; harmonic++) {
        const frequency = fundamental * harmonic;
        if (frequency >= rate * .46) break;
        const resonance = formants.reduce((sum, center) => sum + Math.exp(-.5 * ((frequency - center) / (center * .26)) ** 2), 0);
        const amplitude = (.24 + resonance) / harmonic ** 1.15;
        sample += Math.sin(phase * harmonic) * amplitude;
        weight += amplitude;
      }
      samples[offset + i] += sample / weight * level * gentle * envelope(t, length);
    }
  }

  function breath(start, length, level, frequency, quality = .8, pulse = 0) {
    // Band-pass turbulence gives barks their consonant and snuffles their air.
    const omega = TAU * frequency / rate, alpha = Math.sin(omega) / (2 * quality), a0 = 1 + alpha;
    const b0 = alpha / a0, b2 = -alpha / a0, a1 = -2 * Math.cos(omega) / a0, a2 = (1 - alpha) / a0;
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    const offset = Math.round(start * rate), count = Math.min(Math.ceil(length * rate), samples.length - offset);
    for (let i = 0; i < count; i++) {
      const x = noise(), y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2;
      x2 = x1; x1 = x; y2 = y1; y1 = y;
      const t = i / rate, flutter = pulse ? .45 + .55 * (.5 + .5 * Math.sin(TAU * pulse * t)) : 1;
      samples[offset + i] += y * level * gentle * envelope(t, length, .025, .065) * flutter;
    }
  }

  function hoot(start, length, frequency, level) {
    let phase = 0;
    const offset = Math.round(start * rate), count = Math.min(Math.ceil(length * rate), samples.length - offset);
    for (let i = 0; i < count; i++) {
      const t = i / rate;
      phase += TAU * frequency * (1 + .008 * Math.sin(TAU * 4 * t)) / rate;
      const air = .012 * noise();
      samples[offset + i] += (Math.sin(phase) + .09 * Math.sin(phase * 2) + air) * level * gentle * envelope(t, length, .055, .1);
    }
  }

  switch (skin) {
    case 'fox':
    case 'husky':
    case 'dog': {
      const barks = emotion === 'sad' || emotion === 'pet' ? [0] : [0, .28];
      for (const start of barks) {
        voiced(start, .205, [[0, 350], [.22, 390], [.62, 325], [1, 285]], .27, [690, 1550], .012);
        breath(start, .14, .19, 1500, .65);
      }
      break;
    }
    case 'cat':
      if (emotion === 'pet') {
        // Soft, pulsed breath rather than a low oscillator makes a gentle purr.
        breath(0, .8, .13, 650, .6, 26);
        voiced(.08, .64, [[0, 280], [.5, 290], [1, 270]], .025, [550, 1100], .004);
      } else {
        voiced(0, .76, [[0, 510], [.17, 720], [.45, 650], [.72, 480], [1, 390]], .29, [950, 2250], .016);
        breath(.02, .2, .055, 2800, .75);
      }
      break;
    case 'croc':
      // Crocodilians do not bark or meow; keep this a short, airy huff.
      breath(0, .31, .2, 460, .65);
      breath(.33, .23, .12, 850, .8);
      break;
    case 'kangaroo':
      voiced(0, .19, [[0, 740], [.4, 970], [1, 720]], .13, [1200, 2500], .025);
      breath(.21, .27, .08, 1450, .8, 19);
      break;
    case 'dinosaur':
      voiced(0, .24, [[0, 680], [.3, 1150], [1, 810]], .2, [1600, 3000], .025);
      voiced(.29, .3, [[0, 920], [.4, 1300], [1, 670]], .17, [1600, 3000], .02);
      break;
    case 'owl':
      hoot(0, .27, 510, .22);
      hoot(.36, .52, 430, .25);
      break;
    case 'rabbit':
      // Rabbits are usually quiet. Tiny nasal snuffles, not a cartoon scream.
      breath(0, .12, .065, 2100, 1.2);
      breath(.19, .17, .05, 1700, 1.1);
      break;
  }
  // Avoid accidental clipping even before the output limiter, without lifting
  // the naturally quiet rabbit and crocodile to the volume of a bark.
  for (let i = 0; i < samples.length; i++) samples[i] = .42 * Math.tanh(samples[i] / .42);
  buffers.set(key, buffer);
  return buffer;
}

export function petSound(skin, muted, emotion = 'happy') {
  if (muted || emotion === 'sleep') { stopPetSounds(); return; }
  const id = ++requestId, requestedAt = clock();
  skin = SKINS.has(skin) ? skin : 'dog';
  emotion = ['pet', 'sad', 'angry', 'excited', 'happy'].includes(emotion) ? emotion : 'happy';
  try {
    const ctx = context();
    if (!ctx) return;
    const play = () => {
      // Never replay a call much later when a blocked AudioContext is unlocked.
      if (id !== requestId || clock() - requestedAt > 1500 || ctx.state !== 'running') return;
      const key = `${skin}:${emotion}`, now = ctx.currentTime;
      if (now - lastStarted < (key === lastKey ? .8 : .32)) return;
      while (voices.size >= 2) release(voices.values().next().value);
      const source = ctx.createBufferSource(), gain = ctx.createGain();
      source.buffer = synthesize(skin, emotion);
      source.connect(gain); gain.connect(output);
      const voice = { source, gain };
      voices.add(voice);
      source.onended = () => { voices.delete(voice); source.disconnect(); gain.disconnect(); };
      source.start(now + .012);
      lastStarted = now; lastKey = key;
    };
    if (ctx.state === 'running') play();
    else if (ctx.state === 'suspended') ctx.resume().then(play).catch(() => {});
  } catch { /* Audio is optional; unavailable devices must not freeze the UI. */ }
}
