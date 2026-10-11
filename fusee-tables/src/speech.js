// Lecture à voix haute (fr-FR). Silencieux si indisponible.
export function say(text) {
  try {
    const synth = window.speechSynthesis;
    if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR';
    u.rate = 0.9;
    u.pitch = 1.1;
    synth.speak(u);
  } catch {
    /* rien */
  }
}
