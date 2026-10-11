// Images réellement présentes (noms sans extension, dans assets/img/).
// Le jeu fonctionne sans image (repli couleurs/emoji) : toutes présentes.
// À remplir quand les images existent : 'titre', 'obj-bouteille', 'obj-canette', 'obj-carton',
// 'obj-pot', 'obj-trognon', 'obj-journal', 'obj-pile'.
export const MANIFEST = ['titre', 'obj-bouteille', 'obj-canette', 'obj-carton', 'obj-pot', 'obj-trognon', 'obj-journal', 'obj-pile'];

export function has(name) {
  return MANIFEST.includes(name);
}
export function url(name) {
  return './assets/img/' + name + (name === 'titre' ? '.jpg' : '.png');
}
// Précharge uniquement ce qui est listé ; ne rejette jamais.
export function preload() {
  return Promise.all(
    MANIFEST.map(
      (n) =>
        new Promise((res) => {
          const im = new Image();
          im.onload = im.onerror = () => res();
          im.src = url(n);
        })
    )
  );
}
