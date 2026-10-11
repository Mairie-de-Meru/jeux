// Automate d'une étape (pur, immuable).
export const CONSEILS = {
  entreVoitures: 'On ne traverse pas entre deux voitures garées. Va au passage piéton !',
  horsPassage: 'On traverse sur le passage piéton.',
  feuRouge: 'Attends le bonhomme vert !',
  regarde: 'Regarde à gauche, puis à droite.',
  voiture: "Une voiture arrive. Attends qu'elle passe.",
  garage: 'Une voiture sort du garage. Attends !',
  courir: 'On ne court pas. On marche !',
};

// Séquence valide : le dernier « gauche » est suivi d'un « droite ».
export function regardOk(regards) {
  const i = regards.lastIndexOf('gauche');
  return i >= 0 && regards.indexOf('droite', i + 1) >= 0;
}

export function createCrossing(etape) {
  const choix = etape.choix ?? [];
  return {
    type: etape.type,
    phase: choix.length > 1 ? 'choix' : 'bord',
    regards: [],
    erreurs: 0,
    dernierConseil: null,
    choix,
    spot: choix.length === 1 ? choix[0].id : null,
  };
}

function erreur(state, code) {
  const conseil = CONSEILS[code];
  return {
    state: { ...state, regards: [], erreurs: state.erreurs + 1, dernierConseil: conseil },
    resultat: { ok: false, erreur: code, conseil },
  };
}

export function step(state, action, monde) {
  const same = { state, resultat: { ok: true } };
  switch (action.type) {
    case 'choisir': {
      if (state.phase !== 'choix') return same;
      const id = typeof action.spot === 'string' ? action.spot : action.spot?.id;
      const spot = state.choix.find((s) => s.id === id);
      if (!spot) return same;
      if (spot.genre === 'entreVoitures') return erreur(state, 'entreVoitures');
      if (spot.genre === 'horsPassage') return erreur(state, 'horsPassage');
      return { state: { ...state, phase: 'bord', spot: spot.id, regards: [] }, resultat: { ok: true } };
    }
    case 'regarder': {
      if (state.phase !== 'bord') return same;
      if (action.cote !== 'gauche' && action.cote !== 'droite') return same;
      return { state: { ...state, regards: [...state.regards, action.cote].slice(-6) }, resultat: { ok: true } };
    }
    case 'aller': {
      if (state.phase !== 'bord') return same;
      if (state.type === 'feu' && monde.pieton !== 'vert') return erreur(state, 'feuRouge');
      if (state.type === 'garage' && monde.garage === 'sortie') return erreur(state, 'garage');
      if (state.type !== 'garage' && !regardOk(state.regards)) return erreur(state, 'regarde');
      if (state.type === 'sansFeu' && monde.voitureProche) return erreur(state, 'voiture');
      if (action.allure === 'courir') return erreur(state, 'courir');
      return { state: { ...state, phase: 'traverse' }, resultat: { ok: true } };
    }
    case 'arrive': {
      if (state.phase !== 'traverse') return same;
      return { state: { ...state, phase: 'fini' }, resultat: { ok: true } };
    }
    default:
      return same;
  }
}

export function prochaineAction(state, monde) {
  if (state.phase === 'choix') return 'choisir';
  if (state.phase !== 'bord') return null;
  if (state.type === 'feu' && monde.pieton !== 'vert') return 'attendre';
  if (state.type === 'garage') return monde.garage === 'sortie' ? 'attendre' : 'marcher';
  if (!regardOk(state.regards)) return state.regards.includes('gauche') ? 'regarderDroite' : 'regarderGauche';
  if (state.type === 'sansFeu' && monde.voitureProche) return 'attendre';
  return 'marcher';
}
