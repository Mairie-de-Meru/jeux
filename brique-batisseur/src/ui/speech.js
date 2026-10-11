// Lecture à voix haute des consignes (speechSynthesis, fr-FR).
export function speak(text) {
  try {
    const synth = window.speechSynthesis;
    if (!synth || !text) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR';
    u.rate = 0.9;
    u.pitch = 1.1;
    const v = synth.getVoices().find((x) => x.lang && x.lang.toLowerCase().startsWith('fr'));
    if (v) u.voice = v;
    synth.speak(u);
  } catch { /* synthèse vocale indisponible */ }
}
