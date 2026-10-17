// Plateau : 40 cases originales (thème « ma ville »), règles chiffrées classiques.
export const GO_MONEY = 200;
export const JAIL_POS = 10;
export const JAIL_FEE = 50;
export const START_MONEY = 1500;
export const HOUSES = 32;
export const HOTELS = 12;
export const STATION_RENTS = [25, 50, 100, 200];

export const GROUP_INFO = {
  brown: { color: '#9a6a43', house: 50 },
  lightblue: { color: '#6fd0f2', house: 50 },
  pink: { color: '#f276b0', house: 100 },
  orange: { color: '#ff9a2e', house: 100 },
  red: { color: '#e5424f', house: 150 },
  yellow: { color: '#ffd23f', house: 150 },
  green: { color: '#3fb86a', house: 200 },
  darkblue: { color: '#3b63d6', house: 200 },
};

const P = (i, name, group, price, rents, icon) => ({ i, kind: 'prop', name, group, price, rents, house: GROUP_INFO[group].house, mortgage: price / 2, icon });
const S = (i, name, icon) => ({ i, kind: 'station', name, price: 200, rents: STATION_RENTS, mortgage: 100, icon });
const U = (i, name, icon) => ({ i, kind: 'utility', name, price: 150, mortgage: 75, icon });

export const SPACES = [
  { i: 0, kind: 'go', name: 'Départ', icon: '🏁' },
  P(1, 'Boulevard de Belleville', 'brown', 60, [2, 10, 30, 90, 160, 250], ''),
  { i: 2, kind: 'tirelire', name: 'Caisse de communauté', icon: '🐷' },
  P(3, 'Rue Lecourbe', 'brown', 60, [4, 20, 60, 180, 320, 450], ''),
  { i: 4, kind: 'tax', name: 'Impôt sur le revenu', amount: 200, icon: '💸' },
  S(5, 'Gare Montparnasse', '🚌'),
  P(6, 'Rue de Vaugirard', 'lightblue', 100, [6, 30, 90, 270, 400, 550], ''),
  { i: 7, kind: 'surprise', name: 'Chance', icon: '🎁' },
  P(8, 'Rue de Courcelles', 'lightblue', 100, [6, 30, 90, 270, 400, 550], ''),
  P(9, 'Avenue de la République', 'lightblue', 120, [8, 40, 100, 300, 450, 600], ''),
  { i: 10, kind: 'jail', name: 'Prison', icon: '🔒' },
  P(11, 'Boulevard de la Villette', 'pink', 140, [10, 50, 150, 450, 625, 750], ''),
  U(12, 'Compagnie des eaux', '💧'),
  P(13, 'Avenue de Neuilly', 'pink', 140, [10, 50, 150, 450, 625, 750], ''),
  P(14, 'Rue de Paradis', 'pink', 160, [12, 60, 180, 500, 700, 900], ''),
  S(15, 'Gare de Lyon', '🚂'),
  P(16, 'Avenue Mozart', 'orange', 180, [14, 70, 200, 550, 750, 950], ''),
  { i: 17, kind: 'tirelire', name: 'Caisse de communauté', icon: '🐷' },
  P(18, 'Boulevard Saint-Michel', 'orange', 180, [14, 70, 200, 550, 750, 950], ''),
  P(19, 'Place Pigalle', 'orange', 200, [16, 80, 220, 600, 800, 1000], ''),
  { i: 20, kind: 'freepark', name: 'Parc gratuit', icon: '🧺' },
  P(21, 'Avenue Matignon', 'red', 220, [18, 90, 250, 700, 875, 1050], ''),
  { i: 22, kind: 'surprise', name: 'Chance', icon: '🎁' },
  P(23, 'Boulevard Malesherbes', 'red', 220, [18, 90, 250, 700, 875, 1050], ''),
  P(24, 'Avenue Henri-Martin', 'red', 240, [20, 100, 300, 750, 925, 1100], ''),
  S(25, 'Gare du Nord', '🚢'),
  P(26, 'Faubourg Saint-Honoré', 'yellow', 260, [22, 110, 330, 800, 975, 1150], ''),
  P(27, 'Place de la Bourse', 'yellow', 260, [22, 110, 330, 800, 975, 1150], ''),
  U(28, 'Compagnie d’électricité', '🌬️'),
  P(29, 'Rue La Fayette', 'yellow', 280, [24, 120, 360, 850, 1025, 1200], ''),
  { i: 30, kind: 'gotojail', name: 'Allez en prison', icon: '🚓' },
  P(31, 'Avenue de Breteuil', 'green', 300, [26, 130, 390, 900, 1100, 1275], ''),
  P(32, 'Avenue Foch', 'green', 300, [26, 130, 390, 900, 1100, 1275], ''),
  { i: 33, kind: 'tirelire', name: 'Caisse de communauté', icon: '🐷' },
  P(34, 'Boulevard des Capucines', 'green', 320, [28, 150, 450, 1000, 1200, 1400], ''),
  S(35, 'Gare Saint-Lazare', '✈️'),
  { i: 36, kind: 'surprise', name: 'Chance', icon: '🎁' },
  P(37, 'Avenue des Champs-Élysées', 'darkblue', 350, [35, 175, 500, 1100, 1300, 1500], ''),
  { i: 38, kind: 'tax', name: 'Taxe de luxe', amount: 100, icon: '🧸' },
  P(39, 'Rue de la Paix', 'darkblue', 400, [50, 200, 600, 1400, 1700, 2000], ''),
];

export const GROUPS = {};
for (const s of SPACES) if (s.kind === 'prop') (GROUPS[s.group] ||= []).push(s.i);
export const GROUP_IDS = Object.keys(GROUPS);
export const STATIONS = SPACES.filter((s) => s.kind === 'station').map((s) => s.i);
export const UTILITIES = SPACES.filter((s) => s.kind === 'utility').map((s) => s.i);
export const OWNABLE = SPACES.filter((s) => s.price).map((s) => s.i);
export const unmortgageCost = (i) => Math.ceil((SPACES[i].mortgage * 11) / 10);
