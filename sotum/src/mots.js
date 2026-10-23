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
ange|Un petit être du ciel avec des ailes, dans les contes.
banc|On s'assoit dessus dans le parc.
café|Une boisson chaude et noire que boivent les grands.
coin|L'endroit où deux murs se rencontrent.
dame|Une femme, ou une carte du jeu avec le roi.
dodo|Le mot des petits pour dire dormir.
dune|Une colline de sable dans le désert.
fils|Le garçon de son papa et de sa maman.
four|On y fait cuire les gâteaux.
golf|Un sport où l'on pousse une petite balle dans un trou.
houx|Un arbuste aux feuilles piquantes et aux boules rouges.
idée|Quand on pense à quelque chose de nouveau.
judo|Un sport sur un tapis, en kimono blanc.
kaki|Un fruit orange, et aussi une couleur vert-brun.
loto|Un jeu où l'on tire des numéros au hasard.
lynx|Un grand chat sauvage aux oreilles pointues.
menu|La liste des plats au restaurant.
mime|Il raconte des histoires avec des gestes, sans parler.
mont|Une très haute colline.
mule|Un animal entre l'âne et le cheval.
mûre|Un petit fruit noir des ronces.
nain|Un petit personnage des contes, comme ceux de Blanche-Neige.
noël|La fête de décembre avec le sapin et les cadeaux.
parc|Un jardin public avec des arbres et des jeux.
poli|Il dit bonjour, merci et s'il te plaît.
roux|Une couleur de cheveux orange.
seau|On le remplit de sable ou d'eau à la plage.
sofa|Un grand siège moelleux du salon.
sole|Un poisson plat de la mer.
tipi|Une tente pointue des Amérindiens.
tuba|Un tube pour respirer sous l'eau en nageant.
tutu|La jupe légère des danseuses.
yoga|Une gymnastique douce pour s'étirer et respirer.
bobo|Le mot des petits pour un petit mal.
cage|Une maison à barreaux pour un oiseau.
coco|La noix au lait blanc qui pousse sur le palmier.
fève|Une petite graine cachée dans la galette des rois.
gong|Un grand disque de métal qui résonne quand on le frappe.
goût|Le sens qui dit si c'est sucré ou salé.
mage|Un magicien des contes.
mine|Le bout du crayon qui écrit.
page|Une feuille d'un livre.
paix|Quand tout le monde est calme et s'entend bien.
pneu|Le caoutchouc qui entoure la roue.
rail|Le train roule dessus.
rang|Une ligne d'élèves les uns derrière les autres.
soda|Une boisson sucrée avec des bulles.
stop|Le panneau rouge qui dit de s'arrêter.
vrai|Ce qui n'est pas faux.
lime|Un petit outil pour les ongles.
bouc|Le papa de la chèvre, avec une barbiche.
faon|Le petit de la biche.
note|Un son de musique, comme do, ré, mi.
surf|Glisser sur les vagues debout sur une planche.
bond|Un grand saut.
saut|Un bond en l'air.
grue|Un grand oiseau, ou un engin de chantier.
cinq|Le nombre après quatre.
cent|Dix fois dix.
brun|La couleur du chocolat.
avril|Le mois du poisson.
jeudi|Le jour après mercredi.
lundi|Le premier jour de la semaine.
mardi|Le jour après lundi.
olive|Un petit fruit vert ou noir qui donne de l'huile.
pizza|Une galette ronde avec tomate et fromage, cuite au four.
ruche|La maison des abeilles.
pelle|On s'en sert pour creuser le sable.
malle|Un grand coffre pour ranger des affaires.
taupe|Un petit animal qui creuse des galeries sous la terre.
merle|Un oiseau noir au bec jaune.
bijou|Une jolie bague ou un collier.
bisou|Un baiser tout doux sur la joue.
lilas|Un arbuste aux fleurs violettes qui sentent bon.
duvet|Les plumes toutes douces des poussins.
valse|Une danse qui tourne à trois temps.
bœuf|Un gros animal de la ferme, cousin de la vache.
conte|Une histoire avec des fées, des princes et des dragons.
drôle|Ce qui fait rire.
fable|Une petite histoire avec des animaux qui parlent.
farce|Une blague pour rire.
gilet|Un petit vêtement avec des boutons.
hamac|Un lit de toile suspendu entre deux arbres.
hôtel|On y dort en vacances.
huile|Un liquide doré pour la cuisine.
igloo|La maison de glace des Inuits.
kayak|Un petit bateau qu'on fait avancer avec une pagaie.
lasso|Une corde avec une boucle pour attraper les chevaux.
lutin|Un petit personnage malicieux des contes.
marin|Il navigue sur la mer.
morse|Un gros animal des mers froides avec deux longues dents.
moule|Un coquillage noir, ou un plat pour les gâteaux.
nœud|On le fait avec les lacets.
nappe|Le tissu que l'on met sur la table.
palme|Elle aide à nager vite, au pied.
pente|Une descente ou une montée.
poche|Un petit sac cousu au pantalon.
poêle|On y fait cuire les crêpes.
purée|Des pommes de terre écrasées.
renne|Il tire le traîneau du père Noël.
sabot|La chaussure en bois, ou le pied du cheval.
saule|Un arbre aux branches qui pendent vers l'eau.
stade|Le grand terrain où l'on joue au foot.
usine|Un grand bâtiment où l'on fabrique des choses.
veste|Un vêtement chaud avec des manches.
vigne|La plante qui donne le raisin.
vitre|Le verre de la fenêtre.
wagon|Une voiture du train.
aigle|Un grand oiseau qui vole très haut.
algue|Une plante qui pousse dans la mer.
barbe|Les poils sur le menton des messieurs.
botte|Une grande chaussure pour la pluie.
bouée|Elle aide à flotter dans l'eau.
cacao|La poudre brune du chocolat.
canoë|Un petit bateau léger avec des pagaies.
carré|Une forme avec quatre côtés pareils.
colle|Elle sert à faire tenir le papier.
dîner|Le repas du soir.
écran|On y regarde des dessins animés.
épice|Elle donne du goût, comme la cannelle.
fouet|Il sert à battre les œufs.
héron|Un grand oiseau à longues pattes qui pêche.
lacet|Il ferme la chaussure.
loupe|Elle fait voir les choses en plus gros.
métro|Un train qui roule sous la ville.
musée|On y regarde des tableaux et des statues.
niche|La petite maison du chien.
noyau|Le gros pépin au milieu de la pêche.
pause|Un petit moment de repos.
roche|Une grosse pierre.
rugby|Un sport avec un ballon ovale.
scène|L'endroit où jouent les acteurs.
selle|Le siège sur le dos du cheval ou du vélo.
short|Un pantalon court pour l'été.
tissu|On coud des vêtements avec.
trois|Le nombre après deux.
douze|Le nombre après onze.
seize|Le nombre après quinze.
mille|Dix fois cent.
mauve|Un violet très clair.
chiot|Le petit du chien.
maman|Elle s'occupe de toi, avec papa.
météo|Le bulletin qui dit le temps qu'il fera.
bocal|Un pot en verre.
orque|Un grand animal marin noir et blanc.
bison|Un gros bœuf sauvage à bosse.
chêne|Un grand arbre qui donne des glands.
frigo|Il garde les aliments au frais.
talon|L'arrière du pied.
câlin|Se serrer fort dans les bras.
maçon|Il construit les murs avec des briques.
bille|Une petite boule de verre pour jouer.
ananas|Un gros fruit jaune avec une couronne de feuilles.
otarie|Un animal marin qui ressemble au phoque.
phoque|Un animal marin à moustaches qui vit sur la glace.
chaton|Le petit du chat.
tulipe|Une fleur en forme de coupe, au printemps.
mangue|Un fruit des pays chauds, jaune orangé et juteux.
masque|On le met sur le visage pour se déguiser.
miette|Un tout petit morceau de pain.
paille|On boit avec, ou les vaches dorment dessus.
flaque|Un peu d'eau de pluie par terre.
gaufre|Un gâteau en forme de grille.
goûter|Le petit repas de quatre heures.
légume|La carotte et le poireau en sont.
menthe|Une plante qui sent frais.
moufle|Un gant sans doigts séparés.
pilote|Il conduit l'avion.
statue|Une personne en pierre ou en bronze qui ne bouge pas.
tétine|Le bébé la suce pour se calmer.
tonton|Le frère de papa ou de maman.
torche|Une lampe de poche.
truite|Un poisson des rivières.
quatre|Le nombre après trois.
treize|Le nombre après douze.
samedi|Le jour après vendredi.
domino|Un jeu de petits rectangles avec des points.
basket|Un sport où l'on lance le ballon dans un panier.
bouton|Il ferme la chemise.
bureau|La table pour travailler.
carton|Une boîte en papier épais.
castor|Un animal qui construit des barrages avec des branches.
chemin|Un petit passage dans la forêt.
cinéma|On y regarde des films sur un grand écran.
coffre|Une grande boîte pour garder des trésors.
comète|Un astre avec une longue traînée lumineuse.
étable|La maison des vaches à la ferme.
farine|Une poudre blanche pour faire le pain.
grotte|Un trou dans la montagne, comme une caverne.
hochet|Un jouet de bébé qui fait du bruit.
hublot|La petite fenêtre ronde du bateau.
jambon|Une tranche de viande rose pour les sandwichs.
kimono|La tenue blanche du judo.
lavabo|On s'y lave les mains.
limace|Elle ressemble à l'escargot, sans coquille.
manège|Des chevaux de bois qui tournent à la fête.
moulin|Ses ailes tournent avec le vent.
navire|Un grand bateau.
ourson|Le petit de l'ours.
paquet|Un colis bien emballé.
pinson|Un petit oiseau qui chante gaiement.
poivre|Une épice noire qui pique un peu.
potion|Une boisson magique de sorcier.
puzzle|Des pièces à assembler pour faire une image.
quille|On la renverse avec une boule au bowling.
tennis|Un sport avec une raquette et une balle jaune.
têtard|Le bébé de la grenouille.
tiroir|On le tire pour ranger dans la commode.
trèfle|Une petite plante à trois feuilles.
carnet|Un petit cahier.
gourde|Une bouteille pour boire en promenade.
saumon|Un poisson rose qui remonte les rivières.
ventre|Le milieu du corps, avec le nombril.
voyage|Partir loin, en vacances.
doudou|Le jouet tout doux pour dormir.
compas|Il sert à tracer des cercles.
classe|La salle de l'école où l'on apprend.
calcul|Faire des additions et des soustractions.
lionne|La femelle du roi des animaux.
toupie|Un jouet qui tourne sur sa pointe.
amande|Un fruit sec en forme de goutte.
persil|Une petite herbe verte pour la cuisine.
toucan|Un oiseau au très grand bec coloré.
méduse|Un animal transparent de la mer, qui pique.
homard|Un gros crustacé bleu avec des pinces.
iguane|Un grand lézard vert.
jaguar|Un grand félin tacheté d'Amérique.
fennec|Un petit renard du désert aux grandes oreilles.
alpaga|Un cousin du lama à la laine douce.
jument|La maman du poulain.
narine|Un trou du nez pour respirer.
mollet|L'arrière de la jambe, sous le genou.
langue|Elle est dans la bouche et sert à goûter.
amitié|Ce qui unit deux amis.
feutre|Un crayon à encre pour colorier.
donjon|La plus haute tour du château.
pivert|Un oiseau qui tape sur les arbres avec son bec.
canari|Un petit oiseau jaune qui chante.
faucon|Un oiseau rapide qui chasse en piqué.
faisan|Un bel oiseau à longue queue.
éclair|Un trait de lumière dans le ciel pendant l'orage.
verger|Un jardin plein d'arbres fruitiers.
râteau|Un outil à dents pour ramasser les feuilles.
grange|Le grand bâtiment de la ferme où l'on range le foin.
peigne|Il sert à démêler les cheveux.
brosse|Elle sert à se coiffer ou à frotter.
canapé|Un long siège du salon pour s'asseoir à plusieurs.
garage|On y range la voiture.
dictée|L'exercice où l'on écrit ce que dit la maîtresse.
timbre|On le colle sur l'enveloppe.
cornet|La glace se met dedans.
quiche|Une tarte salée aux œufs et aux lardons.
berger|Il garde les moutons.
rigolo|Très drôle.
gentil|Il est doux et aide les autres.
laisse|La corde pour promener le chien.
poussin|Le petit de la poule.
hamster|Un petit rongeur qui court dans sa roue.
collier|Un bijou autour du cou.
cravate|Elle se noue autour du cou, sur la chemise.
dessert|Le plat sucré à la fin du repas.
gamelle|L'assiette du chien.
tablier|On le met pour cuisiner sans se salir.
poulain|Le petit du cheval.
vanille|Un parfum doux pour les glaces et les gâteaux.
chemise|Un vêtement avec un col et des boutons.
marmite|Une grosse casserole de sorcière.
biberon|La bouteille de lait du bébé.
planche|Un morceau de bois long et plat.
robinet|On le tourne pour avoir de l'eau.
tambour|Un instrument sur lequel on tape.
serpent|Un long animal sans pattes qui rampe.
clavier|Les touches de l'ordinateur ou du piano.
cerceau|Un grand anneau que l'on fait tourner.
costume|Un habit pour se déguiser.
dînette|De la petite vaisselle pour jouer.
épinard|Un légume vert à feuilles.
écolier|Un enfant qui va à l'école.
fanfare|Un groupe de musiciens qui jouent en marchant.
feuille|Elle pousse sur les branches des arbres.
grimace|Une drôle de tête que l'on fait pour rire.
gruyère|Un fromage avec des trous.
journal|On y lit les nouvelles.
lampion|Une petite lanterne en papier.
lecture|Le moment où l'on lit un livre.
lessive|On lave le linge avec.
marteau|Un outil pour taper sur les clous.
panneau|Il montre la route ou interdit de passer.
pinceau|On peint avec.
plateau|Un grand plat pour porter les assiettes.
sifflet|On souffle dedans pour faire tuut.
tonneau|Un grand baril en bois.
torchon|Un tissu pour essuyer la vaisselle.
velours|Un tissu tout doux.
peluche|Un doudou tout doux.
équerre|Une règle en forme de triangle.
caneton|Le petit du canard.
chamois|Une chèvre sauvage des montagnes.
belette|Un petit animal mince et rapide.
caribou|Un renne d'Amérique.
lombric|Un ver de terre.
grillon|Un insecte qui chante dans l'herbe la nuit.
luciole|Un insecte qui brille dans la nuit.
oreille|Elle sert à entendre.
cerveau|Il est dans la tête et sert à penser.
nombril|Le petit rond au milieu du ventre.
asperge|Un légume long, vert ou blanc.
brocoli|Un légume vert en forme de petit arbre.
potiron|Une grosse courge orange.
pruneau|Une prune séchée.
basilic|Une herbe qui sent bon, pour la tomate.
lasagne|Des couches de pâtes et de sauce au four.
écharpe|Elle tient chaud au cou en hiver.
étagère|Une planche au mur pour ranger.
lavande|Une fleur violette qui sent bon.
manchot|Un oiseau noir et blanc qui ne vole pas.
chariot|Un caddie pour les courses.
semaine|Sept jours de suite.
trophée|Une coupe pour le gagnant.
charade|Un jeu de devinette en plusieurs parties.
sablier|Il mesure le temps avec du sable qui coule.
parasol|Un grand parapluie contre le soleil, à la plage.
maillot|Le vêtement pour se baigner.
palmier|Un arbre des pays chauds avec de grandes feuilles.
blouson|Une veste chaude.
commode|Un meuble à tiroirs pour ranger les vêtements.
placard|Un rangement fermé par une porte.
ampoule|Elle éclaire quand on allume.
royaume|Le pays d'un roi.
matelot|Un marin du bateau.
colibri|Le plus petit oiseau, ses ailes battent très vite.
mésange|Un petit oiseau à tête bleue ou noire.
colombe|Un oiseau blanc, symbole de la paix.
sandale|Une chaussure ouverte pour l'été.
collant|Il couvre les jambes sous la jupe.
bermuda|Un short long.
portail|La grande porte du jardin.
ketchup|Une sauce rouge à la tomate.
terrier|La maison sous la terre du lapin.
nichoir|Une petite maison pour les oiseaux.
caresse|Un geste tout doux avec la main.
imagier|Un livre d'images pour les petits.
amusant|Qui fait rire ou plaire.
heureux|Content, plein de joie.
content|Heureux, plein de joie.
médecin|Le docteur qui soigne.
autruche|Un très grand oiseau qui court vite mais ne vole pas.
mammouth|Un éléphant poilu de la préhistoire.
nounours|Un ours en peluche.
pingouin|Un oiseau noir et blanc des pays froids.
pistache|Un petit fruit sec vert.
soucoupe|La petite assiette sous la tasse.
trottoir|Le chemin des piétons au bord de la rue.
chausson|Une chaussure douce pour la maison.
alphabet|Toutes les lettres de A à Z.
addition|Quand on ajoute des nombres.
dentiste|Le docteur des dents.
raquette|On tape la balle avec, au tennis.
biscotte|Une tranche de pain grillé et sec.
mascotte|Un personnage porte-bonheur d'une équipe.
aquarium|Un bassin en verre pour les poissons.
arrosoir|Il sert à donner de l'eau aux fleurs.
bergerie|La maison des moutons.
berceuse|Une chanson douce pour s'endormir.
brouette|Un chariot à une roue pour le jardin.
carrosse|Une voiture tirée par des chevaux, dans les contes.
cheminée|Le feu y crépite l'hiver.
cocotier|Le palmier qui donne les noix de coco.
couronne|Le roi la porte sur la tête.
myrtille|Une petite baie bleue.
nageoire|Elle aide le poisson à nager.
plongeon|Un saut dans l'eau, la tête la première.
pyramide|Un grand monument pointu d'Égypte.
quatorze|Le nombre après treize.
sorcière|Une magicienne des contes, avec un chapeau pointu.
triangle|Une forme à trois côtés.
violette|Une petite fleur mauve.
lentille|Une petite graine ronde qu'on cuisine.
cannelle|Une épice brune qui sent bon dans les gâteaux.
couscous|Des graines de semoule avec des légumes.
porcelet|Le petit du cochon.
blaireau|Un animal de la forêt avec des rayures sur la tête.
caméléon|Un lézard qui change de couleur.
suricate|Un petit animal du désert qui se tient debout pour guetter.
scarabée|Un insecte à carapace brillante.
danseuse|Une femme qui danse.
pianiste|Il joue du piano.
acrobate|Il fait des pirouettes au cirque.
jongleur|Il lance des balles en l'air sans les faire tomber.
dompteur|Il dresse les lions au cirque.
camarade|Un ami de classe.
gommette|Une petite étiquette colorée à coller.
caravane|Une petite maison sur roues.
passager|Une personne qui voyage dans un véhicule.
nénuphar|Une grande feuille ronde qui flotte sur la mare.
éventail|Il fait du vent quand on l'agite.
peuplier|Un grand arbre très droit.
tondeuse|Une machine pour couper l'herbe.
tabouret|Une petite chaise sans dossier.
sonnette|On appuie dessus pour dire qu'on est devant la porte.
saladier|Un grand bol pour la salade.
paupière|Elle ferme l'œil.
mâchoire|L'os qui tient les dents.
fossette|Un petit creux sur la joue quand on sourit.
surprise|Quelque chose d'inattendu qui étonne.
patience|Savoir attendre sans s'énerver.
aventure|Un voyage plein de surprises.
natation|Le sport où l'on nage.
escalade|Grimper sur un mur ou une montagne.
patinage|Glisser sur la glace avec des patins.
football|Un sport où l'on tape dans le ballon avec le pied.
champion|Celui qui gagne la course.
médaille|On la reçoit quand on gagne.
victoire|Quand on gagne.
épicerie|Un petit magasin où l'on achète à manger.
classeur|Un dossier à anneaux pour ranger les feuilles.
trombone|Un petit fil de fer qui tient les feuilles, ou un instrument.
boussole|Elle montre le nord.
barrière|Elle ferme le champ ou le jardin.
glissade|Quand on glisse sur la neige ou la glace.
esquimau|Une glace sur un bâton.
sucrerie|Un bonbon ou une douceur.
tablette|Une barre de chocolat ou un petit écran.
moutarde|Une sauce jaune qui pique.
raclette|Du fromage fondu sur des pommes de terre.
cavalier|Une personne qui monte à cheval.
chaudron|La grosse marmite de la sorcière.
grimoire|Le livre des formules magiques.
farfadet|Un petit lutin malicieux.
équipage|Toutes les personnes du bateau.
plongeur|Il nage sous l'eau avec une bouteille.
albatros|Un grand oiseau de mer aux très longues ailes.
roitelet|Un tout petit oiseau.
alouette|Un petit oiseau des champs qui chante en volant.
ceinture|Elle tient le pantalon.
fromager|Il fait ou vend le fromage.
horloger|Il répare les horloges et les montres.
couvreur|Il répare les toits.
aviateur|Il pilote un avion.
opticien|Il vend des lunettes.
barbecue|On y fait griller la viande dehors.
comptine|Une petite chanson pour les enfants.
généreux|Il aime partager.
gourmand|Il aime bien manger des bonnes choses.
moelleux|Tout doux et mou, comme un bon gâteau.
écriture|L'art de tracer les lettres.
crocodile|Un grand reptile aux dents pointues qui vit dans le fleuve.
dinosaure|Un animal géant qui vivait il y a très longtemps.
kangourou|Un animal d'Australie qui saute, avec une poche sur le ventre.
perroquet|Un oiseau coloré qui peut répéter des mots.
chimpanzé|Un singe très malin.
cochonnet|La petite boule de la pétanque.
libellule|Un insecte aux ailes fines qui vole au-dessus de l'eau.
moustique|Un petit insecte qui pique et fait bzz.
renardeau|Le petit du renard.
louveteau|Le petit du loup.
marcassin|Le petit du sanglier.
chevreuil|Un animal gracieux de la forêt, cousin du cerf.
paresseux|Un animal très lent qui dort accroché aux branches.
bouquetin|Une chèvre sauvage aux grandes cornes.
langouste|Un crustacé de la mer avec de longues antennes.
parapluie|On l'ouvre quand il pleut.
casquette|Un chapeau avec une visière.
chaussure|On la met au pied pour marcher dehors.
pantoufle|Une chaussure confortable pour la maison.
trompette|Un instrument doré dans lequel on souffle.
harmonica|Un petit instrument à souffler, avec des trous.
xylophone|Un instrument avec des lames de couleur que l'on frappe.
accordéon|Un instrument que l'on étire et que l'on serre.
princesse|La fille du roi et de la reine.
chevalier|Il porte une armure et monte à cheval.
capitaine|Le chef du bateau.
boulanger|Il fait le pain et les croissants.
cuisinier|Il prépare les repas au restaurant.
infirmier|Il soigne les malades avec le docteur.
jardinier|Il plante les fleurs et les légumes.
menuisier|Il travaille le bois pour faire des meubles.
fleuriste|Il vend des bouquets de fleurs.
chanteuse|Une femme qui chante.
maîtresse|Elle fait la classe aux élèves.
directeur|Le chef de l'école.
téléphone|On l'utilise pour appeler quelqu'un.
coloriage|Un dessin à remplir avec des couleurs.
ambulance|Elle emmène les malades à l'hôpital.
autoroute|Une grande route pour aller vite.
parachute|Une grande toile qui freine la chute.
tournesol|Une grande fleur jaune qui suit le soleil.
jonquille|Une fleur jaune du printemps.
primevère|Une petite fleur jaune qui annonce le beau temps.
printemps|La saison des fleurs.
télescope|Une longue lunette pour regarder les étoiles.
satellite|Il tourne autour de la Terre.
serviette|On s'essuie avec après le bain.
noisetier|L'arbuste qui donne les noisettes.
clairière|Un endroit sans arbres au milieu de la forêt.
porcherie|La maison des cochons.
baignoire|On y prend son bain.
shampoing|Il lave les cheveux.
ascenseur|Il monte et descend les étages.
casserole|On y fait chauffer la soupe.
cafetière|Elle sert à faire le café.
confiture|On l'étale sur la tartine.
croissant|Une viennoiserie en forme de lune.
madeleine|Un petit gâteau en forme de coquillage.
clafoutis|Un gâteau aux cerises.
grenadine|Un sirop rouge.
chantilly|Une crème fouettée légère.
cacahuète|Une petite graine grillée, dans sa coque.
spaghetti|Des pâtes longues et fines.
camembert|Un fromage rond dans une boîte en bois.
hamburger|Un pain rond avec un steak.
concombre|Un légume vert, long et frais.
aubergine|Un légume violet.
artichaut|Un légume vert aux feuilles serrées.
betterave|Un légume rouge foncé.
cornichon|Un petit concombre au vinaigre.
courgette|Un légume vert et long, cousin du concombre.
châtaigne|Un fruit brun dans une bogue qui pique, à griller en automne.
mandarine|Un petit agrume orange facile à éplucher.
framboise|Un petit fruit rouge et doux.
groseille|Une petite baie rouge en grappe.
mirabelle|Une petite prune jaune.
friandise|Une petite douceur, comme un bonbon.
moustache|Les poils au-dessus de la bouche.
politesse|Dire bonjour, merci et s'il te plaît.
tendresse|Beaucoup de douceur et d'amour.
curiosité|L'envie de tout découvrir.
promenade|Une balade à pied.
spectacle|Des artistes qui jouent sur scène pour le public.
batterie|Un instrument fait de tambours et de cymbales.
saxophone|Un instrument à vent doré et recourbé.
tambourin|Un petit tambour avec des grelots.
orchestre|Un grand groupe de musiciens.
partition|La feuille où sont écrites les notes.
ballerine|Une danseuse classique.
aquarelle|Une peinture à l'eau.
guirlande|Une décoration qui pend au sapin de Noël.
devinette|Une petite énigme à trouver.
badminton|Un sport avec un volant et des raquettes.
rossignol|Un petit oiseau qui chante très bien.
étourneau|Un oiseau noir tacheté qui vole en grands groupes.
orangeade|Une boisson à l'orange.
pharmacie|Le magasin des médicaments.
chauffeur|Il conduit le bus ou le camion.
marchande|Une femme qui vend au marché.
randonnée|Une longue promenade à pied.
enveloppe|On met la lettre dedans.
débardeur|Un tee-shirt sans manches.
étincelle|Une toute petite flamme qui saute.
bijoutier|Il vend des bagues et des colliers.
serrurier|Il répare les serrures et ouvre les portes.
ingénieur|Il invente et construit des machines.
inventeur|Il crée des choses nouvelles.
chercheur|Il fait des découvertes.
astronome|Il observe les étoiles.
sauveteur|Il aide les gens en danger.
mangeoire|Là où les animaux viennent manger.
abreuvoir|Là où les animaux viennent boire.
croquette|Un petit biscuit pour chien ou chat.
aboiement|Le cri du chien.
courageux|Il n'a pas peur.
délicieux|Très bon à manger.
jardinage|Planter, arroser et soigner les plantes.
coccinelle|Une petite bête rouge à points noirs.
hirondelle|Un oiseau qui annonce le printemps.
sauterelle|Un insecte vert qui saute très loin.
dromadaire|Un animal du désert avec une seule bosse.
rhinocéros|Un gros animal avec une corne sur le nez.
grenouille|Elle saute et fait coa-coa près de la mare.
hippocampe|Un petit poisson en forme de cheval.
salamandre|Un petit animal jaune et noir qui aime l'humidité.
balançoire|Elle va et vient dans le jardin, accrochée à des cordes.
magicienne|Une femme qui fait des tours de magie.
astronaute|Il voyage dans l'espace dans une fusée.
pharmacien|Il vend les médicaments.
mécanicien|Il répare les voitures.
architecte|Il dessine les plans des maisons.
récréation|Le moment pour jouer dans la cour.
ordinateur|Une machine avec un écran et un clavier.
télévision|On y regarde des émissions et des dessins animés.
calendrier|Il montre les jours et les mois de l'année.
bicyclette|Un vélo à deux roues et des pédales.
locomotive|Elle tire les wagons du train.
pelleteuse|Une machine qui creuse la terre.
marguerite|Une fleur blanche au cœur jaune.
coquelicot|Une fleur rouge des champs.
champignon|Il pousse dans la forêt après la pluie.
brouillard|Un nuage tout bas qui empêche de voir loin.
cosmonaute|Il flotte dans la fusée, en route vers les étoiles.
coquillage|On le ramasse sur la plage, il vient de la mer.
marronnier|Le grand arbre qui donne des marrons.
citronnier|L'arbre qui donne des citrons.
poulailler|La maison des poules.
cuisinière|Le four et les plaques pour cuire les repas.
aspirateur|Il aspire la poussière.
lampadaire|Une grande lampe dans la rue ou le salon.
couverture|On la met sur le lit pour avoir chaud.
chaussette|On la met au pied avant la chaussure.
dentifrice|La pâte pour se brosser les dents.
savonnette|Un petit savon.
fourchette|On pique les aliments avec.
bouilloire|Elle fait chauffer l'eau.
tartelette|Une petite tarte.
citronnade|Une boisson au citron.
clémentine|Un petit agrume sans pépins, en hiver.
ciboulette|Une herbe fine pour la cuisine.
chatouille|Ce qui fait rire quand on touche sous les bras.
clarinette|Un instrument à vent noir.
trampoline|Une toile sur laquelle on rebondit.
tourniquet|Un manège qu'on fait tourner au parc.
équitation|Le sport où l'on monte à cheval.
citrouille|Une grosse courge orange pour Halloween.
labyrinthe|Un chemin plein de détours où l'on se perd.
aventurier|Il part découvrir des pays lointains.
abricotier|L'arbre qui donne les abricots.
pâtisserie|Une boutique de gâteaux.
restaurant|On y mange des plats préparés par le cuisinier.
conducteur|Il conduit le train.
infirmière|Elle soigne les malades.
boulangère|Elle vend le pain.
jardinière|Une grande caisse pour planter des fleurs au balcon.
musicienne|Une femme qui joue de la musique.
directrice|La cheffe de l'école.
maternelle|La première école des petits.
professeur|Il fait la classe aux grands.
calculette|Une petite machine pour compter.
mappemonde|Une carte du monde entier.
mayonnaise|Une sauce jaune aux œufs.
choucroute|Du chou avec des saucisses.
forteresse|Un château très solide.
gouvernail|La barre qui dirige le bateau.
espadrille|Une chaussure en toile pour l'été.
nourriture|Tout ce que l'on mange.
confiserie|Le magasin des bonbons.
invitation|Une carte pour dire : viens à ma fête.
décoration|Ce qui rend la maison jolie pour la fête.
apiculteur|Il s'occupe des abeilles et du miel.
couturière|Elle coud des vêtements.
cordonnier|Il répare les chaussures.
secouriste|Il aide les gens qui ont un petit accident.
camionneur|Il conduit un gros camion.
chrysalide|La petite maison où la chenille devient papillon.
taupinière|Un petit tas de terre fait par la taupe.
miaulement|Le cri du chat.
gazouillis|Le chant léger des oiseaux.
abécédaire|Un livre pour apprendre les lettres.
personnage|Un héros d'une histoire.
magnifique|Très très beau.
formidable|Super, génial !
tranquille|Calme, sans bruit.
silencieux|Qui ne fait pas de bruit.
soif|L'envie de boire.
faim|L'envie de manger.
polo|Un tee-shirt avec un petit col.
gnou|Une grosse antilope d'Afrique à barbe.
amie|Une copine.
ibis|Un oiseau à long bec courbé.
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

