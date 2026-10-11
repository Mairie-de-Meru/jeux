// Voix : speechSynthesis fr-FR, option mémorisée en localStorage.
const KEY = 'usine-formes-voix';
let enabled = true;
try { enabled = localStorage.getItem(KEY) !== 'off'; } catch (e) { /* ignore */ }

export const speech = {
  get enabled() { return enabled; },
  set(v) {
    enabled = !!v;
    try { localStorage.setItem(KEY, enabled ? 'on' : 'off'); } catch (e) { /* ignore */ }
    if (!enabled && 'speechSynthesis' in window) speechSynthesis.cancel();
  },
  say(text, { force = false } = {}) {
    if ((!enabled && !force) || !text || !('speechSynthesis' in window)) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/[\p{Extended_Pictographic}\uFE0F]/gu, ' '));
      u.lang = 'fr-FR';
      u.rate = 0.92;
      u.pitch = 1.1;
      speechSynthesis.speak(u);
    } catch (e) { /* ignore */ }
  },
};
