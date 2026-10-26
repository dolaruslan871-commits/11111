let audio;
export function petSound(skin, muted) {
  if (muted) return;
  try {
    audio ||= new AudioContext();
    audio.resume();
    const notes = skin === 'dog' ? [[210, .00, .12], [170, .17, .13]] : skin === 'cat' ? [[680, .00, .35]] : [[90, .00, .23], [65, .23, .2]];
    for (const [frequency, delay, duration] of notes) {
      const oscillator = audio.createOscillator(), gain = audio.createGain(), time = audio.currentTime + delay;
      oscillator.type = skin === 'cat' ? 'sine' : 'triangle';
      oscillator.frequency.setValueAtTime(frequency, time);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * .55, time + duration);
      gain.gain.setValueAtTime(0, time); gain.gain.linearRampToValueAtTime(.09, time + .015); gain.gain.exponentialRampToValueAtTime(.001, time + duration);
      oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(time); oscillator.stop(time + duration + .02);
    }
  } catch {}
}
