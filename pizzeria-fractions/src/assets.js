// Chargement optionnel des images : assets/img/manifest.json liste celles qui existent.
const BASE = 'assets/img/';

export async function loadAssets() {
  const assets = { names: [], images: {}, has: (n) => assets.names.includes(n), url: (n) => BASE + n };
  try {
    const res = await fetch(BASE + 'manifest.json', { cache: 'no-cache' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.images)) assets.names = data.images.filter((n) => typeof n === 'string');
    }
  } catch { /* pas de manifest : aucune image */ }
  await Promise.all(
    assets.names.map(
      (n) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () => { assets.images[n] = img; resolve(); };
          img.onerror = () => { assets.names = assets.names.filter((x) => x !== n); resolve(); };
          img.src = BASE + n;
        }),
    ),
  );
  return assets;
}
