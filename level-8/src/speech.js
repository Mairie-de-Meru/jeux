// Synthèse vocale fr-FR ; silencieuse si indisponible.
const ok = typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
export function cancel() {
  if (!ok) return;
  try { window.speechSynthesis.cancel(); } catch (e) { /* silencieux */ }
}
export function speak(text) {
  if (!ok || !text) return;
  try {
    const s = window.speechSynthesis;
    s.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR';
    u.rate = 0.92;
    u.pitch = 1.1;
    const v = s.getVoices().find((x) => x.lang && x.lang.toLowerCase().startsWith('fr'));
    if (v) u.voice = v;
    s.speak(u);
  } catch (e) { /* silencieux */ }
}
