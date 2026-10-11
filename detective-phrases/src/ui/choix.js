// Boutons de réponse ; frise hier / aujourd'hui / demain pour temps-classer.
import { el } from './dom.js';
import { FRISE, LABELS_PONCT } from './textes.js';

export function rendreChoix(zone, q, retires, onChoix) {
  zone.replaceChildren();
  zone.classList.toggle('frise', q.kind === 'temps-classer');
  for (const valeur of q.choix) {
    let b;
    if (q.kind === 'temps-classer') {
      const f = FRISE[valeur];
      b = el('button', { class: valeur }, el('span', { class: 'ico', texte: f.ico }), el('span', { texte: f.label }));
    } else if (q.kind === 'faute' && q.regle === 'point') {
      const [signe, nom] = LABELS_PONCT[valeur];
      b = el('button', {}, signe, el('small', { texte: nom }));
    } else {
      b = el('button', { texte: valeur });
    }
    b.type = 'button';
    b.dataset.valeur = valeur;
    if (retires.includes(valeur)) b.classList.add('retire');
    b.addEventListener('click', () => onChoix(valeur));
    zone.append(b);
  }
}
