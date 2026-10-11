// Manifeste des images présentes. Module pur.
// Une image n'est chargée que si sa clé figure ici (chemin relatif).
// Clés prévues : titre, decor, theme_animals, theme_colors, theme_numbers,
// theme_fruits, herbe, bois. Exemple : titre: './assets/img/titre.png'
export const IMAGES = {};

export const IMAGE_KEYS = ['titre', 'decor', 'theme_animals', 'theme_colors', 'theme_numbers', 'theme_fruits', 'herbe', 'bois'];

export function imageUrl(key) {
  return Object.prototype.hasOwnProperty.call(IMAGES, key) ? IMAGES[key] : null;
}
