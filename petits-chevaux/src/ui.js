// Écrans DOM : accueil, réglages, HUD, fin.
import { PALIERS } from './regles.js';
import { COL } from './scene.js';

const $ = (id) => document.getElementById(id);
const ECRANS = ['accueil', 'reglages', 'fin'];
const css = (n) => '#' + n.toString(16).padStart(6, '0');

// Sans icône chargée, repli sur un emoji cheval devant le nom.
const libelle = (nom) => (ICONES ? nom : `🐴 ${nom}`);

export function ecran(nom) {
  ECRANS.forEach((e) => { $(e).hidden = e !== nom; });
  $('hud').hidden = nom !== null;
}

let timerToast = null;
export function toast(texte, ms = 2200) {
  const t = $('toast');
  t.textContent = texte;
  t.classList.add('vu');
  clearTimeout(timerToast);
  timerToast = setTimeout(() => t.classList.remove('vu'), ms);
}

let ICONES = null;
export function setIcones(urls) { ICONES = urls; majBoutonsRobots(); }
function majBoutonsRobots() {
  document.querySelectorAll('#choixRobots button').forEach((b) => {
    const n = +b.dataset.v;
    b.textContent = '';
    if (!ICONES) { b.textContent = '🐴'.repeat(n); return; }
    for (let i = 1; i <= n; i++) {
      const im = document.createElement('img');
      im.src = ICONES[i]; im.alt = ''; im.className = 'mini';
      b.appendChild(im);
    }
  });
}
function pastille(el, j) {
  el.style.backgroundColor = css(COL[j]);
  el.classList.toggle('icone', !!ICONES);
  el.style.backgroundImage = ICONES ? `url("${ICONES[j]}")` : '';
}

export function setJoueur(jo, j) {
  pastille($('pastille'), j);
  $('quiNom').textContent = jo.humain ? 'À toi !' : libelle(jo.nom);
}
export function setTexteQui(t) { $('quiNom').textContent = t; }
export function setLancer(actif) { $('btnLancer').disabled = !actif; }

function groupe(id, valeur, auChoix) {
  const btns = [...$(id).querySelectorAll('button')];
  const maj = (v) => btns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === String(v))));
  maj(valeur);
  btns.forEach((b) => b.addEventListener('click', () => { maj(b.dataset.v); auChoix(b.dataset.v); }));
  return maj;
}

export function confettis() {
  const zone = $('confettis');
  for (let i = 0; i < 60; i++) {
    const d = document.createElement('div');
    d.className = 'confetti';
    d.style.left = Math.random() * 100 + '%';
    d.style.background = css(COL[i % 4]);
    d.style.animationDuration = 2.2 + Math.random() * 2.2 + 's';
    d.style.animationDelay = Math.random() * 0.8 + 's';
    zone.appendChild(d);
  }
  setTimeout(() => { zone.textContent = ''; }, 6000);
}

export function afficherFin(etat, joueurs) {
  const rang = etat.classement.indexOf(0) + 1;
  $('finTitre').textContent = rang === 1 ? 'Bravo, tu as gagné !' : rang === 2 ? 'Bien joué, deuxième !' : 'Bien joué, tu as couru !';
  $('etoiles').textContent = '⭐'.repeat(rang === 1 ? 3 : rang === 2 ? 2 : 1);
  const ol = $('classement');
  ol.textContent = '';
  const medailles = ['🥇', '🥈', '🥉', '🏅'];
  etat.classement.forEach((j, i) => {
    const li = document.createElement('li');
    if (j === 0) li.className = 'moi';
    const m = document.createElement('span'); m.className = 'medaille'; m.textContent = medailles[i] || '🏅';
    const p = document.createElement('span'); p.className = 'pastille'; pastille(p, j);
    const n = document.createElement('span'); n.textContent = libelle(joueurs[j].nom);
    li.append(m, p, n);
    ol.appendChild(li);
  });
  $('btnSuivant').hidden = etat.palier >= 3;
  ecran('fin');
  confettis();
}

export function initUI(h, reglages) {
  majBoutonsRobots();
  const majRobots = groupe('choixRobots', reglages.nbRobots, (v) => { reglages.nbRobots = +v; });
  const majPalier = groupe('choixPalier', reglages.palier, (v) => { reglages.palier = +v; });
  const majDiff = groupe('choixDiff', reglages.difficulte, (v) => { reglages.difficulte = v; });
  $('btnJouer').addEventListener('click', () => { h.clic(); ecran('reglages'); });
  $('btnRetour').addEventListener('click', () => { h.clic(); ecran('accueil'); });
  $('btnCommencer').addEventListener('click', () => h.commencer());
  $('btnLancer').addEventListener('click', () => h.lancer());
  $('btnConsigne').addEventListener('click', () => h.consigne());
  $('btnMaison').addEventListener('click', () => h.accueil());
  $('btnAccueil').addEventListener('click', () => h.accueil());
  $('btnRejouer').addEventListener('click', () => h.commencer());
  $('btnSuivant').addEventListener('click', () => h.suivant());
  const son = $('btnSon');
  son.addEventListener('click', () => { const v = son.textContent === '🔇'; son.textContent = v ? '🔊' : '🔇'; h.son(v); });
  return {
    majReglages() { majRobots(reglages.nbRobots); majPalier(reglages.palier); majDiff(reglages.difficulte); },
  };
}

export function fondAccueil(url) {
  $('accueil').style.backgroundImage = `linear-gradient(rgba(36,52,71,.15), rgba(36,52,71,.35)), url("${url}")`;
}
export const descriptionPalier = (n) => PALIERS[n].nom;
