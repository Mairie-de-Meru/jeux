// Écrans DOM : accueil, réglages, HUD, fin.
import { PALIERS, nomParDefaut } from './regles.js';
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
export function setIcones(urls) { ICONES = urls; if (REG) majSieges(); }

// ---- réglages : une ligne par couleur ----
const TYPES = [['humain', '🙂 Humain'], ['robot', '🤖 Robot'], ['absent', '— Absent']];
const COULEUR_NOM = ['rouge', 'bleu', 'jaune', 'vert'];
let REG = null;
function validation() {
  const pres = REG.joueurs.filter((s) => s.type !== 'absent').length;
  const hum = REG.joueurs.filter((s) => s.type === 'humain').length;
  const msg = pres < 2 ? 'Il faut au moins 2 joueurs.' : hum < 1 ? 'Il faut au moins 1 humain.' : '';
  $('msgJoueurs').textContent = msg;
  $('btnCommencer').disabled = !!msg;
}
function majSieges() {
  const zone = $('sieges');
  zone.textContent = '';
  REG.joueurs.forEach((s, c) => {
    const row = document.createElement('div');
    row.className = 'siege';
    const tete = document.createElement('div');
    tete.className = 'siegeTete';
    const ic = document.createElement('span');
    ic.className = 'pastille';
    pastille(ic, c, s.type === 'robot');
    row.style.borderColor = css(COL[c]);
    row.style.background = PALES[c];
    row.classList.toggle('absent', s.type === 'absent');
    const input = document.createElement('input');
    input.type = 'text'; input.maxLength = 12; input.value = s.nom || '';
    input.setAttribute('aria-label', `Prénom, cheval ${COULEUR_NOM[c]}`);
    input.disabled = s.type === 'absent';
    input.style.borderColor = css(COL[c]);
    input.addEventListener('input', () => { s.nom = input.value; });
    tete.append(ic, input);
    const choix = document.createElement('div');
    choix.className = 'choix';
    TYPES.forEach(([v, lib]) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'btn'; b.textContent = lib;
      b.dataset.type = v;
      b.setAttribute('aria-pressed', String(s.type === v));
      b.addEventListener('click', () => {
        const ancien = s.type;
        if (v === ancien) return;
        const nom = (s.nom || '').trim();
        if (v !== 'absent' && (!nom || nom === nomParDefaut(c, ancien))) s.nom = nomParDefaut(c, v);
        s.type = v;
        majSieges();
      });
      choix.appendChild(b);
    });
    row.append(tete, choix);
    zone.appendChild(row);
  });
  validation();
}
function pastille(el, j, robot = false) {
  el.classList.toggle('robot', !!robot);
  el.style.backgroundColor = css(COL[j]);
  el.classList.toggle('icone', !!ICONES);
  el.style.backgroundImage = ICONES ? `url("${ICONES[j]}")` : '';
}

const PALES = ['#ffe0e0', '#dcebff', '#fff7c2', '#dcf3dd'];
const nomAffiche = (jo) => (jo.nom === 'Toi' ? 'toi' : jo.nom);
export function setJoueur(jo, j) {
  pastille($('pastille'), j, !jo.humain);
  const q = $('qui');
  q.style.background = PALES[j];
  q.style.borderColor = css(COL[j]);
  $('quiNom').textContent = jo.humain ? `À ${nomAffiche(jo)} de jouer` : `${libelle(jo.nom)} joue`;
}
export function setTexteQui(t, jo) { $('quiNom').textContent = jo && jo.nom !== 'Toi' ? `${jo.nom}, ${t.toLowerCase()}` : t; }
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
  const hp = etat.classement.find((j) => joueurs[j].humain);
  const rang = etat.classement.indexOf(hp) + 1;
  const seul = joueurs.filter((jo) => jo.humain).length === 1;
  $('finTitre').textContent = seul && joueurs[hp].nom === 'Toi'
    ? (rang === 1 ? 'Bravo, tu as gagné !' : rang === 2 ? 'Bien joué, deuxième !' : 'Bien joué, tu as couru !')
    : `Bravo ${joueurs[hp].nom} !`;
  $('etoiles').textContent = '⭐'.repeat(rang === 1 ? 3 : rang === 2 ? 2 : 1);
  const ol = $('classement');
  ol.textContent = '';
  const medailles = ['🥇', '🥈', '🥉', '🏅'];
  etat.classement.forEach((j, i) => {
    const li = document.createElement('li');
    if (joueurs[j].humain) li.className = 'moi';
    const m = document.createElement('span'); m.className = 'medaille'; m.textContent = medailles[i] || '🏅';
    const p = document.createElement('span'); p.className = 'pastille'; pastille(p, j, !joueurs[j].humain);
    const n = document.createElement('span'); n.textContent = libelle(joueurs[j].nom);
    li.append(m, p, n);
    ol.appendChild(li);
  });
  $('btnSuivant').hidden = etat.palier >= 3;
  ecran('fin');
  confettis();
}

export function initUI(h, reglages) {
  REG = reglages;
  majSieges();
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
    majReglages() { majSieges(); majPalier(reglages.palier); majDiff(reglages.difficulte); },
  };
}

export function fondAccueil(url) {
  $('accueil').style.backgroundImage = `linear-gradient(rgba(36,52,71,.15), rgba(36,52,71,.35)), url("${url}")`;
}
export const descriptionPalier = (n) => PALIERS[n].nom;
