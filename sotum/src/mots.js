// Listes de mots (sans accents). Module pur : aucune dépendance au DOM.
// SOLUTIONS : "mot|définition" ; classés par longueur automatiquement.
import { DICO } from './dico.js';
const SOLUTIONS_TXT = `
chat|Un petit animal à moustaches qui fait miaou.
lait|Une boisson blanche que donne la vache.
pain|On le mange avec du beurre, il vient de la boulangerie.
jour|Quand il fait clair, avec le soleil.
nuit|Quand il fait noir et que l'on dort.
lune|Elle brille dans le ciel la nuit.
main|Au bout du bras, avec cinq doigts.
pied|On marche avec, il est dans la chaussure.
dent|On l'utilise pour croquer et mâcher.
bras|Il va de l'épaule à la main.
tete|Elle est en haut du corps, avec le visage.
bleu|La couleur du ciel et de la mer.
rose|Une fleur épineuse ou une couleur douce.
vert|La couleur de l'herbe.
noir|La couleur de la nuit sans lumière.
gris|La couleur des nuages de pluie.
loup|Un animal sauvage qui hurle à la lune.
ours|Un gros animal poilu qui dort tout l'hiver.
lion|Le roi des animaux avec une grande crinière.
cerf|Un animal de la forêt avec de grands bois sur la tête.
kiwi|Un fruit vert à l'intérieur, à peau poilue.
miel|Une douceur jaune faite par les abeilles.
velo|Il a deux roues et des pédales.
auto|Elle roule sur la route avec quatre roues.
moto|Elle a deux roues et un moteur.
toit|Il couvre la maison pour la protéger de la pluie.
cour|L'endroit de l'école où l'on joue à la récré.
rire|Ce que l'on fait quand c'est drôle.
joie|Un grand bonheur dans le cœur.
vent|De l'air qui bouge et fait voler les feuilles.
pate|Elle sert à faire le pain ou les gâteaux.
oeuf|La poule le pond, on peut le manger au plat.
fete|Un jour joyeux avec des amis et de la musique.
cake|Un gâteau moelleux que l'on coupe en tranches.
bois|On le trouve dans les arbres, ou c'est une petite forêt.
mare|Un petit coin d'eau où vivent les grenouilles.
pont|Il permet de traverser une rivière.
fort|Qui a beaucoup de force, comme un champion.
nage|On la fait dans l'eau avec les bras et les jambes.
joue|Elle est sur le visage, sous les yeux.
cils|Les petits poils au bord de l'œil.
paon|Un oiseau qui ouvre une queue magnifique en éventail.
puce|Un tout petit insecte qui saute très haut.
thon|Un grand poisson de la mer.
mais|Les grains jaunes du pop-corn.
chou|Un gros légume vert aux feuilles serrées.
pois|Une petite boule verte qui vit dans une cosse.
noix|Un fruit à coque dure et plissée que l'on casse pour le manger.
flan|Un dessert jaune et tremblotant.
vase|On y met des fleurs avec de l'eau.
clef|Elle ouvre la porte.
pile|Elle donne de l'énergie à une lampe de poche.
cube|Un solide avec six faces carrées.
pion|Une petite pièce que l'on déplace sur un jeu de société.
robe|Un habit pour les filles, d'un seul morceau.
jupe|Un vêtement qui part de la taille.
gant|On le met sur la main quand il fait froid.
pull|Un vêtement chaud en laine.
cape|Un grand manteau sans manches pour les super-héros.
chef|Celui qui dirige, ou qui fait la cuisine.
elfe|Un petit être magique des forêts.
tour|Un bâtiment très haut et étroit.
soir|La fin de la journée avant la nuit.
midi|Le moment où le soleil est tout en haut.
mois|Janvier, février... il y en a douze dans l'année.
nord|Là où la boussole pointe, vers le froid.
haut|Le contraire de bas.
beau|Ce que l'on dit de ce qui est très joli.
joli|Agréable à regarder.
gros|Le contraire de mince.
long|Le contraire de court.
doux|Agréable à toucher, comme un nounours.
vite|Le contraire de lentement.
lent|Qui avance tout doucement, comme l'escargot.
sage|Qui est calme et obéissant.
rond|Comme un ballon ou une roue.
plat|Sans aucune bosse, comme une table.
pret|Quand on a fini de se préparer.
sale|Plein de boue ou de taches.
neuf|Tout nouveau, ou le nombre après huit.
vide|Il n'y a rien dedans.
lire|Ce que l'on fait avec un livre.
dire|Parler pour faire savoir quelque chose.
voir|Regarder avec les yeux.
rame|Elle fait avancer la barque.
luge|On glisse dessus dans la neige.
taxi|Une voiture avec un chauffeur que l'on paye.
tram|Un petit train qui roule dans la ville.
quai|Là où l'on attend le train ou le bateau.
gare|Là où l'on prend le train.
camp|Un endroit avec des tentes pour dormir dehors.
tige|La partie longue qui porte la fleur.
foin|De l'herbe séchée que mangent les vaches.
boue|De la terre mouillée qui colle aux bottes.
baie|Un petit fruit rond, ou un bout de mer dans la côte.
port|L'endroit où les bateaux s'arrêtent.
mars|Le mois où commence le printemps.
peau|Elle recouvre tout notre corps.
oeil|On voit avec lui.
yeux|On voit avec eux, il y en a deux.
poil|Il pousse sur la peau des animaux.
puma|Un grand chat sauvage des montagnes.
lama|Un animal des Andes qui crache parfois.
cane|La femelle du canard.
veau|Le bébé de la vache.
porc|Un gros animal rose de la ferme qui grogne.
aile|Elle sert à l'oiseau pour voler.
brin|Un petit morceau d'herbe fine.
lave|La roche fondue qui sort d'un volcan.
zero|Le nombre qui veut dire rien.
deux|Un et encore un.
sept|Le nombre après six.
huit|Le nombre après sept.
onze|Le nombre après dix.
cuir|La peau d'un animal travaillée pour faire des sacs.
soie|Un tissu très doux fabriqué par un ver.
film|Une histoire que l'on regarde au cinéma.
bain|On le prend dans la baignoire pour se laver.
reve|Une histoire dans la tête quand on dort.
papa|Le monsieur qui est ton père.
papi|Le papa de ton papa ou de ta maman.
mere|La dame qui est la maman de la famille.
pere|Le monsieur qui est le papa de la famille.
tata|La sœur de ton papa ou de ta maman.
roue|Elle tourne sous la voiture.
trou|Un creux dans le sol.
juin|Le mois juste avant les grandes vacances.
aout|Un mois d'été, en plein milieu des vacances.
chien|Il aboie et aime les promenades.
lapin|Un animal à longues oreilles qui mange des carottes.
poule|Elle pond des œufs.
vache|Elle donne du lait et fait meuh.
singe|Un animal malin qui grimpe aux arbres et aime les bananes.
zebre|Un animal d'Afrique à rayures noires et blanches.
hibou|Un oiseau de nuit aux grands yeux ronds.
cygne|Un grand oiseau blanc au long cou qui nage sur le lac.
crabe|Un animal de mer qui marche de côté avec des pinces.
biche|La femelle du cerf.
tigre|Un grand félin rayé, très fort.
panda|Un ours noir et blanc qui mange du bambou.
koala|Un animal d'Australie qui dort dans les eucalyptus.
herbe|Elle pousse dans les prés, c'est vert.
fleur|Elle sent bon et a des pétales colorés.
arbre|Il a un tronc, des branches et des feuilles.
fruit|Une pomme, une poire ou une fraise en sont.
pomme|Un fruit rond rouge ou vert qui pousse sur le pommier.
poire|Un fruit doux en forme de goutte.
prune|Un petit fruit violet avec un noyau.
datte|Un fruit sucré du palmier.
figue|Un fruit mou et sucré, violet ou vert.
mures|Les petites baies noires des ronces.
melon|Un gros fruit à l'intérieur orange et sucré.
navet|Un légume blanc et violet.
radis|Un petit légume rouge piquant.
sucre|Il rend les gâteaux doux.
soupe|Un plat chaud que l'on mange à la cuillère.
pates|Des spaghettis, des coquillettes...
tarte|Un gâteau rond avec des fruits.
glace|Un dessert froid à la fraise ou à la vanille.
creme|Une douceur blanche pour les desserts.
crepe|Une galette fine que l'on retourne en l'air.
ecole|Là où les enfants apprennent à lire.
livre|Il contient des histoires à lire.
stylo|On écrit avec lui.
regle|Elle sert à tracer des traits droits.
table|On mange dessus.
lampe|Elle éclaire la pièce.
radio|Elle fait entendre de la musique.
porte|On l'ouvre pour entrer.
salon|La pièce de la maison où l'on se repose.
drap|On le met sur le matelas.
tasse|On y boit du chocolat chaud.
verre|On boit de l'eau dedans.
balle|On la lance et on la rattrape.
jouet|Un objet pour jouer.
train|Il roule sur des rails.
avion|Il vole dans le ciel.
route|Les voitures roulent dessus.
ville|Un grand endroit avec beaucoup de maisons.
champ|Un grand terrain où poussent des plantes.
ferme|Là où vivent les vaches et les poules.
plage|Du sable au bord de la mer.
sable|Les petits grains dorés de la plage.
vague|Elle roule sur la mer jusqu'à la plage.
ocean|Une immense étendue d'eau salée.
etang|Un petit lac calme.
monde|La Terre et tous ses habitants.
terre|Notre planète, ou le sol du jardin.
ciel|Au-dessus de nos têtes, bleu ou gris.
nuage|Une grosse boule blanche dans le ciel.
pluie|Des gouttes d'eau qui tombent du ciel.
neige|Elle tombe en flocons blancs l'hiver.
brume|Un brouillard léger.
fusee|Elle part dans l'espace.
robot|Une machine qui bouge comme un humain.
magie|Ce que font les magiciens avec leur baguette.
reine|La femme du roi.
geant|Une personne énorme dans les contes.
clown|Il fait rire au cirque avec un gros nez rouge.
danse|On bouge au rythme de la musique.
chant|Ce que l'on fait avec sa voix.
piano|Un instrument à touches noires et blanches.
flute|Un instrument où l'on souffle.
rouge|La couleur de la fraise et du feu.
jaune|La couleur du soleil et du citron.
blanc|La couleur de la neige.
beige|Une couleur claire comme le sable.
chaud|Le contraire de froid.
froid|Il fait ça en hiver, brrr.
grand|Le contraire de petit.
petit|Le contraire de grand.
lourd|Difficile à soulever.
leger|Facile à soulever, comme une plume.
amour|Ce que l'on ressent pour ceux que l'on aime.
amis|Ceux avec qui l'on joue et que l'on aime bien.
frere|Le garçon qui a les mêmes parents que toi.
soeur|La fille qui a les mêmes parents que toi.
mamie|La maman de ta maman ou de ton papa.
oncle|Le frère de ton papa ou de ta maman.
tante|La sœur de ton papa ou de ta maman.
bebe|Un tout petit enfant.
fille|Une petite personne, comme une sœur ou une copine.
femme|Une dame adulte.
homme|Un monsieur adulte.
corps|Tête, bras, jambes : c'est tout toi.
jambe|Elle sert à marcher.
doigt|Il y en a cinq par main.
ongle|Au bout du doigt, on le coupe avec des ciseaux.
pouce|Le plus gros doigt de la main.
genou|Il plie au milieu de la jambe.
coude|Il plie au milieu du bras.
coeur|Il bat dans la poitrine.
levre|Elle entoure la bouche.
front|Au-dessus des yeux.
gorge|Elle est dans le cou, on y avale.
jouer|Ce que l'on fait à la récréation.
aider|Donner un coup de main.
boire|Avaler de l'eau ou du jus.
bulle|Elle est ronde et légère, en savon.
carte|On la reçoit pour son anniversaire.
image|Un dessin ou une photo.
photo|Une image prise par un appareil.
peche|Un fruit doux à la peau veloutée.
sport|Courir, nager, jouer au foot : c'est ça.
match|Une partie de foot.
filet|Il retient le ballon au foot.
piste|Un chemin pour courir ou skier.
phare|Une grande lumière au bord de la mer.
ancre|Elle retient le bateau au fond de l'eau.
voile|Le grand tissu qui fait avancer un bateau.
plume|Elle recouvre un oiseau.
patte|Le pied d'un animal.
queue|Au bout du corps du chat.
corne|Elle pousse sur la tête de la vache.
miaou|Le cri du chat.
foret|Beaucoup d'arbres ensemble.
tente|Une petite maison en toile pour camper.
savon|On s'en sert pour se laver les mains.
rever|Imaginer des histoires pendant la nuit.
globe|Une boule qui représente la Terre.
cheval|Un animal qui galope et que l'on monte.
mouton|Il a de la laine et fait bêê.
souris|Un petit animal gris qui aime le fromage.
lievre|Un animal qui court vite, cousin du lapin.
renard|Un animal roux malin avec une queue en panache.
girafe|L'animal au très long cou.
tortue|Elle porte sa maison sur son dos.
oiseau|Il a des plumes et des ailes.
canard|Il fait coin-coin sur l'étang.
agneau|Le bébé du mouton.
chevre|Elle donne du lait et fait mêêê.
cochon|Il aime se rouler dans la boue.
mouche|Un insecte noir qui bourdonne.
fourmi|Un tout petit insecte très travailleur.
lezard|Un petit reptile qui aime le soleil.
dragon|Un monstre des contes qui crache du feu.
sirene|Une dame des contes avec une queue de poisson.
pirate|Il navigue pour trouver des trésors.
prince|Le fils du roi.
bateau|Il flotte sur l'eau.
camion|Un gros véhicule qui transporte des choses.
moteur|Il fait tourner la voiture.
etoile|Un petit point brillant dans le ciel la nuit.
volcan|Une montagne qui crache de la lave.
jardin|Là où poussent les fleurs et les légumes.
cabane|Une petite maison en bois dans un arbre.
maison|Là où l'on habite.
chalet|Une maison de montagne en bois.
balcon|Une petite terrasse qui dépasse d'un étage.
tapis|Il recouvre le sol de la chambre.
chaise|On s'assoit dessus.
miroir|Il nous renvoie notre image.
bougie|Elle brille avec une petite flamme.
cadeau|On l'offre à un anniversaire.
gateau|Un dessert avec des bougies à l'anniversaire.
bonbon|Une petite sucrerie.
citron|Un fruit jaune très acide.
fraise|Un petit fruit rouge avec des graines.
raisin|On en fait du jus, il pousse en grappes.
cerise|Un petit fruit rouge avec un noyau.
banane|Un fruit jaune qu'on épluche.
orange|Un fruit rond de couleur vive.
tomate|Un légume rouge rond.
salade|Des feuilles vertes que l'on mange.
patate|Une pomme de terre.
oignon|Un légume qui fait pleurer.
beurre|On le tartine sur le pain.
yaourt|Un dessert crémeux à la cuillère.
crayon|On dessine avec.
cahier|On y écrit à l'école.
gomme|Elle efface les erreurs.
dessin|Une image faite au crayon.
violet|Un mélange de bleu et de rouge.
marron|La couleur du chocolat.
joyeux|Très content.
rapide|Qui va vite.
violon|Un instrument à cordes joué avec un archet.
danser|Bouger au rythme de la musique.
sauter|Faire un bond.
courir|Aller vite avec les jambes.
nager|Avancer dans l'eau.
dormir|Fermer les yeux et se reposer la nuit.
manger|Avaler un repas.
lancer|Envoyer un ballon au loin.
tomber|Aller par terre sans le vouloir.
bouger|Ne pas rester immobile.
ouvrir|Le contraire de fermer.
fermer|Le contraire d'ouvrir.
couper|Faire des morceaux avec un couteau.
laver|Nettoyer avec de l'eau.
ranger|Mettre chaque chose à sa place.
enfant|Un petit garçon ou une petite fille.
garcon|Un petit homme.
maitre|Celui qui enseigne à l'école.
copain|Un ami avec qui on joue.
copine|Une amie avec qui on joue.
voisin|Quelqu'un qui habite à côté.
cousin|Le fils de ton oncle ou de ta tante.
bouche|On parle et on mange avec.
cheveu|Un des fils fins qui poussent sur la tête.
visage|Le devant de la tête.
epaule|Elle relie le bras au corps.
orteil|Un des doigts de pied.
menton|Le bas du visage.
poumon|Il nous aide à respirer.
muscle|Il nous rend fort quand on le travaille.
hiver|La saison où il fait froid.
nombre|Un, deux, trois... on compte avec eux.
lettre|Une des vingt-six de l'alphabet.
cirque|Un spectacle avec des clowns et des acrobates.
tresor|Des pièces d'or dans un coffre.
pierre|Un caillou ou un gros rocher.
rocher|Une grosse pierre.
fleuve|Un grand cours d'eau qui va à la mer.
desert|Un grand endroit de sable sans pluie.
jungle|Une forêt chaude pleine d'animaux.
savane|Une grande plaine d'Afrique avec des lions.
flocon|Un petit morceau de neige.
glacon|Un petit cube de glace.
vallee|Un creux entre deux montagnes.
marais|Un endroit plein d'eau et de roseaux.
poulet|Un jeune oiseau de la ferme, que l'on peut manger rôti.
cuisse|Le haut de la jambe.
sieste|Un petit somme après le repas.
jumeau|Un frère né le même jour que toi.
bambou|Une plante géante dont le panda raffole.
cactus|Une plante piquante du désert.
sapin|Un arbre de Noël vert avec des aiguilles.
bambin|Un très petit enfant.
bonnet|Il se met sur la tête quand il fait froid.
crabes|Ils marchent de côté.
dindon|Un gros oiseau de ferme qui fait glou-glou.
ecurie|La maison des chevaux.
gazon|De l'herbe courte et douce.
guepe|Un insecte rayé jaune et noir qui pique.
lapine|La maman du lapereau.
loutre|Un animal qui nage et joue dans la rivière.
mulot|Une petite souris des champs.
nuages|De grosses boules blanches ou grises dans le ciel.
panier|On y met les pommes cueillies.
parfum|Une odeur qui sent très bon.
radeau|Des planches attachées pour flotter sur l'eau.
sirop|Un liquide sucré que l'on mélange à l'eau.
sorbet|Une glace aux fruits sans lait.
tricot|Un vêtement en laine fait avec des aiguilles.
tunnel|Un grand trou pour passer sous la montagne.
valise|On y range ses affaires pour partir en voyage.
zigzag|Une ligne qui va à gauche puis à droite.
trompe|Le long nez de l'éléphant.
tuyau|Un long tube qui sert à arroser.
poupee|Un jouet qui a la forme d'un bébé.
pigeon|Un oiseau gris des villes qui roucoule.
cloche|Elle sonne ding-dong à l'église ou à l'école.
ballon|Rond et léger, on le lance ou on tape dedans.
soleil|L'étoile jaune qui nous éclaire et nous réchauffe.
pyjama|On le met le soir pour aller dormir.
casque|On le met sur la tête pour faire du vélo.
rideau|Il se ferme devant la fenêtre.
ruban|Un long bout de tissu pour faire un joli nœud.
perle|Une petite boule brillante pour faire un collier.
poney|Un tout petit cheval.
clou|Une petite pointe en métal que l'on enfonce.
ravi|Très content, tout joyeux.
puits|Un trou profond où l'on puise de l'eau.
dauphin|Un gentil animal de la mer qui saute hors de l'eau.
baleine|Le plus grand animal de la mer.
poisson|Il vit dans l'eau et nage avec ses nageoires.
moineau|Un petit oiseau brun que l'on voit en ville.
chameau|Un animal du désert avec deux bosses sur le dos.
gorille|Un grand singe très fort qui vit en Afrique.
cigogne|Un grand oiseau blanc qui, dit-on, apporte les bébés.
pelican|Un oiseau de mer avec un énorme bec.
flamant|Un grand oiseau rose qui dort sur une patte.
abeille|Elle fait le miel et pique si on l'embête.
criquet|Un insecte vert qui saute dans l'herbe.
taureau|Le mâle de la vache, avec des cornes.
crapaud|Il ressemble à une grosse grenouille et saute.
vautour|Un grand oiseau qui plane très haut dans le ciel.
sardine|Un petit poisson argenté que l'on met en boîte.
mouette|Un oiseau blanc qui crie au bord de la mer.
corbeau|Un grand oiseau tout noir.
castors|Ils construisent des barrages dans les rivières.
lapines|Les mamans des lapereaux.
trousse|On y range ses crayons et son stylo.
cuisine|La pièce où l'on prépare les repas.
fenetre|On l'ouvre pour aérer, elle laisse entrer la lumière.
armoire|Un grand meuble pour ranger les vêtements.
chapeau|On le met sur la tête pour se protéger du soleil.
manteau|Un vêtement chaud que l'on met par-dessus les autres.
voiture|Elle roule sur la route avec quatre roues.
autobus|Un grand véhicule qui emmène plein de gens en ville.
camping|On y dort sous une tente pendant les vacances.
piscine|Un grand bassin d'eau pour nager.
marelle|Un jeu où l'on saute à cloche-pied sur des cases dessinées.
bonbons|Des petites sucreries colorées.
biscuit|Un petit gâteau sec et croquant.
brioche|Un pain doux et sucré.
tartine|Une tranche de pain avec du beurre ou de la confiture.
fromage|Camembert, gruyère... on le fait avec du lait.
poivron|Un légume rouge, jaune ou vert, creux à l'intérieur.
carotte|Un légume orange que les lapins adorent.
haricot|Un légume vert et long, ou un petit grain blanc.
abricot|Un fruit orange et doux avec un gros noyau.
raisins|De petites boules sucrées en grappes.
chateau|La grande maison d'un roi ou d'une reine.
cabanes|Des petites maisons en bois.
village|Un petit groupe de maisons à la campagne.
riviere|Un cours d'eau qui coule vers le fleuve.
prairie|Un grand champ d'herbe où broutent les vaches.
falaise|Un grand mur de roche au bord de la mer.
colline|Une petite montagne toute ronde.
cascade|De l'eau qui tombe de haut en faisant du bruit.
cantine|L'endroit de l'école où l'on mange.
chambre|La pièce où l'on dort.
magasin|Un endroit où l'on achète des choses.
hopital|Là où les docteurs soignent les malades.
theatre|Un lieu où des acteurs jouent des histoires.
docteur|Il soigne les gens quand ils sont malades.
pompier|Il éteint les incendies avec une grande lance.
fermier|Il élève des animaux et cultive des champs.
facteur|Il apporte le courrier dans les boîtes aux lettres.
peintre|Il fait des tableaux avec des pinceaux.
planete|La Terre, Mars et Jupiter en sont.
lumiere|Elle nous permet de voir quand il fait noir.
tempete|Un gros orage avec beaucoup de vent.
automne|La saison où les feuilles tombent.
janvier|Le premier mois de l'année.
fevrier|Le mois le plus court de l'année.
juillet|Un mois d'été, en pleines vacances.
octobre|Un mois d'automne, avec Halloween à la fin.
cheveux|Ils poussent sur la tête.
sourcil|Une ligne de poils au-dessus de l'œil.
poignet|Il relie la main au bras.
estomac|Il digère ce que l'on a mangé.
musique|Des sons agréables que l'on écoute ou que l'on joue.
guitare|Un instrument à cordes que l'on pince.
chanson|On la chante avec des paroles et un air.
famille|Papa, maman, frères et sœurs.
cousine|La fille de ton oncle ou de ta tante.
voisine|Une dame qui habite à côté de chez toi.
copains|Des amis avec qui l'on joue.
bonheur|Quand on est très très content.
sourire|Ce que font les lèvres quand on est content.
courage|Ce qu'il faut pour faire une chose difficile.
bougies|Elles brillent sur le gâteau d'anniversaire.
cadeaux|On les ouvre à Noël ou à son anniversaire.
poupees|Des jouets qui ont la forme d'un bébé.
sorcier|Un magicien méchant des contes qui prépare des potions.
licorne|Un cheval blanc magique avec une corne sur le front.
oranger|L'arbre qui donne des oranges.
pommier|L'arbre qui donne des pommes.
cerisier|Un arbre qui donne des cerises.
tulipes|Des fleurs en forme de coupe, de toutes les couleurs.
muguets|De petites fleurs blanches en clochettes du mois de mai.
bateaux|Ils flottent sur l'eau.
valises|On y range ses affaires pour partir.
lapereau|Le bébé du lapin.
herisson|Un petit animal couvert de piquants.
sanglier|Un cochon sauvage de la forêt.
ecureuil|Un petit animal roux qui mange des noisettes.
papillon|Un insecte aux ailes colorées qui vole de fleur en fleur.
araignee|Elle tisse sa toile dans un coin.
escargot|Il porte sa coquille sur son dos et avance doucement.
chenille|Elle deviendra un papillon.
marmotte|Un animal de montagne qui dort tout l'hiver.
chouette|Un oiseau de nuit aux grands yeux.
anguille|Un poisson long qui ressemble à un serpent.
elephant|Un énorme animal gris avec une trompe.
panthere|Un grand chat noir et rapide de la jungle.
cartable|On y met ses cahiers pour aller à l'école.
fauteuil|Un grand siège confortable avec des accoudoirs.
escalier|Il permet de monter à l'étage.
pantalon|Un vêtement qui couvre les deux jambes.
mouchoir|Un petit carré de tissu pour se moucher.
tricycle|Un vélo à trois roues pour les petits.
tracteur|Un gros véhicule du fermier dans les champs.
toboggan|On glisse dessus au parc.
chocolat|Une douceur brune que l'on aime beaucoup.
sandwich|Du pain garni de jambon ou de fromage.
omelette|Des œufs battus cuits à la poêle.
noisette|Un petit fruit rond que mange l'écureuil.
montagne|Une très haute bosse de la Terre, avec parfois de la neige.
ruisseau|Une toute petite rivière.
fontaine|De l'eau qui jaillit sur une place.
boutique|Un petit magasin.
policier|Il protège les gens et fait respecter les règles.
musicien|Il joue d'un instrument.
chanteur|Il chante des chansons.
magicien|Il fait des tours de magie avec sa baguette.
plombier|Il répare les robinets et les tuyaux.
tonnerre|Le gros bruit que l'on entend pendant l'orage.
vacances|Les jours sans école pour se reposer.
dimanche|Le jour de la semaine après samedi.
vendredi|Le jour de la semaine avant samedi.
mercredi|Le jour de la semaine au milieu.
novembre|Le mois avant décembre.
decembre|Le dernier mois de l'année, avec Noël.
cheville|Elle relie le pied à la jambe.
peinture|Des couleurs que l'on étale avec un pinceau.
histoire|On la lit ou on la raconte avant de dormir.
poitrine|Le devant du corps, sous le cou.
lionceau|Le bébé du lion.
crevette|Un petit animal de mer rose quand il est cuit.
perruche|Un petit oiseau coloré qui peut apprendre à parler.
chevreau|Le bébé de la chèvre.
poussins|Les bébés de la poule.
oisillon|Un tout petit oiseau qui vient de naître.
antilope|Un animal rapide d'Afrique avec de longues cornes.
cormoran|Un oiseau de mer noir qui plonge pour pêcher.
gazelle|Un animal très rapide et gracieux d'Afrique.
bourdon|Un gros insecte velu qui butine les fleurs.
cigales|Elles chantent dans les arbres en été.
guepard|Le chat sauvage qui court le plus vite.
leopard|Un grand chat sauvage à taches noires.
pintade|Un oiseau de la ferme à plumes grises tachetées.
pieuvre|Un animal de mer avec huit bras.
lunettes|On les met sur le nez pour mieux voir.
bracelet|Un bijou que l'on porte autour du poignet.
baguette|Un long pain croustillant, ou le bâton du magicien.
oreiller|On pose la tête dessus pour dormir.
matelas|On dort dessus dans le lit.
couette|Une grosse couverture douce et chaude.
rideaux|Ils se ferment devant la fenêtre.
tableau|Une peinture accrochée au mur, ou le grand panneau de la classe.
assiette|On mange dedans.
cuillere|On l'utilise pour manger la soupe.
couteau|Il sert à couper la viande.
theiere|Un récipient pour servir le thé.
horloge|Elle indique l'heure.
lanterne|Une lampe que l'on porte à la main.
scooter|Un petit engin à deux roues avec un moteur.
tramway|Un train qui roule dans les rues de la ville.
paquebot|Un énorme bateau pour les voyages en mer.
voilier|Un bateau qui avance avec le vent.
traineau|Il glisse sur la neige, tiré par des chiens ou des rennes.
pasteque|Un gros fruit vert dehors et rouge dedans.
macaroni|Des petites pâtes en forme de tube.
raviolis|Des petits carrés de pâte farcis, avec de la sauce.
gaufres|Des gâteaux plats quadrillés que l'on mange chauds.
meringue|Un gâteau tout blanc et léger fait avec du blanc d'œuf.
caramel|Une douceur brune et collante.
sucette|Un bonbon au bout d'un bâton.
guimauve|Un bonbon rose ou blanc, tout mou.
compote|Des fruits cuits en purée.
beignet|Un gâteau rond et frit, saupoudré de sucre.
limonade|Une boisson sucrée et pétillante au citron.
saucisse|On la fait cuire sur le barbecue.
poireau|Un long légume vert et blanc.
campagne|Là où il y a des champs et des fermes, loin de la ville.
aeroport|Là où les avions décollent et atterrissent.
gymnase|Une grande salle pour faire du sport.
terrasse|Une grande plateforme dehors, devant la maison.
grenier|La pièce tout en haut de la maison, sous le toit.
couloir|Un passage étroit entre les pièces.
plafond|Le haut de la pièce, au-dessus de nos têtes.
pelouse|De l'herbe bien coupée dans le jardin.
potager|Un jardin où poussent des légumes.
sentier|Un petit chemin dans les bois.
marchand|Il vend des choses au marché.
pecheur|Il attrape des poissons.
ouvrier|Il travaille sur un chantier.
danseur|Il bouge en rythme sur la musique.
artiste|Il fait de la peinture, de la musique ou du théâtre.
coiffeur|Il coupe les cheveux.
gardien|Il surveille un endroit pour qu'il soit en sécurité.
carnaval|Une fête où l'on se déguise.
festival|De grandes fêtes de musique en plein air.
concert|Un spectacle de musique.
bonhomme|Une petite personne en neige ou en dessin.
gentille|Qui est douce et aime aider.
marraine|Une dame qui s'occupe de son filleul.
parrain|Un monsieur qui s'occupe de son filleul.
jumeaux|Deux frères nés en même temps.
enfants|Des petits garçons et des petites filles.
garcons|Des petits hommes.
fillette|Une petite fille.
curieux|Qui aime découvrir et poser des questions.
silence|Quand il n'y a aucun bruit.
branches|Elles poussent sur le tronc de l'arbre.
racines|Elles sont sous la terre et nourrissent l'arbre.
buissons|De petits arbustes touffus.
cailloux|De petites pierres.
coquille|Elle protège l'escargot ou le coquillage.
etoiles|Des petits points qui brillent dans le ciel la nuit.
galaxie|Un énorme groupe d'étoiles dans l'espace.
meteore|Une étoile filante.
eclipse|Quand la lune cache le soleil.
flocons|De petits morceaux de neige qui tombent.
banquise|De la glace qui flotte sur la mer, là où vivent les ours blancs.
glacier|Un énorme fleuve de glace en montagne.
iceberg|Un énorme bloc de glace qui flotte sur la mer.
tornade|Un vent qui tourne très fort.
oreilles|On entend avec elles.
sourcils|Ils sont au-dessus de nos yeux.
epaules|Elles relient les bras au corps.
muscles|Ils nous rendent forts.
orteils|Les doigts de pied.
gencive|Elle tient les dents dans la bouche.
`;

