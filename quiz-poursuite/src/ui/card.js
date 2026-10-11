import { CATEGORIES, COULEURS_PARTS } from '../logic/categories.js';
import { speak } from '../speech.js';

const el = () => document.getElementById('card');

export function questionText(q) {
  return `${q.q} 1 : ${q.choix[0].t}. 2 : ${q.choix[1].t}. 3 : ${q.choix[2].t}.`;
}

// Affiche la carte question. onAnswer(i) est appelé au tap sur un choix.
export function showQuestion(q, catIndex, onAnswer, { bot = false } = {}) {
  const cat = CATEGORIES[catIndex];
  const c = el();
  c.innerHTML = '';
  c.className = 'card';
  c.style.setProperty('--cat', cat.couleur);
  const band = document.createElement('div');
  band.className = 'band';
  band.innerHTML = `<span class="band-ico"></span><span class="band-nom"></span>`;
  band.querySelector('.band-ico').textContent = cat.icone;
  band.querySelector('.band-nom').textContent = cat.nom;
  const replay = document.createElement('button');
  replay.className = 'replay';
  replay.type = 'button';
  replay.textContent = '🔊';
  replay.setAttribute('aria-label', 'Relire');
  replay.addEventListener('pointerdown', (e) => { e.preventDefault(); speak(questionText(q)); });
  band.appendChild(replay);
  const qt = document.createElement('p');
  qt.className = 'question';
  qt.textContent = q.q;
  const list = document.createElement('div');
  list.className = 'choices';
  q.choix.forEach((ch, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'choice';
    b.dataset.i = String(i);
    b.innerHTML = '<span class="ce"></span><span class="ct"></span>';
    b.querySelector('.ce').textContent = ch.e;
    b.querySelector('.ct').textContent = ch.t;
    if (bot) b.disabled = true;
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); if (!bot) onAnswer(i); });
    list.appendChild(b);
  });
  const fb = document.createElement('div');
  fb.className = 'feedback';
  c.append(band, qt, list, fb);
  c.hidden = false;
  if (!bot) speak(questionText(q));
}

// Surligne le choix d'un robot
export function highlightChoice(i) {
  const b = el().querySelector(`.choice[data-i="${i}"]`);
  if (b) b.classList.add('pick');
}

// Retour après réponse. onContinue() au tap sur « Continuer ».
export function showFeedback(q, chosen, result, onContinue) {
  const c = el();
  c.classList.add('answered');
  c.querySelectorAll('.choice').forEach((b) => {
    const i = Number(b.dataset.i);
    b.disabled = true;
    if (i === result.bonne) b.classList.add('good');
    else if (i === chosen) b.classList.add('soft');
    else b.classList.add('dim');
  });
  const fb = c.querySelector('.feedback');
  fb.innerHTML = '';
  const title = document.createElement('p');
  title.className = 'fb-title ' + (result.correct ? 'ok' : 'try');
  title.textContent = result.correct ? 'Bravo !' : 'Presque !';
  fb.appendChild(title);
  let voix = result.correct ? 'Bravo !' : 'Presque !';
  if (result.partGagnee !== null && result.partGagnee !== undefined) {
    const p = document.createElement('p');
    p.className = 'fb-part';
    p.textContent = `🥧 Tu gagnes la part ${COULEURS_PARTS[result.partGagnee]} !`;
    fb.appendChild(p);
    voix += ` Tu gagnes la part ${COULEURS_PARTS[result.partGagnee]} !`;
  }
  if (result.correct && (result.partGagnee === null || result.partGagnee === undefined)) {
    const hint = result.caseType === 'quartier'
      ? '⭐ +1 étoile ! Tu as déjà cette part.'
      : '⭐ +1 étoile ! Les parts se gagnent sur les grandes cases à icône.';
    const h = document.createElement('p');
    h.className = 'fb-hint';
    h.textContent = hint;
    fb.appendChild(h);
    voix += ' ' + hint.replace('⭐ ', '');
  }
  if (!result.correct) {
    voix += ` La bonne réponse : ${q.choix[result.bonne].t}.`;
  }
  const ex = document.createElement('p');
  ex.className = 'fb-expl';
  ex.textContent = result.explication;
  fb.appendChild(ex);
  voix += ' ' + result.explication;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'big-btn go';
  btn.textContent = 'Continuer ➜';
  btn.addEventListener('pointerdown', (e) => { e.preventDefault(); onContinue(); });
  fb.appendChild(btn);
  speak(voix);
}

export function hideCard() {
  const c = el();
  c.hidden = true;
  c.innerHTML = '';
}
