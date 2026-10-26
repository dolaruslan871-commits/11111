import { pets, renderPet } from './pet-art.js';
import { api } from './bridge.js';
import { petSound } from './sound.js';

const paths = {
  paw: '<ellipse cx="12" cy="15.5" rx="5.5" ry="4"/><ellipse cx="5" cy="9" rx="2" ry="2.7"/><ellipse cx="10" cy="5" rx="2" ry="2.7"/><ellipse cx="16" cy="5.8" rx="2" ry="2.7"/><ellipse cx="20" cy="10.5" rx="2" ry="2.7"/>',
  home: '<path d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-7h6v7"/>',
  shirt: '<path d="m8 3-6 4 3 5 3-2v11h8V10l3 2 3-5-6-4c0 4-8 4-8 0Z"/>',
  sliders: '<path d="M4 7h5m4 0h7M4 17h9m4 0h3"/><circle cx="11" cy="7" r="2"/><circle cx="15" cy="17" r="2"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  moon: '<path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z"/>',
  bowl: '<path d="M3 12h18l-3 8H6Z"/><path d="M9 8c-3-3 3-3 0-6m6 6c-3-3 3-3 0-6"/>',
  ball: '<circle cx="12" cy="12" r="9"/><path d="M5 6c8 0 5 12 14 12M3 14c8 0 7-6 17-5"/>',
  arrow: '<path d="M7 17 17 7M7 7h10v10"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  volume: '<path d="M11 4 6 8H3v8h3l5 4Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  wifi: '<path d="M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0m-11 4a6 6 0 0 1 8 0"/><circle cx="12" cy="20" r="1"/>',
  bluetooth: '<path d="m7 7 10 10-5 5V2l5 5L7 17"/>',
  spark: '<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Z"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
};
const icon = (name, size = 20) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.paw}</svg>`;
let state = await api.getState(), page = 'home', wardrobeTab = 'hat';
const app = document.querySelector('#app');
let lastActivity = state.activity, toastTimer;
const names = { dog: 'Бадди', cat: 'Моти', croc: 'Киви' };
const moods = { idle: 'Рад тебя видеть', walk: 'Исследует рабочий стол', sleep: 'Сладко спит', eat: 'Хрум-хрум…', play: 'Время поиграть!', hunt: 'На маленькой охоте', pet: 'Ещё за ушком, пожалуйста' };
const wardrobe = {
  hat: { name: 'Шапочки', items: [['none', 'Без шапочки', '—'], ['beanie', 'Тёплая шапка', '◒'], ['party', 'Праздничный колпак', '△']] },
  glasses: { name: 'Очки', items: [['none', 'Без очков', '—'], ['round', 'Круглые очки', '◎'], ['sun', 'Солнечные очки', '●']] },
  scarf: { name: 'Шарфики', items: [['none', 'Без шарфика', '—'], ['coral', 'Коралловый шарф', '〰'], ['sage', 'Шалфейный шарф', '〰']] },
  toy: { name: 'Игрушки', items: [['none', 'Без игрушки', '—'], ['bone', 'Любимая косточка', '🦴'], ['ball', 'Весёлый мячик', '◉']] },
};
function toast(text) {
  const box = document.querySelector('#toast'); box.textContent = text; box.classList.add('visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => box.classList.remove('visible'), 4500);
}
function petStage() {
  return `<section class="pet-stage" aria-label="Твой питомец"><div class="stage-top"><span class="pill"><i></i> ${state.activity === 'sleep' ? 'Тихий час' : 'Всё хорошо'}</span><button class="icon-button" id="sound-stage" aria-label="${state.muted ? 'Включить' : 'Выключить'} звук" title="Звук">${icon('volume')}${state.muted ? '<span class="mute-slash"></span>' : ''}</button></div><span class="stage-spark spark-one">✧</span><span class="stage-spark spark-two">✧</span><div class="stage-floor"></div>${state.activity === 'hunt' ? '<span class="butterfly" aria-hidden="true"><i></i><b></b></span>' : ''}<button class="hero-pet state-${state.activity}" id="pat-pet" aria-label="Погладить питомца">${renderPet(state.skin, state.activity, state.outfit)}</button><div class="mood-bubble">${state.activity === 'pet' ? '♡ ' : ''}${moods[state.activity]}</div><div class="stage-bottom"><span>${icon('sun', 14)} Маленькие радости каждый день</span><span class="stage-hint">Нажми, чтобы погладить</span></div></section>`;
}
function petPicker() {
  return `<div class="section-heading"><h2>Кто будет рядом?</h2><span>Три характера. Один друг.</span></div><div class="pet-picker">${pets.map(p => `<button class="pet-card ${state.skin === p.id ? 'selected' : ''}" data-skin="${p.id}" aria-pressed="${state.skin === p.id}"><div class="pet-thumbnail">${renderPet(p.id, 'idle', {})}</div><div><strong>${names[p.id]}</strong><span>${p.id === 'dog' ? 'Верный хвостик' : p.id === 'cat' ? 'Мягкие лапки' : 'Зубастое обаяние'}</span></div><span class="selection-dot">${state.skin === p.id ? icon('check', 13) : ''}</span></button>`).join('')}</div>`;
}
function homeContent() {
  return `<div class="main-grid"><div class="stage-column">${petStage()}<div class="quick-actions"><button data-action="pet">${icon('heart')}<span>Погладить</span><kbd>♡</kbd></button><button data-action="play">${icon('ball')}<span>Поиграть</span></button><button id="feed">${icon('bowl')}<span>Покормить</span></button></div></div><aside class="daily-card"><div class="eyebrow">МАЛЕНЬКАЯ ЖИЗНЬ</div><h2>У ${names[state.skin]}<br>свои планы</h2><p>Он рядом, даже когда<br>ты занят своими делами.</p><div class="activity-list">${[['walk','paw','Погулять','Изучить каждый уголок'],['play','ball','Поиграть','Поймать хорошее настроение'],['sleep','moon','Вздремнуть','Набраться сил для шалостей']].map(([value, symbol, title, sub]) => `<button data-action="${value}" class="activity-item ${state.activity === value ? 'active' : ''}"><span class="activity-icon">${icon(symbol)}</span><span><strong>${title}</strong><small>${sub}</small></span><span class="activity-indicator"></span></button>`).join('')}</div><div class="daily-footer">${icon('heart', 16)} Забота в простых вещах</div></aside></div>${petPicker()}<div class="bottom-note"><span class="note-icon">${icon('bowl', 19)}</span><div><strong>Ненужным файлам — вкусное применение</strong><p>Перетащи файл на питомца: он съест его и отправит в корзину без лишних вопросов.</p></div><span class="note-flower">✳</span></div>`;
}
function wardrobeContent() {
  return `<div class="wardrobe-layout"><div>${petStage()}<p class="wardrobe-caption">Все вещи можно сочетать. Образ сохраняется автоматически.</p></div><section class="wardrobe-panel"><div class="eyebrow">С МАЛЕНЬКИМ ХАРАКТЕРОМ</div><h2>Ему идёт быть собой</h2><p class="muted">А ещё — эта чудесная шапочка.</p><div class="wardrobe-tabs" role="tablist" aria-label="Виды аксессуаров">${Object.entries(wardrobe).map(([key, tab]) => `<button role="tab" aria-selected="${wardrobeTab === key}" data-tab="${key}" class="${wardrobeTab === key ? 'active' : ''}">${tab.name}</button>`).join('')}</div><div class="outfit-options">${wardrobe[wardrobeTab].items.map(([value,label]) => `<button class="outfit-option ${state.outfit[wardrobeTab] === value ? 'selected' : ''}" data-outfit="${value}" aria-pressed="${state.outfit[wardrobeTab] === value}"><span class="outfit-preview">${renderPet(state.skin, 'idle', { ...state.outfit, [wardrobeTab]: value })}</span><span>${label}</span>${state.outfit[wardrobeTab] === value ? `<i>${icon('check',14)}</i>` : ''}</button>`).join('')}</div><button class="text-button" id="reset-outfit">Снять все аксессуары</button><div class="wardrobe-note">${icon('spark')} <span>Косточка и мячик останутся с другом<br>даже во время прогулки.</span></div></section></div>${petPicker()}`;
}
function toggleRow(id, title, description, checked, symbol) {
  return `<div class="setting-row"><span class="setting-icon">${icon(symbol)}</span><div><strong>${title}</strong><p>${description}</p></div><button id="${id}" role="switch" aria-checked="${checked}" aria-label="${title}" class="switch ${checked ? 'on' : ''}"><i></i></button></div>`;
}
function settingsContent() {
  return `<div class="settings-layout"><section class="settings-card"><h2>В своём ритме</h2><p class="muted">Пусть другу будет уютно на твоём экране.</p>${toggleRow('setting-sound','Звуки питомца','Тихие мультяшные голоса во время общения',!state.muted,'volume')}${toggleRow('setting-roam','Прогулки по экрану','Питомец сам гуляет, играет и отдыхает',state.roaming,'paw')}<div class="setting-row"><span class="setting-icon">${icon('bowl')}</span><div><strong>Кормление файлами</strong><p>Сразу в системную корзину, без подтверждения.<br>Папки и ссылки питомец не ест.</p></div><span class="small-badge">Включено</span></div><h2 class="system-title">Под лапой</h2><p class="muted">Быстрый доступ — ещё и по правой кнопке на питомце.</p><div class="system-buttons"><button id="wifi-status">${icon('wifi')} Wi-Fi <span id="wifi-label">Настройки</span>${icon('chevron',16)}</button><button id="bluetooth-settings">${icon('bluetooth')} Bluetooth <span>Настройки</span>${icon('chevron',16)}</button></div><p class="system-footnote">Переключение Wi-Fi зависит от разрешений macOS и Windows. Bluetooth: переключение в Windows, системные настройки на Mac.</p></section><aside class="help-card"><div class="help-pet">${renderPet(state.skin, 'sleep', state.outfit)}</div><h2>Всегда рядом.<br>Без лишней суеты.</h2><p>Перетаскивай друга мышкой, гладь нажатием и открывай его меню правой кнопкой.</p><div class="help-divider"></div><span>PAW · ПЕРВЫЕ ШАГИ</span><p class="version">Версия 0.1.0</p></aside></div>`;
}
function render() {
  const isHome = page === 'home', titles = { home: ['Твой маленький компаньон', 'Хороший день начинается с «гав».'], wardrobe: ['Гардероб', 'Маленькие детали. Большая индивидуальность.'], settings: ['Как дома', 'Всё, что нужно для вашей дружбы.'] };
  app.innerHTML = `<div class="app-shell"><aside class="sidebar"><a class="brand" href="#" aria-label="Paw — домой"><span class="brand-mark">${icon('paw',28)}</span>Paw<span class="brand-dot">✧</span></a><div class="sidebar-label">ВАШ ОБЩИЙ МИР</div><nav>${[['home','home','Мой питомец'],['wardrobe','shirt','Гардероб'],['settings','sliders','Настройки']].map(([id,symbol,label]) => `<button class="nav-item ${page === id ? 'active' : ''}" data-page="${id}" ${page === id ? 'aria-current="page"' : ''}>${icon(symbol)}<span>${label}</span>${page === id ? '<i></i>' : ''}</button>`).join('')}</nav><div class="sidebar-bottom"><div class="tiny-paw">${icon('paw',32)}</div><p>Чуть больше тепла<br>на твоём рабочем столе.</p><div class="sidebar-version"><span>Paw для тебя</span><span>v0.1</span></div></div></aside><main><header class="page-header"><div><div class="eyebrow">МАЛЕНЬКИЙ ДРУГ. БОЛЬШЕ УЮТА.</div><h1>${titles[page][0]}</h1><p>${titles[page][1]}</p></div><button id="show-pet" class="primary-button">${icon('paw',18)} На рабочий стол ${icon('arrow',16)}</button></header>${isHome ? homeContent() : page === 'wardrobe' ? wardrobeContent() : settingsContent()}<footer><span><i></i> ${state.desktop ? 'Твой друг уже рядом' : 'Знакомство с Paw · веб-превью'}</span><span>Сделано для маленькой дружбы ${icon('heart',12)}</span></footer></main></div>`;
  bind();
}
function bind() {
  document.querySelector('.brand').onclick = e => { e.preventDefault(); page = 'home'; render(); };
  document.querySelectorAll('[data-page]').forEach(b => b.onclick = () => { page = b.dataset.page; render(); });
  document.querySelectorAll('[data-skin]').forEach(b => b.onclick = async () => { state = await api.update({ skin: b.dataset.skin }); render(); petSound(state.skin, state.muted); });
  document.querySelectorAll('[data-action]').forEach(b => b.onclick = () => action(b.dataset.action));
  document.querySelector('#pat-pet')?.addEventListener('click', () => action('pet'));
  document.querySelector('#show-pet').onclick = async () => { const ok = await api.showPet(); toast(ok ? 'Друг уже на рабочем столе. Правая кнопка — его меню.' : 'Чтобы выпустить друга на рабочий стол, запусти приложение Paw.'); };
  document.querySelector('#feed')?.addEventListener('click', async () => resultToast(await api.feed()));
  document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { wardrobeTab = b.dataset.tab; render(); });
  document.querySelectorAll('[data-outfit]').forEach(b => b.onclick = async () => { state = await api.update({ outfit: { [wardrobeTab]: b.dataset.outfit } }); render(); });
  document.querySelector('#reset-outfit')?.addEventListener('click', async () => { state = await api.update({ outfit: { hat:'none', glasses:'none', scarf:'none', toy:'none' } }); render(); });
  for (const id of ['sound-stage','setting-sound']) document.getElementById(id)?.addEventListener('click', async () => { state = await api.update({ muted: !state.muted }); render(); });
  document.querySelector('#setting-roam')?.addEventListener('click', async () => { state = await api.update({ roaming: !state.roaming }); render(); });
  document.querySelector('#bluetooth-settings')?.addEventListener('click', async () => {
    const status = await api.systemStatus();
    if (status.bluetooth.supported && typeof status.bluetooth.enabled === 'boolean') resultToast(await api.bluetooth(!status.bluetooth.enabled));
    else resultToast(await api.settings('bluetooth'));
  });
  document.querySelector('#wifi-status')?.addEventListener('click', async () => {
    const status = await api.systemStatus();
    if (status.wifi.supported && typeof status.wifi.enabled === 'boolean') { const result = await api.wifi(!status.wifi.enabled); resultToast(result); if (result.ok) refreshWifi(); }
    else resultToast(await api.settings('wifi'));
  });
  const stage = document.querySelector('.pet-stage');
  if (stage) {
    stage.oncontextmenu = e => { e.preventDefault(); if (state.desktop) api.menu(); else toast('Меню по правой кнопке доступно у питомца на рабочем столе.'); };
    stage.ondragover = e => { e.preventDefault(); stage.classList.add('drop-active'); };
    stage.ondragleave = () => stage.classList.remove('drop-active');
    stage.ondrop = async e => { e.preventDefault(); stage.classList.remove('drop-active'); resultToast(await api.drop(e.dataTransfer.files)); };
  }
  if (page === 'settings') refreshWifi();
}
async function refreshWifi() {
  const status = await api.systemStatus();
  const label = document.querySelector('#wifi-label');
  if (label) label.textContent = status.wifi.enabled === true ? 'Включён' : status.wifi.enabled === false ? 'Выключен' : 'Настройки';
}
function resultToast(result) { if (result?.message) toast(result.message); }
async function action(name) { state = await api.action(name); render(); if (!state.desktop) petSound(state.skin, state.muted); }
api.onState(next => {
  const preferencesChanged = ['skin','muted','roaming'].some(key => state[key] !== next[key]) || JSON.stringify(state.outfit) !== JSON.stringify(next.outfit);
  state = next;
  if (lastActivity !== state.activity || preferencesChanged) { lastActivity = state.activity; render(); }
  else {
    const pet = document.querySelector('#pat-pet');
    if (pet) pet.innerHTML = renderPet(state.skin, state.activity, state.outfit);
  }
});
render();
