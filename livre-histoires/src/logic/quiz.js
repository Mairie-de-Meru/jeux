const BRAVO = ['Bravo !', 'Super, tu as trouvé !', 'Bien joué !'];
const AIDE = 'Presque ! Essaie encore.';

export function checkAnswer(question, choixIndex) {
  const correct = choixIndex === question.reponse;
  const message = correct
    ? BRAVO[choixIndex % BRAVO.length]
    : question.indice || AIDE;
  return { correct, message };
}

export const starsFor = (essais) => (essais <= 1 ? 3 : essais === 2 ? 2 : 1);
