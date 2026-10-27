import test from "node:test";
import assert from "node:assert/strict";
import { GRAPHICS_PROFILES, graphicsProfile } from "../src/graphics-quality.js";

test("detail budgets rise predictably without removing the Ultra frame cap", () => {
  const profiles = Object.values(GRAPHICS_PROFILES);
  assert.equal(profiles.length, 4);
  for (let i = 1; i < profiles.length; i++) {
    for (const property of ["detailFactor", "furDensity", "maxFur", "textureSize", "shadowSize", "dpr"]) {
      assert.ok(profiles[i][property] >= profiles[i - 1][property], property);
    }
  }
  assert.ok(profiles.every((value) => value.maxFPS <= 60));
  assert.ok(profiles.every((value) => value.maxFur <= 12000));
  assert.ok(Object.isFrozen(GRAPHICS_PROFILES));
  assert.ok(profiles.every(Object.isFrozen));
});

test("missing, inherited or corrupt quality values choose the usable High default", () => {
  for (const value of [undefined, null, [], {}, { graphicsQuality: "toString" }, { graphicsQuality: "not-a-profile" }]) {
    const result = graphicsProfile(value);
    assert.equal(result.id, "high");
    assert.equal(result.dpr, 1);
  }
});

test("Retina resolution obeys the selected profile without raising geometry budgets", () => {
  const low = graphicsProfile({ graphicsQuality: "low" }, { devicePixelRatio: 3 });
  const high = graphicsProfile({ graphicsQuality: "high" }, { devicePixelRatio: 3 });
  const ultra = graphicsProfile({ graphicsQuality: "ultra" }, { devicePixelRatio: 3 });
  assert.equal(low.dpr, 1);
  assert.equal(high.dpr, 2);
  assert.equal(ultra.dpr, 2.5);
  assert.equal(low.maxFur, 0);
  assert.equal(low.physicalMaterials, false);
  assert.equal(low.detailFactor, GRAPHICS_PROFILES.low.detailFactor);
  assert.equal(graphicsProfile({ graphicsQuality: "ultra" }, { devicePixelRatio: 0.75 }).dpr, 0.75);
});

test("invalid device ratios and context never leak NaN or Infinity into renderer settings", () => {
  for (const ratio of [NaN, Infinity, -1, 0, "2", null, undefined]) {
    const result = graphicsProfile({ graphicsQuality: "ultra" }, { devicePixelRatio: ratio });
    assert.equal(result.dpr, 1);
    for (const value of Object.values(result)) {
      if (typeof value === "number") assert.ok(Number.isFinite(value));
    }
  }
  assert.equal(graphicsProfile({}, null).id, "high");
});

test("2K maps are reserved for explicit Ultra studio or large capture output", () => {
  assert.equal(graphicsProfile({ graphicsQuality: "ultra" }, { devicePixelRatio: 4 }).textureSize, 1024);
  assert.equal(graphicsProfile({ graphicsQuality: "ultra" }, { captureWidth: 1023 }).textureSize, 1024);
  assert.equal(graphicsProfile({ graphicsQuality: "ultra" }, { captureWidth: 1024 }).textureSize, 2048);
  assert.equal(graphicsProfile({ graphicsQuality: "ultra", studioQuality: true }).textureSize, 2048);
  assert.equal(graphicsProfile({ graphicsQuality: "high", studioQuality: true }, { captureWidth: 4096 }).textureSize, 1024);
  assert.equal(graphicsProfile({ graphicsQuality: "low", studioQuality: true }, { captureWidth: 4096 }).textureSize, 256);
});

test("battery saving reduces pixel and frame costs without silently relabelling quality", () => {
  const result = graphicsProfile({ graphicsQuality: "ultra" }, { devicePixelRatio: 3, batterySaving: true });
  assert.equal(result.id, "ultra");
  assert.equal(result.dpr, 1.5);
  assert.equal(result.maxFPS, 30);
  assert.equal(result.detailFactor, GRAPHICS_PROFILES.ultra.detailFactor);
});

test("Reduce Motion limits decorative redraws but preserves essential motion", () => {
  const decorative = graphicsProfile({}, { reducedMotion: true });
  const essential = graphicsProfile({}, { reducedMotion: true, essentialMotion: true });
  assert.equal(decorative.maxFPS, 15);
  assert.equal(essential.maxFPS, 30);
  assert.equal(graphicsProfile({}, { hidden: true, essentialMotion: true }).maxFPS, 0);
});

test("adapting one render cannot mutate another instance's profile", () => {
  const adapted = graphicsProfile({ graphicsQuality: "ultra", studioQuality: true }, { batterySaving: true });
  adapted.textureSize = 8;
  adapted.maxFPS = 2;
  assert.equal(graphicsProfile({ graphicsQuality: "ultra" }).textureSize, 1024);
  assert.equal(graphicsProfile({ graphicsQuality: "ultra" }).maxFPS, 60);
});
