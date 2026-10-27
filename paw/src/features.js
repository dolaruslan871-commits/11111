import { foodPanel } from "./v5-panels.js";
import { v } from "./v5-ui.js";
import { t } from "./i18n.js";
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
let metricsAt = 0,
  metricsPending = false;
const words = {
  en: {
    Возраст: "Age",
    Дружба: "Friendship",
    Настроение: "Mood",
    Энергия: "Energy",
    Голод: "Hunger",
    Домик: "Home",
    Малыш: "Baby",
    Подросток: "Young",
    Взрослый: "Adult",
    Морковка: "Carrot",
    Печенье: "Cookie",
    Ягоды: "Berries",
    Покормить: "Feed",
    "Ежедневный подарок": "Daily gift",
    "Получить подарок": "Open gift",
    "Улучшить домик · 20 🪙": "Upgrade home · 20 🪙",
    Характер: "Personality",
    Активность: "Activity",
    Любопытство: "Curiosity",
    Лень: "Laziness",
    "Частота прогулок": "Walk frequency",
    "Просит внимания": "Seeks attention",
    "Тихие часы": "Quiet hours",
    Начало: "From",
    Конец: "Until",
    "Ночной сон": "Sleep at night",
    "Реакции на погоду": "Weather reactions",
    "Сезонные эффекты": "Seasonal effects",
    "Напоминать об отдыхе и воде": "Break and water reminders",
    "Перерыв каждые, мин": "Break interval, min",
    "Вода каждые, мин": "Water interval, min",
    "Взаимодействие с окнами": "Interact with windows",
    "Реакции на приложения": "React to apps",
    Невесомость: "Zero gravity",
    "Второй питомец": "Second pet",
    Нет: "None",
    Передвижение: "Movement",
    Автоматически: "Automatic",
    Пешком: "Walking",
    Скейт: "Skateboard",
    Самокат: "Scooter",
    "Реактивный ранец": "Jetpack",
    "Дата рождения пользователя": "Your birthday",
    "Автозапуск Paw": "Launch Paw at login",
    Игры: "Games",
    Рыбалка: "Fishing",
    Бабочки: "Butterflies",
    Мячик: "Ball",
    Прятки: "Hide and seek",
    Поймать: "Catch",
    Начать: "Start",
    Таймер: "Timer",
    Будильник: "Alarm",
    Минуты: "Minutes",
    Остановить: "Cancel",
    "Заметки и напоминания": "Notes and reminders",
    Задача: "Task",
    Добавить: "Add",
    Поиск: "Search",
    Найти: "Find",
    "Искать в интернете": "Search the web",
    Скриншот: "Screenshot",
    "Экран или область": "Screen or area",
    Музыка: "Music",
    Назад: "Previous",
    "Пауза / играть": "Play / pause",
    Далее: "Next",
    Компьютер: "Computer",
    Батарея: "Battery",
    "Без батареи": "No battery",
    Температура: "Temperature",
    "Датчик недоступен": "Sensor unavailable",
    "Оперативная память": "Memory",
    Уровень: "Level",
    "Подарок уже получен сегодня": "Gift already claimed today",
    "Домик готов": "Home complete",
    "Жди поклёвку…": "Wait for a bite…",
    "Клюёт!": "Bite!",
    "Игра длится 30 секунд. Лови цель — получай монеты для гардероба.":
      "Each game lasts 30 seconds. Catch targets to earn wardrobe coins.",
    Готово: "Done",
    Удалить: "Delete",
    "Доступ к окнам на Mac может потребовать разрешение «Универсальный доступ».":
      "Window interactions on Mac may require Accessibility permission.",
    "Прогресс хранится на этом компьютере. Возраст идёт по календарю, рост — в течение восьми недель.":
      "Progress is saved on this computer. Age follows real time; growth takes eight weeks.",
    "Поиск использует системный индекс файлов.":
      "Search uses the system file index.",
  },
  uk: {
    Возраст: "Вік",
    Дружба: "Дружба",
    Настроение: "Настрій",
    Энергия: "Енергія",
    Голод: "Голод",
    Домик: "Будиночок",
    Малыш: "Малюк",
    Подросток: "Підліток",
    Взрослый: "Дорослий",
    Морковка: "Морква",
    Печенье: "Печиво",
    Ягоды: "Ягоди",
    Покормить: "Нагодувати",
    "Ежедневный подарок": "Щоденний подарунок",
    "Получить подарок": "Відкрити подарунок",
    "Улучшить домик · 20 🪙": "Покращити будиночок · 20 🪙",
    Характер: "Характер",
    Активность: "Активність",
    Любопытство: "Допитливість",
    Лень: "Лінь",
    "Частота прогулок": "Частота прогулянок",
    "Просит внимания": "Просить уваги",
    "Тихие часы": "Тихі години",
    Начало: "Початок",
    Конец: "Кінець",
    "Ночной сон": "Нічний сон",
    "Реакции на погоду": "Реакції на погоду",
    "Сезонные эффекты": "Сезонні ефекти",
    "Напоминать об отдыхе и воде": "Нагадувати про відпочинок і воду",
    "Перерыв каждые, мин": "Перерва кожні, хв",
    "Вода каждые, мин": "Вода кожні, хв",
    "Взаимодействие с окнами": "Взаємодія з вікнами",
    "Реакции на приложения": "Реакції на застосунки",
    Невесомость: "Невагомість",
    "Второй питомец": "Другий улюбленець",
    Нет: "Немає",
    Передвижение: "Пересування",
    Автоматически: "Автоматично",
    Пешком: "Пішки",
    Скейт: "Скейт",
    Самокат: "Самокат",
    "Реактивный ранец": "Реактивний ранець",
    "Дата рождения пользователя": "Дата народження користувача",
    "Автозапуск Paw": "Автозапуск Paw",
    Игры: "Ігри",
    Рыбалка: "Риболовля",
    Бабочки: "Метелики",
    Мячик: "М’ячик",
    Прятки: "Хованки",
    Поймать: "Спіймати",
    Начать: "Почати",
    Таймер: "Таймер",
    Будильник: "Будильник",
    Минуты: "Хвилини",
    Остановить: "Зупинити",
    "Заметки и напоминания": "Нотатки та нагадування",
    Задача: "Завдання",
    Добавить: "Додати",
    Поиск: "Пошук",
    Найти: "Знайти",
    "Искать в интернете": "Шукати в інтернеті",
    Скриншот: "Знімок екрана",
    "Экран или область": "Екран або область",
    Музыка: "Музика",
    Назад: "Назад",
    "Пауза / играть": "Пауза / грати",
    Далее: "Далі",
    Компьютер: "Комп’ютер",
    Батарея: "Батарея",
    "Без батареи": "Без батареї",
    Температура: "Температура",
    "Датчик недоступен": "Датчик недоступний",
    "Оперативная память": "Оперативна пам’ять",
    Уровень: "Рівень",
    "Подарок уже получен сегодня": "Подарунок сьогодні вже отримано",
    "Домик готов": "Будиночок готовий",
    "Жди поклёвку…": "Чекай на клювання…",
    "Клюёт!": "Клює!",
    Готово: "Готово",
    Удалить: "Видалити",
  },
};
export function word(text, lang) {
  return words[lang]?.[text] || t(text, lang);
}
export function ageLabel(life, lang = "ru") {
  const days = life?.age || 0,
    weeks = Math.floor(days / 7);
  return lang === "en"
    ? `${days} days${weeks ? ` · ${weeks} wk` : ""}`
    : lang === "uk"
      ? `${days} дн.${weeks ? ` · ${weeks} тиж.` : ""}`
      : `${days} дн.${weeks ? ` · ${weeks} нед.` : ""}`;
}
export function featureContent(page, state, petStage, pets) {
  const w = (text) => esc(word(text, state.language)),
    l = state.life || {},
    b = state.behavior || {};
  const button = (text, attrs) =>
    `<button type="button" ${attrs}>${w(text)}</button>`;
  const metric = (text, value) =>
    `<div class="life-meter" data-meter="${{ Настроение: "mood", Энергия: "energy", Голод: "hunger", Дружба: "friendship" }[text]}"><label>${w(text)}<b>${Math.round(value || 0)}%</b></label><meter min="0" max="100" value="${value || 0}"></meter></div>`;
  if (page === "life")
    return `<div class="feature-columns"><div>${petStage()}<div class="life-card age-card"><span>${w("Возраст")}</span><strong id="pet-age">${ageLabel(l, state.language)}</strong><span id="life-summary">${w(l.stage === "adult" ? "Взрослый" : l.stage === "young" ? "Подросток" : "Малыш")} · ${w("Уровень")} ${l.level || 1} · 🪙 ${l.coins || 0}</span></div></div><section class="life-card"><h2>${w("Мой питомец")}</h2>${metric("Настроение", l.mood)}${metric("Энергия", l.energy)}${metric("Голод", l.hunger)}${metric("Дружба", l.friendship)}<div class="food-row">${foodPanel(state)}</div><h3>${w("Ежедневный подарок")}</h3>${button("Получить подарок", 'id="daily-gift"')}<h3>${w("Домик")} · <span id="house-progress">${Math.round(l.house || 0)}%</span></h3>${button(l.house >= 100 ? "Домик готов" : "Улучшить домик · 20 🪙", `id="build-house" ${l.house >= 100 ? "disabled" : ""}`)}<p class="feature-hint">${v("Домик: 20 монет + 10 дерева + 5 камня", state.language)}</p><p class="feature-hint">${w("Прогресс хранится на этом компьютере. Возраст идёт по календарю, рост — в течение восьми недель.")}</p></section></div><section class="life-card behavior-editor"><h2>${w("Характер")}</h2><div class="behavior-grid">${[
      ["active", "Активность"],
      ["curious", "Любопытство"],
      ["lazy", "Лень"],
      ["walkFrequency", "Частота прогулок"],
      ["attentionFrequency", "Просит внимания"],
    ]
      .map(
        ([id, label]) =>
          `<label>${w(label)}<output>${b[id] ?? 50}%</output><input type="range" min="0" max="100" value="${b[id] ?? 50}" data-behavior="${id}"></label>`,
      )
      .join(
        "",
      )}<label>${w("Тихие часы")}<span class="inline-controls"><input type="number" min="0" max="23" value="${b.quietStart ?? 22}" data-behavior="quietStart" aria-label="${w("Начало")}">—<input type="number" min="0" max="23" value="${b.quietEnd ?? 8}" data-behavior="quietEnd" aria-label="${w("Конец")}"></span></label>${[
      ["nightSleep", "Ночной сон"],
      ["weatherReactions", "Реакции на погоду"],
      ["seasons", "Сезонные эффекты"],
      ["reminders", "Напоминать об отдыхе и воде"],
      ["windowInteraction", "Взаимодействие с окнами"],
      ["appReactions", "Реакции на приложения"],
      ["zeroGravity", "Невесомость"],
    ]
      .map(
        ([id, label]) =>
          `<label class="checkbox-row"><input type="checkbox" data-behavior="${id}" ${b[id] ? "checked" : ""}>${w(label)}</label>`,
      )
      .join("")}${[
      ["breakMinutes", "Перерыв каждые, мин"],
      ["waterMinutes", "Вода каждые, мин"],
    ]
      .map(
        ([id, label]) =>
          `<label>${w(label)}<input type="number" min="5" max="240" value="${b[id] || 50}" data-behavior="${id}"></label>`,
      )
      .join("")}<label>${w("Передвижение")}<select data-behavior="transport">${[
      ["auto", "Автоматически"],
      ["walk", "Пешком"],
      ["skate", "Скейт"],
      ["scooter", "Самокат"],
      ["jetpack", "Реактивный ранец"],
    ]
      .map(
        ([v, n]) =>
          `<option value="${v}" ${b.transport === v ? "selected" : ""}>${w(n)}</option>`,
      )
      .join(
        "",
      )}</select></label><label>${w("Второй питомец")}<select id="companion"><option value="">${w("Нет")}</option>${pets.map((p) => `<option value="${p.id}" ${state.companion === p.id ? "selected" : ""}>${esc(p.name || p.id)}</option>`).join("")}</select></label><label>${w("Дата рождения пользователя")}<input id="birthday" type="date" value="${l.birthday ? "2000-" + esc(l.birthday) : ""}"></label><label class="checkbox-row"><input id="autostart" type="checkbox" ${state.autostart ? "checked" : ""}>${w("Автозапуск Paw")}</label></div><p class="feature-hint">${w("Доступ к окнам на Mac может потребовать разрешение «Универсальный доступ».")}</p></section>`;
  if (page === "games")
    return `<div class="feature-columns"><div>${petStage()}<p>${w("Игра длится 30 секунд. Лови цель — получай монеты для гардероба.")}</p></div><section class="life-card"><h2>${w("Игры")} <span class="coin-balance">🪙 ${l.coins || 0}</span></h2><div class="game-picker">${[
      ["fish", "🎣", "Рыбалка"],
      ["butterflies", "🦋", "Бабочки"],
      ["ball", "⚽", "Мячик"],
      ["hide", "🙈", "Прятки"],
    ]
      .map(([id, emoji, label]) =>
        button(
          emoji + " " + word(label, state.language),
          `data-game="${id}" ${l.game ? "disabled" : ""}`,
        ),
      )
      .join(
        "",
      )}</div><div id="game-arena" class="game-arena"></div><div id="game-status" role="status"></div></section></div>`;
  if (page === "tools")
    return `<div class="tools-grid"><section class="life-card"><h2>${w("Таймер")} / ${w("Будильник")}</h2><form id="timer-form" class="inline-controls"><input type="number" id="timer-minutes" aria-label="${w("Минуты")}" min="1" max="10080" value="30"><button>${w("Начать")}</button></form><form id="alarm-form" class="inline-controls"><input type="datetime-local" id="alarm-at" required aria-label="${w("Будильник")}"><button>${w("Будильник")}</button></form><div id="timer-status" role="status"></div>${button("Остановить", 'id="timer-cancel"')}</section><section class="life-card"><h2>${w("Заметки и напоминания")}</h2><form id="task-form"><input id="task-text" placeholder="${w("Задача")}" maxlength="1000" required><input type="datetime-local" id="task-due" aria-label="${w("Заметки и напоминания")}"><button>${w("Добавить")}</button></form><ul id="task-list"></ul></section><section class="life-card"><h2>${w("Поиск")}</h2><form id="search-form" class="inline-controls"><input id="search-query" minlength="2" maxlength="150" required placeholder="${w("Поиск")}"><button>${w("Найти")}</button></form>${button("Искать в интернете", 'id="web-search"')}<p class="feature-hint">${w("Поиск использует системный индекс файлов.")}</p><div id="search-results" role="status"></div></section><section class="life-card"><h2>${w("Музыка")}</h2><div class="media-controls">${[
      ["previous", "⏮", "Назад"],
      ["playpause", "⏯", "Пауза / играть"],
      ["next", "⏭", "Далее"],
      ["down", "🔉", "−"],
      ["up", "🔊", "+"],
    ]
      .map(
        ([id, emoji, label]) =>
          `<button data-media="${id}" title="${w(label)}" aria-label="${w(label)}">${emoji}</button>`,
      )
      .join(
        "",
      )}</div><h3>${w("Скриншот")}</h3>${button("Экран или область", 'id="screenshot"')}</section><section class="life-card"><h2>${w("Компьютер")}</h2><div id="computer-metrics" role="status">…</div></section></div>`;
  return "";
}
export function bindFeatures(
  root,
  { api, state, change, accept, toast, pets },
) {
  const current = () => state();
  const w = (text) => word(text, current().language);
  const result = async (promise) => {
    try {
      const r = await promise;
      if (r?.state) accept(r.state);
      if (r?.ok === false && !r.canceled)
        toast(
          r.message ||
            w(
              r.reason === "already"
                ? "Подарок уже получен сегодня"
                : "Не удалось выполнить действие.",
            ),
        );
      return r;
    } catch {
      toast(w("Не удалось выполнить действие."));
    }
  };
  root.querySelectorAll("[data-behavior]").forEach((e) => {
    e.oninput = () => {
      if (e.type === "range")
        e.previousElementSibling.textContent = e.value + "%";
    };
    e.onchange = () =>
      change({
        behavior: {
          [e.dataset.behavior]:
            e.type === "checkbox"
              ? e.checked
              : e.tagName === "SELECT"
                ? e.value
                : Number(e.value),
        },
      });
  });
  root
    .querySelector("#companion")
    ?.addEventListener("change", (e) =>
      change({ companion: e.target.value || null }),
    );
  root
    .querySelector("#autostart")
    ?.addEventListener("change", (e) =>
      change({ autostart: e.target.checked }),
    );
  root
    .querySelector("#birthday")
    ?.addEventListener("change", (e) =>
      result(api.life("birthday", e.target.value.slice(5))),
    );
  root
    .querySelectorAll("[data-food]")
    .forEach(
      (e) => (e.onclick = () => result(api.life("food", e.dataset.food))),
    );
  root
    .querySelector("#daily-gift")
    ?.addEventListener("click", () => result(api.life("gift")));
  root
    .querySelector("#build-house")
    ?.addEventListener("click", () => result(api.life("build")));
  root
    .querySelectorAll("[data-game]")
    .forEach(
      (e) => (e.onclick = () => result(api.game("start", e.dataset.game))),
    );
  root.querySelector("#timer-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    result(
      api.timer(
        "start",
        Number(root.querySelector("#timer-minutes").value) * 60,
      ),
    );
  });
  root.querySelector("#alarm-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const seconds =
      (new Date(root.querySelector("#alarm-at").value).getTime() - Date.now()) /
      1000;
    if (seconds < 1 || seconds > 604800) {
      toast(
        current().language === "en"
          ? "Choose a time within seven days."
          : "Выбери время в пределах семи дней.",
      );
      return;
    }
    result(api.timer("start", seconds));
  });
  root
    .querySelector("#timer-cancel")
    ?.addEventListener("click", () => result(api.timer("cancel")));
  root.querySelector("#task-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = root.querySelector("#task-text").value,
      due = root.querySelector("#task-due").value;
    const r = await result(
      api.task("add", { text, due: due ? new Date(due).getTime() : null }),
    );
    if (r?.ok) root.querySelector("#task-text").value = "";
    refreshFeatures(root, current(), api);
  });
  root
    .querySelectorAll("[data-media]")
    .forEach((e) => (e.onclick = () => result(api.media(e.dataset.media))));
  root
    .querySelector("#screenshot")
    ?.addEventListener("click", () => result(api.screenshot()));
  let searchGeneration = 0;
  root.querySelector("#search-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const query = root.querySelector("#search-query").value,
      token = ++searchGeneration,
      box = root.querySelector("#search-results");
    box.textContent = "…";
    try {
      const list = await api.search(query);
      if (token !== searchGeneration || !box.isConnected) return;
      box.innerHTML = list.length
        ? list
            .map(
              (x) =>
                `<button class="search-result" data-result="${esc(x.id)}"><strong>${esc(x.name)}</strong><small>${esc(x.path)}</small></button>`,
            )
            .join("")
        : "0";
      box
        .querySelectorAll("[data-result]")
        .forEach(
          (e) => (e.onclick = () => result(api.searchOpen(e.dataset.result))),
        );
    } catch {
      box.textContent = w("Не удалось выполнить действие.");
    }
  });
  root.querySelector("#web-search")?.addEventListener("click", () => {
    const q = root.querySelector("#search-query").value;
    if (q.trim()) result(api.webSearch(q));
  });
  refreshFeatures(root, current(), api);
  if (root.querySelector("#computer-metrics"))
    api
      .metrics()
      .then((m) => {
        const box = root.querySelector("#computer-metrics");
        if (!box) return;
        box.innerHTML = `<p>CPU <b>${m.cpu ?? "—"}%</b></p><p>${w("Оперативная память")} <b>${m.memoryUsed ? Math.round((m.memoryUsed / 1024 ** 3) * 10) / 10 : "—"} / ${m.memoryTotal ? Math.round((m.memoryTotal / 1024 ** 3) * 10) / 10 : "—"} GB</b></p><p>${w("Температура")} <b>${m.temperature === null ? w("Датчик недоступен") : m.temperature + " °C"}</b></p><p>${w("Батарея")} <b>${m.battery?.supported ? m.battery.percent + "%" : w("Без батареи")}</b></p>`;
      })
      .catch(() => {});
}
async function refreshMetrics(root, state, api) {
  if (
    !root.querySelector("#computer-metrics") ||
    metricsPending ||
    Date.now() - metricsAt < 3000
  )
    return;
  metricsPending = true;
  metricsAt = Date.now();
  try {
    const m = await api.metrics(),
      box = root.querySelector("#computer-metrics"),
      w = (text) => word(text, state.language);
    if (box)
      box.innerHTML = `<p>CPU <b>${m.cpu ?? "—"}%</b></p><p>${w("Оперативная память")} <b>${m.memoryUsed ? Math.round((m.memoryUsed / 1024 ** 3) * 10) / 10 : "—"} / ${m.memoryTotal ? Math.round((m.memoryTotal / 1024 ** 3) * 10) / 10 : "—"} GB</b></p><p>${w("Температура")} <b>${m.temperature === null ? w("Датчик недоступен") : m.temperature + " °C"}</b></p><p>${w("Батарея")} <b>${m.battery?.supported ? m.battery.percent + "%" : w("Без батареи")}</b></p>`;
  } catch {
  } finally {
    metricsPending = false;
  }
}
export function refreshFeatures(root, state, api) {
  root.querySelectorAll("[data-stock]").forEach((e) => {
    const n = state.life?.inventory?.[e.dataset.stock] ?? 0;
    e.textContent = n;
    e.closest("button").disabled = n < 1;
  });
  void refreshMetrics(root, state, api);
  const w = (text) => word(text, state.language),
    l = state.life || {};
  root.querySelectorAll("[data-meter]").forEach((e) => {
    const value = Math.round(l[e.dataset.meter] || 0);
    e.querySelector("meter").value = value;
    e.querySelector("b").textContent = value + "%";
  });
  const summary = root.querySelector("#life-summary");
  if (summary)
    summary.textContent =
      w(
        l.stage === "adult"
          ? "Взрослый"
          : l.stage === "young"
            ? "Подросток"
            : "Малыш",
      ) +
      " · " +
      w("Уровень") +
      " " +
      (l.level || 1) +
      " · 🪙 " +
      (l.coins || 0);
  const hp = root.querySelector("#house-progress");
  if (hp) hp.textContent = Math.round(l.house || 0) + "%";
  root
    .querySelectorAll(".coin-balance")
    .forEach((e) => (e.textContent = "🪙 " + (l.coins || 0)));
  const age = root.querySelector("#pet-age");
  if (age) age.textContent = ageLabel(l, state.language);
  const timer = root.querySelector("#timer-status");
  if (timer)
    timer.textContent = l.timer
      ? new Date(l.timer.ends).toLocaleTimeString(
          state.language === "uk" ? "uk-UA" : state.language,
        )
      : "—";
  const list = root.querySelector("#task-list");
  if (list) {
    const html = (l.tasks || [])
      .map(
        (x) =>
          `<li><label><input type="checkbox" data-task-toggle="${esc(x.id)}" ${x.done ? "checked" : ""}><span class="${x.done ? "done" : ""}">${esc(x.text)}</span></label><small>${x.due ? esc(new Date(x.due).toLocaleString(state.language)) : ""}</small><button data-task-delete="${esc(x.id)}" aria-label="${esc(w("Удалить"))}">×</button></li>`,
      )
      .join("");
    const signature = JSON.stringify([l.tasks, state.language]);
    if (list.dataset.signature !== signature) {
      list.dataset.signature = signature;
      list.innerHTML = html;
      list
        .querySelectorAll("[data-task-toggle]")
        .forEach(
          (e) => (e.onchange = () => api.task("toggle", e.dataset.taskToggle)),
        );
      list
        .querySelectorAll("[data-task-delete]")
        .forEach(
          (e) => (e.onclick = () => api.task("delete", e.dataset.taskDelete)),
        );
    }
  }
  const arena = root.querySelector("#game-arena"),
    status = root.querySelector("#game-status"),
    g = l.game;
  if (arena) {
    root.querySelectorAll("[data-game]").forEach((e) => (e.disabled = !!g));
    if (!g) {
      arena.replaceChildren();
      if (status) status.textContent = "🪙 " + (l.coins || 0);
      return;
    }
    arena.dataset.mode = g.type;
    if (g.type === "hide") {
      const token = String(g.target),
        correct = Math.floor(g.target * 9),
        peek = Date.now() - g.targetAt < 1100;
      if (arena.dataset.target !== token) {
        arena.dataset.target = token;
        arena.innerHTML = Array.from(
          { length: 9 },
          (_, i) =>
            `<button class="hide-box" data-box="${i}" aria-label="${w("Прятки")} ${i + 1}">📦</button>`,
        ).join("");
      }
      arena.querySelectorAll("[data-box]").forEach((button) => {
        const index = Number(button.dataset.box);
        button.textContent = peek && index === correct ? "🐰" : "📦";
        button.onclick = async () => {
          const r = await api.game("hit", {
            id: g.id,
            target: index === correct ? g.target : -1,
          });
          if (!r.ok) {
            button.textContent = "💨";
            setTimeout(() => {
              if (button.isConnected) button.textContent = "📦";
            }, 300);
          }
        };
      });
    } else {
      if (arena.querySelector(".hide-box")) arena.replaceChildren();
      let target = arena.querySelector("button");
      if (!target) {
        target = document.createElement("button");
        target.className = "game-target";
        arena.replaceChildren(target);
      }
      const bite = Date.now() >= g.ready && Date.now() < g.ready + 1800;
      target.textContent = {
        fish: bite ? "🐟" : "🎣",
        butterflies: "🦋",
        ball: "⚽",
      }[g.type];
      target.setAttribute("aria-label", w("Поймать"));
      const time = Date.now() / 1000;
      target.style.left =
        10 +
        g.target * 65 +
        (g.type === "butterflies" ? Math.sin(time * 2) * 7 : 0) +
        "%";
      target.style.top =
        (g.type === "ball"
          ? 28 + Math.abs(Math.sin(time * 2.3)) * 42
          : g.type === "fish"
            ? 52
            : 20 + ((g.target * 13) % 1) * 35 + Math.cos(time * 1.7) * 10) +
        "%";
      target.onclick = () => api.game("hit", { id: g.id, target: g.target });
    }
    if (status)
      status.textContent = `${g.score} · ${Math.max(0, Math.ceil((g.ends - Date.now()) / 1000))} s ${g.type === "fish" ? w(Date.now() >= g.ready && Date.now() < g.ready + 1800 ? "Клюёт!" : "Жди поклёвку…") : ""}`;
  }
}
