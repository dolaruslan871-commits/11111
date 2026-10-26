const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { sanitizeSettings, SKINS, clampPosition } = require("../src/model.cjs");
const { sanitizeTasks, dueTasks } = require("../src/productivity.cjs");
const { createDesktopTools } = require("../src/desktop-tools.cjs");
test("0.3 settings migrate while new behavior gets defaults", () => {
  const s = sanitizeSettings({
    skin: "owl",
    theme: "dark",
    outfit: { hat: "beanie" },
    shortcut: { path: "/Applications/Finder.app", name: "Finder" },
  });
  assert.equal(s.skin, "owl");
  assert.equal(s.theme, "dark");
  assert.equal(s.outfit.hat, "beanie");
  assert.equal(s.shortcut.name, "Finder");
  assert.equal(s.behavior.curious, 65);
  assert.equal(s.companion, null);
  assert.equal(SKINS.size, 9);
});
test("malformed settings cannot produce invalid sizes or species", () => {
  const s = sanitizeSettings({
    scale: Infinity,
    skin: "bad",
    companion: "bad",
    outfit: { hat: "unknown" },
  });
  assert.equal(s.scale, 1);
  assert.equal(s.skin, "dog");
  assert.equal(s.companion, null);
  assert.equal(s.outfit.hat, "none");
  assert.deepEqual(
    clampPosition(
      { x: 999, y: -10 },
      { x: 0, y: 0, width: 1000, height: 800 },
      { width: 430, height: 390 },
    ),
    { x: 570, y: 0 },
  );
});
test("tasks preserve IDs, safely cap text, and notify once", () => {
  const tasks = sanitizeTasks([
    { id: "one", text: "x".repeat(1500), due: 100 },
    { id: "two", text: "later", due: 300 },
    { id: "three", text: "done", due: 100, done: true },
  ]);
  assert.equal(tasks[0].text.length, 1000);
  assert.deepEqual(
    dueTasks(tasks, 200).map((x) => x.id),
    ["one"],
  );
  tasks[0].notified = true;
  assert.equal(dueTasks(tasks, 200).length, 0);
});
test("device metrics return real counters and honest unavailable sensors", () => {
  const m = createDesktopTools().metrics();
  assert.ok(m.memoryTotal > 0);
  assert.ok(m.memoryUsed >= 0);
  assert.ok(m.cpu >= 0 && m.cpu <= 100);
  assert.equal(m.temperature, null);
});
test("media rejects arbitrary commands; Windows uses encoded allowlisted key events", async () => {
  const calls = [];
  const tools = createDesktopTools({
    platform: "win32",
    execute: async (f, args) => {
      calls.push({ f, args });
      return "";
    },
  });
  await assert.rejects(tools.media("rm -rf"));
  await tools.media("next");
  assert.equal(calls.length, 1);
  const script = Buffer.from(calls[0].args.at(-1), "base64").toString(
    "utf16le",
  );
  assert.match(script, /176/);
  assert.equal(calls[0].args.at(-2), "-EncodedCommand");
});
test("battery parses macOS percentage and charging state", async () => {
  const tools = createDesktopTools({
    platform: "darwin",
    execute: async () =>
      "Now drawing from 'Battery Power'\n -InternalBattery-0 64%; discharging; 2:00 remaining",
  });
  assert.deepEqual(await tools.battery(), {
    supported: true,
    percent: 64,
    charging: false,
  });
});
test("browser life engine is generated from same tested pure source", () => {
  const fs = require("node:fs");
  const source = fs
    .readFileSync(require.resolve("../src/life.cjs"), "utf8")
    .replace(/module\.exports\s*=\s*\{/, "export {");
  const browser = fs.readFileSync(
    require.resolve("../src/life-browser.js"),
    "utf8",
  );
  assert.ok(browser.endsWith(source));
});
