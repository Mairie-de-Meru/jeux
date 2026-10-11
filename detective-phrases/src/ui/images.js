// Seules les images listées dans assets/manifest.json sont chargées (aucune 404).
let liste = new Set();

export async function chargerManifeste() {
  try {
    const r = await fetch('assets/manifest.json', { cache: 'no-store' });
    const j = await r.json();
    liste = new Set((j.images || []).map((n) => String(n).split('/').pop()));
  } catch {
    liste = new Set();
  }
  return liste;
}

export const urlImage = (nom) => (liste.has(nom) ? `assets/img/${nom}` : null);

export function chargerImg(nom) {
  const url = urlImage(nom);
  if (!url) return Promise.resolve(null);
  return new Promise((ok) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => ok(null);
    img.src = url;
  });
}
