// Manifeste (n'y déclarer que les fichiers présents dans assets/img/) des images : seules ces images sont demandées. Repli silencieux si absente.
export const MANIFEST = {
  titre: 'assets/img/titre.png',
  reveil: 'assets/img/reveil.png',
  ecole: 'assets/img/ecole.png',
  gouter: 'assets/img/gouter.png',
  dodo: 'assets/img/dodo.png',
};

const loaded = {}; // id -> url si chargée

export function loadAssets() {
  return Promise.all(
    Object.entries(MANIFEST).map(
      ([id, url]) =>
        new Promise((resolve) => {
          try {
            const img = new Image();
            img.onload = () => { loaded[id] = url; resolve(); };
            img.onerror = () => resolve();
            img.src = url;
          } catch (e) { resolve(); }
        })
    )
  );
}

export function imageUrl(id) {
  return loaded[id] || null;
}
