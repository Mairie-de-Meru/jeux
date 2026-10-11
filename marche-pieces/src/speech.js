// Synthèse vocale fr-FR. Toute erreur ou absence d'API est silencieuse.
let enabled = true;
let voice = null;

function pickVoice() {
  try {
    if (voice) return voice;
    const list = window.speechSynthesis.getVoices();
    voice = list.find((v) => /^fr[-_]FR/i.test(v.lang)) || list.find((v) => /^fr/i.test(v.lang)) || null;
  } catch { /* silencieux */ }
  return voice;
}

export function setSpeechEnabled(v) { enabled = !!v; if (!enabled) cancelSpeech(); }

export function cancelSpeech() {
  try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch { /* silencieux */ }
}

export function speak(text) {
  try {
    if (!enabled || !text || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR';
    const v = pickVoice();
    if (v) u.voice = v;
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  } catch { /* silencieux */ }
}
