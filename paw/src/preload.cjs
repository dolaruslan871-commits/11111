const { contextBridge, ipcRenderer, webUtils } = require('electron');
contextBridge.exposeInMainWorld('paw', {
  getState: () => ipcRenderer.invoke('paw:get-state'),
  update: (patch) => ipcRenderer.invoke('paw:update', patch),
  action: (name) => ipcRenderer.invoke('paw:action', name),
  menu: () => ipcRenderer.send('paw:menu'),
  showPet: () => ipcRenderer.invoke('paw:show-pet'),
  feed: () => ipcRenderer.invoke('paw:feed', null),
  drop: (files) => ipcRenderer.invoke('paw:feed', Array.from(files, file => webUtils.getPathForFile(file))),
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
