// Données du jeu (pures) : continents, océans, animaux et monuments, pays.
export const CONTINENT_LIST = [
  { id: 'afrique', nom: 'Afrique', article: "l'Afrique", couleur: '#f5a623', centre: { lat: 5, lon: 20 } },
  { id: 'amerique', nom: 'Amérique', article: "l'Amérique", couleur: '#ff5d73', centre: { lat: 10, lon: -80 } },
  { id: 'antarctique', nom: 'Antarctique', article: "l'Antarctique", couleur: '#8fe3ff', centre: { lat: -80, lon: 0 } },
  { id: 'asie', nom: 'Asie', article: "l'Asie", couleur: '#7ed957', centre: { lat: 35, lon: 90 } },
  { id: 'europe', nom: 'Europe', article: "l'Europe", couleur: '#a66cff', centre: { lat: 50, lon: 15 } },
  { id: 'oceanie', nom: 'Océanie', article: "l'Océanie", couleur: '#ffd93d', centre: { lat: -25, lon: 135 } },
];

export const OCEAN_LIST = [
  { id: 'pacifique', nom: "l'océan Pacifique", centre: { lat: 0, lon: -150 } },
  { id: 'atlantique', nom: "l'océan Atlantique", centre: { lat: 0, lon: -30 } },
  { id: 'indien', nom: "l'océan Indien", centre: { lat: -20, lon: 75 } },
  { id: 'arctique', nom: "l'océan Arctique", centre: { lat: 85, lon: 0 } },
  { id: 'austral', nom: "l'océan Austral", centre: { lat: -60, lon: 0 } },
];

// Animaux et monuments. `image` : clé du manifeste (sprite RunningHub) ; sans image, repli sur `emoji` dessiné en canvas.
// `original` : item de la v1 (toujours possible dans le tirage du palier 3).
const it = (id, nom, type, continent, lat, lon, question, emoji, image = null) =>
  ({ id, nom, type, continent, pos: { lat, lon }, question, emoji, image, original: !!image });

export const ITEM_LIST = [
  it('manchot', 'le manchot', 'animal', 'antarctique', -72, 20, 'Où vit le manchot ?', '🐧', 'manchot'),
  it('lion', 'le lion', 'animal', 'afrique', -3, 35, 'Où vit le lion ?', '🦁', 'lion'),
  it('pyramides', 'les pyramides', 'monument', 'afrique', 29.98, 31.13, 'Où sont les pyramides ?', '🔺', 'pyramides'),
  it('panda', 'le panda', 'animal', 'asie', 31, 103, 'Où vit le panda ?', '🐼', 'panda'),
  it('kangourou', 'le kangourou', 'animal', 'oceanie', -25, 134, 'Où vit le kangourou ?', '🦘', 'kangourou'),
  it('tourEiffel', 'la tour Eiffel', 'monument', 'europe', 48.86, 2.29, 'Où est la tour Eiffel ?', '🗼', 'tourEiffel'),
  it('statueLiberte', 'la statue de la Liberté', 'monument', 'amerique', 40.7, -74, 'Où est la statue de la Liberté ?', '🗽', 'statueLiberte'),
  it('lama', 'le lama', 'animal', 'amerique', -16, -68, 'Où vit le lama ?', '🦙', 'lama'),
  // ajouts (emoji en repli, pas d'image)
  it('girafe', 'la girafe', 'animal', 'afrique', -22, 22, 'Où vit la girafe ?', '🦒'),
  it('elephant', "l'éléphant", 'animal', 'afrique', -14, 28, "Où vit l'éléphant ?", '🐘'),
  it('tigre', 'le tigre', 'animal', 'asie', 46, 133, 'Où vit le tigre ?', '🐅'),
  it('koala', 'le koala', 'animal', 'oceanie', -37, 145, 'Où vit le koala ?', '🐨'),
  it('oursPolaire', "l'ours polaire", 'animal', 'amerique', 68, -95, "Où vit l'ours polaire ?", '🐻‍❄️'),
  it('jaguar', 'le jaguar', 'animal', 'amerique', -9, -58, 'Où vit le jaguar ?', '🐆'),
  it('tajMahal', 'le Taj Mahal', 'monument', 'asie', 27.17, 78.04, 'Où est le Taj Mahal ?', '🕌'),
  it('murailleChine', 'la Grande Muraille', 'monument', 'asie', 40.4, 116, 'Où est la Grande Muraille ?', '🏯'),
  it('colisee', 'le Colisée', 'monument', 'europe', 41.89, 12.49, 'Où est le Colisée ?', '🏛️'),
  it('christRedempteur', 'le Christ Rédempteur', 'monument', 'amerique', -22.95, -43.2, 'Où est le Christ Rédempteur ?', '⛪'),
  it('operaSydney', "l'Opéra de Sydney", 'monument', 'oceanie', -33.86, 151.21, "Où est l'Opéra de Sydney ?", '🎭'),
  it('bigBen', 'Big Ben', 'monument', 'europe', 51.5, -0.12, 'Où est Big Ben ?', '🕰️'),
];

// centre : position d'étiquette Natural Earth (LABEL_X / LABEL_Y)
const pays = (id, nom, continent, lat, lon, original = false) => ({ id, nom, continent, centre: { lat, lon }, original });