// Normalisation : minuscules sans accents, ligatures œ -> oe et æ -> ae (les mots à trait
// d'union ou apostrophe sont ensuite écartés par le filtre /^[a-z]+$/).
const clean = (s) => s.toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae').normalize('NFD').replace(/[̀-ͯ]/g, '');
export const LENGTHS = [4, 5, 6, 7, 8, 9, 10];

const DEFS = {};
export const SOLUTIONS = Object.fromEntries(LENGTHS.map((n) => [n, []]));
for (const line of SOLUTIONS_TXT.split('\n')) {
  const t = line.trim();
  if (!t) continue;
  const i = t.indexOf('|');
  const w = clean(t.slice(0, i));
  if (DEFS[w] || !/^[a-z]+$/.test(w) || !SOLUTIONS[w.length]) continue;
  DEFS[w] = t.slice(i + 1).trim();
  SOLUTIONS[w.length].push(w);
}
for (const n of LENGTHS) SOLUTIONS[n].sort();

const EXTRA_WORDS = EXTRA_TXT.split(/\s+/).map(clean).filter((w) => /^[a-z]+$/.test(w) && w.length >= 4 && w.length <= 10);

const DICO_WORDS = DICO.split(/\s+/).filter(Boolean);
export const ACCEPTED = new Set([...Object.keys(DEFS), ...EXTRA_WORDS, ...DICO_WORDS]);

// Lignes brutes de SOLUTIONS_TXT (pour les tests : format, doublons, mots écartés par le filtre).
export function solutionEntries() {
  return SOLUTIONS_TXT.split('\n').map((l) => l.trim()).filter(Boolean).map((t) => {
    const i = t.indexOf('|');
    return { src: t, word: i < 0 ? '' : clean(t.slice(0, i)), def: i < 0 ? '' : t.slice(i + 1).trim() };
  });
}

export function definition(word) { return DEFS[word] || ''; }
export function isAccepted(word) { return ACCEPTED.has(word); }
export function acceptedCount(len) { let n = 0; for (const w of ACCEPTED) if (w.length === len) n++; return n; }
export { clean };
