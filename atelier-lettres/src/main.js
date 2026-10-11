// Démarrage : scène, écrans (menu -> atelier -> récompense), progression, crochet de débogage.
import { createStage } from './scene.js';
import { loadAssets } from './assets.js';
import { unlock, sfx } from './audio.js';
import { speech } from './speech.js';
import { confetti } from './fx.js';
import { ui, el, btn, starsText } from './ui.js';
import { createProgress, recordRound, getStars, isUnlocked, starsFor } from './logic/progress.js';
import { makeTile, TILE_COLORS } from './tiles.js';
import { squash, wait } from './fx.js';
import { createTracer } from './ateliers/tracer.js';
import { createPaires } from './ateliers/paires.js';
import { createPhrase } from './ateliers/phrase.js';
import { installDebug } from './debug.js';

const KEY = 'atelier-lettres-progression';
let progress;
try { progress = createProgress(JSON.parse(localStorage.getItem(KEY))); } catch (e) { progress = createProgress(null); }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(progress)); } catch (e) { /* ignore */ } };

const stage = createStage(document.getElementById('gl'));
const assets = await loadAssets();

let screen = 'menu';
let current = null;
let currentName = null;
let currentLevel = 0;
let offDecor = null;

const ctx = { stage, assets, ui, finish: (atelier, level, hints) => reward(atelier, level, hints) };
const ateliers = {
  tracer: createTracer(ctx),
  paires: createPaires(ctx),
  phrase: createPhrase(ctx),
};

const META = {
  tracer: { emoji: '✏️', title: 'Tracer', icon: 'icon_tracer', levels: ['I L T', 'A B C', 'a b c', 'Attachées'], next: 3 },
  paires: { emoji: '🔤', title: 'Paires', icon: 'icon_paires', levels: ['Paires', 'Tri', 'Intrus'], next: 3 },
  phrase: { emoji: '📝', title: 'Phrases', icon: 'icon_phrase', levels: ['3 mots', '4 mots', '5 mots'], next: 3 },
};

function stopCurrent() {
  if (current) current.dispose();
  current = null;
  if (offDecor) offDecor();
  offDecor = null;
  stage.clearRoot();
  stage.root.position.set(0, 0, 0);
  ui.setBar([]);
  ui.clearDots();
  ui.setEmoji('');
  ui.hideHint();
}

// Décor : rangée de tuiles tout en haut de l'écran (position et taille en pixels, donc identique en paysage et en portrait).
const DECOR_TOP = 14;
const DECOR_PX = (w) => Math.max(40, Math.min(72, w / 8));
function decor() {
  const tiles = [];
  'ABCabc'.split('').forEach((ch, k) => {
    const t = makeTile({ kind: 'letter', letter: ch.toLowerCase(), style: ch === ch.toUpperCase() ? 'caps' : 'script', color: TILE_COLORS[k % TILE_COLORS.length] });
    stage.root.add(t);
    tiles.push(t);
  });
  const layout = () => {
    const cam = stage.camera;
    const dist = cam.position.z;
    const half = dist * Math.tan((cam.fov * Math.PI) / 360);
    const ppw = innerHeight / (2 * half); // pixels par unité de monde à z = 0
    const px = DECOR_PX(innerWidth);
    const sc = px / (1.6 * ppw);
    const yTop = cam.position.y + half - ((DECOR_TOP + px / 2) / innerHeight) * 2 * half;
    tiles.forEach((t, k) => {
      t.userData.baseY = yTop;
      t.position.x = (k - 2.5) * (px * 1.15) / ppw;
      t.scale.setScalar(sc);
    });
  };
  stage.setContent(13, 9);
  layout();
  const offR = stage.onResize(layout);
  const offF = stage.onFrame((dt, t) => {
    tiles.forEach((tile, k) => {
      tile.position.y = tile.userData.baseY + Math.sin(t * 1.6 + k) * 0.1;
      tile.rotation.z = Math.sin(t * 1.1 + k * 1.3) * 0.12;
    });
  });
  offDecor = () => { offR(); offF(); };
}

// Image avec repli (emoji ou titre texte) si absente ou en échec.
function imgOr(key, cls, fallback) {
  if (!assets.has(key)) return fallback();
  const img = el('img', cls);
  img.alt = '';
  img.src = assets.url(key);
  img.draggable = false;
  img.addEventListener('error', () => img.replaceWith(fallback()));
  return img;
}

function menu() {
  stopCurrent();
  screen = 'menu';
  current = null;
  ui.showTop(false);
  decor();
  const col = el('div', 'col');
  // L'image title contient un faux mot généré (« LOBEL ») : titre texte seul.
  col.append(el('h1', '', 'Atelier des Lettres'));
  const row = el('div', 'row');
  for (const [name, meta] of Object.entries(META)) {
    const card = el('div', 'card');
    card.append(imgOr(meta.icon, 'icon-img', () => el('div', 'icon-emoji', meta.emoji)));
    card.append(el('h2', '', meta.title));
    const lv = el('div', 'levels');
    meta.levels.forEach((label, i) => {
      const lvl = i + 1;
      const unlocked = isUnlocked(progress, name, lvl === 4 ? 3 : lvl);
      const b = btn(unlocked ? label : `🔒 ${label}`, () => unlocked && play(name, lvl), unlocked ? 'lvl' : 'lvl off');
      b.append(el('span', 'stars', starsText(getStars(progress, name, lvl))));
      lv.append(b);
    });
    card.append(lv);
    row.append(card);
  }
  col.append(row);
  col.append(btn(speech.enabled ? '🔊 Voix' : '🔇 Voix', () => { speech.set(!speech.enabled); ui.updateSpeak(); menu(); }));
  ui.screen(col);
  document.getElementById('screen').classList.add('clear');
  ui.updateSpeak();
}

async function play(name, level, index = 0, seed) {
  stopCurrent();
  screen = 'play';
  currentName = name;
  currentLevel = level;
  current = ateliers[name];
  ui.screen(null);
  document.getElementById('screen').classList.remove('clear');
  ui.showTop(true);
  await current.start(level, { index, ...(seed != null ? { seed } : {}) });
}

function reward(name, level, hints) {
  const stars = starsFor(hints);
  recordRound(progress, name, level, stars);
  save();
  screen = 'reward';
  sfx.fanfare();
  confetti(180);
  const col = el('div', 'col');
  col.append(el('h1', '', 'Bravo !'));
  col.append(el('div', 'big-stars', starsText(stars)));
  speech.say('Bravo !');
  const row = el('div', 'row');
  row.append(btn('🔁 Rejouer', () => play(name, level)));
  if (level < META[name].next && isUnlocked(progress, name, level + 1)) row.append(btn('➡️ Suivant', () => play(name, level + 1), 'primary'));
  row.append(btn('🏠 Accueil', menu, 'sun'));
  col.append(row);
  ui.screen(col);
}

document.getElementById('btn-home').addEventListener('click', () => { sfx.click(); menu(); });
document.getElementById('btn-speak').addEventListener('click', () => { speech.set(!speech.enabled); ui.updateSpeak(); sfx.click(); });
for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, unlock, { once: true });

installDebug({
  state: () => ({ screen, name: currentName, level: currentLevel, progress, ...(current && screen === 'play' ? current.state() : {}) }),
  goto: (name, level, index, seed) => (name === 'menu' ? menu() : play(name, level, index, seed)),
  tracer: () => ateliers.tracer,
  solve: () => (current ? current.solve() : undefined),
});

stage.start();
menu();
