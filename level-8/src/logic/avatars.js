// Avatars (module pur) : noms, emoji de repli, fichier image. Le joueur en prend un, les bots les autres.
export const AVATARS = [
  { id: 1, name: 'Astro', emoji: '🧑‍🚀', file: 'avatar-1.jpg' },
  { id: 2, name: 'Pirate', emoji: '🏴‍☠️', file: 'avatar-2.jpg' },
  { id: 3, name: 'Magie', emoji: '🧙', file: 'avatar-3.jpg' },
  { id: 4, name: 'Chevalier', emoji: '🛡️', file: 'avatar-4.jpg' },
  { id: 5, name: 'Héros', emoji: '🦸', file: 'avatar-5.jpg' },
  { id: 6, name: 'Explo', emoji: '🧭', file: 'avatar-6.jpg' },
];

// Manifeste des fichiers réellement présents dans assets/img/ (seuls ceux-là sont préchargés : pas de 404).
export const AVATAR_FILES = [];

// Avatars des bots : tous sauf celui du joueur, dans l'ordre.
export function botAvatars(playerAvatar = 1) {
  return AVATARS.filter((a) => a.id !== playerAvatar);
}
