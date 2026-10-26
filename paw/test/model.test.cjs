const test = require('node:test');
const assert = require('node:assert/strict');
const { DEFAULTS, OPTIONS, sanitizeSettings, clampPosition } = require('../src/model.cjs');

test('missing and malformed settings become safe defaults', () => {
  assert.deepEqual(sanitizeSettings(), DEFAULTS);
  for (const malformed of [null, [], false, 12, 'not settings']) {
    assert.deepEqual(sanitizeSettings(malformed), DEFAULTS);
  }
  assert.deepEqual(sanitizeSettings({
    skin: '<script>alert(1)</script>',
    muted: 'false',
    roaming: 0,
    outfit: { hat: '../../file', glasses: 'unknown', scarf: true, toy: [] },
    unexpected: 'not retained',
  }), DEFAULTS);
  assert.deepEqual(sanitizeSettings({ outfit: null }), DEFAULTS);
});

test('all supported skins and outfit combinations survive persistence sanitization', () => {
  for (const skin of ['dog', 'cat', 'croc']) {
    for (const hat of OPTIONS.hat) {
      for (const glasses of OPTIONS.glasses) {
        for (const scarf of OPTIONS.scarf) {
          for (const toy of OPTIONS.toy) {
            const settings = { skin, muted: true, roaming: false, outfit: { hat, glasses, scarf, toy } };
            assert.deepEqual(sanitizeSettings(JSON.parse(JSON.stringify(settings))), settings);
          }
        }
      }
    }
  }
});

test('one invalid outfit choice leaves independent valid choices intact', () => {
  assert.deepEqual(sanitizeSettings({
    skin: 'cat', muted: true, roaming: false,
    outfit: { hat: 'party', glasses: 'broken', scarf: 'sage', toy: 'ball' },
  }), {
    skin: 'cat', muted: true, roaming: false,
    outfit: { hat: 'party', glasses: 'none', scarf: 'sage', toy: 'ball' },
  });
});

test('sanitized settings do not share mutable outfit data with persisted input or defaults', () => {
  const original = { outfit: { hat: 'beanie', glasses: 'round', scarf: 'coral', toy: 'bone' } };
  const sanitized = sanitizeSettings(original);
  sanitized.outfit.hat = 'party';
  assert.equal(original.outfit.hat, 'beanie');
  const fresh = sanitizeSettings();
  fresh.outfit.scarf = 'sage';
  assert.equal(DEFAULTS.outfit.scarf, 'none');
  assert.equal(sanitizeSettings().outfit.scarf, 'none');
});

test('pet stays inside a secondary display with negative desktop coordinates', () => {
  const monitor = { x: -1920, y: -200, width: 1920, height: 1080 };
  const pet = { width: 246, height: 250 };
  assert.deepEqual(clampPosition({ x: -2200, y: -400 }, monitor, pet), { x: -1920, y: -200 });
  assert.deepEqual(clampPosition({ x: 100, y: 1000 }, monitor, pet), { x: -246, y: 630 });
  assert.deepEqual(clampPosition({ x: -900, y: 150 }, monitor, pet), { x: -900, y: 150 });
});

test('a display smaller than the pet uses the display origin without reversing bounds', () => {
  const monitor = { x: -300, y: 80, width: 160, height: 180 };
  const pet = { width: 246, height: 250 };
  assert.deepEqual(clampPosition({ x: 1000, y: -2000 }, monitor, pet), { x: -300, y: 80 });
  assert.deepEqual(clampPosition({ x: -500, y: 900 }, monitor, pet), { x: -300, y: 80 });
});

test('display bounds reserve the full pet size and round fractional movement', () => {
  const monitor = { x: 0, y: 24, width: 1440, height: 876 };
  const pet = { width: 246, height: 250 };
  assert.deepEqual(clampPosition({ x: 1439, y: 899 }, monitor, pet), { x: 1194, y: 650 });
  assert.deepEqual(clampPosition({ x: 100.4, y: 100.8 }, monitor, pet), { x: 100, y: 101 });
});