// Mots acceptés en plus des solutions (sans définition).
const EXTRA_TXT = `
abat abri abus acne acre acte ados afin ages agir agis agit aida aide aies aigu ails aima aime aine aire
aise allo alto amas amer ames amie anes ange anis anse ante apte arcs arts aube aune aval avec avez avis
axer axes ayez azur
abime abois abord abris abuse acces achat acide acier actes adieu adore agent agile aidas aidee aides
aidez aigle aigre aigus ailes aimas aimee aimer aimes aimez ainsi aires aises album algue alibi allee aller
allez allie alors amble ambre amere amers amide amies ample amusa amuse anges angle anima anime annee appel
appui apres aptes arche ardue arene arete armee arome arret asile aspic assez assis astre atlas atome atout
aucun audio aurai aussi autel autos autre avais avala avale avant avare aveux avide avoir avons avril azote
azurs
abimes accent accord achats acides aciers acteur agents agiter agrume aidais aidait aidant aidees
aident aidera aidons aigles aimais aimait aimant aimees aiment aimera aimons ajouta ajoute alarme albums
algues allons alluma allume amande ameres amusas amusee amuser amuses amusez ananas ancres angles animal
animas animee animer animes animez anneau annees anorak apercu appels appuis arbres arenes aretes argent
armees arreta arrete arrets arriva arrive arrosa arrose asiles assise atomes attend autant autels autour
avalas avalee avaler avales avalez avance avants avenir avenue averse averti avions avocat
bacs bail bals banc bard bars base bati bats bave bete bide bien bile bise bits bloc blog boas bobs
boit bols bond bons boom bord bots bouc bout boxe bref brie brio brun brut buee bues buis buse buts
bague bahut baies bains balai banal bancs bande banjo banne banni barbe barbu barde baron barre basse batie
batir batis batit baton battu bazar beaux bebes belle benne berge betes bidon biens bijou bilan bille
bises blase bleue bleus blocs blond blues bobos bocal boeuf boite bondi bonne bonus bords borne bosse
botte bouee boues bouge boule bourg bouse boute bouts boxer brame brave bravo breve bribe bride brins
brisa brise bruit brula brule brune bruni bruns brute buche buees buire burin buses butee butin buvez
bagage bagues baigne baiser baissa baisse balada balade balais balles bandes bannie bannir bannis bannit
banque barbes barbue barbus barque barres basket basses bassin baties battez battre battue battus bavard
bavoir bazars beaute beiges belier belles bennes berger besoin betail betise biches bidons bidule bijoux
bilans billes billet blague blancs blessa blesse bleues bleuet blondi blonds bloqua bloque blouse bocaux
boeufs boites bondir bondis bondit bonnes bornes bosses bottes boucha boucle bouees boueux bouges
bougez boules boulot bourse bouton braise braves bravos brebis brilla brille brique brisas brisee briser
brises brisez broche bronze brossa brosse bruine bruits brulas brulee bruler brules brulez brumes brunes
brunie brunir brunis brunit buches buffet buffle bulles bureau buvard buvons
cafe cage cale came caps cars case cash cave ceci cela cent ceux chai cher chez chic choc
chut cime cinq cire cite clan cles clic clip clos club coco code coin coke cola cols coqs cote coud coup
cous cout cran cria crie crin cris croc crue crus cuis cuit cure cuve
cabas cable cabri cacao cacha cache cadre cafes cages cakes calma calme campa campe camps canal canif canne
canoe canon canot capes capot caque carat carre cases cassa casse causa cause caves ceder cedre celle celui
cents cerfs cerne cessa cesse chale chaos chats chefs chene chere cheri chers chiot chocs choir choix chose
choux chute cible ciels cieux cimes cirer cires civil clair clame clans claps clefs clone clore cloue
clous clubs codes cogna cogne coins colis colla colle colon combe comme connu conte copia copie coque corde
cotes coton couds coupa coupe coups cours court couru cousu couta coute craie crane crete creux creve crias
criee crier cries criez crins crise crois croit croix cruel crues cubes cuire cuirs cuite cuits culte
cumul curer cures cycle
cables cachas cachee cacher caches cachez cadres cafard caisse calcul calmas calmee calmer calmes calmez
camera campas campee camper campes campez canape canaux canifs cannes canots carafe carnet carres cartes
carton casier cassas cassee casser casses cassez causas causee causer causes causez celles cendre centre
cercle cessas cessee cesser cesses cessez chacal chacun chaine chales champs chance change chanta chante
chants chaque charge charme chassa chasse chaton chaude chauds chauve chemin chenes chenil cheque cheres
cherie cherir cheris cherit chiens chiots choisi choses cibles cigale cinema ciseau claire clairs classe
cliche cligna cligne climat clones clowns cobaye cocher coeurs coffre cognas cognee cogner cognes cognez
coince colere collas collee coller colles collez colore comete compas compta compte connue connus contre
copias copiee copier copies copiez coquin corail coraux cordes cordon cornes cotons coucha couche coucou
coudes coudre coupas coupee coupes coupez couple courbe courez courte courts courue courus cousue coutas
coutee couter coutes coutez couvre craies creche cremes crepes cretes creusa creuse criais criait criant
criees crient criera crions crises crocus croire croute croyez cuisez cuites cuivre cycles cygnes
daim dais dame dans dard date decu defi deja dieu dite dits dois doit dome donc dons dont dora dore
dors dort dose dote dots drue dues dune duos dupe dura dure durs
daims dalle dames dansa darde dates daube debat debit debut decor decue decus defis degat degre delai demon
denim dense dents depot deuil devez devis digne dimes dinde diner diode disco dites divan domes donna
donne doras doree dorer dores dorez dorme dormi doses douce doute douze drame drape draps droit drole dunes
duras durci duree durer dures durez duvet
dalles damier danger dansas dansee danses dansez dattes debats debout debuta debute debuts decida decide
decora decore decors decues dedans defaut defend degres dehors delice deluge demain denims depart deposa
depose depuis dessus destin detail detour devant devina devine devoir devons diable dictee dindes diners
disent disons disque docile doigts dollar domino donnas donnee donner donnes donnez dorais dorait dorant
dorees dorent dorera dormez dorons douane double douces douche doutes dressa dresse droite droits droles
durais durait durant durcie durcir durcis durcit durees durent durera durons duvets
eaux echo ecot ecru ecus edit elan elle elus emeu emue epee epis erre esse etat etau etes etre etui eues exil
ebene eclat ecran ecris ecrit ecume edite effet egale egout elans eleve elfes elles email emeri emois encre
enfer enfin engin enjeu ennui entre envie envoi epais epand epave epees epice epier epine epoux erige
essai essor etage etain etais etape etats etend ethos etude etuis eveil evier evita evite exact exces
exigu exode
eclair eclats ecoles ecorce ecouta ecoute ecrans ecrasa ecrase ecrire ecrite ecrits ecumes efface effort
eglise egouts elargi eleves emails empire emploi encore encres enfila enfile engins enigme ennuis enorme
entend entier envahi envers envies epands epandu epices epines epoque equipe erable erreur escale espace
espoir esprit essais estime etable etages etangs etends etendu etonna etonne etroit etudes eviers evitas
evitee eviter evites evitez examen excuse
face fade faim fais fait fane fard faut faux fees fend fers feux fiel fier fige file fils fine fini fins fixa
fixe flot flou flux foie fois fols fond font foot fors four fous frac fret frit fuel fuir fuis fuit fuma
fume fuse
fable faces facon fagot faims faire faite faits fakir falot fanal fanes fange farce fards faste fatal faune
faute fauve feint fends fendu fente ferma ferry fetes feuil fiche fiere fiers filer films final
fines finie finir finis finit fiole firme fixas fixee fixer fixes fixez flair flanc flans flash flore flots
flous fluor foies foins foire folie folle fonce fonds fondu fonte fonts foots force forer forge forme
forte forts fosse fouet foule fours foyer frais franc frein frele fripe frire frise frite fugue fuite fumas
fumee fumer fumes fumez futur
fables facade facile fagots faible faites fameux farces farine fausse faveur femmes fendez fendre fendue
fendus fermas fermee fermes fermez festin feutre fiches fieres fievre figues figure filets filles filtre
finale finies fixais fixait fixant fixees fixent fixera fixons flacon flairs flamme flaque fleche fleura
fleure fleuri fleurs flotta flotte fluide flutes foires folies folles fonces fondez fondre fondue fondus
forcer forces forcez forets formes fortes fosses foudre fouets foules fourbe fourni fracas frange freins
freres friche frises frites froide froids fronts fruits fugues fumais fumait fumant fumees fument fumera
fumier fumons fuseau fusees futurs
gage gags gaie gain gais gala gale gars geai gele gels gemi gene gens gent gere gite glas glue gnou goal
gobe golf gond gong gout gras grec grue guet guis gyms
gaffe gages gagna gagne gaies gaine gains galet galop gamin ganse gants garda garde gares garni gaule gelee
geler gemie gemir gemis gemit genes genie genre gents gerbe geste gifle gigot gilet givre gland gnome golfe
golfs gombo gosse gourd gouta goute gouts grace grade grain grave grele greve grise grive grues guere gueri
guida guide guise
gadget gagnas gagnee gagner gagnes gagnez gaines galets galopa galope galops gamins garage gardas gardee
garder gardes gardez garnie garnir garnis garnit gaufre gaules gazons gemies genial genies genoux genres
gentil gerbes gestes gibier gigots gilets glaces glaise glands glissa glisse globes gloire gluant gommes
gonfla gonfle gorges gourde goutas goutee gouter goutes goutez goutte grabat gradin graine grains gramme
grande grandi grands grange grappe grasse gratta gratte greffe greles grelot grenat greves griffa griffe
grilla grille grimpa grimpe grippe grises gronda gronde grosse grossi grotte groupe guepes guerie guerir
gueris guerit guidas guidee guider guides guidez
haie hais hait hale hall halo hate hein hola hors houe houx huer huis
habit hache haies haler halle halls halte hamac hante harem harpe hates haute hauts havre helas heron heros
heure hisse hobby honte horde hotel houle huile humer humus hurla hurle hutte hydre hyene hymne
habita habite habits haches halles hamacs hanche hangar harpes hasard hausse hautes helice herbes herons
heures hiboux hivers hobbys hockey homard hommes hotels houles hourra hublot huiles huitre humain humide
hurlas hurlee hurler hurles hurlez huttes hyenes hymnes
ibis idee idem ides iles ilot imam inox ions iris ivre
ideal idees idole igloo ilots imita imite impot index indus intro isard isole issue ivres
idoles igloos images imitas imitee imiter imites imitez impair impots indice inedit infime infini injure
invita invite ironie isards ivoire
jade jais jars jazz jeta jets jeun jeux jonc joua joug joui judo juge jure jury
jabot jadis jalon jante jarre jauge jauni jeans jetee jeter jeton jeudi jeune joies joker jolie jolis
joncs jouas jouee joues jouez jougs jouir jouis jouit jours joyau judas judos juger juges jugez juive
julep jumbo jupes jurer juron jurys juste
jabots jaguar jalons jaloux jamais jambes jambon jantes jarres jarret jauges jaunes jaunie jaunir jaunis
jaunit jersey jetees jetons jeudis jeunes jockey jolies jongla jongle jouais jouait jouant jouees jouent
jouera jouets joueur jouons joyaux jubile jugent jujube jumbos jument jusque justes juteux
kaki kart khan kilo kilt kits
kakis karts kayak kebab kefir khans kilos kilts kiwis kyste
karate kayaks kebabs kimono koalas
lacs laid laie lame lard lava lest leur lice lien lier lieu lime lino lits lobe loge logo loin loir lois
lors loti loto loue lues luxe lynx lyre
label lacet laide laids laine laits lames lance lards large larme larve lasso latte lavas lavee laves lavez
lecha leche lecon legal lente lents lepre leurs lever leves liane libre lices liege liens lieue lieus lieux
ligne ligue lilas limon linge lions lippe lires lisez lisse liste litre local loche loger loges logez
logis longe longs loque lords lotus louer loupe loups louve loyal loyer lubie lueur luges luire lunch lundi
lunes lutin lutte luxes lycee
lacets laides laines laissa laisse lampes lances lancez langue langui lapins larges larmes lattes lavabo
lavais lavait lavant lavees lavent lavera lavoir lavons lechas lechee lecher leches lechez lecons legere
legers legume lentes lequel levres libres lieges lierre lignes limace limbes limita limite linges lingot
lisent lisons lisser lisses listes litres livres locale logent loisir longer longes longez longue
louche lourde lourds loyers lubies lucide lueurs lunchs lundis lutins luttes lycees
mage male mari mate mats maux meme mene menu mers mets mien mime mine mise mite mixa mixe mode mont mord mors
mots moue mous muet mule mure muri murs muse
macon mages mains maire malle maman mange manie mardi mares marge marin maris marre masse matin
mauve meche melee menue menus merci meres merle metal meteo metre metro meule miche micro
miels mieux mille mimer mimes mince minci mines minet mirer miser mises mites mixas mixee mixer mixes mixez
mixte modes moine moins moire moisi moite molle momie monta monte moral mords mordu morne morse
motel motif motos motte moule moult muets mugir mules mulet munir mural murer muret murie murir muris
murit musee muser myope mythe
machin madame magies magnet maigre maigri maille maires mairie majeur malade malles mamies manche manege
manges mangez mangue manoir manuel marbre marcha marche marges marins marqua marque martin masqua masque
masses matins maudit mazout mecano meches meduse melons membre menace menthe mercis merles mesura mesure
metaux meteos metier metros mettez mettre meuble meules miaula miaule miches micros miette mijota mijote
milieu milles minces mincir mincis mincit minuit minute mirage mixais mixait mixant mixees mixent
mixera mixeur mixons mobile modele moitie molles moment mondes montas montee monter montes montez montra
montre morale mordez mordre mordue mordus mortes motard motifs moudre moufle moules moulin mousse
muguet mulets murets muries museau musees myopes
nain nais nait nefs nerf nids noce noel noms nota note nous nuee nuls
nacre nages nagez naine nains naive nappe natal natte naval nerfs nette neufs neuve neveu niais nicha niche
niece noble noces noels noeud noire noirs noise nomma nomme nonne norme notas notee noter notes
notez notre nouer noyau noyer nuire nuits nuque nurse nylon
nacres nagent nageur naitre nappes narine nattes nature navets navire nectar neiges neuves neveux nichas
nichee nicher niches nichez nickel nieces nigaud niveau noeuds noirci noires nommas nommee nommer nommes
nommez normal notais notait notant notees notent notera notice notons nougat nounou nourri nouvel noyaux
 nuance numero nuques nurses nylons
obei ocre ogre oies once onde opte oral orge orme orna orne oser ouie oups ovni
oasis obeie obeir obeis obeit objet obole obtus ocres odeur oeils oeufs offre ogive olive ombre omega onces
ondes opale opera optez orage orale orbes ordre orges orgue ornas ornee orner ornes ornez ortie osera osier
otage ouate oubli ouest ouies ourse outil outre ouvra ouvre ovale ovnis oxyde
obeies objets oblige obscur oceans odeurs odorat oeuvre offert offres offrir olives ombres ongles opaque
operas orages ordres organe orgues orient ornais ornait ornant ornees ornent ornera ornons orties osiers
otages otarie ouates oublia oublie oublis ouille ourses ourson outils outres ouvert ouvras ouvree
ouvrer ouvres ouvrez ovales
pack page paie pair paix pale pali parc pare pars part paru pave paye pays pend perd peur peut peux piaf pipe
pire plan plia plie plis plot plus pole poli polo pond posa pose pote pots pour poux pres pria prie pris prix
prof psst pues puis puni pure
pages pains paire pales palie palir palis palit palme panne panse papas parce parcs parka parla parle parmi
parti parts parue parus passa passe patin patio paume pause pavee pavot payer payez peaux pecha peine peint
pelle pends pendu pensa pense pente perce perds perdu peres perte pesee peser peurs phase piafs piece pieds
piege pieux piles pilon pince pinte pions pipes piqua pique pires pitie pitre pivot pixel pizza place plaid
plaie plain plais plait plane plans plant plate plats plein pleur plias pliee plier plies pliez plomb
plots pocha poche poele poeme poids poils poilu poing point poker polar poles polie polir polis polit polka
polos pompa pompe ponds pondu ponts porcs porta ports posas posee poser poses posez posta poste potin poupe
preau prend preta prete prets prevu prias priee prier pries priez prime prise prive profs proie promo prose
puces puisa puise pulls pulpe punch punie punir punis punit puree purge
paille paires palais palier palies palmes pandas pannes pantin papier paquet parait pardon parent parkas
parlas parlee parler parles parlez parole partez partie partir partis parues passas passee passer passes
passez patina patine patins patron pattes paumes pauses pauvre pavots payant payons paysan pechas pechee
pecher peches pechez pedala pedale peigna peigne pelage pelles pelote pendez pendre pendue pendus pensas
pensee penser penses pensez pentes percer perces percez perche perdez perdre perdue perdus perles persil
pesees petale petard petite petits peuple phares phoque photos phrase pianos picora picore pieces pilier
pilote pincee pincer pinces pincez pioche piquas piquee piquer piques piquet piquez piqure pistes pitres
pivots pizzas placer places placez plages plaids plaine plaire plante plaque plates pleine pleins pleura
pleure pliais pliait pliant pliees plient pliera plions plissa plisse plombs plonge
pluies plumes pochas pochee pocher poches pochez podium poeles poemes poesie poilue poilus poings points
pointu poires poivre police polies pommes pompas pompee pomper pompes pompez pondez pondre pondue pondus
poneys ponton porche portas portee porter portes portez posais posait posant posees posent posera posons
postas postee poster postes postez potage poteau pouces poules pourri poussa pousse pouvez prends prenez
prenom presse pretas pretee preter pretes pretez prevue prevus priais priait priant priees prient priera
prions prises prison prives proche projet propre prunes public puisas puisee puiser puises puisez puisse
punies purees puzzle
quad quel quiz quoi
quais quand quant quart quasi quels quete quota
quarts quatre quelle quetes queues quiche quille quinze quitta quitte quotas
race rade rage raid raie rail rama rang rare rase rata rate rats recu rein rend rene reva revu ride rien riez
rima rime rive rocs rois role rots roux rude ruer rues rugi ruse
rabat rabot racer races radar rafle rages raide raies rails ramas ramee ramer rames ramez rampe ranch range
rangs rares ratas ratee rater rates ratez raton ravie ravir ravis ravit rayer rayez rayon reale recif recit
recue recus refus regne reins relia relie remua remue rende rends rendu renes renne rente repas repli repos
resta reste retro revas revee reves revez revue revus rhume riche rides rient rieur rimas rimee rimer rimes
rimez rions rires risee rival rives rivet robes roche rodeo roles roman ronce ronde ronds ronge rosee roses
rotor roues rouet rougi roula roule royal rubis ruche rudes rugby rugie rugir rugis rugit ruine ruses
rabots radars radios rafale raides raison rallye ramais ramait ramant rameau ramees rament ramera ramons
rampes ranchs rangee ranges rangez rapace rarete rasoir ratais ratait ratant rateau ratees ratent ratera
ratons ravies rayant rayons rayure razzia recifs recits record recues recula recule reflet refuge refusa
refuse regard regime region regles reines relais relias reliee relief relier relies reliez remede remise
remous rempli remuas remuee remuer remues remuez rendez rendre rendue rendus rennes rentra rentre repara
repare repere repond reposa repose requin reseau resine restas restee rester restes restez retard retira
retire retour reussi revais revait revant revees reveil revent revera revoir revons revues rhumes ricane
riches rieurs rieuse rigola rigole rimais rimait rimant rimees riment rimera rimons risque rivage rivets
robots roches rodeos romans rompre ronces rondes rondin ronfla ronfle ronger ronges rongez rosees rosier
rotule rouets rouges rougie rougir rougis rougit roulas roulee rouler roules roulez rousse routes rubans
ruches ruelle rugbys rugies rumeur rythme
sacs sain sais sait sali sans sauf saut saxo scie seau secs sels sens sent sera sers sert seul sien site skia
skie skis slip sofa soif soin soit soja sols sons sont sors sort sous star stuc suce sues suis suit sumo
surf
sabla sabot sages saine sains saisi sales salie salir salis salit salle salto salua salue salut satin sauce
sauge saule sauta saute sauts sauva sauve savez saxos sceau scene scier scies score scout seaux seche secte
seine seize selle selon semer semis sense sente senti serai serie serra serre servi seuil seule seuls short
siege signa signe silex sinon sites skate skias skier skies skiez slips snack sobre socle sofas soies
soifs soins soirs sojas solde somme sonde songe sonna sonne sorte sorti souci soude soupa sourd soute spots
stade stage stand stars stock stops store style suave sucer suces sucez suite suivi sujet sumos super sushi
sweat swing
sablas sablee sabler sables sablez sabots sachet saines saisie saisir saisis saisit saison salies salive
salles salons saltos saluas saluee saluer salues saluez samedi santal sapeur sapins satins sauces saumon
sautas sautee sautes sautez sauvas sauvee sauver sauves sauvez savent savoir savons sceaux scenes schema
scores scouts seance sebile seches second secoua secoue secret selles sentez sentie sentir sentis series
sermon seront serras serree serrer serres serrez servez servie servir servis sesame seuils seules shorts
siecle sieges siffla siffle signal signas signee signer signes signez sillon simple singes sirops sirota
sirote skates skiais skiait skiant skient skiera skions snacks social socles soeurs soldat soldes
solide sombre sommes sommet songes sonnas sonnee sonner sonnes sonnez sortez sortie sortir sortis soucis
soupas souper soupes soupez soupir souple source sourde sourds soutes soyeux sphere sports stades
stages statue studio stylos sucent sucree sucres suites suivez suivie suivis suivre sujets sultan surnom
survol sweats
tact taie tais tait tant tapa tape tard taro taux taxe tele tels tend tenu thes thym tics tien tint tipi tira
tire tirs tome tond tons tord tort tous tout toux trac tres tria trie trio troc trop trot truc tube tutu
type
tabou tache tacts taies taiga taire talon talus tango tapas tapee taper tapes tapez tarif tarot tassa taupe
taxis tchao tchat teint teles temps tends tendu tenez tenir tenon tenue tenus terme terne tests tetes texte
thons tiare tibia tiede tiens tient tiers tiges tipis tiras tiree tirer tires tiret tirez tissu titan titre
toast toile toise toits tomba tombe tonds tondu tonne tonus toque tords tordu torse total totem tours toute
trace tract trahi trait trapu treve trias tribu triee trier tries triez trios trocs trois tronc trone troue
trous trucs truie tubes tuile tulle tuner turbo tutus twist types
tables taches tagine taigas tailla taille talent talons tampon tandis tangos tantes tapage tapais tapait
tapant tapees tapent tapera tapons tapota tapote tarifs tarots tartes tassas tassee tasser tasses tassez
tatoua tatoue taupes teints tendez tendon tendre tendue tendus tennis tenons tenter tentes tenues terres
tesson tetard textes tiares tiedes tigres timbra timbre timide tirais tirait tirant tirees tirent tirera
tiroir tirons tisane tissus titans titres toasts toiles tombas tombee tombes tombez tondez tondre tondue
tondus topaze torche tordez tordre tordue tordus torses totale totems toucha touche toupie tourna tourne
tourte toussa tousse toutes tracer traces tracez tracts trahie trahir trahis trahit traina traine trains
traits trauma trefle treize trente tressa tresse triais triait triant tribus tricha triche triees trient
triera trions triple triste trompa troncs trones troqua troque trotta trotte trouva trouve truite
tuiles tulipe turbos tuteur tuyaux twists typhon
unie unir unis unit urne usee user uses
ultra unies union unite urnes usage usant usent usine usure utile
unions unique unites usages usines usures utiles
vain vais valu vaut vecu vend venu vers veut veux vice vies vifs vils vins visa vive voeu voie vois voit voix
vola vole vols vont vota vote vous vrai vues
vaine valet valsa valse valve vanne varie vases vaste veaux vecue veine velos vends vendu venez venin venir
vente vents venue venus verbe verdi verge verni versa verse verte verts verve veste veuve vexer vibra vibre
vices video vider vides vieil viens vient vieux vigie vigne villa vingt viole viral virer visas visee viser
vital vitre vives vivez vivre vocal voeux voici voies voila voire volas volee voler voles volet volez 
votas votee voter votes votez votre vouer voute voyez voyou vraie vrais
vaccin vacher vaches vagues valets valeur vallon valoir valsas valsee valser valses valsez valves vapeur
veille veines vendez vendre vendue vendus veneur venons ventre venues verdie verdir verdis verdit verger
verite verres verrou versas versee verser verses versez vertes vessie vestes viaduc viande vibras vibree
vibrer vibres vibrez videos vigies vignes vilain villas villes vinyle virage vision visita visite
vitres vivant vivent vivier vivons vocaux voient voiles voirie volais volait volant volees volent volera
volets voleur volons volume votais votait votant votees votent votera votons voulez voutes voyage voyons
voyous vraies
watt wifi
wagon wifis
 wagons wapiti
xenon
yaks yang yens yeti yoga yogi yole yoyo yuan
yacht yetis yogas yogis yoyos
yachts
zebu zele zest zinc zone zoom zoos
zebus zeros zeste zincs zones zooms
zebres zenith zephyr zestes zouave
`;

