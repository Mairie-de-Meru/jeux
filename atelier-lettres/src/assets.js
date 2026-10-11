// Images optionnelles listées dans assets/manifest.json : { "images": { "title": "assets/img/title.png", ... } }
// Seules les images listées sont demandées ; le jeu reste jouable sans (repli couleurs/emoji).
import * as THREE from 'three';

export async function loadAssets() {
  const urls = {};
  const textures = {};
  try {
    const r = await fetch('assets/manifest.json', { cache: 'no-store' });
    if (r.ok) {
      const j = await r.json();
      for (const [k, v] of Object.entries((j && j.images) || {})) if (typeof v === 'string' && v) urls[k] = v;
    }
  } catch (e) { /* manifeste absent ou invalide : repli */ }
  const loader = new THREE.TextureLoader();
  await Promise.all(
    Object.entries(urls).map(([k, u]) => new Promise((res) => {
      loader.load(
        u,
        (t) => { t.colorSpace = THREE.SRGBColorSpace; t.userData.shared = true; textures[k] = t; res(); },
        undefined,
        () => { delete urls[k]; res(); }
      );
    }))
  );
  return {
    has: (k) => !!urls[k],
    url: (k) => urls[k] || null,
    texture: (k) => textures[k] || null,
  };
}
