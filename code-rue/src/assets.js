// Manifeste des images potentielles. Seuls les fichiers listés dans PRESENTS sont chargés (aucune 404).
const BASE = './assets/img/';
export const MANIFEST = [
  'titre.png', 'icone.png', 'mascotte.png', 'diplome.png',
  'enseigne-ecole.png', 'enseigne-parc.png', 'enseigne-boulangerie.png',
];
export const PRESENTS = [
  'titre.png', 'icone.png', 'mascotte.png', 'diplome.png',
  'enseigne-ecole.png', 'enseigne-parc.png', 'enseigne-boulangerie.png',
];

export async function loadAssets() {
  const assets = { images: {}, has: (n) => !!assets.images[n], url: (n) => BASE + n };
  await Promise.all(
    PRESENTS.filter((n) => MANIFEST.includes(n)).map(
      (n) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () => { assets.images[n] = img; resolve(); };
          img.onerror = () => resolve();
          img.src = BASE + n;
        }),
    ),
  );
  return assets;
}
