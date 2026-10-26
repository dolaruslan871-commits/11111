import { pets, renderPet } from './pet-art.js';
import { api } from './bridge.js';
import { petSound } from './sound.js';

import { icon } from './icons.js';
import catalog from './catalog.json' with { type: 'json' };
import { mountPet3D } from './pet-3d.js';
import { t,localize,registerNames } from './i18n.js';
registerNames(Object.values(catalog.wardrobe).flat());
let state = await api.getState(), page = 'home', wardrobeTab = 'hat';
const app = document.querySelector('#app');
let lastActivity = state.activity, toastTimer;
const names = { dog: 'Бадди', cat: 'Моти', croc: 'Киви' };
const moods = { idle: 'Рад тебя видеть', walk: 'Исследует рабочий стол', sleep: 'Сладко спит', eat: 'Хрум-хрум…', play: 'Время поиграть!', hunt: 'На маленькой охоте', pet: 'Ещё за ушком, пожалуйста', stand:'Лапками к твоему экрану', wave:'Привет, человек!', stretch:'Потягу-у-ушки', sad:'Побудь со мной', excited:'Как же я рад!', carry:'Несу в корзину' };
const slotNames = {hat:'Шапочки',glasses:'Очки',scarf:'Шарфики',toy:'Игрушки',clothing:'Одежда',accessory:'Аксессуары'};
const slotEmoji = {hat:'🧢',glasses:'👓',scarf:'🧣',toy:'🦴',clothing:'👕',accessory:'🎒'};
const wardrobe = Object.fromEntries(Object.entries(catalog.wardrobe).map(([key,items])=>[key,{name:slotNames[key],items}]));
let petScene;
function toast(text) {
  const box = document.querySelector('#toast'); box.textContent = t(text,state.language); box.classList.add('visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => box.classList.remove('visible'), 4500);
}
function petStage() {
  return `<section class="pet-stage" aria-label="Твой питомец"><div class="stage-top"><span class="pill"><i></i> ${state.activity === 'sleep' ? 'Тихий час' : 'Всё хорошо'}</span><button class="icon-button" id="sound-stage" aria-label="${state.muted ? 'Включить' : 'Выключить'} звук" title="Звук">${icon('volume')}${state.muted ? '<span class="mute-slash"></span>' : ''}</button></div><span class="stage-spark spark-one">✧</span><span class="stage-spark spark-two">✧</span><div class="stage-floor"></div>${state.activity === 'hunt' ? '<span class="butterfly" aria-hidden="true"><i></i><b></b></span>' : ''}<button class="hero-pet state-${state.activity}" id="pat-pet" aria-label="Погладить питомца"></button><div class="mood-bubble">${state.activity === 'pet' ? '♡ ' : ''}${moods[state.activity] || 'Рядом с тобой'}</div><div class="stage-bottom"><span>${icon('sun', 14)} Маленькие радости каждый день</span><span class="stage-hint">Нажми, чтобы погладить</span></div></section>`;
}
function petPicker() {
  return `<div class="section-heading"><h2>Кто будет рядом?</h2><span>Три характера. Один друг.</span></div><div class="pet-picker">${pets.map(p => `<button class="pet-card ${state.skin === p.id ? 'selected' : ''}" data-skin="${p.id}" aria-pressed="${state.skin === p.id}"><div class="pet-thumbnail">${renderPet(p.id, 'idle', {})}</div><div><strong>${names[p.id]}</strong><span>${p.id === 'dog' ? 'Верный хвостик' : p.id === 'cat' ? 'Мягкие лапки' : 'Зубастое обаяние'}</span></div><span class="selection-dot">${state.skin === p.id ? icon('check', 13) : ''}</span></button>`).join('')}</div>`;
}
function homeContent() {
  return `<div class="main-grid"><div class="stage-column">${petStage()}<div class="quick-actions"><button data-action="pet">${icon('heart')}<span>Погладить</span><kbd>♡</kbd></button><button data-action="play">${icon('ball')}<span>Поиграть</span></button><button id="feed">${icon('bowl')}<span>Покормить</span></button></div></div><aside class="daily-card"><div class="eyebrow">МАЛЕНЬКАЯ ЖИЗНЬ</div><h2>У ${names[state.skin]}<br>свои планы</h2><p>Он рядом, даже когда<br>ты занят своими делами.</p><div class="activity-list">${[['walk','paw','Погулять','Изучить каждый уголок'],['play','ball','Поиграть','Поймать хорошее настроение'],['sleep','moon','Вздремнуть','Набраться сил для шалостей']].map(([value, symbol, title, sub]) => `<button data-action="${value}" class="activity-item ${state.activity === value ? 'active' : ''}"><span class="activity-icon">${icon(symbol)}</span><span><strong>${title}</strong><small>${sub}</small></span><span class="activity-indicator"></span></button>`).join('')}</div><div class="daily-footer">${icon('heart', 16)} Забота в простых вещах</div></aside></div>${emotionPanel()}${petPicker()}<div class="bottom-note"><span class="note-icon">${icon('bowl', 19)}</span><div><strong>Ненужным файлам — вкусное применение</strong><p>Перетащи файл на питомца: он съест его и отправит в корзину без лишних вопросов.</p></div><span class="note-flower">✳</span></div>`;
}
function emotionPanel() {
  return `<section class="emotion-panel"><div class="section-heading"><h2>Маленький, но с характером</h2><span>Нажми — и смотри</span></div><div class="emotion-actions">${[['excited','🤩','Радость'],['sad','🥺','Грусть'],['stand','🐾','Лапки на экран'],['wave','👋','Привет'],['stretch','🌤','Потянуться'],['hunt','🦋','Охота']].map(([id,emoji,name])=>`<button data-action="${id}" aria-pressed="${state.activity === id}"><span>${emoji}</span>${name}</button>`).join('')}</div></section>`;
}
function wardrobeContent() {
  return `<div class="wardrobe-layout"><div>${petStage()}<p class="wardrobe-caption">Все вещи можно сочетать. Образ сохраняется автоматически.</p></div><section class="wardrobe-panel"><div class="eyebrow">С МАЛЕНЬКИМ ХАРАКТЕРОМ</div><h2>Ему идёт быть собой</h2><p class="muted">Больше 50 вещей. Собери свой любимый образ.</p><div class="wardrobe-tabs" role="tablist" aria-label="Виды аксессуаров">${Object.entries(wardrobe).map(([key, tab]) => `<button role="tab" aria-selected="${wardrobeTab === key}" data-tab="${key}" class="${wardrobeTab === key ? 'active' : ''}">${tab.name}</button>`).join('')}</div><div class="outfit-options">${wardrobe[wardrobeTab].items.map(item => `<button class="outfit-option ${state.outfit[wardrobeTab] === item.id ? 'selected' : ''}" data-outfit="${item.id}" aria-pressed="${state.outfit[wardrobeTab] === item.id}"><span class="outfit-swatch" style="--swatch:${item.color || '#a7b59a'}">${item.id === 'none' ? '—' : item.emoji || slotEmoji[wardrobeTab]}</span><span>${item.name}</span>${state.outfit[wardrobeTab] === item.id ? `<i>${icon('check',14)}</i>` : ''}</button>`).join('')}</div><button class="text-button" id="reset-outfit">Снять все аксессуары</button><div class="wardrobe-note">${icon('spark')} <span>Косточка и мячик останутся с другом<br>даже во время прогулки.</span></div></section></div>${petPicker()}`;
}
function toggleRow(id, title, description, checked, symbol) {
  return `<div class="setting-row"><span class="setting-icon">${icon(symbol)}</span><div><strong>${title}</strong><p>${description}</p></div><button id="${id}" role="switch" aria-checked="${checked}" aria-label="${title}" class="switch ${checked ? 'on' : ''}"><i></i></button></div>`;
}
function settingsContent() {
  return `<div class="settings-layout"><section class="settings-card"><h2>В своём ритме</h2><p class="muted">Пусть другу будет уютно на твоём экране.</p>${toggleRow('setting-sound','Звуки питомца','Тихие мультяшные голоса во время общения',!state.muted,'volume')}${toggleRow('setting-top','Поверх окон','Питомец остаётся видимым поверх других приложений',state.alwaysOnTop !== false,'arrow')}${toggleRow('setting-roam','Прогулки по экрану','Питомец сам гуляет, играет и отдыхает',state.roaming,'paw')}<div class="appearance-settings"><label><strong>Язык</strong><select id="language" aria-label="Язык"><option value="ru" ${state.language==='ru'?'selected':''}>Русский</option><option value="uk" ${state.language==='uk'?'selected':''}>Українська</option><option value="en" ${state.language==='en'?'selected':''}>English</option></select></label><div><strong>Тема</strong><div class="segmented"><button data-theme="light" aria-pressed="${state.theme!=='dark'}">Светлая</button><button data-theme="dark" aria-pressed="${state.theme==='dark'}">Тёмная</button></div></div></div><div class="setting-row size-setting"><span class="setting-icon">${icon('paw')}</span><div><strong>Размер питомца</strong><p>От крошечного хвостика до большого друга</p><label class="size-slider"><input id="pet-size" aria-label="Размер питомца" type="range" min="0.6" max="1.6" step="0.1" value="${state.scale || 1}"><output id="size-value">${Math.round((state.scale || 1)*100)}%</output></label></div></div><div class="setting-row"><span class="setting-icon">${icon('bowl')}</span><div><strong>Кормление файлами</strong><p>Сразу в системную корзину, без подтверждения.<br>Папки и ссылки питомец не ест.</p></div><span class="small-badge">Включено</span></div><div class="feed-mode"><strong>Как отправлять файлы в корзину?</strong><div class="segmented"><button data-feed-mode="eat" aria-pressed="${state.feedMode !== 'carry'}">🍪 Съесть</button><button data-feed-mode="carry" aria-pressed="${state.feedMode === 'carry'}">📄 Отнести в зубах</button></div><p>Анимация — потом системная корзина. Без подтверждения.</p></div><h2 class="system-title">Под лапой</h2><p class="muted">Быстрый доступ — ещё и по правой кнопке на питомце.</p><div class="system-buttons"><button id="wifi-status">${icon('wifi')} Wi-Fi <span id="wifi-label">Настройки</span>${icon('chevron',16)}</button><button id="bluetooth-settings">${icon('bluetooth')} Bluetooth <span>Настройки</span>${icon('chevron',16)}</button></div><p class="system-footnote">Переключение Wi-Fi зависит от разрешений macOS и Windows. Bluetooth: переключение в Windows, системные настройки на Mac.</p></section><aside class="help-card"><div class="help-pet">${renderPet(state.skin, 'sleep', state.outfit)}</div><h2>Всегда рядом.<br>Без лишней суеты.</h2><p>Перетаскивай друга мышкой, гладь нажатием и открывай его меню правой кнопкой.</p><div class="help-divider"></div><span>PAW · ПЕРВЫЕ ШАГИ</span><p class="version">Версия 0.2.0 · 3D</p></aside></div>`;
}
function render() {
  petScene?.dispose(); petScene = null;
  document.documentElement.dataset.theme=state.theme || 'light';document.documentElement.lang=state.language || 'ru';
  const isHome = page === 'home', titles = { home: ['Твой маленький компаньон', 'Хороший день начинается с «гав».'], wardrobe: ['Гардероб', 'Маленькие детали. Большая индивидуальность.'], settings: ['Как дома', 'Всё, что нужно для вашей дружбы.'] };
  app.innerHTML = `<div class="app-shell"><aside class="sidebar"><a class="brand" href="#" aria-label="Paw — домой"><span class="brand-mark">${icon('paw',28)}</span>Paw<span class="brand-dot">✧</span></a><div class="sidebar-label">ВАШ ОБЩИЙ МИР</div><nav>${[['home','home','Мой питомец'],['wardrobe','shirt','Гардероб'],['settings','sliders','Настройки']].map(([id,symbol,label]) => `<button class="nav-item ${page === id ? 'active' : ''}" data-page="${id}" ${page === id ? 'aria-current="page"' : ''}>${icon(symbol)}<span>${label}</span>${page === id ? '<i></i>' : ''}</button>`).join('')}</nav><div class="sidebar-bottom"><div class="tiny-paw">${icon('paw',32)}</div><p>Чуть больше тепла<br>на твоём рабочем столе.</p><div class="sidebar-version"><span>Paw для тебя</span><span>v0.2 · 3D</span></div></div></aside><main><header class="page-header"><div><div class="eyebrow">МАЛЕНЬКИЙ ДРУГ. БОЛЬШЕ УЮТА.</div><h1>${titles[page][0]}</h1><p>${titles[page][1]}</p></div><button id="show-pet" class="primary-button">${icon('paw',18)} На рабочий стол ${icon('arrow',16)}</button></header>${isHome ? homeContent() : page === 'wardrobe' ? wardrobeContent() : settingsContent()}<footer><span><i></i> ${state.desktop ? 'Твой друг уже рядом' : 'Знакомство с Paw · веб-превью'}</span><span>Сделано для маленькой дружбы ${icon('heart',12)}</span></footer></main></div>`;
  bind();
  const host = document.querySelector('#pat-pet');
  if (host) petScene = mountPet3D(host, state);
  localize(app,state.language);
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
  document.querySelector('#reset-outfit')?.addEventListener('click', async () => { state = await api.update({ outfit: Object.fromEntries(Object.keys(wardrobe).map(key => [key, 'none'])) }); render(); });
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
    stage.ondrop = async e => { e.preventDefault(); stage.classList.remove('drop-active'); if (!state.desktop) toast('Кормление файлами работает в настольном Paw.'); };
  }
  document.querySelectorAll('[data-feed-mode]').forEach(button => button.onclick = async () => { state = await api.update({feedMode:button.dataset.feedMode}); render(); });
  document.querySelector('#setting-top')?.addEventListener('click',async()=>{state=await api.update({alwaysOnTop:!state.alwaysOnTop});render();});
  document.querySelector('#language')?.addEventListener('change',async e=>{state=await api.update({language:e.target.value});render();});
  document.querySelectorAll('[data-theme]').forEach(button=>button.onclick=async()=>{state=await api.update({theme:button.dataset.theme});render();});
  const size = document.querySelector('#pet-size');
  if (size) { size.oninput = () => {document.querySelector('#size-value').textContent = `${Math.round(Number(size.value)*100)}%`;}; size.onchange = async () => { state = await api.update({scale:Number(size.value)}); render(); }; }
  if (page === 'settings') refreshWifi();
}
async function refreshWifi() {
  const status = await api.systemStatus();
  const label = document.querySelector('#wifi-label');
  if (label) label.textContent = t(status.wifi.enabled === true ? 'Включён' : status.wifi.enabled === false ? 'Выключен' : 'Настройки',state.language);
}
function resultToast(result) { if (result?.message) toast(result.message); }
async function action(name) { state = await api.action(name); render(); if (!state.desktop) petSound(state.skin, state.muted); }
api.onState(next => {
  const preferencesChanged = ['skin','muted','roaming','scale','feedMode','theme','language','alwaysOnTop'].some(key => state[key] !== next[key]) || JSON.stringify(state.outfit) !== JSON.stringify(next.outfit);
  state = next;
  if (lastActivity !== state.activity || preferencesChanged) { lastActivity = state.activity; render(); }
  else {
    const pet = document.querySelector('#pat-pet');
    if (pet) petScene?.update(state);
  }
});
render();

api.onFeedResult?.(result => resultToast(result));
