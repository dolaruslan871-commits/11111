import { icon } from "./icons.js";
import { ageLabel, word } from "./features.js";
import { t } from "./i18n.js";

const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        ch
      ],
  );
export function mountRadialMenu(host, api, getState, notify = () => {}) {
  let open = false,
    signature = "",
    generation = 0,
    status = {},
    weather,
    busy = false,
    disposed = false;
  const label = (text) => escape(t(text, getState().language));
  function render() {
    const s = getState();
    host.className = `utility-menu ${s.menuOpen ? "is-open" : ""}`;
    host.setAttribute("aria-hidden", String(!s.menuOpen));
    if (!s.menuOpen || disposed) {
      host.replaceChildren();
      return;
    }
    const toggle = (kind, symbol, title) => {
      const value = status[kind];
      const known = value?.supported && typeof value.enabled === "boolean";
      const stateLabel = known
        ? value.enabled
          ? "Включён"
          : "Выключен"
        : "Настройки";
      return `<button class="utility-row" data-system="${kind}" ${busy ? "disabled" : ""} ${known ? `role="switch" aria-checked="${value.enabled}"` : ""}><span class="utility-symbol">${icon(symbol, 23)}</span><strong>${label(title)}</strong><span class="utility-state">${label(stateLabel)}</span></button>`;
    };
    const weatherLabel = weather?.ok
      ? `${escape(weather.city)} · ${Math.round(weather.temperature)}°C`
      : label(
          !s.weatherCity
            ? "Указать город"
            : weather
              ? "Недоступна"
              : "Загрузка…",
        );
    const weatherSymbol = weather?.ok
      ? weather.code >= 51
        ? "☂"
        : weather.code > 2
          ? "☁"
          : weather.isDay
            ? "☀"
            : "☾"
      : "☁";
    host.innerHTML = `<section class="utility-card" aria-label="${label("Быстрые действия")}"><button class="utility-close" aria-label="${label("Закрыть меню")}">×</button><p class="utility-heading">Paw · ${ageLabel(s.life, s.language)}</p>${toggle("bluetooth", "bluetooth", "Bluetooth")}${toggle("audio", "volume", "Звук устройства")}<button class="utility-row utility-weather" data-weather><span class="utility-symbol" aria-hidden="true">${weatherSymbol}</span><span><strong>${label("Погода")}</strong><span class="utility-weather-value">${weatherLabel}</span></span>${icon("chevron", 18)}</button><button class="utility-row utility-app" data-app ${busy ? "disabled" : ""}><span class="utility-symbol">${icon(s.shortcut ? "app" : "plus", 23)}</span><strong>${s.shortcut ? escape(s.shortcut.name) : label("Добавить приложение")}</strong>${icon("arrow", 19)}</button>${[
      ["playpause", "♫", "Музыка"],
      ["tools", "◷", "Таймер"],
      ["tools", "▤", "Заметки и напоминания"],
      ["capture", "▣", "Скриншот"],
      ["tools", "⌕", "Поиск"],
      ["tools", "▥", "Компьютер"],
      ["life", "♡", "Характер"],
      ["games", "⚽", "Игры"],
    ]
      .map(
        ([target, glyph, title]) =>
          `<button class="utility-row" data-utility="${target}"><span class="utility-symbol">${glyph}</span><strong>${escape(word(title, s.language))}</strong></button>`,
      )
      .join(
        "",
      )}<div class="utility-row"><strong>${escape(word("Батарея", s.language))}</strong><span class="utility-state">${s.battery?.supported ? s.battery.percent + "%" : "—"}</span></div></section>`;
    host.querySelectorAll("[data-utility]").forEach(
      (button) =>
        (button.onclick = async () => {
          const target = button.dataset.utility;
          if (target === "capture") {
            const r = await api.screenshot();
            if (!r.ok) notify(r.message);
          } else if (target === "playpause") {
            const r = await api.media(target);
            if (!r.ok) notify(r.message);
          } else api.dashboard(target);
        }),
    );
    host.querySelector(".utility-close").onclick = () => api.closeMenu();
    host.querySelectorAll("[data-system]").forEach(
      (button) =>
        (button.onclick = async () => {
          if (busy) return;
          busy = true;
          render();
          try {
            const kind = button.dataset.system,
              value = status[kind];
            const result =
              value?.supported && typeof value.enabled === "boolean"
                ? await api[kind](!value.enabled)
                : await api.settings(kind);
            if (!getState().menuOpen || disposed) return;
            if (result?.message && !result.ok) notify(result.message);
            status = await api.systemStatus();
          } catch {
            notify(t("Не удалось выполнить действие.", s.language));
          } finally {
            busy = false;
            if (getState().menuOpen && !disposed) render();
          }
        }),
    );
    host.querySelector("[data-weather]").onclick = async () => {
      if (!s.weatherCity) {
        await api.dashboard("settings");
        return;
      }
      await loadWeather(generation);
    };
    host.querySelector("[data-app]").onclick = async () => {
      if (busy) return;
      busy = true;
      render();
      try {
        const result = s.shortcut ? await api.openApp() : await api.chooseApp();
        if (result?.message && !result.ok && !result.canceled)
          notify(result.message);
        if (s.shortcut && result?.ok) api.closeMenu();
      } catch {
        notify(t("Не удалось выполнить действие.", s.language));
      } finally {
        busy = false;
        if (getState().menuOpen && !disposed) render();
      }
    };
  }
  async function loadWeather(token) {
    try {
      const value = await api.weather();
      if (token === generation && open && !disposed) {
        weather = value;
        render();
      }
    } catch {
      if (token === generation && open && !disposed) {
        weather = { ok: false };
        render();
      }
    }
  }
  function update() {
    const s = getState(),
      nextSignature = JSON.stringify([
        s.language,
        s.theme,
        s.shortcut,
        s.weatherCity,
      ]);
    if (!s.menuOpen) {
      if (open) {
        open = false;
        generation++;
      }
      render();
      return;
    }
    const opening = !open;
    if (!opening && signature === nextSignature) return;
    open = true;
    signature = nextSignature;
    const token = ++generation;
    if (opening) {
      status = {};
      weather = undefined;
    }
    render();
    api.systemStatus().then(
      (value) => {
        if (generation === token && open && !disposed) {
          status = value;
          render();
        }
      },
      () => {},
    );
    if (s.weatherCity) void loadWeather(token);
  }
  host.onpointerdown = (e) => e.stopPropagation();
  host.oncontextmenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  return {
    update,
    dispose() {
      disposed = true;
      generation++;
      host.replaceChildren();
      host.onpointerdown = host.oncontextmenu = null;
    },
  };
}
