// speechSynthesis fr-FR ; ne plante jamais si absent.
let enabled = true;
export function speak(text) {
  try {
    if (!enabled || !text || typeof speechSynthesis === 'undefined') return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR';
    u.rate = 0.9;
    u.pitch = 1.1;
    const v = speechSynthesis.getVoices().find((x) => x.lang && x.lang.toLowerCase().startsWith('fr'));
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  } catch (_) { /* ignoré */ }
}
export function stopSpeech() {
  try { if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel(); } catch (_) { /* ignoré */ }
}
export const setSpeechEnabled = (v) => { enabled = !!v; };
