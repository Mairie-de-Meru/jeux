// Manifeste des images : uniquement celles listées ici sont demandées (repli sur des couleurs si absente).
export const IMAGES = ['titre'];
const PATH = (key) => `./assets/img/${key}.jpg`;

export function loadImage(key) {
  return new Promise((resolve) => {
    if (!IMAGES.includes(key)) return resolve(null);
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => resolve(null);
    im.src = PATH(key);
  });
}
