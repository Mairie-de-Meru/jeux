// Données pures : poubelles et objets (consignes françaises générales).
export const BINS = {
  jaune: { id: 'jaune', label: 'Emballages', color: '#FFD23F' },
  vert: { id: 'vert', label: 'Verre', color: '#3BB273' },
  bleu: { id: 'bleu', label: 'Papier', color: '#3E8EDE' },
  marron: { id: 'marron', label: 'Compost', color: '#8B5A2B' },
  piles: { id: 'piles', label: 'Piles', color: '#E94F37' },
};

export const ITEMS = [
  { id: 'bouteille', nom: 'Bouteille en plastique', bin: 'jaune', pourquoi: 'Le plastique va dans la poubelle jaune des emballages.' },
  { id: 'canette', nom: 'Canette', bin: 'jaune', pourquoi: 'Le métal va dans la poubelle jaune des emballages.' },
  { id: 'carton', nom: 'Carton', bin: 'jaune', pourquoi: 'Le carton d’emballage va dans la poubelle jaune.' },
  { id: 'pot', nom: 'Pot en verre', bin: 'vert', pourquoi: 'Le verre va dans la poubelle verte.' },
  { id: 'trognon', nom: 'Trognon de pomme', bin: 'marron', pourquoi: 'Les restes de fruits vont dans le compost marron.' },
  { id: 'journal', nom: 'Journal', bin: 'bleu', pourquoi: 'Le papier va dans la poubelle bleue.' },
  { id: 'pile', nom: 'Pile', bin: 'piles', pourquoi: 'Les piles vont dans la boîte spéciale rouge.' },
];

export function itemById(id) {
  return ITEMS.find((i) => i.id === id) || null;
}
export function binOf(itemId) {
  const it = itemById(itemId);
  return it ? it.bin : null;
}
