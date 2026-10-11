const isText = (s) => typeof s === 'string' && s.trim() !== '';

export function validateStory(obj) {
  const errors = [];
  if (!obj || typeof obj !== 'object') return { ok: false, errors: ['histoire absente'] };
  if (!isText(obj.id)) errors.push('id manquant');
  if (!isText(obj.titre)) errors.push('titre manquant');
  if (!Array.isArray(obj.pages) || obj.pages.length < 1) {
    errors.push('au moins une page requise');
  } else {
    obj.pages.forEach((p, i) => {
      if (!p || !isText(p.texte)) errors.push(`page ${i + 1} : texte manquant`);
      if (!p || typeof p.image !== 'string') errors.push(`page ${i + 1} : image manquante`);
    });
  }
  const q = obj.question;
  if (!q || typeof q !== 'object') {
    errors.push('question manquante');
  } else {
    if (!isText(q.texte)) errors.push('question : texte manquant');
    if (!Array.isArray(q.choix) || q.choix.length < 2) {
      errors.push('question : au moins 2 choix');
    } else if (!Number.isInteger(q.reponse) || q.reponse < 0 || q.reponse >= q.choix.length) {
      errors.push('question : reponse hors bornes');
    }
  }
  return { ok: errors.length === 0, errors };
}

export function buildSpreads(story) {
  return [
    { kind: 'cover', image: story.couverture ?? null, titre: story.titre },
    ...story.pages.map((p, index) => ({ kind: 'page', index, texte: p.texte, image: p.image })),
    { kind: 'end' },
  ];
}

export function filterImages(story, manifestSet) {
  const keep = (url) => (url && manifestSet.has(url) ? url : null);
  return {
    ...story,
    couverture: keep(story.couverture),
    pages: story.pages.map((p) => ({ ...p, image: keep(p.image) })),
  };
}
