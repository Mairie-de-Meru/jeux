// Lecture à voix haute (fr-FR). Sans effet si le navigateur ne sait pas.
export function speak(text) {
  try {
    const synth = window.speechSynthesis;
    if (!synth || !text) return false;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR';
    u.rate = 0.9;
    const v = synth.getVoices().find((x) => x.lang && x.lang.toLowerCase().startsWith('fr'));
    if (v) u.voice = v;
    synth.speak(u);
    return true;
  } catch (e) { return false; }
}
