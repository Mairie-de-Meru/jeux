// Lecture à voix haute (speechSynthesis fr-FR).
let auto = false;
export const speechAvailable = () => 'speechSynthesis' in window;
export function speak(text) {
  if (!speechAvailable() || !text) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[^\p{L}\p{N}\s.,!?'’:;€-]/gu, ' '));
    u.lang = 'fr-FR'; u.rate = 0.95;
    speechSynthesis.speak(u);
  } catch { /* silencieux */ }
}
export const setAutoSpeak = (b) => { auto = b; if (!b && speechAvailable()) speechSynthesis.cancel(); };
export const isAutoSpeak = () => auto;
export function autoSpeak(text) { if (auto) speak(text); }
