const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { createWeather } = require("../src/weather.cjs");
test("weather resolves geocoding and current data, caches and deduplicates requests", async () => {
  let calls = 0;
  const service = createWeather({
    fetchImpl: async (url) => {
      calls++;
      return {
        ok: true,
        json: async () =>
          String(url).includes("geocoding")
            ? { results: [{ latitude: 50.45, longitude: 30.52, name: "Kyiv" }] }
            : { current: { temperature_2m: 14, weather_code: 61, is_day: 1 } },
      };
    },
  });
  const [a, b] = await Promise.all([
    service.get("Kyiv", "en"),
    service.get("Kyiv", "en"),
  ]);
  assert.equal(calls, 2);
  assert.deepEqual(a, b);
  assert.equal(a.code, 61);
  assert.equal(a.temperature, 14);
  assert.equal(a.city, "Kyiv");
  await service.get("Kyiv", "en");
  assert.equal(calls, 2);
});
test("no city does not make a network request; failures are explicit", async () => {
  const service = createWeather({
    fetchImpl: async () => {
      throw new Error("Offline");
    },
  });
  assert.equal((await service.get("")).needsCity, true);
  assert.equal((await service.get("Kyiv")).ok, false);
});
test("invalid coordinates never reach forecast request", async () => {
  let calls = 0;
  const service = createWeather({
    fetchImpl: async () => {
      calls++;
      return {
        ok: true,
        json: async () => ({ results: [{ latitude: 999, longitude: 30 }] }),
      };
    },
  });
  assert.equal((await service.get("Kyiv")).ok, false);
  assert.equal(calls, 1);
});
