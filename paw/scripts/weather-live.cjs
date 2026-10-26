const assert = require("node:assert/strict");
const { createWeather } = require("../src/weather.cjs");
(async () => {
  const result = await createWeather().get("Kyiv", "en");
  assert.equal(result.ok, true, result.message);
  assert.ok(Number.isFinite(result.temperature));
  assert.ok(Number.isFinite(result.code));
  console.log(
    "LIVE WEATHER PASS:",
    result.city,
    result.temperature,
    "°C, WMO",
    result.code,
  );
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
