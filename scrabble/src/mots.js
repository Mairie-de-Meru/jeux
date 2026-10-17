// Dictionnaire des mots courants pour enfants (liste écrite pour ce jeu).
// Mots de 2 à 7 lettres, sans accents (é -> E), en majuscules après normalisation.

const BRUT = `
au du de la le les un une et en on il si je tu me te se ce ma ta sa ne nu ou eu vu lu os or ai as oh
mon ton son mes tes ses nos vos ses ces des aux par sur sous dans pour avec sans chez vers mais donc car que qui quoi
quand comme tres plus moins tout tous rien bien mal vite ici voila oui non merci bravo salut allo bonjour
est sont suis es ete etre avoir fait fais dit dis va vais vas vont ira
ane air ail art ami arc bac bal bar bec ble boa bol bon bus but cap cle col coq cou cri cru dos don dix duo eau elu fee fer feu fil fin fou gaz gel gui ile jeu jus lac lit loi lui mai mer moi mot mur nef nez nid nom nul oie ouf pan pas peu pie pin plat pli pot pre pur rat riz roc roi rue sac sel six ski sol son sou suc sud tas tel the tic toi ton tri tue uni van ver vie vin vis vol vue zoo web yak
chat chien chiot chaton cheval vache veau boeuf cochon porc truie mouton agneau chevre bouc lapin lievre souris renard loup ours lion tigre singe girafe zebre koala panda elan cerf biche daim sanglier chameau lama zebu poney jaguar puma lynx castor loutre blaireau belette taupe gorille rhino hippo
oiseau poule coq poussin canard oie cygne pigeon moineau merle pie hibou chouette aigle corbeau paon dinde autruche faucon mesange pinson colombe
poisson requin baleine dauphin phoque morse raie thon truite sole crabe homard moule huitre pieuvre meduse corail algue
limace insecte abeille guepe fourmi mouche cigale grillon crapaud serpent lezard tortue dragon yeti
nid patte pattes queue plume plumes aile ailes bec griffe griffes poil poils museau corne cornes ruche miel laine
pain pomme poire banane orange fraise cerise prune raisin citron melon peche kiwi ananas mangue datte figue noix amande carotte tomate salade radis chou poireau oignon ail patate frite frites riz pate pates soupe gateau tarte crepe bonbon bonbons sucre sel poivre beurre lait fromage yaourt oeuf oeufs jambon viande poulet steak jus eau cafe cacao glace biscuit fruit fruits legume haricot pois mais farine repas gouter creme flan
moulin four verre tasse bol cuiller couteau nappe plat table chaise fourchette assiette
maison porte fenetre toit mur sol lit canape armoire cuisine salon salle bain douche evier frigo lampe lumiere tapis rideau miroir jardin garage cave grenier clef cles tele radio balai seau boite panier valise
livre livres cahier stylo crayon crayons gomme regle trousse ecole classe maitre eleve tableau craie colle ciseaux feutre feutres dessin page conte image images carte cartes lettre lettres mot mots phrase phrases texte nom nombre chiffre lecture voyelle syllabe son sons lire ecrire compter
jouer chanter danser courir sauter nager manger boire dormir rire pleurer parler aimer marcher ecouter donner prendre mettre aller venir voir faire dire partir rester tomber grimper rouler voler pousser tirer lancer cacher trouver ouvrir fermer laver cuire couper coller peindre lire dessiner
joue joues mange manges danse chante saute court nage dort rit pleure parle aime marche donne prend met vient voit
arbre arbres fleur fleurs herbe feuille feuilles branche racine foret bois champ pre colline riviere fleuve lac mer ocean plage sable vague ile ciel nuage nuages pluie neige vent soleil lune etoile etoiles orage eclair terre feu air roche pierre caillou rocher sentier grotte desert volcan jungle savane saison hiver ete automne
rouge bleu vert jaune orange rose violet noir blanc gris marron brun beige clair fonce or argent dore rouges bleus verts jaunes roses noirs blancs
tete main mains pied pieds bras jambe jambes doigt doigts dos nez bouche dent dents oeil yeux oreille oreilles cou coeur ventre genou cheveu cheveux joue levre peau ongle visage
papa maman frere soeur bebe enfant enfants ami amie amis copain mamie papi tonton tante oncle cousin fille garcon fils
roi reine prince fee ogre geant nain magie chateau pirate robot clown cirque fete cadeau cadeaux ballon ballons jouet jouets jeux poupee puzzle cube
voiture velo auto bus train avion bateau camion moto taxi metro fusee route pont rue gare port quai roue roues moteur phare ancre voile
un deux trois quatre cinq six sept huit neuf dix onze douze treize vingt cent mille zero
jour jours nuit matin soir hier demain heure minute semaine mois an annee lundi mardi jeudi samedi
grand grande petit petite gros long longue court beau belle joli jolie gentil content triste fort faible rapide lent chaud froid doux dur mou sale propre neuf vieux nouveau heureux drole rond ronde carre plein vide haut bas
ski foot sport balle equipe match saut course judo danse piscine tennis rugby golf karate boxe yoga kayak corde
medecin docteur pompier facteur fermier pilote marin juge chef
sac clou montre horloge cloche chapeau bonnet botte bottes jupe robe pull manteau veste short echarpe gant gants bague collier
kaki kilo kepi koala kiwi wagon wapiti yaourt yacht yoyo yoga zebre zero zebu zigzag zeste zone zinc zele taxi boxe luxe mixte fixe faux paix exact index
quai quart queue cirque masque paquet toque banque clique quatre quille quinze
vif vive vrai vraie vert verte lisse rugueux tendre plume
gai gaie sage fou folle fier fiere rare rapide calme bruit chant chanson musique piano tambour flute violon guitare note notes
sucrer sale sucre amer acide epice cuit cru
oui nuage rose hache pelle pioche marteau scie vis clous outil outils echelle
coude epaule hanche talon orteil menton front sourcil sourire rire
cabane tente igloo hutte ferme grange etable stable puits mare etang
bulle bulles bille billes cerf-volant ficelle fil laine bouton boutons ruban
minou toutou coucou
camp lieu endroit monde pays ville village rue place parc zoo
`;

