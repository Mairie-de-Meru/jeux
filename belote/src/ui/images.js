// Manifeste des images présentes (aucune requête pour un fichier absent).
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
