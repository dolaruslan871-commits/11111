const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { createSystemControls } = require("../src/system-controls.cjs");
test("Linux reports unavailable device controls without inventing statuses", async () => {
  const system = createSystemControls({ platform: "linux" });
  const s = await system.getStatus();
  assert.equal(s.audio.supported, false);
  assert.equal(s.bluetooth.enabled, null);
  await assert.rejects(system.setAudio(true));
  await assert.rejects(system.setBluetooth(true));
});
test("macOS audio uses real mute state and verifies readback", async () => {
  let muted = "false",
    calls = [];
  const system = createSystemControls({
    platform: "darwin",
    execFile: (file, args, opts, cb) => {
      calls.push({ file, args });
      const text = args.join(" ");
      if (file.includes("blueutil")) {
        const e = new Error("missing");
        e.code = "ENOENT";
        return cb(e);
      }
      if (text.includes("set volume output muted"))
        muted = text.includes("muted true") ? "true" : "false";
      cb(null, muted);
    },
  });
  assert.equal((await system.getStatus()).audio.enabled, true);
  assert.equal((await system.setAudio(false)).audio.enabled, false);
  assert.ok(
    calls.some((x) =>
      x.args.join(" ").includes("set volume output muted true"),
    ),
  );
});
test("device control rejects nonboolean toggles", async () => {
  const s = createSystemControls();
  await assert.rejects(s.setAudio("yes"), TypeError);
  await assert.rejects(s.setBluetooth("no"), TypeError);
});

test(
  "Windows runner compiles the actual Core Audio COM interop without muting hardware",
  { skip: process.platform !== "win32" },
  () => {
    const { AUDIO_CS } = require("../src/system-controls.cjs");
    const script =
      "$ErrorActionPreference = 'Stop'; Add-Type -TypeDefinition @'\n" + AUDIO_CS + "\n'@\n'COMPILE_OK'";
    const text = require("node:child_process").execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-EncodedCommand",
        Buffer.from(script, "utf16le").toString("base64"),
      ],
      { encoding: "utf8", timeout: 30000 },
    );
    assert.match(text, /COMPILE_OK/);
  },
);