export const COUNTRY_LIST = [
  pays('france', 'la France', 'europe', 46.7, 2.55, true),
  pays('belgique', 'la Belgique', 'europe', 50.8, 4.8, true),
  pays('suisse', 'la Suisse', 'europe', 46.7, 7.46, true),
  pays('canada', 'le Canada', 'amerique', 60.3, -101.9, true),
  pays('senegal', 'le Sénégal', 'afrique', 15.1, -14.8, true),
  pays('japon', 'le Japon', 'asie', 36.1, 138.4, true),
  pays('bresil', 'le Brésil', 'amerique', -12.1, -49.6, true),
  pays('italie', "l'Italie", 'europe', 42.8, 12.6),
  pays('allemagne', "l'Allemagne", 'europe', 51.1, 10.3),
  pays('espagne', "l'Espagne", 'europe', 40.2, -3.6),
  pays('irlande', "l'Irlande", 'europe', 53.1, -8.0),
  pays('mali', 'le Mali', 'afrique', 17.3, -3.5),
  pays('coteIvoire', "la Côte d'Ivoire", 'afrique', 7.6, -5.5),
  pays('maroc', 'le Maroc', 'afrique', 31.8, -6.5),
  pays('chine', 'la Chine', 'asie', 35.0, 103.0),
  pays('inde', "l'Inde", 'asie', 22.0, 79.0),
  pays('argentine', "l'Argentine", 'amerique', -34.0, -64.0),
  pays('royaumeUni', 'le Royaume-Uni', 'europe', 54.0, -2.5),
  pays('etatsUnis', 'les États-Unis', 'amerique', 39.5, -98.0),
];

// Merveilles du monde (palier 5). Réussite : tap à moins de `rayon` degrés d'une des `cibles`,
// ou dans la bande |lat| < `bande`, ou dans l'océan `ocean`. `centre` sert à l'indice « montre ».
const mer = (id, nom, question, emoji, fiche, spec) => ({ id, nom, question, emoji, fiche, ...spec });

export const WONDER_LIST = [
  mer('poleNord', 'le pôle Nord', 'Montre le pôle Nord !', '🧊', 'Le pôle Nord est tout en haut de la Terre. Il y fait très froid !',
    { cibles: [{ lat: 90, lon: 0 }], rayon: 14, centre: { lat: 90, lon: 0 } }),
  mer('poleSud', 'le pôle Sud', 'Montre le pôle Sud !', '🐧', 'Le pôle Sud est tout en bas de la Terre, couvert de glace.',
    { cibles: [{ lat: -90, lon: 0 }], rayon: 14, centre: { lat: -90, lon: 0 } }),
  mer('sahara', 'le Sahara', 'Trouve le désert du Sahara !', '🏜️', 'Le Sahara est le plus grand désert chaud du monde.',
    { cibles: [{ lat: 23, lon: 12 }], rayon: 12, centre: { lat: 23, lon: 12 } }),
  mer('amazonie', "la forêt d'Amazonie", "Trouve la forêt d'Amazonie !", '🌳', "L'Amazonie est la plus grande forêt tropicale du monde.",
    { cibles: [{ lat: -4, lon: -62 }], rayon: 9, centre: { lat: -4, lon: -62 } }),
  mer('everest', "l'Everest", "Où est la plus haute montagne, l'Everest ?", '🏔️', "L'Everest, dans l'Himalaya, est la plus haute montagne du monde.",
    { cibles: [{ lat: 28, lon: 87 }], rayon: 7, centre: { lat: 28, lon: 87 } }),
  mer('nil', 'le Nil', 'Suis le plus long fleuve, le Nil !', '🌊', 'Le Nil traverse le désert jusqu’à la mer Méditerranée.',
    { fleuve: 'nil', rayon: 4, centre: { lat: 24, lon: 32.5 } }),
  mer('amazone', "l'Amazone", "Trouve l'Amazone !", '🏞️', "L'Amazone est le fleuve qui transporte le plus d'eau du monde.",
    { fleuve: 'amazone', rayon: 4, centre: { lat: -3.5, lon: -60 } }),
  mer('mississippi', 'le Mississippi', 'Trouve le Mississippi !', '🌊', 'Le Mississippi coule longtemps à travers les États-Unis jusqu’au golfe du Mexique.',
    { fleuve: 'mississippi', rayon: 4, centre: { lat: 36, lon: -90 } }),
  mer('barriere', 'la Grande Barrière de corail', 'Trouve la Grande Barrière de corail !', '🐠', 'La Grande Barrière de corail est pleine de poissons colorés.',
    { cibles: [{ lat: -18.5, lon: 147.5 }], rayon: 6, centre: { lat: -18.5, lon: 147.5 } }),
  mer('equateur', "l'équateur", "Montre l'équateur !", '🌞', "L'équateur fait le tour de la Terre, tout autour du ventre.",
    { bande: 6, centre: { lat: 0, lon: 20 } }),
  mer('grandOcean', 'le plus grand océan', 'Montre le plus grand océan !', '🌊', "L'océan Pacifique est le plus grand de tous.",
    { ocean: 'pacifique', centre: { lat: 0, lon: -150 } }),
  mer('narval', 'le narval', 'Dans quel océan nage le narval ?', '🐋', "Le narval nage dans l'océan Arctique, avec sa grande défense.",
    { ocean: 'arctique', centre: { lat: 85, lon: 0 } }),
  mer('phoque', 'le phoque de Weddell', 'Dans quel océan nage le phoque de Weddell ?', '🦭', "Le phoque de Weddell vit dans l'océan Austral, près de l'Antarctique.",
    { ocean: 'austral', centre: { lat: -60, lon: 0 } }),
];
