// Textes du jeu (français, phrases courtes, jamais punitifs).
export const SPECIALS = {
  oie: { emoji: '🦆', title: "Case de l'oie !", say: "Une oie ! Tu avances encore du même nombre." },
  pont: { emoji: '🌉', title: 'Le pont !', say: 'Un pont ! Tu sautes en avant.' },
  auberge: { emoji: '🛏️', title: "L'auberge", say: "L'auberge ! Une petite sieste, tu passes un tour." },
  puits: { emoji: '🪣', title: 'Le puits', say: "Le puits ! Attends qu'un ami arrive, ou deux tours." },
  prison: { emoji: '🔒', title: 'La prison', say: "La prison ! Attends qu'un ami arrive, ou deux tours." },
  labyrinthe: { emoji: '🌀', title: 'Le labyrinthe', say: 'Le labyrinthe ! Tu recules un peu.' },
  mort: { emoji: '😂', title: 'Retour en riant', say: 'Oh là là ! Tu rentres à la case un en riant !' },
};

export const RULES = {
  1: "Touche le dé. Ton pion saute et on compte ensemble. Arrive juste sur la dernière case pour gagner !",
  2: "Touche le dé, puis touche la case où ton pion doit arriver. Si tu hésites, on compte ensemble.",
  3: "Touche les deux dés, puis choisis le total : additionne les points des deux dés !",
};

export const PLAYERS = [
  { name: 'Toi', emoji: '🔴', color: 0xe63946 },
  { name: 'Bleu', emoji: '🔵', color: 0x3a86ff },
  { name: 'Orange', emoji: '🟠', color: 0xff9f1c },
  { name: 'Vert', emoji: '🟢', color: 0x38b000 },
];