export function normaliser(mot) {
  return mot.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
}

// ---------- Enrichissement : mots courants, pluriels, féminins, verbes ----------
// Listes écrites à la main ; les formes dérivées sont calculées par des règles simples,
// appliquées seulement à ces listes (jamais à tout le dictionnaire).

// Mots ajoutés tels quels (mots d'enfants, couleurs, nombres, adjectifs, petits mots).
const EXTRA = `
maison porte table chaise livre cahier stylo crayon gomme ecole classe maitre maitresse eleve copain copine
papa maman bebe enfant fille garcon frere soeur oncle tante cousin papi mamie
jouet jouets poupee ballon velo moto voiture camion train avion bateau fusee robot cirque clown magie
gateau bonbon pomme poire banane fraise cerise orange citron raisin prune melon peche abricot kiwi
carotte tomate salade patate frite pates soupe pain beurre lait fromage oeuf jambon glace chocolat miel confiture
eau jus the cafe sel poivre sucre farine repas diner souper gouter dejeuner
soleil lune etoile ciel nuage pluie neige vent orage mer plage sable vague ile
arbre fleur herbe feuille foret bois champ jardin pre montagne colline riviere ruisseau lac rocher pierre
rouge bleu jaune vert noir blanc gris violet marron beige
un deux trois quatre cinq six sept huit neuf dix onze douze treize quatorze quinze seize vingt trente cent mille
lundi mardi jeudi samedi dimanche janvier fevrier mars avril mai juin juillet aout
matin midi soir nuit jour jours semaine mois an annee hier demain
tete visage oeil yeux nez bouche dent dents langue oreille cheveux joue cou bras main mains doigt ongle jambe genou pied pieds dos ventre coeur peau
lit drap couette oreiller coussin tapis lampe fenetre mur toit sol escalier salon cuisine chambre bain douche
chaussure chaussette pantalon casque casquette lunettes sac parapluie
papier ciseaux colle peinture pinceau dessin image photo carte jeu jeux puzzle domino cartes pion
lettre lettres mot mots phrase histoire conte reve idee secret cadeau fete noel
tortue grenouille escargot abeille fourmi mouche papillon araignee coccinelle lezard serpent crocodile dragon
licorne fantome sorciere magicien prince princesse roi reine chateau fee geant lutin pirate tresor
ami amie gentil gentille mechant content triste heureux fatigue malade sage drole beau belle joli jolie
petit petite grand grande gros grosse long longue court courte large haut haute bas basse neuf neuve vieux vieille jeune
chaud chaude froid froide doux douce dur dure mou molle sec seche propre sale lourd lourde leger legere
rapide lent lente fort forte faible fou folle fier fiere rare calme libre juste vrai vraie faux fausse
premier premiere dernier derniere autre meme tel telle seul seule cher chere
merci pardon bravo hop zut aie oups chut
sur sous dans devant derriere entre vers chez avec sans pour par contre apres avant pres loin
voici voila encore deja jamais toujours souvent parfois ensemble aussi alors puis enfin
quel quelle ceci cela celui celle ceux eux elle nous vous ils elles leur leurs notre votre
coup coin trou bout bord fond cote tour tours rang tas file ligne point bande
cle serrure boite caisse panier valise bocal verre tasse bol assiette fourchette cuillere
note musique chanson rythme danse bal joie rire sourire
foot ski judo golf tennis rugby velo piscine
`;