const clean = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const DEFS = {};
export const SOLUTIONS = { 4: [], 5: [], 6: [], 7: [], 8: [] };
for (const line of SOLUTIONS_TXT.split('\n')) {
  const t = line.trim();
  if (!t) continue;
  const i = t.indexOf('|');
  const w = clean(t.slice(0, i));
  if (DEFS[w] || !/^[a-z]+$/.test(w) || !SOLUTIONS[w.length]) continue;
  DEFS[w] = t.slice(i + 1).trim();
  SOLUTIONS[w.length].push(w);
}
for (const n of [4, 5, 6, 7, 8]) SOLUTIONS[n].sort();

const EXTRA_WORDS = EXTRA_TXT.split(/\s+/).map(clean).filter((w) => /^[a-z]+$/.test(w) && w.length >= 4 && w.length <= 8);

const DICO_WORDS = DICO.split(/\s+/).filter(Boolean);
export const ACCEPTED = new Set([...Object.keys(DEFS), ...EXTRA_WORDS, ...DICO_WORDS]);

export function definition(word) { return DEFS[word] || ''; }
export function isAccepted(word) { return ACCEPTED.has(word); }
export function acceptedCount(len) { let n = 0; for (const w of ACCEPTED) if (w.length === len) n++; return n; }
export { clean };
