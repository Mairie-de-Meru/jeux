// Manifeste des images présentes (aucune requête hors de cette liste). Le jeu reste jouable sans elles.
export const IMAGES = { titre: './assets/img/titre.jpg' };

export function loadImage(key) {
  return new Promise((resolve) => {
    const src = IMAGES[key];
    if (!src) return resolve(null);
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => resolve(null);
    im.src = src;
  });
}
