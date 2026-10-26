import { mountPet3D } from './pet-3d.js';
import { mountRadialMenu } from './radial-menu.js';
import { petSound } from './sound.js';
import { t } from './i18n.js';
const api=window.paw;
let state=await api.getState(),pointer=null,moved=false,noticeTimer;
document.body.innerHTML='<div id="floating-world"><div id="floating-pet" class="pet-hitbox" role="button" tabindex="0" aria-label="Paw"></div><div id="pet-prey"></div><div id="pet-bubble" role="status"></div><div id="radial-host"></div><span id="trash-destination" aria-hidden="true">♻</span></div>';
const world=document.querySelector('#floating-world'),pet=document.querySelector('#floating-pet'),bubble=document.querySelector('#pet-bubble');
const scene=mountPet3D(pet,state),menu=mountRadialMenu(document.querySelector('#radial-host'),api,()=>state,notify);
const captions={sleep:'z z Z',pet:'♡ ♡ ♡',eat:'Ням-ням…',carry:'Отнесу в корзину!',stand:'Привет, человек!',wave:'Привет, человек!',sad:'Побудь со мной',excited:'Как же я рад!'};
function update(){document.documentElement.dataset.theme=state.theme||'light';document.documentElement.lang=state.language||'ru';world.style.transform=`scale(${state.scale||1})`;world.classList.toggle('menu-open',!!state.menuOpen);world.classList.toggle('is-carrying',state.activity==='carry');scene.update(state);menu.update();bubble.textContent=t(state.feed?.phase==='error'?state.feed.message:captions[state.activity]||'',state.language);document.querySelector('#pet-prey').innerHTML=state.activity==='hunt'?'<span class="butterfly" aria-hidden="true"><i></i><b></b></span>':'';}
function notify(message){clearTimeout(noticeTimer);bubble.textContent=t(message,state.language);noticeTimer=setTimeout(update,6000);}
api.onState(next=>{const changed=state.activity!==next.activity;state=next;update();if(changed&&['pet','eat','play','excited','wave'].includes(state.activity))petSound(state.skin,state.muted,state.activity);});
api.onFeedResult(result=>{if(result?.message)notify(result.message);});
pet.oncontextmenu=e=>{e.preventDefault();pointer=null;api.drag('end',{x:e.screenX,y:e.screenY});api.menu();};
pet.onpointerdown=e=>{if(e.button!==0||state.menuOpen)return;pointer={x:e.screenX,y:e.screenY};moved=false;pet.setPointerCapture(e.pointerId);api.drag('start',{x:e.screenX,y:e.screenY});};
pet.onpointermove=e=>{if(!pointer)return;if(Math.hypot(e.screenX-pointer.x,e.screenY-pointer.y)>5)moved=true;if(moved)api.drag('move',{x:e.screenX,y:e.screenY});};
pet.onpointerup=e=>{if(!pointer)return;api.drag('end',{x:e.screenX,y:e.screenY});if(!moved)api.action('pet');pointer=null;};
pet.onpointercancel=e=>{pointer=null;api.drag('end',{x:e.screenX,y:e.screenY});};
pet.onkeydown=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();api.action('pet');}if(e.key==='ContextMenu')api.menu();};
document.addEventListener('keydown',e=>{if(e.key==='Escape')api.closeMenu();});
document.addEventListener('dragover',e=>{if(e.dataTransfer?.types.includes('Files')){e.preventDefault();pet.classList.add('drop-active');bubble.textContent=t(state.feedMode==='carry'?'Отнесу в корзину!':'Ням-ням…',state.language);}});
document.addEventListener('dragleave',e=>{if(!e.relatedTarget)pet.classList.remove('drop-active');});
// Native File resolution and feeding belong to preload; no File bridge cloning.
document.addEventListener('drop',e=>{e.preventDefault();pet.classList.remove('drop-active');});
window.addEventListener('beforeunload',()=>{scene.dispose();menu.dispose();});
update();