// Noms et adjectifs dont on ajoute le pluriel en -S (mots déjà en S, X ou Z exclus automatiquement).
const PLURIEL_S = `
chat chien chiot chaton vache cochon porc truie mouton chevre bouc lapin lievre renard loup lion tigre singe girafe zebre koala panda elan cerf biche daim lama poney puma castor loutre taupe rhino hippo
poule coq poussin canard oie cygne pigeon hibou chouette aigle corbeau paon dinde faucon mesange pinson colombe
poisson requin baleine dauphin phoque morse raie thon truite sole crabe homard tortue grenouille escargot abeille fourmi mouche papillon araignee lezard serpent dragon licorne fantome sorciere
sac clou montre cloche bonnet botte jupe robe pull veste gant bague collier chaussure chaussette pantalon casque casquette lunette
ami amie arc bal bar bec bol bus cap col cou cri don duo fil lac lit mot mur nid nom pot rat roc roi rue sol sou suc tas the tic van ver vin vol zoo
maison porte table chaise livre cahier stylo crayon gomme ecole classe maitre maitresse eleve copain copine papa maman bebe enfant fille garcon frere soeur oncle tante cousin
jouet poupee ballon velo moto voiture camion train avion robot clown fusee
bonbon pomme poire banane fraise cerise citron raisin prune melon peche abricot carotte tomate patate frite soupe fromage glace
nuage vague plage ile arbre fleur herbe feuille foret champ jardin colline riviere rocher pierre etoile lune
jour semaine mois annee matin soir nuit tete dent langue oreille joue bras main doigt ongle jambe pied ventre coeur
drap oreiller coussin tapis lampe fenetre toit chambre douche
papier ciseau colle image photo carte puzzle domino pion lettre phrase histoire conte reve idee secret fete
prince princesse reine geant lutin pirate tresor magicien
gentil gentille mechant mechante content contente triste drole belle joli jolie petit petite grand grande gros grosse long longue court courte large haute basse neuve vieille jeune
chaud chaude froid froide doux douce dur dure mou molle sec seche propre lourd lourde leger legere rapide lent lente fort forte faible fou folle fier fiere rare calme libre juste vrai vraie faux fausse
premier premiere dernier derniere autre seul seule cher chere rouge bleu jaune vert verte noir noire blanc blanche gris grise violet violette marron beige
trou bout bord fond cote tour rang file ligne point bande cle boite caisse panier valise bocal verre tasse bol assiette fourchette cuillere note chanson danse
coup coin sourire repas gouter oeuf
sage gai gaie vif vive amer amere sucre sucree sale salee cuit cuite cru crue plat plate rond ronde carre carree plein pleine vide
medecin docteur pompier facteur fermier pilote marin juge chef camp pays ville village parc
bille bulle bouton ruban ficelle laine outil echelle pelle pioche scie hache
tente cabane ferme grange etable mare etang puits
piano tambour flute violon guitare
`;

