// Échelle de temps des animations (réglable par le crochet de test).
export const clock = { scale: 1 };
export const dur = (ms) => ms * clock.scale;
export const sleep = (ms) => new Promise((r) => setTimeout(r, Math.max(0, dur(ms))));
export const easeOut = (u) => 1 - Math.pow(1 - u, 3);
// Rythme des robots : multiplicateur appliqué aux délais et animations des robots (pas à l'enfant).
export const BOT_PACE = 1.6;
