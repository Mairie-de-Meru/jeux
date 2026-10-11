// Images RunningHub optionnelles : seules celles listées dans assets/img/manifest.json
// sont demandées (pas de 404 en console quand une image manque).
export const images = fetch('assets/img/manifest.json')
  .then((r) => (r.ok ? r.json() : []))
  .catch(() => []);

export function whenImage(name, fn) {
  images.then((list) => { if (list.includes(name)) fn(`assets/img/${name}`); });
}

// Classe img-<nom> sur <html> pour les fonds CSS, et logo de l'écran titre.
images.then((list) => {
  for (const n of list) document.documentElement.classList.add(`img-${n.replace(/\.\w+$/, '')}`);
});
