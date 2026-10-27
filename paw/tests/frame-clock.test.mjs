import test from 'node:test';
import assert from 'node:assert/strict';
import { createFrameClock } from '../src/frame-clock.js';
function run(fps, frames = 240) {
  const clock = createFrameClock(); let count = 0;
  for (let i = 0; i < frames; i++) count += Number(clock.tick(i * 1000 / 60 + [0, -.24, .31, -.18, .17][i % 5], fps));
  return count;
}
test('60 Hz RAF jitter retains essentially every 60 FPS frame', () => {
  assert.ok(run(60) >= 238, String(run(60))); assert.ok(run(60) <= 240);
});
test('45 FPS budget does not alias to 30 FPS on a 60 Hz display', () => {
  assert.ok(Math.abs(run(45) - 180) <= 1, String(run(45)));
});
test('30 FPS and Reduce Motion 15 FPS budgets remain bounded', () => {
  assert.ok(Math.abs(run(30) - 120) <= 1); assert.ok(Math.abs(run(15) - 60) <= 1);
});
test('long suspension renders once without catch-up bursts', () => {
  const c = createFrameClock(); assert.equal(c.tick(0, 60), true); assert.equal(c.tick(5000, 60), true);
  for (let i = 0; i < 10; i++) assert.equal(c.tick(5000 + i / 10, 60), false);
});
test('invalid budgets and times never render or poison the clock', () => {
  const c = createFrameClock();
  for (const [n, f] of [[0, 0], [0, -1], [NaN, 60], [0, Infinity]]) assert.equal(c.tick(n, f), false);
  assert.equal(c.tick(1, 60), true); assert.equal(c.tick(1, 60), false);
});
test('profile and visibility changes restart cleanly', () => {
  const c = createFrameClock(); assert.equal(c.tick(100, 60), true); assert.equal(c.tick(101, 30), true);
  assert.equal(c.tick(110, 30), false); c.reset(); assert.equal(c.tick(110, 30), true);
});
