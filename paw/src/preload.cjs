const { contextBridge, ipcRenderer, webUtils } = require('electron');
const feedListeners = new Set();
function reportFeed(result) { for (const callback of feedListeners) { try { callback(result); } catch {} } }
// Resolve native File paths in the preload realm, before contextBridge cloning.
document.addEventListener('dragover', event => {
  if (event.dataTransfer?.types?.includes('Files')) {
    event.preventDefault();
    const allowed = String(event.dataTransfer.effectAllowed).toLowerCase();
    // Some native drag sources allow copy only. Forcing an unsupported move
    // causes Chromium to cancel the drop before a File is ever delivered.
    event.dataTransfer.dropEffect = ['all','uninitialized'].includes(allowed) || allowed.includes('move') ? 'move' : 'copy';
  }
}, true);
document.addEventListener('drop', event => {
  if (!event.dataTransfer?.files?.length) return;
  event.preventDefault();
  try {
    const paths = Array.from(event.dataTransfer.files, file => webUtils.getPathForFile(file));
    if (paths.some(file => !file)) {
      reportFeed({ ok: false, message: 'Не удалось получить путь файла. Перетащи сохранённый файл из Finder или Проводника.' });
      return;
    }
    ipcRenderer.invoke('paw:feed', [...new Set(paths)]).then(reportFeed, () => reportFeed({ ok: false, message: 'Не удалось передать файл питомцу. Попробуй кнопку «Покормить».' }));
  } catch { reportFeed({ ok: false, message: 'Не удалось прочитать перетаскиваемый файл. Попробуй кнопку «Покормить».' }); }
}, true);
contextBridge.exposeInMainWorld('paw', {
  getState: () => ipcRenderer.invoke('paw:get-state'),
  update: (patch) => ipcRenderer.invoke('paw:update', patch),
  action: (name) => ipcRenderer.invoke('paw:action', name),
  menu: () => ipcRenderer.send('paw:menu'),
  closeMenu: () => ipcRenderer.send('paw:close-menu'),
  dashboard: () => ipcRenderer.invoke('paw:dashboard'),
  hide: () => ipcRenderer.invoke('paw:hide'),
  quit: () => ipcRenderer.invoke('paw:quit'),
  showPet: () => ipcRenderer.invoke('paw:show-pet'),
  feed: () => ipcRenderer.invoke('paw:feed', null),
  drop: () => Promise.resolve({ ok: false, message: 'Перетащи файл непосредственно на питомца или воспользуйся кнопкой «Покормить».' }),
  onFeedResult: callback => { feedListeners.add(callback); return () => feedListeners.delete(callback); },
  systemStatus: () => ipcRenderer.invoke('paw:system-status'),
  wifi: (enabled) => ipcRenderer.invoke('paw:wifi', enabled),
  bluetooth: (enabled) => ipcRenderer.invoke('paw:bluetooth', enabled),
  settings: (kind) => ipcRenderer.invoke('paw:settings', kind),
  drag: (phase, point) => ipcRenderer.send('paw:drag', phase, point),
  hit: (value) => ipcRenderer.send('paw:hit', value),
  onState: (callback) => {
    const listener = (_, value) => callback(value);
    ipcRenderer.on('paw:state', listener);
    return () => ipcRenderer.removeListener('paw:state', listener);
  },
});
