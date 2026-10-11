// Manifeste des modèles GLB (Kenney, CC0) et choix GLB / procédural. Module pur (aucun import three ni DOM).
// color : couleur d'affichage naturelle du GLB (texture colormap), mesurée sur les UV de chaque modèle ;
// null pour les animaux (pas de consigne de couleur).
const FOOD = './assets/models/food/';
const PETS = './assets/models/pets/';
const FARM = './assets/models/farm/'; // matériaux propres à chaque GLB (dir null : pas de matériau partagé)

export const MODEL_MANIFEST = {
  cow: { url: PETS + 'animal-cow.glb', dir: 'pets', color: null },
  pig: { url: PETS + 'animal-pig.glb', dir: 'pets', color: null },
  cat: { url: PETS + 'animal-cat.glb', dir: 'pets', color: null },
  dog: { url: PETS + 'animal-dog.glb', dir: 'pets', color: null },
  sheep: { url: FARM + 'sheep.glb', dir: null, color: null, bright: 2.2 },
  chicken: { url: FARM + 'chicken.glb', dir: null, color: null, bright: 1.3 },
  horse: { url: FARM + 'horse.glb', dir: null, color: null },
  duck: { url: FARM + 'duck.glb', dir: null, color: null },
  apple: { url: FOOD + 'apple.glb', dir: 'food', color: 'red' },
  banana: { url: FOOD + 'banana.glb', dir: 'food', color: 'yellow' },
  pear: { url: FOOD + 'pear.glb', dir: 'food', color: 'green' },
  strawberry: { url: FOOD + 'strawberry.glb', dir: 'food', color: 'red' },
  cherry: { url: FOOD + 'cherries.glb', dir: 'food', color: 'red' },
  orange: { url: FOOD + 'orange.glb', dir: 'food', color: 'orange' },
  lemon: { url: FOOD + 'lemon.glb', dir: 'food', color: 'yellow' },
};

// Entrée du manifeste à utiliser pour (nom, couleur demandée), ou null → modèle procédural.
// Le GLB n'a qu'une couleur : il ne sert que si aucune couleur n'est demandée ou si elle est la sienne.
export function glbChoice(nounId, colorId = null) {
  const e = MODEL_MANIFEST[nounId];
  if (!e) return null;
  if (colorId == null || colorId === e.color) return e;
  return null;
}
