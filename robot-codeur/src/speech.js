// Lecture à voix haute (speechSynthesis, fr-FR). Sans plantage si l'API manque.
export const speechAvailable = () => typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

export function speak(text) {
  if (!speechAvailable()) return false;
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const clean = String(text).replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}️]/gu, '').trim();
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = 'fr-FR';
    u.rate = 0.9;
    u.pitch = 1.1;
    const voice = synth.getVoices().find((v) => v.lang && v.lang.toLowerCase().startsWith('fr'));
    if (voice) u.voice = voice;
    synth.speak(u);
    return true;
  } catch {
    return false;
  }
}

export function stopSpeech() {
  try { if (speechAvailable()) window.speechSynthesis.cancel(); } catch { /* ignore */ }
}
