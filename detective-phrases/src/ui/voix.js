// Lecture à voix haute (speechSynthesis fr-FR). Voix basse si aucune voix française.
let voixFr = null;
export const voix = { auto: true };

function chercher() {
  try {
    voixFr = speechSynthesis.getVoices().find((v) => (v.lang || '').toLowerCase().startsWith('fr')) || null;
  } catch {
    voixFr = null;
  }
}
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  chercher();
  speechSynthesis.addEventListener?.('voiceschanged', chercher);
}

export function parler(texte, { force = false } = {}) {
  if ((!voix.auto && !force) || !texte || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texte);
    u.lang = 'fr-FR';
    u.rate = 0.9;
    if (voixFr) u.voice = voixFr;
    else u.volume = 0.3;
    speechSynthesis.speak(u);
  } catch {
    // pas de voix : le jeu reste jouable en lecture
  }
}

export function taire() {
  try { speechSynthesis.cancel(); } catch { /* rien */ }
}
