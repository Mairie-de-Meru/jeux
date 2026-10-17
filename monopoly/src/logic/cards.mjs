// Cartes originales. Effets : money, moveTo(i, go), moveBy, nearestStation, nearestUtility,
// jail, jailCard, payEach, collectEach, repairs.
const m = (id, text, n) => ({ id, text, effect: { t: 'money', n } });
export const SURPRISE = [
  { id: 'su00', text: 'Cap sur le Départ ! Reçois ton argent de poche.', effect: { t: 'moveTo', i: 0, go: true } },
  { id: 'su01', text: 'Direction l’Avenue Mozart ! Passe par le Départ : +200.', effect: { t: 'moveTo', i: 16, go: true } },
  { id: 'su02', text: 'Balade à la Place de la Bourse ! Avance jusque-là.', effect: { t: 'moveTo', i: 27, go: true } },
  { id: 'su03', text: 'Une visite en grand : avance jusqu’à la Rue de la Paix.', effect: { t: 'moveTo', i: 39, go: true } },
  { id: 'su04', text: 'Monte dans le prochain transport : avance à la gare la plus proche.', effect: { t: 'nearestStation' } },
  { id: 'su05', text: 'Le car passe ! Avance à la gare la plus proche.', effect: { t: 'nearestStation' } },
  { id: 'su06', text: 'On t’attend à la compagnie la plus proche : avance !', effect: { t: 'nearestUtility' } },
  { id: 'su07', text: 'Oups, tu as oublié ton sac ! Recule de 3 cases.', effect: { t: 'moveBy', n: -3 } },
  { id: 'su08', text: 'Tu as perdu ton doudou ! Retourne au Boulevard de Belleville sans toucher d’argent.', effect: { t: 'moveTo', i: 1, go: false } },
  { id: 'su09', text: 'Une bêtise de trop : va faire une pause en prison.', effect: { t: 'jail' } },
  { id: 'su10', text: 'Carte Évasion ! Garde-la pour sortir de prison.', effect: { t: 'jailCard' } },
  m('su11', 'Ton dessin a gagné le concours ! +50', 50),
  m('su12', 'Tu gagnes la course de trottinettes ! +100', 100),
  m('su13', 'Oups, un vase cassé ! Paie 40.', -40),
  { id: 'su14', text: 'Tu invites tout le monde au goûter : paie 25 à chaque joueur.', effect: { t: 'payEach', n: 25 } },
  { id: 'su15', text: 'Coup de peinture sur les maisons : 25 par maison, 100 par hôtel.', effect: { t: 'repairs', house: 25, hotel: 100 } },
];
export const TIRELIRE = [
  m('ti00', 'Ta tirelire déborde de pièces ! +100', 100),
  m('ti01', 'Tu vends ton vieux vélo : +50', 50),
  m('ti02', 'Cadeau de mamie ! +75', 75),
  m('ti03', 'Une pièce sous le canapé ! +10', 10),
  m('ti04', 'Ton gâteau gagne le 2e prix : +25', 25),
  { id: 'ti05', text: 'Tu chantes pour la classe : chaque joueur te donne 10.', effect: { t: 'collectEach', n: 10 } },
  { id: 'ti06', text: 'Fête du quartier ! Chaque joueur te donne 15.', effect: { t: 'collectEach', n: 15 } },
  m('ti07', 'Trop de bonbons ! Le dentiste : paie 50.', -50),
  m('ti08', 'Tu t’offres des livres d’images : paie 60.', -60),
  m('ti09', 'Roue de vélo à réparer : paie 30.', -30),
  { id: 'ti10', text: 'Séance de ciné pour tous : paie 15 à chaque joueur.', effect: { t: 'payEach', n: 15 } },
  { id: 'ti11', text: 'Avance jusqu’au Départ et reçois ton argent de poche.', effect: { t: 'moveTo', i: 0, go: true } },
  { id: 'ti12', text: 'Carte Évasion ! Garde-la pour sortir de prison.', effect: { t: 'jailCard' } },
  { id: 'ti13', text: 'Tu as chahuté en classe : va en prison.', effect: { t: 'jail' } },
  { id: 'ti14', text: 'Nettoyage du quartier : 40 par maison, 115 par hôtel.', effect: { t: 'repairs', house: 40, hotel: 115 } },
  { id: 'ti15', text: 'Tu aides à ranger le quartier : +20', effect: { t: 'money', n: 20 } },
];
export const DECKS = { surprise: SURPRISE, tirelire: TIRELIRE };
export const JAIL_CARD_ID = {
  surprise: SURPRISE.findIndex((c) => c.effect.t === 'jailCard'),
  tirelire: TIRELIRE.findIndex((c) => c.effect.t === 'jailCard'),
};
export const DECK_LABEL = { surprise: 'Chance', tirelire: 'Caisse de communauté' };