// Pluriels en -X (-EAU, -EU, -OU courants) et en -AUX (-AL).
const PLURIEL_X = `
beau veau agneau oiseau chapeau bateau gateau chateau manteau marteau couteau rideau cadeau tableau ruisseau pinceau drapeau morceau anneau bureau cheveu neveu feu jeu lieu genou bijou caillou chou joujou hibou
`;
const PLURIEL_AUX = `cheval animal journal canal hopital signal metal mal`;

// Verbes réguliers en -ER (radical) : infinitif, présent (je/tu/il/nous/vous/ils), participes.
const VERBES_ER = [
  'jou', 'chant', 'dans', 'saut', 'aim', 'parl', 'march', 'regard', 'donn', 'port', 'trouv', 'pos', 'tomb', 'rest', 'montr', 'lav',
  'coup', 'colori', 'dessin', 'cri', 'cach', 'cherch', 'tir', 'pouss', 'tourn', 'ferm', 'pens', 'rev', 'rentr', 'entr', 'mont', 'pass',
  'gagn', 'cuisin', 'bross', 'brill', 'ador', 'arriv', 'attrap', 'cass', 'chauff', 'compt', 'copi', 'creus', 'decid', 'demand', 'ecout',
  'embrass', 'emport', 'enlev', 'fum', 'gard', 'gliss', 'gonfl', 'habill', 'invit', 'lev', 'oubli', 'pli', 'pleur', 'prepar',
  'present', 'propos', 'quitt', 'rapport', 'rempl', 'repond', 'reuss', 'roul', 'sauv', 'sembl', 'sonn', 'souffl', 'termin', 'touch',
  'travaill', 'tromp', 'utilis', 'visit', 'vol', 'peign', 'ramass', 'secou', 'coll',
  // ajout 2026-10-17 (BRULE manquait) : verbes du quotidien des enfants
  'brul', 'gel', 'piqu', 'gratt', 'repar', 'arros', 'plant', 'allum', 'mouill', 'sech', 'achet', 'ajout', 'amus', 'apport',   'arret', 'aval', 'baill', 'bavard', 'boss', 'bouch', 'bricol', 'cal', 'caress', 'chass', 'chatouill', 'coiff', 'command',   'consol', 'continu', 'couch', 'coul', 'craqu', 'crev', 'croqu', 'cueill', 'decor', 'deguis', 'dejeun',   'desir', 'devor', 'din', 'discut', 'dout', 'dur', 'ecras', 'emmen', 'empil', 'enferm', 'entour', 'envol', 'eclat', 'etal',   'evit', 'expliqu', 'fabriqu', 'fet', 'flott', 'fouill', 'frapp', 'frott', 'goutt', 'grimp', 'grond', 'guid', 'hurl', 'jardin',   'jur', 'lach', 'lou', 'mel', 'mesur', 'miaul', 'mim', 'moqu', 'not', 'pardonn', 'patin', 'pein',   'pes', 'press', 'prêt', 'priv', 'pédal', 'racont', 'rat', 'recul', 'redress', 'regl', 'remerci',   'renvers', 'repos', 'respir', 'retourn', 'rev', 'rigol', 'ronfl', 'saign', 'salu', 'sautill', 'siffl', 'soign',   'souhait', 'tach', 'tap', 'tard', 'tent', 'tir', 'tomb', 'tracass', 'trembl', 'tremp', 'trich', 'trott', 'tu', 'vers',   'vid', 'zigzagu', ];

