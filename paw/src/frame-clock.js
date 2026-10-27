// A drift-corrected frame budget. Anchoring every frame to `now` aliases a
// 45 FPS budget to 30 on a 60 Hz display, and tiny RAF jitter can halve 60 FPS.
// This clock advances an ideal deadline, with a sub-millisecond tolerance.
export function createFrameClock() {
  let lastTick = null, lastRate = null;
  return {
    tick(now, fps) {
      if (!Number.isFinite(now) || !Number.isFinite(fps) || fps <= 0) return false;
      const interval = 1000 / Math.min(240, fps);
      if (lastTick === null || lastRate !== fps || now < lastTick - interval) {
        lastTick = now; lastRate = fps; return true;
      }
      const elapsed = now - lastTick;
      if (elapsed + Math.min(.65, interval * .05) < interval) return false;
      // A restored/backgrounded window renders one fresh frame, never a burst
      // of missed historical frames. Ordinary RAF jitter retains its cadence.
      lastTick = elapsed > interval * 4 ? now : lastTick + interval;
      return true;
    },
    reset() { lastTick = lastRate = null; },
  };
}
