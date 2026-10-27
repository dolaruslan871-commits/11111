import { mountHabitat3D } from "./habitat-3d.js";
const kind = new URLSearchParams(location.search).get("kind"),
  api = window.paw;
let state = await api.getState();
const scene = mountHabitat3D(document.querySelector("#scene"), {
  ...state,
  companion: null,
  habitatKind: kind,
  behavior: { ...state.behavior, seasons: false },
}, kind);
api.onState((next) => {
  state = next;
  scene.update({
    ...state,
    companion: null,
    habitatKind: kind,
    behavior: { ...state.behavior, seasons: false },
  });
});
window.onbeforeunload = () => scene.dispose();

if(kind==='house'){
 const host=document.querySelector('#scene');host.style.cursor='grab';host.style.touchAction='none';
 let pointer=null;
 const point=e=>({x:e.screenX,y:e.screenY});
 host.addEventListener('pointerdown',e=>{if(e.button!==0)return;pointer=e.pointerId;host.setPointerCapture(pointer);api.habitatDrag('start',point(e));host.style.cursor='grabbing';});
 host.addEventListener('pointermove',e=>{if(pointer===e.pointerId)api.habitatDrag('move',point(e));});
 const end=e=>{if(pointer===null)return;api.habitatDrag('end',point(e));pointer=null;host.style.cursor='grab';};
 host.addEventListener('pointerup',end);host.addEventListener('pointercancel',end);
}
