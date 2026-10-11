// Images optionnelles : seules celles listées dans assets/img/images.json sont demandées
// (pas de 404 dans la console quand elles manquent), et jamais d'erreur JS.
const cache = new Map();
let manifest = null;

function available() {
  if (!manifest) {
    manifest = fetch('assets/img/images.json')
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => new Set(Array.isArray(list) ? list : []))
      .catch(() => new Set());
  }
  return manifest;
}

export function loadImage(url) {
  if (!cache.has(url)) {
    cache.set(url, available().then((names) => {
      if (!names.has(url.split('/').pop())) return false;
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
      });
    }));
  }
  return cache.get(url);
}
