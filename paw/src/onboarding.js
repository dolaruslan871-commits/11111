// Language is chosen before any instructions or spoken introduction.
export const LANGUAGES = [
  { id: "uk", name: "Українська", locale: "uk-UA" },
  { id: "en", name: "English", locale: "en-US" },
  { id: "ru", name: "Русский", locale: "ru-RU" },
];
const copy = {
  ru: { change: "Изменить язык", listen: "Послушать приветствие", stop: "Остановить", unavailable: "Голос на этом языке не установлен в системе" },
  uk: { change: "Змінити мову", listen: "Послухати привітання", stop: "Зупинити", unavailable: "Голос цією мовою не встановлено в системі" },
  en: { change: "Change language", listen: "Listen to the introduction", stop: "Stop", unavailable: "No voice for this language is installed on this device" },
};
export function languagePicker() {
  return `<section class="welcome language-welcome"><div class="welcome-logo">Paw <span>0.6.1</span></div><div class="language-symbol" aria-hidden="true">A<span>あ</span></div><h1><span lang="uk">Обери мову</span><span lang="en">Choose your language</span><span lang="ru">Выбери язык</span></h1><div class="welcome-languages">${LANGUAGES.map(({id,name}) => `<button type="button" lang="${id}" data-welcome-language="${id}"><strong>${name}</strong><span aria-hidden="true">→</span></button>`).join("")}</div></section>`;
}
export function welcomeControls(language) {
  const c = copy[language] || copy.en;
  return `<div class="welcome-preferences"><button type="button" id="welcome-language">${c.change}</button><button type="button" id="welcome-listen" disabled>${c.listen}</button><p id="welcome-voice-status" role="status"></p></div>`;
}
export function bindWelcomeVoice(root, language) {
  const button = root.querySelector("#welcome-listen");
  const status = root.querySelector("#welcome-voice-status");
  const c = copy[language] || copy.en;
  const synth = window.speechSynthesis;
  if (!button || !synth || !window.SpeechSynthesisUtterance) {
    if (button) button.hidden = true;
    return () => {};
  }
  let active = false, disposed = false;
  const voice = () => synth.getVoices().find(v => v.lang?.toLowerCase().split(/[-_]/)[0] === language);
  const refresh = () => {
    if (disposed) return;
    button.disabled = !voice();
    status.textContent = voice() ? "" : c.unavailable;
  };
  const reset = () => { active = false; button.textContent = c.listen; };
  refresh();
  synth.addEventListener("voiceschanged", refresh);
  button.onclick = () => {
    if (active) { synth.cancel(); reset(); return; }
    const selected = voice();
    if (!selected) { refresh(); return; }
    const text = [...root.querySelectorAll(".welcome h1, .welcome-subtitle, .welcome-guide h2, .welcome-guide p, .welcome-trash")].map(n => n.textContent).join(". ");
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = selected.lang;
    utterance.voice = selected;
    utterance.rate = 0.95;
    utterance.onend = utterance.onerror = reset;
    active = true;
    button.textContent = c.stop;
    synth.speak(utterance);
  };
  return () => {
    disposed = true;
    synth.removeEventListener("voiceschanged", refresh);
    if (active) synth.cancel();
    button.onclick = null;
  };
}
