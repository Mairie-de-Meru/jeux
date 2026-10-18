// Manifeste des images présentes (aucune requête pour un fichier absent).
export const IMAGES = {
  titre: './assets/img/titre.jpg',
  table: './assets/img/table.jpg',
  'av-renard': './assets/img/av-renard.png',
  'av-panda': './assets/img/av-panda.png',
  'av-koala': './assets/img/av-koala.png',
  'av-hibou': './assets/img/av-hibou.png',
};

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
