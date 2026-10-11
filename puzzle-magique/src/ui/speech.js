// Lecture à voix haute des consignes (speechSynthesis, fr-FR).
export function speak(text) {
  try {
    const s = window.speechSynthesis;
    if (!s) return;
    s.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR';
    u.rate = 0.9;
    const v = s.getVoices().find((x) => x.lang && x.lang.toLowerCase().startsWith('fr'));
    if (v) u.voice = v;
    s.speak(u);
  } catch { /* pas de synthèse vocale */ }
}
export function stopSpeech() { try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch { /* rien */ } }
