import { SEASON_INFO, ITEMS } from './seasons.js';

const STAGE_NAMES = { graine: 'la graine', germe: 'le germe', pousse: 'la pousse', fleur: 'la fleur', fruit: 'le fruit',
  oeuf: "l'œuf", chenille: 'la chenille', chrysalide: 'la chrysalide', papillon: 'le papillon' };

export const T = {
  titre: 'Jardin des Saisons',
  activites: { plante: 'Faire pousser', cycle: 'Le cycle de la vie', saison: 'Les saisons' },
  choisisNiveau: 'Choisis un niveau',
  consigne: {
    plante: 'Donne à la plante ce dont elle a besoin !',
    cycle: 'Remets les images dans le bon ordre !',
    saison: (s) => `Habille le jardin pour ${s === 'printemps' ? 'le printemps' : s === 'ete' ? "l'été" : s === 'automne' ? "l'automne" : "l'hiver"} !`,
  },
  indice: {
    'trop-eau': "Assez d'eau ! Essaie le soleil.",
    'trop-soleil': 'Assez de soleil ! Essaie avec de l\'eau.',
    'manque-eau': "Il faut de l'eau !",
    'manque-soleil': 'Il faut du soleil !',
    avant: "C'est trop tôt. Cherche une case avant !",
    apres: "C'est trop tard. Cherche une case après !",
    intrus: "Celle-là n'est pas dans cette histoire !",
    'intrus-printemps': "Ça, ce n'est pas pour le printemps !",
    'intrus-ete': "Ça, ce n'est pas pour l'été !",
    'intrus-automne': "Ça, ce n'est pas pour l'automne !",
    'intrus-hiver': "Ça, c'est pour une autre saison !",
    'deja-pose': "C'est déjà dans le jardin !",
    'objet-inconnu': 'Essaie un autre objet !',
  },
  encouragement: ['Presque !', 'Essaie encore !', 'Tu y es presque !'],
  bravo: ['Bravo !', 'Super !', 'Génial !'],
  grew: ['Ça pousse !', 'Regarde, elle grandit !'],
  fini: 'Bravo ! Un beau fruit est né !',
  habille: 'Bravo ! Le jardin est tout beau !',
  stades: STAGE_NAMES,
  saisons: Object.fromEntries(Object.entries(SEASON_INFO).map(([k, v]) => [k, v.label])),
  objets: Object.fromEntries(ITEMS.map((i) => [i.id, i.label])),
  eau: "Arroser",
  soleil: 'Soleil',
  rejouer: 'Rejouer',
  suite: 'Suite',
  maison: 'Accueil',
};

export function sayCycle(cycleId) {
  const seq = {
    plante: ['graine', 'pousse', 'fleur', 'fruit'],
    papillon: ['oeuf', 'chenille', 'chrysalide', 'papillon'],
  }[cycleId];
  if (!seq) return '';
  const n = seq.map((s) => STAGE_NAMES[s]);
  return `D'abord ${n[0]}, puis ${n[1]}, ensuite ${n[2]}, et enfin ${n[3]}.`;
}
