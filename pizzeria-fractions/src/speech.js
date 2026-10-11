// Synthèse vocale fr-FR, jamais bloquante si l'API est absente.
const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
let enabled = true;
let current = '';

export const speechSupported = !!synth && typeof SpeechSynthesisUtterance !== 'undefined';

export function setSpeechEnabled(v) { enabled = !!v; if (!enabled) stopSpeech(); }
export function isSpeechEnabled() { return enabled; }
export function setCurrentText(text) { current = text || ''; }

export function speak(text, { force = false } = {}) {
  if (!speechSupported || (!enabled && !force) || !text) return;
  try {
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR';
    u.rate = 0.95;
    u.pitch = 1.1;
    const voice = synth.getVoices().find((v) => v.lang && v.lang.toLowerCase().startsWith('fr'));
    if (voice) u.voice = voice;
    synth.speak(u);
  } catch { /* ignoré */ }
}

export function speakCurrent() { speak(current, { force: true }); }
export function stopSpeech() { try { synth?.cancel(); } catch { /* ignoré */ } }
