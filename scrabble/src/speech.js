// Synthèse vocale fr-FR ; silencieuse si indisponible.
let enabled = true;
const ok = typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';

export const available = () => ok;
export const isEnabled = () => enabled;
export function setEnabled(v) {
  enabled = !!v;
  if (!enabled) cancel();
}
export function cancel() {
  if (!ok) return;
  try { window.speechSynthesis.cancel(); } catch (e) { /* silencieux */ }
}
export function speak(text, { force = false } = {}) {
  if (!ok || (!enabled && !force) || !text) return;
  try {
    const s = window.speechSynthesis;
    s.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR';
    u.rate = 0.9;
    u.pitch = 1.1;
    const v = s.getVoices().find((x) => x.lang && x.lang.toLowerCase().startsWith('fr'));
    if (v) u.voice = v;
    s.speak(u);
  } catch (e) { /* silencieux */ }
}
