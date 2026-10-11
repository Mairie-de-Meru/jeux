// Contrôleur d'une partie : affichage, retours visuels/sonores, avance automatique.
import { $, el } from './dom.js';
import { creerPartie, questionCourante, toucherMot, choisir, etoiles } from '../logic/partie.mjs';
import { rendrePhrase } from './phrase.js';
import { rendreChoix } from './choix.js';
import { consigne, texteLu } from './textes.js';
import { parler, taire } from './voix.js';
import * as son from './son.js';
import { chargerImg } from './images.js';

const DELAI_AVANCE = 1400;

export function creerPartieUI({ scene, onFin }) {
  let p = null;
  let enquete = '';
  let attente = null; // { timer, action }
  let derniere = null; // question qui vient d'être réussie (phrase résolue)

  const bulle = (texte) => {
    $('bulle').classList.toggle('cache', !texte);
    $('bulle-texte').textContent = texte || '';
  };

  chargerImg('detective.png').then((img) => {
    if (!img) return;
    const n = $('bulle-detective');
    n.src = img.src;
    n.classList.remove('cache');
    $('bulle-emoji').classList.add('cache');
  });

  function loupes() {
    const z = $('progression');
    z.replaceChildren();
    const n = p.questions.length;
    for (let i = 0; i < n; i++) {
      const cls = i < p.index ? 'faite' : i === p.index ? 'courante' : '';
      z.append(el('span', { class: cls, texte: '🔍' }));
    }
  }

  function lireQuestion() {
    const q = questionCourante(p);
    if (!q) return;
    parler(`${consigne(q, p.phase)} ${texteLu(q.mots)}`);
  }

  function afficher(lire = true) {
    const q = questionCourante(p);
    if (!q) return;
    loupes();
    $('consigne').textContent = consigne(q, p.phase);
    rendrePhrase($('phrase'), q, p.phase, { onMot: toucher });
    if (p.phase === 'trouver') $('choix').replaceChildren();
    else rendreChoix($('choix'), q, p.retires, choix);
    bulle('');
    if (lire) lireQuestion();
  }

  function toucher(i) {
    if (attente) return;
    const r = toucherMot(p, i);
    if (r.ignore) return;
    if (r.ok) {
      son.juste();
      scene.sauter();
      afficher();
    } else {
      son.faux();
      scene.gratter();
      bulle(r.message);
      parler(r.message);
    }
  }

  function planifier(action) {
    const run = () => {
      if (!attente) return;
      clearTimeout(attente.timer);
      attente = null;
      action();
    };
    attente = { timer: setTimeout(run, DELAI_AVANCE), run };
  }

  function choix(valeur) {
    if (attente) return;
    const avant = questionCourante(p);
    const r = choisir(p, valeur);
    if (r.ignore) return;
    if (r.ok) {
      derniere = avant;
      son.juste();
      scene.sauter();
      rendrePhrase($('phrase'), avant, 'resolu');
      $('choix').querySelectorAll('button').forEach((b) => { b.disabled = true; });
      bulle(r.explication);
      parler(r.explication);
      planifier(() => {
        if (r.finie) terminer();
        else afficher();
      });
    } else {
      son.faux();
      scene.gratter();
      bulle(r.explication);
      parler(r.explication);
      rendreChoix($('choix'), avant, p.retires, choix);
    }
  }

  function terminer() {
    const e = etoiles(p.erreurs);
    onFin({ enquete, palier: p.palier, erreurs: p.erreurs, etoiles: e });
  }

  function demarrer(enq, questions, palier, rng) {
    annuler();
    enquete = enq;
    p = creerPartie(questions, { palier, rng });
    $('consigne').textContent = '';
    afficher();
  }

  function annuler() {
    if (attente) clearTimeout(attente.timer);
    attente = null;
    taire();
  }

  // Termine immédiatement l'avance automatique en attente (utile au crochet de test).
  function flush() {
    if (attente) attente.run();
  }

  return {
    demarrer,
    annuler,
    flush,
    relire: lireQuestion,
    partie: () => p,
    derniere: () => derniere,
    // Pour le crochet de débogage.
    repondreJuste() {
      flush();
      const q = questionCourante(p);
      if (!q) return;
      if (p.phase === 'trouver') toucher(q.faute);
      if (p.phase !== 'trouver') {
        const encore = questionCourante(p);
        if (encore) choix(encore.bonne);
      }
    },
    repondreFaux() {
      flush();
      const q = questionCourante(p);
      if (!q) return;
      if (p.phase === 'trouver') {
        const i = q.mots.findIndex((m, k) => k !== q.faute && !['.', ',', '?', '!'].includes(m));
        toucher(i);
      } else {
        const v = q.choix.find((c) => c !== q.bonne && !p.retires.includes(c));
        if (v !== undefined) choix(v);
      }
    },
  };
}
