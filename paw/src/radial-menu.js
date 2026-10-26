import { icon } from './icons.js';
import { localize } from './i18n.js';
export function mountRadialMenu(host, api, getState, notify = () => {}) {
  let panel=false;
  function render() {
    const s=getState();host.className=`radial-menu ${s.menuOpen?'is-open':''}`;host.setAttribute('aria-hidden',String(!s.menuOpen));
    if(!s.menuOpen){host.replaceChildren();panel=false;return;}
    const entries=[['wardrobe','shirt','Гардероб'],['sleep','moon',s.activity==='sleep'?'Разбудить':'Спать'],['stand','paw','Лапки'],['sound','volume',s.muted?'Звук вкл.':'Звук выкл.'],['pet','heart','Погладить'],['play','ball','Играть'],['feed','bowl','Покормить'],['top','arrow',s.alwaysOnTop?'Поверх окон':'Обычное окно'],['settings','sliders','Ещё']];
    host.innerHTML=`<div class="radial-halo"></div><div class="radial-caption">PAW · 3D</div>${entries.map(([id,symbol,label],i)=>{const a=Math.PI-i*Math.PI/8;return `<button class="radial-item ${id==='top'&&s.alwaysOnTop?'chosen':''}" data-radial="${id}" style="--item-x:${215+Math.cos(a)*173}px;--item-y:${244-Math.sin(a)*173}px;--order:${i}" aria-label="${label}" title="${label}"><span>${icon(symbol,20)}</span><small>${label}</small></button>`;}).join('')}<button class="radial-close" aria-label="Закрыть меню">×</button>${panel?details(s):''}`;
    host.querySelector('.radial-close').onclick=()=>api.closeMenu();
    host.querySelectorAll('[data-radial]').forEach(b=>b.onclick=async()=>{const id=b.dataset.radial;if(id==='settings'){panel=!panel;render();return;}if(id==='sound'){await api.update({muted:!getState().muted});return;}if(id==='top'){await api.update({alwaysOnTop:!getState().alwaysOnTop});return;}if(id==='wardrobe'){await api.dashboard();return;}if(id==='feed'){api.closeMenu();const r=await api.feed();if(r?.message)notify(r.message);return;}api.action(id==='sleep'&&s.activity==='sleep'?'idle':id);});
    for(const kind of ['wifi','bluetooth'])host.querySelector(`[data-detail="${kind}"]`)?.addEventListener('click',async()=>{const status=await api.systemStatus();const r=status[kind]?.supported&&typeof status[kind].enabled==='boolean'?await api[kind](!status[kind].enabled):await api.settings(kind);if(r?.message)notify(r.message);});
    host.querySelector('[data-detail="home"]')?.addEventListener('click',()=>api.dashboard());
    host.querySelector('[data-detail="hide"]')?.addEventListener('click',()=>api.hide());
    host.querySelector('[data-detail="quit"]')?.addEventListener('click',()=>api.quit());
    const size=host.querySelector('#radial-size');if(size)size.onchange=()=>api.update({scale:Number(size.value)});
    localize(host,s.language);
  }
  function details(s){return `<section class="glass-details"><h3>Под лапой</h3><div class="detail-actions"><button data-detail="wifi">${icon('wifi',16)} Wi-Fi</button><button data-detail="bluetooth">${icon('bluetooth',16)} Bluetooth</button><button data-detail="home">${icon('shirt',16)} Настройки</button></div><label>Размер питомца <input id="radial-size" aria-label="Размер питомца" type="range" min="0.6" max="1.6" step="0.1" value="${s.scale||1}"></label><div class="detail-actions"><button data-detail="hide">Спрятать</button><button data-detail="quit">Выйти из Paw</button></div></section>`;}
  host.onpointerdown=e=>e.stopPropagation();host.oncontextmenu=e=>{e.preventDefault();e.stopPropagation();};
  return {update:render,dispose:()=>host.replaceChildren()};
}
