import { renderPet } from './pet-art.js';
import { petSound } from './sound.js';
const api = window.paw;
let state = await api.getState(), pointer = null, moved = false;
const pet = document.querySelector('#floating-pet'), bubble = document.querySelector('#pet-bubble');
function render() {
  pet.innerHTML = renderPet(state.skin, state.activity, state.outfit) + (state.activity === 'hunt' ? '<span class="butterfly" aria-hidden="true"><i></i><b></b></span>' : '');
  pet.className = `pet-hitbox state-${state.activity}`;
  pet.style.transform = state.direction < 0 && ['walk','hunt'].includes(state.activity) ? 'scaleX(-1)' : '';
  bubble.textContent = state.activity === 'sleep' ? 'z z Z' : state.activity === 'pet' ? '♡ ♡ ♡' : state.activity === 'eat' ? 'Ням!' : '';
}
api.onState(next => { const changed = state.activity !== next.activity; state = next; render(); if (changed && ['pet','eat','play'].includes(state.activity)) petSound(state.skin, state.muted); });
document.addEventListener('mousemove', e => api.hit(!!e.target.closest('.pet-hitbox') || !!pointer));
pet.oncontextmenu = e => { e.preventDefault(); pointer = null; api.menu(); };
pet.onpointerdown = e => {
  if (e.button !== 0) return;
  pointer = { x: e.screenX, y: e.screenY }; moved = false; pet.setPointerCapture(e.pointerId);
  api.drag('start', { x: e.screenX, y: e.screenY });
};
pet.onpointermove = e => {
  if (!pointer) return;
  if (Math.hypot(e.screenX - pointer.x, e.screenY - pointer.y) > 5) moved = true;
  if (moved) api.drag('move', { x: e.screenX, y: e.screenY });
};
pet.onpointerup = e => {
  if (!pointer) return;
  api.drag('end', { x: e.screenX, y: e.screenY });
  if (!moved) api.action('pet');
  pointer = null;
};
pet.onpointercancel = e => { pointer = null; api.drag('end', { x: e.screenX, y: e.screenY }); };
pet.onkeydown = e => { if (['Enter',' '].includes(e.key)) { e.preventDefault(); api.action('pet'); } };
document.ondragover = e => { e.preventDefault(); api.hit(true); pet.classList.add('drop-active'); };
document.ondragleave = () => pet.classList.remove('drop-active');
document.ondrop = async e => {
  e.preventDefault(); pet.classList.remove('drop-active');
  const result = await api.drop(e.dataTransfer.files);
  if (result?.message) { bubble.textContent = result.ok ? 'Ням! ♡' : result.message; setTimeout(render, 5000); }
};
render();
