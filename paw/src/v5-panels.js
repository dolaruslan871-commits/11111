import { FOOD, FOOD_NAMES, THEMES } from "./v5-model-browser.js";
import { v, escapeHTML as esc, petName } from "./v5-ui.js";
const glyphs = {
  fish: "🐟",
  meat: "🥩",
  kibble: "🥣",
  carrot: "🥕",
  cabbage: "🥬",
  berries: "🫐",
  grain: "🌾",
  worms: "🪱",
};
export function foodPanel(state) {
  const index = state.language === "en" ? 2 : state.language === "uk" ? 1 : 0;
  return `<div class="food-row">${(FOOD[state.skin] || []).map((food) => `<button data-food="${food}" ${state.life?.inventory?.[food] === 0 ? "disabled" : ""}>${glyphs[food]} ${esc(FOOD_NAMES[food][index])} <span data-stock="${food}">${state.life?.inventory?.[food] ?? 3}</span></button>`).join("")}</div>`;
}
export function appearancePanel(state) {
  const w = (t) => esc(v(t, state.language)),
    label = {
      light: ["Светлая", "Світла", "Light"],
      dark: ["Графит", "Графіт", "Graphite"],
      ocean: ["Океан", "Океан", "Ocean"],
      lavender: ["Лаванда", "Лаванда", "Lavender"],
      rose: ["Роза", "Троянда", "Rose"],
      sand: ["Песок", "Пісок", "Sand"],
      coffee: ["Кофе", "Кава", "Coffee"],
    },
    i = state.language === "en" ? 2 : state.language === "uk" ? 1 : 0;
  return `<section class="life-card appearance-v5"><h2>${state.language === "en" ? "Appearance" : state.language === "uk" ? "Оформлення" : "Оформление"}</h2><div class="theme-swatches">${THEMES.map((theme) => `<button data-theme="${theme}" class="theme-${theme}" aria-pressed="${state.theme === theme}"><i></i>${label[theme][i]}</button>`).join("")}</div><div class="behavior-grid"><label class="checkbox-row"><input type="checkbox" id="v5-glass" ${state.glass !== false ? "checked" : ""}>${w("Эффект стекла")}</label><label>${w("Прозрачность окон")}<input id="v5-window-opacity" type="range" min="0.65" max="1" step="0.01" value="${state.windowOpacity ?? 1}"></label><label>${w("Прозрачность стекла")}<input id="v5-glass-opacity" type="range" min="0.55" max="1" step="0.01" value="${state.glassOpacity ?? 0.9}"></label><label class="checkbox-row"><input id="v5-house" type="checkbox" ${state.showHouse !== false ? "checked" : ""}>${w("Показывать домик")}</label></div><p class="feature-hint">${w("Домик остаётся в углу экрана.")}</p></section>`;
}
export function identityPanel(state, fallback) {
  const w = (t) => esc(v(t, state.language));
  return `<section class="identity-panel life-card"><h3>${w("Имя питомца")}</h3>${state.skin === "husky" ? `<strong>Хася</strong><p class="feature-hint">${w("Хася — имя домашнего питомца создателя приложения.")}</p>` : `<form id="rename-pet" class="inline-controls"><input id="pet-name" maxlength="32" value="${esc(petName(state, state.skin, fallback))}" required><button>${w("Сохранить")}</button></form>`}</section>`;
}
export function toyDistance(state) {
  return `<label class="toy-distance">${esc(v("Расстояние до игрушки", state.language))}<input id="toy-distance" type="range" min="30" max="200" step="5" value="${state.toyDistance || 90}"><output>${state.toyDistance || 90} px</output></label>`;
}
export function bindV5Panels(root, { state, change }) {
  root.querySelectorAll(".shortcut-settings").forEach((e) => e.remove());
  root
    .querySelector(".appearance-settings [data-theme]")
    ?.parentElement?.parentElement?.remove();
  const bind = (selector, event, callback) =>
    root.querySelector(selector)?.addEventListener(event, callback);
  bind("#rename-pet", "submit", (e) => {
    e.preventDefault();
    change({
      names: {
        ...state().names,
        [state().skin]: root.querySelector("#pet-name").value,
      },
    });
  });
  bind("#v5-glass", "change", (e) => change({ glass: e.target.checked }));
  bind("#v5-house", "change", (e) => change({ showHouse: e.target.checked }));
  for (const [id, key] of [
    ["v5-window-opacity", "windowOpacity"],
    ["v5-glass-opacity", "glassOpacity"],
    ["toy-distance", "toyDistance"],
  ]) {
    bind("#" + id, "input", (e) => {
      const output = e.target.nextElementSibling;
      if (output?.tagName === "OUTPUT")
        output.textContent = e.target.value + " px";
    });
    bind("#" + id, "change", (e) => change({ [key]: Number(e.target.value) }));
  }
  bind("#ui-mode", "click", () =>
    change({ uiMode: state().uiMode === "detailed" ? "simple" : "detailed" }),
  );
}
