// Lecture à voix haute (speechSynthesis, fr-FR). Silencieux si indisponible.
export function speak(text) {
  try {
    if (!text || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR'; u.rate = 0.9; u.pitch = 1.1;
    const v = window.speechSynthesis.getVoices().find((x) => x.lang && x.lang.toLowerCase().startsWith('fr'));
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  } catch (e) { /* ignoré */ }
}
export function stopSpeech() {
  try { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); } catch (e) { /* ignoré */ }
}
