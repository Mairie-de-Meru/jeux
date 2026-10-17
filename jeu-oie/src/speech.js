// Voix (speechSynthesis fr-FR).
let on = true;
export function setVoice(v) { on = v; if (!v) cancel(); }
export function voiceOn() { return on; }
export function cancel() { try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) { /* rien */ } }
export function say(text, { force = false, queue = false, rate = 1 } = {}) {
  if ((!on && !force) || !('speechSynthesis' in window)) return;
  try {
    if (!queue) window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR';
    u.rate = rate;
    u.pitch = 1.1;
    window.speechSynthesis.speak(u);
  } catch (e) { /* rien */ }
}
