function createWeather({ fetchImpl = globalThis.fetch, now = Date.now } = {}) {
  const cache = new Map(),
    pending = new Map();
  async function request(city, language) {
    const geocode = new URL("https://geocoding-api.open-meteo.com/v1/search");
    geocode.search = new URLSearchParams({
      name: city,
      count: "1",
      language: ["ru", "uk", "en"].includes(language) ? language : "en",
      format: "json",
    }).toString();
    const read = async (url) => {
      const response = await fetchImpl(url, {
        signal: AbortSignal.timeout(6500),
      });
      if (!response.ok) throw new Error("Weather service unavailable");
      return response.json();
    };
    const place = (await read(geocode)).results?.[0];
    if (
      !place ||
      !Number.isFinite(place.latitude) ||
      !Number.isFinite(place.longitude) ||
      Math.abs(place.latitude) > 90 ||
      Math.abs(place.longitude) > 180
    )
      return { ok: false, message: "Город не найден." };
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.search = new URLSearchParams({
      latitude: String(place.latitude),
      longitude: String(place.longitude),
      current: "temperature_2m,weather_code,is_day",
      timezone: "auto",
    }).toString();
    const current = (await read(url)).current;
    if (
      !current ||
      !Number.isFinite(current.temperature_2m) ||
      !Number.isFinite(current.weather_code)
    )
      throw new Error("Invalid weather response");
    return {
      ok: true,
      city: String(place.name || city),
      temperature: current.temperature_2m,
      code: current.weather_code,
      isDay: current.is_day !== 0,
    };
  }
  async function get(city, language = "ru") {
    if (typeof city !== "string" || !city.trim())
      return {
        ok: false,
        unconfigured: true,
        needsCity: true,
        message: "Укажи город в настройках Paw.",
      };
    city = city.trim().slice(0, 120);
    const key = city.toLowerCase() + "|" + language;
    if (cache.get(key)?.expires > now()) return cache.get(key).result;
    if (pending.has(key)) return pending.get(key);
    const task = request(city, language)
      .catch(() => ({
        ok: false,
        message: "Погода временно недоступна. Попробуй позже.",
      }))
      .then((result) => {
        if (result.ok) {
          if (cache.size > 30) cache.clear();
          cache.set(key, { result, expires: now() + 900000 });
        }
        return result;
      })
      .finally(() => pending.delete(key));
    pending.set(key, task);
    return task;
  }
  return { get };
}
module.exports = { createWeather };
