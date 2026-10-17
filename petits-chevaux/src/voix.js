// Lecture à voix haute (speechSynthesis, fr-FR). Sans voix disponible, ne fait rien.
let actif = true;
export function setVoix(v) { actif = !!v; if (!v) arreter(); }
export function voixActive() { return actif; }
export function disponible() { return typeof window !== 'undefined' && 'speechSynthesis' in window; }

export function arreter() { if (disponible()) window.speechSynthesis.cancel(); }

// force = true : lecture demandée explicitement (bouton 🔊), même si la voix automatique est coupée.
export function parler(texte, { force = false, interrompre = true } = {}) {
  if (!disponible() || (!actif && !force)) return;
  try {
    const synth = window.speechSynthesis;
    if (interrompre) synth.cancel();
    const u = new SpeechSynthesisUtterance(texte);
    u.lang = 'fr-FR';
    u.rate = 0.95;
    u.pitch = 1.1;
    synth.speak(u);
  } catch (e) { /* ignoré */ }
}

const NOMBRES = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six'];
export function compter(n) { parler(NOMBRES[n] ?? String(n)); }
