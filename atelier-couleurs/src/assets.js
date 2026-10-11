// Manifeste d'images optionnelles. Une image n'est demandée que si elle est listée dans DISPONIBLES
// (aucun 404). Le jeu reste jouable sans elles (repli sur des couleurs unies).
export const MANIFESTE = {
  titre: 'assets/img/titre.jpg',
  icone: 'assets/img/icone.png',
  bois: 'assets/img/bois.jpg',
  mur: 'assets/img/mur.jpg',
  peintre: 'assets/img/peintre.png',
};

// Ajouter ici la clé d'une image une fois le fichier présent dans assets/img/.
export const DISPONIBLES = ['titre', 'icone'];

export async function chargerImages() {
  const res = {};
  for (const cle of Object.keys(MANIFESTE)) res[cle] = null;
  await Promise.all(
    DISPONIBLES.filter((c) => MANIFESTE[c]).map(
      (cle) =>
        new Promise((ok) => {
          const img = new Image();
          img.onload = () => { res[cle] = MANIFESTE[cle]; ok(); };
          img.onerror = () => ok();
          img.src = MANIFESTE[cle];
        })
    )
  );
  return res;
}
