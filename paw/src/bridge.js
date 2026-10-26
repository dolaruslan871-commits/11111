const initial = { skin: 'dog', muted: false, roaming: true, activity: 'idle', direction: 1, outfit: { hat: 'none', glasses: 'none', scarf: 'none', toy: 'none' }, desktop: false };
let value = initial;
try { value = { ...initial, ...JSON.parse(localStorage.getItem('paw-preview') || '{}'), desktop: false }; } catch {}
const listeners = new Set();
const emit = () => { for (const listener of listeners) listener(value); };
export const api = window.paw || {
  getState: async () => value,
  update: async patch => {
    value = { ...value, ...patch, outfit: { ...value.outfit, ...patch.outfit } };
    localStorage.setItem('paw-preview', JSON.stringify(value)); emit(); return value;
  },
  action: async activity => { value = { ...value, activity }; emit(); return value; },
  showPet: async () => false,
  feed: async () => ({ ok: false, message: 'Кормление файлами работает в настольном приложении Paw.' }),
  drop: async () => ({ ok: false, message: 'Для отправки файлов в корзину запусти настольное приложение Paw.' }),
  systemStatus: async () => ({ wifi: { supported: false, enabled: null }, bluetooth: { supported: false, enabled: null } }),
  settings: async () => ({ ok: false, message: 'Системные настройки доступны в настольном приложении.' }),
  wifi: async () => ({ ok: false, message: 'Переключатель Wi-Fi доступен на Mac и Windows.' }),
  bluetooth: async () => ({ ok: false, message: 'Переключатель Bluetooth доступен в приложении для Windows.' }),
  menu: () => {},
  onState: callback => { listeners.add(callback); return () => listeners.delete(callback); },
};
