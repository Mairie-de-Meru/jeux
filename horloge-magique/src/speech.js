// Lecture à voix haute (speechSynthesis fr-FR), tout en try/catch.
let enabled = true;
let voice = null;

function pickVoice() {
  try {
    const vs = window.speechSynthesis.getVoices();
    voice = vs.find((v) => /^fr/i.test(v.lang)) || null;
  } catch (e) { voice = null; }
}

export function initSpeech() {
  try {
    if (!('speechSynthesis' in window)) return;
    pickVoice();
    window.speechSynthesis.addEventListener('voiceschanged', pickVoice);
  } catch (e) { /* ignoré */ }
}

export function setSpeechEnabled(v) { enabled = !!v; if (!v) cancel(); }
export function speechEnabled() { return enabled; }

export function cancel() {
  try { window.speechSynthesis.cancel(); } catch (e) { /* ignoré */ }
}

export function say(text) {
  if (!enabled || !text) return;
  try {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR';
    u.rate = 0.9;
    u.pitch = 1.1;
    if (voice) u.voice = voice;
    window.speechSynthesis.speak(u);
  } catch (e) { /* ignoré */ }
}
