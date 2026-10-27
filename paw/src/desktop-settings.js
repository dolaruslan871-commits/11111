import {escapeHTML as esc} from './v5-ui.js';
export function desktopSettings(s){
 const c=(ru,uk,en)=>s.language==='en'?en:s.language==='uk'?uk:ru;
 const toggle=(key,label,hint='')=>`<label class="desktop-option"><span><strong>${label}</strong>${hint?`<small>${hint}</small>`:''}</span><input type="checkbox" data-desktop-pref="${key}" ${s[key]?'checked':''}></label>`;
 const option=(v,label,current)=>`<option value="${esc(v)}" ${v===current?'selected':''}>${esc(label)}</option>`;
 return `<section class="life-card desktop-settings"><h2>${c('Paw на рабочем столе','Paw на робочому столі','Paw on your desktop')}</h2><div class="behavior-grid"><label>${c('Быстро показать / скрыть','Швидко показати / сховати','Show / hide shortcut')}<select data-desktop-pref="hotkey">${['CommandOrControl+Shift+P','CommandOrControl+Alt+P','Alt+Shift+P',''].map(v=>option(v,v||c('Отключено','Вимкнено','Disabled'),s.hotkey)).join('')}</select><small id="hotkey-status" role="status">${s.hotkeyRegistered===false?c('Комбинация занята. Выбери другую.','Комбінація зайнята. Обери іншу.','Shortcut unavailable. Choose another.') : ''}</small></label><label>${c('Экран питомца','Екран улюбленця','Pet display')}<select data-desktop-pref="displayId">${option('',c('Основной экран','Основний екран','Primary display'),s.displayId)}${(s.displays||[]).map(d=>option(d.id,`${d.label} · ${d.width} × ${d.height}`,s.displayId)).join('')}</select></label>
 ${toggle('autostart',c('Автозапуск Paw','Автозапуск Paw','Launch at login'),s.platform==='linux'?c('Настраивается в системе','Налаштовується в системі','Configure in system settings'):'')}
 ${toggle('energySaver',c('Экономия энергии','Економія енергії','Save energy'),c('15 FPS в покое, 60 FPS при взаимодействии','15 FPS у спокої, 60 FPS під час взаємодії','15 FPS at rest; up to 60 FPS during interaction'))}
 ${toggle('smartDnd',c('Не мешать в полноэкранных приложениях','Не турбувати в повноекранних програмах','Hide during fullscreen apps'),c('Автоматически возвращается после выхода','Автоматично повертається після виходу','Returns automatically when fullscreen ends'))}
 ${toggle('updateNotifications',c('Уведомлять об обновлениях','Сповіщати про оновлення','Notify about updates'))}</div><div class="desktop-buttons"><button id="paw-guide-replay">${c('Обучение Paw','Навчання Paw','Paw Guide')}</button><button id="paw-reset-position">${c('Вернуть питомца на экран','Повернути улюбленця на екран','Reset pet position')}</button><button id="paw-dock">${s.docked?c('Развернуть питомца','Розгорнути улюбленця','Expand pet'):c('Свернуть в значок','Згорнути у значок','Collapse to icon')}</button><button id="paw-updates">${c('Проверить обновления','Перевірити оновлення','Check for updates')}</button><button id="paw-uninstall">${c('Удалить приложение…','Видалити програму…','Uninstall app…')}</button></div><p id="desktop-status" role="status"></p></section>`;
}
export function bindDesktopSettings(root,{api,change,replay,notify}){
 root.querySelectorAll('[data-desktop-pref]').forEach(e=>e.addEventListener('change',async()=>{
  const value=e.type==='checkbox'?e.checked:e.type==='range'?Number(e.value):e.value;
  try{await change({[e.dataset.desktopPref]:value});}catch{notify('Paw: unable to save setting');}
 }));
 const bind=(id,fn)=>root.querySelector(id)?.addEventListener('click',async()=>{try{await fn();}catch(e){notify(e.message);}});
 bind('#paw-guide-replay',replay);bind('#paw-reset-position',()=>api.desktop('reset'));bind('#paw-dock',()=>api.desktop('dock'));bind('#paw-uninstall',()=>api.desktop('uninstall'));
 bind('#paw-updates',async()=>{const r=await api.desktop('updates');const out=root.querySelector('#desktop-status');if(out)out.textContent=r.message;});
}

export function petAppearanceSettings(s){
 const c=(ru,uk,en)=>s.language==='en'?en:s.language==='uk'?uk:ru;
 const toggle=(key,label,hint='')=>`<label class="desktop-option"><span><strong>${label}</strong><small>${hint}</small></span><input type="checkbox" data-desktop-pref="${key}" ${s[key]?'checked':''}></label>`;
 const option=(v,label,current)=>`<option value="${esc(v)}" ${v===current?'selected':''}>${esc(label)}</option>`;
 const breeds=s.skin==='cat'?[['classic',c('Полосатый','Смугастий','Tabby')],['siamese',c('Сиамский','Сіамський','Siamese')],['british',c('Британский','Британський','British shorthair')]]:s.skin==='dog'?[['classic',c('Ретривер','Ретривер','Retriever')],['corgi',c('Корги','Коргі','Corgi')],['dalmatian',c('Далматин','Далматин','Dalmatian')]]:[];
 return `<div class="behavior-grid">${breeds.length?`<label>${c('Порода','Порода','Breed')}<select data-desktop-pref="breed">${breeds.map(([v,l])=>option(v,l,s.breed)).join('')}</select></label>`:''} ${toggle('parachuteEnabled',c('Парашют','Парашут','Parachute'),c('Включён — спуск вниз. Выключен — оставляй меня в любой точке.','Увімкнено — спуск униз. Вимкнено — залишай мене будь-де.','On: descend to the bottom. Off: stay where you place me.'))}
 ${toggle('edgeSnap',c('Прилипать к краям','Прилипати до країв','Snap to screen edges'))}
 ${toggle('clickThrough',c('Пропускать клики сквозь питомца','Пропускати кліки крізь улюбленця','Click through pet'),c('Вернуть управление можно здесь или через значок Paw в трее','Повернути керування можна тут або через значок Paw у треї','Restore interaction here or from the Paw tray icon'))}
 <label>${c('Прозрачность питомца','Прозорість улюбленця','Pet opacity')}<input type="range" min="0.2" max="1" step="0.05" value="${s.petOpacity??1}" data-desktop-pref="petOpacity"></label>
</div>`;
}
