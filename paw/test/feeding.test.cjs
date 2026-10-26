const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createFeeder } = require('../src/feeding.cjs');
const file = name => path.resolve('fake-files', name);
const stats = { isFile: () => true, isSymbolicLink: () => false };
const missing = () => Object.assign(new Error('missing'), { code: 'ENOENT' });
function fixture(overrides = {}) {
  const available = new Map([[file('a.txt'), stats], [file('b.txt'), stats]]), phases = [], calls = [], waits = [];
  const feeder = createFeeder({
    lstat: async p => { if (!available.has(p)) throw missing(); return available.get(p); },
    trash: async p => { calls.push(p); available.delete(p); },
    wait: async ms => { waits.push(ms); }, onPhase: value => phases.push(value), ...overrides,
  });
  return { feeder, available, phases, calls, waits };
}
test('eat animates first, deduplicates inputs and confirms actual source disappearance', async () => {
  const f = fixture();
  const result = await f.feeder.feed([file('a.txt'), file('a.txt'), file('b.txt')]);
  assert.equal(result.ok, true); assert.equal(result.count, 2);
  assert.deepEqual(f.calls, [file('a.txt'), file('b.txt')]);
  assert.deepEqual(f.waits, [800]);
  assert.equal(f.phases[0].phase, 'working'); assert.equal(f.phases[0].mode, 'eat');
  assert.equal(f.phases.at(-1).phase, 'done');
});
test('carry uses its distinct animation before using the same reversible trash API', async () => {
  const f = fixture();
  assert.equal((await f.feeder.feed([file('a.txt')], { mode: 'carry' })).ok, true);
  assert.deepEqual(f.waits, [1500]); assert.equal(f.phases[0].mode, 'carry');
});
test('an empty native File path is rejected rather than pretending it was eaten', async () => {
  const f = fixture();
  for (const bad of [[], [''], ['relative.txt'], ['https://example.com/file'], 'file', new Array(21).fill(file('a.txt'))]) {
    const result = await f.feeder.feed(bad); assert.equal(result.ok, false);
  }
  assert.deepEqual(f.calls, []); assert.deepEqual(f.waits, []);
});
test('folders and symbolic links reject the whole batch before any file is moved', async () => {
  for (const unsafe of [{ isFile: () => false, isSymbolicLink: () => false }, { isFile: () => true, isSymbolicLink: () => true }]) {
    const f = fixture(); f.available.set(file('b.txt'), unsafe);
    assert.equal((await f.feeder.feed([file('a.txt'), file('b.txt')])).ok, false);
    assert.deepEqual(f.calls, []); assert.equal(f.available.has(file('a.txt')), true);
  }
});
test('chooser cancellation does not animate, trash or request confirmation', async () => {
  let choices = 0;
  const f = fixture({ chooseFiles: async owner => { choices++; assert.equal(owner, 'owner'); return { canceled: true }; } });
  const result = await f.feeder.feed(null, { owner: 'owner' });
  assert.deepEqual(result, { ok: false, canceled: true }); assert.equal(choices, 1);
  assert.deepEqual(f.phases, []); assert.deepEqual(f.calls, []);
});
test('partial native errors report the real completed count and leave remaining files', async () => {
  const f = fixture();
  const feeder = createFeeder({ lstat: async p => { if (!f.available.has(p)) throw missing(); return stats; },
    trash: async p => { if (p === file('b.txt')) throw Object.assign(new Error('denied'), { code: 'EACCES' }); f.available.delete(p); },
    wait: async () => {}, onPhase: phase => f.phases.push(phase) });
  const result = await feeder.feed([file('a.txt'), file('b.txt')]);
  assert.equal(result.ok, false); assert.equal(result.count, 1);
  assert.match(result.message, /разрешения/); assert.equal(f.available.has(file('b.txt')), true);
  assert.equal(f.phases.at(-1).phase, 'error');
});
test('a native operation resolving without moving its source is not reported as success', async () => {
  const f = fixture({ trash: async () => {} });
  const result = await f.feeder.feed([file('a.txt')]);
  assert.equal(result.ok, false); assert.equal(result.count, 0); assert.match(result.message, /на месте/);
});
test('busy feeder does not process the same drop twice', async () => {
  let finishAnimation;
  const f = fixture({ wait: () => new Promise(resolve => { finishAnimation = resolve; }) });
  const first = f.feeder.feed([file('a.txt')]);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.feeder.isBusy(), true);
  const duplicate = await f.feeder.feed([file('a.txt')]); assert.equal(duplicate.ok, false);
  finishAnimation(); assert.equal((await first).ok, true);
  assert.equal(f.calls.length, 1); assert.equal(f.feeder.isBusy(), false);
});
test('missing files fail validation with no trash side effects', async () => {
  const f = fixture(); const result = await f.feeder.feed([file('missing.txt')]);
  assert.equal(result.ok, false); assert.match(result.message, /не существует/); assert.deepEqual(f.calls, []);
});
