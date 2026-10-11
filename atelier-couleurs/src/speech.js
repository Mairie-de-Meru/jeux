// Lecture à voix haute (speechSynthesis, fr-FR). Silencieux si non disponible.
export function disponible() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function parler(texte) {
  if (!disponible() || !texte) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(texte);
  u.lang = 'fr-FR';
  u.rate = 0.9;
  u.pitch = 1.1;
  const voix = synth.getVoices().find((v) => v.lang && v.lang.toLowerCase().startsWith('fr'));
  if (voix) u.voice = voix;
  synth.speak(u);
}

export function taire() {
  if (disponible()) window.speechSynthesis.cancel();
}