// Formes explicites : verbes irréguliers ou à orthographe particulière.
const VERBES_FORMES = `
bouge bouger bougeons bougez bougent rongé ronge ronger plonge plonger nage nager range ranger mange manger mangeons voyage voyager nettoie nettoyer pince pincer coud coudre cousu court courir couru courons courez courent ouvre ouvrir ouvert ouverte ouvrons ouvrez ouvrent brulure peint peindre peinte eteint eteindre mord mordre mordu siffle siffler
ai as a avons avez ont avais avait eu eue avoir
suis es est sommes etes sont etais etait ete etre
vais vas va allons allez vont aller
fais fait faisons faites font faire faite
dis dit disons dites disent dire dite
vois voit voyons voyez voient voir vu vue
prends prend prenons prenez prennent prendre pris prise
viens vient venons venez viennent venir venu venue
peux peut pouvons pouvez peuvent pouvoir pu
veux veut voulons voulez veulent vouloir voulu
sais sait savons savez savent savoir su
cours court courons courez courent courir couru
finis finit finir fini finie choisis choisit choisir choisi
ouvre ouvres ouvrons ouvrez ouvrent ouvrir ouvert ouverte
dors dort dormons dormez dorment dormir dormi
pars part partons partez partent partir parti partie
lis lisons lisez lisent lire lue
ecris ecrit ecrire ecrite
ris rit rions riez rient rire souriez sourire
bois boit buvons buvez boivent boire bu
mets met mettons mettez mettent mettre mis mise
perds perd perdons perdez perdent perdre perdu perdue
rends rend rendons rendez rendent rendre rendu
vends vend vendons vendez vendent vendre vendu
attends attend attendez attendre attendu
entends entend entendre entendu
descends descend descendre
apprends apprend apprendre appris
comprends comprend comprendre compris
tiens tient tenons tenez tiennent tenir tenu tenue
doit dois devons devez doivent devoir
crois croit croire
vis vit vivons vivez vivent vivre vecu
mange manges mangeons mangez mangent manger mangee
nage nages nageons nagez nagent nager
range ranges rangeons rangez rangent ranger
lance lances lancons lancez lancent lancer
place places placons placez placent placer
commence commencons commencez commencer
appelle appelles appelons appelez appellent appeler
jette jettes jetons jetez jettent jeter
achete achetes achetons achetez achetent acheter
essaie essaies essayons essayez essaient essayer
envoie envoies envoyons envoyez envoient envoyer
paie paies payons payez paient payer
nettoie nettoies nettoyons nettoyez nettoient nettoyer
grandis grandit grandir grandi
reviens revient revenir revenu
`;

function conjuguerER(r) {
  return ['er', 'e', 'es', 'ons', 'ez', 'ent', 'é', 'ée', 'ées', 'és'].map((s) => r + s);
}
// Pluriel en -S avec les exceptions courantes (-EAU/-EU -> X, -AL -> AUX, 7 mots en -OU -> X).
const OU_X = ['BIJOU', 'CAILLOU', 'CHOU', 'GENOU', 'HIBOU', 'JOUJOU', 'POU'];
function pluriel(n) {
  if (/(EAU|EU)$/.test(n) && n !== 'BLEU' && n !== 'PNEU') return [n + 'X'];
  if (/AL$/.test(n) && n !== 'BAL' && n !== 'CHACAL' && n !== 'FESTIVAL') return [n.slice(0, -2) + 'AUX'];
  if (OU_X.includes(n)) return [n + 'X'];
  return [n + 'S'];
}
function formes(liste, derive) {
  const out = [];
  for (const m of liste.split(/\s+/)) {
    if (!m) continue;
    const n = normaliser(m);
    out.push(n);
    if (!/[SXZ]$/.test(n)) out.push(...derive(n));
  }
  return out;
}

const SUPPL = [
  ...formes(EXTRA, () => []),
  ...formes(PLURIEL_S, pluriel),
  ...formes(PLURIEL_X, (n) => [n + 'X']),
  ...formes(PLURIEL_AUX, (n) => [n.slice(0, -2) + 'AUX']),
  ...formes(VERBES_FORMES, () => []),
  ...VERBES_ER.flatMap(conjuguerER).map(normaliser),
];

const vus = new Set();
for (const brut of BRUT.split(/\s+/)) {
  if (!brut) continue;
  const m = normaliser(brut);
  if (/^[A-Z]{2,7}$/.test(m)) vus.add(m);
}
for (const m of SUPPL) if (/^[A-Z]{2,7}$/.test(m)) vus.add(m);

export const WORDS = Object.freeze([...vus].sort());
