import { t } from "./i18n.js";
import { icon } from "./icons.js";
import { ageLabel } from "./features.js";
import { escapeHTML as esc, v, petName } from "./v5-ui.js";
export function mountRadialMenu(host, api, getState, notify = () => {}) {
  let menuSession = null, regionsFrame = 0;
  let panel = null,
    signature = "",
    open = false,
    generation = 0,
    disposed = false,
    status = {};
  const w = (t) => esc(v(t, getState().language));
  const error = (r) => {
    if (r?.ok === false && !r.canceled)
      notify(r.message || "Не удалось выполнить действие.");
    return r;
  };
  function regions() {
    cancelAnimationFrame(regionsFrame);
    regionsFrame = requestAnimationFrame(async () => {
      if (disposed || !open) return;
      const rects=[...host.querySelectorAll(".utility-card,.quick-panel")].map(e=>{
        const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};
      });
      let layout;
      try {layout = await api.widgetRects?.(rects, !!panel);}
      catch {return;}
      if (!disposed && open) {
        const changed=host.classList.contains("panel-left") !== (layout?.leftPanel === true);
        host.classList.toggle("panel-left",layout?.leftPanel === true);
        if(changed)regions();
      }
    });
  }
  const resizeObserver = new ResizeObserver(regions);
  resizeObserver.observe(host);
  function closePanel() {panel=null;generation++;showPanel();}
  function outsideClick(event) {
    if (open && !event.target.closest(".utility-card,.quick-panel")) api.closeMenu();
  }
  host.ownerDocument.addEventListener("pointerdown",outsideClick);
  function render() {
    const s = getState();
    host.classList.add("utility-menu","is-open");
    host.innerHTML = `<section class="utility-card"><header><div><strong>${esc(petName(s, s.skin, "Paw"))}</strong><small>${ageLabel(s.life, s.language)}</small></div><button class="utility-close" aria-label="Close">×</button></header>${[
      ["music", "♫", "Музыка"],
      ["timer", "◷", "Таймер"],
      ["notes", "▤", "Заметки"],
      ["search", "⌕", "Поиск"],
      ["apps", "▦", "Приложения"],
    ]
      .map(
        ([id, glyph, title]) =>
          `<button class="utility-row" data-panel="${id}"><span class="utility-symbol">${glyph}</span><strong>${w(title)}</strong><span class="utility-state">›</span></button>`,
      )
      .join("")}<button id="quick-pause" class="utility-row"><span class="utility-symbol">${s.roaming?'Ⅱ':'▶'}</span><strong>${s.language==='en'?(s.roaming?'Pause walking':'Resume walking'):s.language==='uk'?(s.roaming?'Зупинити прогулянки':'Відновити прогулянки'):(s.roaming?'Остановить прогулки':'Продолжить прогулки')}</strong></button><button id="quick-wardrobe" class="utility-row"><span class="utility-symbol">✦</span><strong>${w('Гардероб')}</strong></button><div class="quick-toggles">${[
      ["audio", "volume", "Звук"],
      ["bluetooth", "bluetooth", "Bluetooth"],
    ]
      .map(
        ([kind, glyph, label]) =>
          `<button data-system="${kind}" aria-label="${esc(label)}">${icon(glyph, 20)}<span>${esc(label)}</span><i id="quick-${kind}">…</i></button>`,
      )
      .join(
        "",
      )}</div><button class="utility-row" data-panel="weather"><span class="utility-symbol">☁</span><strong>${s.language === "en" ? "Weather" : s.language === "uk" ? "Погода" : "Погода"}</strong><span id="quick-weather" class="utility-state">…</span></button><button class="utility-row" id="quick-studio"><span class="utility-symbol">◉</span><strong>${w("Съёмка")}</strong></button><button class="utility-row" id="dashboard"><span class="utility-symbol">⚙</span><strong>${w("Основное меню")}</strong></button><button class="utility-row" id="quick-settings"><span class="utility-symbol">⚙</span><strong>${s.language==='en'?'Settings':s.language==='uk'?'Налаштування':'Настройки'}</strong></button><button class="utility-row utility-quit" id="quit-paw"><span class="utility-symbol">⏻</span><strong>${esc(t("Выйти из Paw",s.language))}</strong></button><p id="widget-error" role="status"></p></section><aside id="quick-panel-host" hidden></aside>`;
    host.querySelector("#quit-paw").onclick = async (event) => {
      event.currentTarget.disabled=true;
      try {await api.quit();}
      catch {if(!disposed){event.target.closest("button").disabled=false;notify(t("Не удалось выполнить действие.",s.language));}}
    };
    host.querySelector(".utility-close").onclick = () => api.closeMenu();
    host.querySelector('#quick-pause').onclick=async()=>{await api.update({roaming:!getState().roaming});signature='';render();};
    host.querySelector('#quick-wardrobe').onclick=()=>api.dashboard('wardrobe');
    host.querySelector("#quick-studio").onclick=()=>api.dashboard("studio");
    host.querySelector("#quick-settings").onclick=()=>api.dashboard("settings");
    host.querySelector("#dashboard").onclick = () => api.dashboard("home");
    host.querySelectorAll("[data-panel]").forEach(
      (e) =>
        (e.onclick = () => {
          panel = panel === e.dataset.panel ? null : e.dataset.panel;
          generation++;
          showPanel();
        }),
    );
    host.querySelectorAll("[data-system]").forEach(
      (e) =>
        (e.onclick = async () => {
          e.disabled = true;
          try {
            const kind = e.dataset.system,
              value = status[kind];
            error(
              await (value?.supported
                ? api[kind](!value.enabled)
                : api.settings(kind)),
            );
            status = await api.systemStatus();
            paintStatus();
          } catch (e) {
            notify(e.message);
          } finally {
            e.disabled = false;
          }
        }),
    );
    showPanel();
    regions();
  }
  function paintStatus() {
    for (const kind of ["audio", "bluetooth"]) {
      const e = host.querySelector("#quick-" + kind),
        s = status[kind];
      if (e) e.textContent = s?.supported ? (s.enabled ? "●" : "○") : "↗";
    }
  }
  function showPanel() {
    const s = getState(),
      box = host.querySelector("#quick-panel-host");
    if (!box) return;
    host.classList.toggle("has-panel",!!panel);
    box.hidden=!panel;
    host.querySelectorAll("[data-panel]").forEach(e=>e.setAttribute("aria-expanded",String(e.dataset.panel===panel)));
    if (!panel) {
      box.replaceChildren();
      regions();
      return;
    }
    let body = "";
    if (panel === "music")
      body = `<h2>${w("Музыка")}</h2><button id="open-player">${w("Открыть плеер")}</button><div class="media-controls">${[
        ["previous", "⏮"],
        ["playpause", "⏯"],
        ["next", "⏭"],
        ["down", "−"],
        ["up", "+"],
      ]
        .map(([id, g]) => `<button data-media="${id}">${g}</button>`)
        .join(
          "",
        )}</div><button id="pick-player">${w("Выбрать плеер")}</button><small>${esc(s.player?.name || "")}</small>`;
    if (panel === "timer")
      body = `<h2>${w("Таймер")}</h2><form id="quick-timer"><label>${w("Минуты")}<input type="number" min="1" max="10080" value="30" required id="quick-minutes"></label><button>${w("Запустить")}</button></form><output id="quick-timer-status"></output><button id="cancel-timer">${w("Остановить")}</button>`;
    if (panel === "notes")
      body = `<h2>${w("Заметки")}</h2><form id="quick-note"><input id="quick-note-text" maxlength="1000" placeholder="${w("Задача")}" required><input id="quick-note-due" type="datetime-local"><button>${w("Добавить")}</button></form><ul id="quick-note-list"></ul>`;
    if (panel === "search")
      body = `<h2>${w("Поиск Google")}</h2><form id="quick-search"><input id="quick-query" maxlength="1000" placeholder="${w("Поиск")}" required autofocus><button>${w("Найти")}</button></form><button id="pick-browser">${w("Выбрать браузер")}</button><small>${esc(s.browser?.name || v("Системный браузер", s.language))}</small><p>${w("Ответы откроются в Google в выбранном браузере.")}</p>`;
    if (panel === "apps")
      body = `<h2>${w("Приложения")}</h2><div class="launcher-list">${(s.shortcuts || []).map((item, index) => `<div><button data-launch="${index}">↗ ${esc(item.name)}</button><button data-remove="${index}" aria-label="Remove">×</button></div>`).join("")}</div><button id="pick-app">＋ ${w("Добавить приложение")}</button>`;
    if (panel === "weather")
      body = `<h2>☁</h2><form id="quick-city"><input id="quick-city-name" value="${esc(s.weatherCity)}" required maxlength="120"><button>${w("Сохранить")}</button></form><p id="weather-detail">…</p><small>Open-Meteo · GeoNames</small>`;
    box.innerHTML = `<section class="quick-panel"><button type="button" class="panel-back" id="quick-panel-back" aria-label="${esc(t("Закрыть меню",s.language))}">← ${esc(s.language === "uk" ? "Назад" : s.language === "en" ? "Back" : "Назад")}</button>${body}</section>`;
    box.querySelector("#quick-panel-back").onclick=closePanel;
    const q = (sel) => box.querySelector(sel);
    q("#open-player")?.addEventListener("click", async () =>
      error(await api.openPlayer()),
    );
    q("#pick-player")?.addEventListener("click", async () =>
      error(await api.pickLauncher("player")),
    );
    box
      .querySelectorAll("[data-media]")
      .forEach(
        (e) =>
          (e.onclick = async () => error(await api.media(e.dataset.media))),
      );
    q("#quick-timer")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      error(await api.timer("start", Number(q("#quick-minutes").value) * 60));
    });
    q("#cancel-timer")?.addEventListener("click", () => api.timer("cancel"));
    q("#quick-note")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const due = q("#quick-note-due").value;
      const r = error(
        await api.task("add", {
          text: q("#quick-note-text").value,
          due: due ? new Date(due).getTime() : null,
        }),
      );
      if (r.ok) q("#quick-note-text").value = "";
    });
    q("#quick-search")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      error(await api.browserSearch(q("#quick-query").value));
    });
    q("#pick-browser")?.addEventListener("click", async () =>
      error(await api.pickLauncher("browser")),
    );
    q("#pick-app")?.addEventListener("click", async () =>
      error(await api.pickLauncher("app")),
    );
    box
      .querySelectorAll("[data-launch]")
      .forEach(
        (e) =>
          (e.onclick = async () =>
            error(await api.launchShortcut(Number(e.dataset.launch)))),
      );
    box
      .querySelectorAll("[data-remove]")
      .forEach(
        (e) =>
          (e.onclick = async () =>
            error(await api.removeShortcut(Number(e.dataset.remove)))),
      );
    q("#quick-city")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      await api.update({ weatherCity: q("#quick-city-name").value });
      loadWeather();
    });
    if (panel === "weather") loadWeather();
    refresh();
    regions();
  }
  async function loadWeather() {
    const token = ++generation;
    try {
      const data = await api.weather();
      if (disposed || token !== generation) return;
      const summary = host.querySelector("#quick-weather"),
        detail = host.querySelector("#weather-detail");
      if (summary)
        summary.textContent = data.ok
          ? Math.round(data.temperature) + "°"
          : "—";
      if (detail)
        detail.textContent = data.ok
          ? data.city + " · " + Math.round(data.temperature) + " °C"
          : data.message;
    } catch {}
  }
  function refresh() {
    const s = getState(),
      output = host.querySelector("#quick-timer-status");
    if (output) {
      const remaining = Math.max(
        0,
        Math.ceil(((s.life?.timer?.ends || 0) - Date.now()) / 1000),
      );
      output.textContent = s.life?.timer
        ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`
        : "—";
    }
    const list = host.querySelector("#quick-note-list");
    if (list) {
      const token = JSON.stringify(s.life?.tasks);
      if (list.dataset.key !== token) {
        list.dataset.key = token;
        list.innerHTML = (s.life?.tasks || [])
          .map(
            (task) =>
              `<li><label><input type="checkbox" data-task="${esc(task.id)}" ${task.done ? "checked" : ""}>${esc(task.text)}</label><button data-delete="${esc(task.id)}">×</button></li>`,
          )
          .join("");
        list
          .querySelectorAll("[data-task]")
          .forEach(
            (e) => (e.onchange = () => api.task("toggle", e.dataset.task)),
          );
        list
          .querySelectorAll("[data-delete]")
          .forEach(
            (e) => (e.onclick = () => api.task("delete", e.dataset.delete)),
          );
      }
    }
  }
  return {
    update() {
      const s = getState();
      if (!s.menuOpen) {
        host.replaceChildren();
        host.classList.remove("is-open","has-panel","panel-left");
        panel=null;generation++;
        open = false;
        return;
      }
      const key = JSON.stringify([
        s.language,
        s.theme,
        s.glassOpacity,
        s.glass,
        s.shortcuts,
        s.browser,
        s.player,
        s.names, s.roaming,
      ]);
      if (!open || menuSession !== s.menuSession || key !== signature) {
        if (!open || menuSession !== s.menuSession) {panel=null;generation++;}
        menuSession=s.menuSession;
        open = true;
        signature = key;
        render();
        api.systemStatus().then((value) => {
          if (!disposed) {
            status = value;
            paintStatus();
          }
        });
        loadWeather();
      }
      refresh();
    },
    dispose() {
      disposed = true;
      generation++;
      cancelAnimationFrame(regionsFrame);
      resizeObserver.disconnect();
      host.ownerDocument.removeEventListener("pointerdown",outsideClick);
      host.replaceChildren();
    },
  };
}
