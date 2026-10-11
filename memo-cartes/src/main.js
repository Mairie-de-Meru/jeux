import { IMAGES } from '../assets/manifest.js';
import { mulberry32 } from './logic/rng.js';
import { THEMES } from './logic/themes.js';
import { LEVELS } from './logic/levels.js';
import { createDeck } from './logic/deck.js';
import { createBotMemory, observe, chooseFirst, chooseSecond, BOT_SKILL } from './logic/bot.js';
import { createGame, flip, resolvePending, winner } from './logic/game.js';
import { stars } from './logic/score.js';
import { createScene } from './render/scene.js';
import { createCards, PLAYER_COLORS } from './render/cards.js';
import { createEffects } from './render/effects.js';
import { preloadTextures } from './render/textures.js';
import { createUI } from './ui/ui.js';
import { sounds, unlockAudio } from './ui/audio.js';
import { speak, stopSpeech } from './ui/speech.js';

const CONSIGNE = 'Trouve les cartes identiques !';
const FLIP_MS = 350;
const canvas = document.getElementById('view');
const sc = createScene(canvas);
const cards = createCards(sc.scene);
const fx = createEffects(sc.scene);

let game = null, deck = null;
let cfg = { themeId: 'animaux', levelIndex: 0, players: 1 };
let token = 0;     // invalide les timers d'une partie abandonnée
let speed = 1;
let active = false;
let bot = false, botMemory = null, botRng = null, solving = false;

const wait = (ms) => new Promise((r) => setTimeout(r, ms / speed));
function later(ms, fn) {
  const t = token;
  setTimeout(() => { if (t === token) fn(); }, ms / speed);
}
function setSpeed(s) { speed = s; cards.setSpeed(s); }

const ui = createUI({
  titleUrl: IMAGES.titre,
  onStart: (t, l, p) => start(t, l, p),
  onHome: () => { token++; active = false; stopSpeech(); ui.hideEnd(); ui.showMenu(); },
  onSpeak: () => speak(CONSIGNE),
  onAgain: () => start(cfg.themeId, cfg.levelIndex, cfg.players),
  onNext: () => start(cfg.themeId, Math.min(cfg.levelIndex + 1, LEVELS.length - 1), cfg.players),
});

function hud() {
  ui.updateHud({
    tries: bot ? game.triesBy[0] : game.tries, scores: game.scores, current: game.current,
    players: game.players, mode: bot ? 'bot' : null, won: game.phase === 'won',
  });
}

function start(themeId, levelIndex, players = 1, seed) {
  token++;
  bot = players === 'bot';
  cfg = { themeId, levelIndex, players: bot ? 'bot' : players === 2 ? 2 : 1 };
  const realSeed = seed ?? Math.floor(Math.random() * 2 ** 32);
  const rng = mulberry32(realSeed);
  botRng = mulberry32(realSeed ^ 0x9e3779b9);
  botMemory = createBotMemory();
  deck = createDeck(themeId, levelIndex, rng);
  game = createGame(deck, bot || cfg.players === 2 ? 2 : 1);
  const lv = LEVELS[levelIndex];
  cards.build(deck, lv, themeId);
  sc.fitCamera(lv.rows, lv.cols);
  ui.hideEnd();
  ui.showHud();
  hud();
  active = true;
  speak(CONSIGNE);
  return game;
}

// byBot : coup du robot ; force : coup du crochet solve() (ignore le blocage du tour robot)
function play(index, byBot = false, force = false) {
  if (!active || !game) return { type: 'ignored' };
  if (bot && game.current === 1 && !byBot && !force) return { type: 'ignored' };
  const { state, event } = flip(game, index);
  if (event.type === 'ignored') return event;
  game = state;
  if (bot) botMemory = observe(botMemory, event, game, botRng, BOT_SKILL);
  cards.flip(index, true);
  sounds.flip();
  hud();
  if (event.type === 'match') {
    later(FLIP_MS, () => {
      cards.jump(event.indices);
      cards.tint(event.indices, game.players === 2 ? event.player : null);
      event.indices.forEach((i) => fx.burst(cards.position(i), PLAYER_COLORS[event.player]));
      sounds.ding();
      if (bot && !event.won && event.player === 1) botSchedule(900);
      if (!event.won) speak(event.nom.charAt(0).toUpperCase() + event.nom.slice(1));
    });
    if (event.won) {
      later(FLIP_MS + 900, () => {
        fx.confettiBurst(LEVELS[cfg.levelIndex].cols * 1.2);
        sounds.victory();
        active = false;
        ui.showEnd({
          stars: stars(bot ? game.triesBy[0] : game.tries, LEVELS[cfg.levelIndex].pairs),
          tries: bot ? game.triesBy[0] : game.tries, mode: bot ? 'bot' : null, players: game.players, winner: winner(game), scores: game.scores,
          hasNext: cfg.levelIndex < LEVELS.length - 1,
        });
      });
    }
  } else if (event.type === 'mismatch') {
    later(FLIP_MS, () => { cards.shake(event.indices); sounds.mismatch(); });
    later(900 + FLIP_MS, () => resolve());
  }
  return event;
}

function resolve() {
  if (!game || !game.pending) return game;
  const [a, b] = game.pending;
  game = resolvePending(game);
  cards.flip(a, false);
  cards.flip(b, false);
  hud();
  botSchedule(700);
  return game;
}

// Tour du robot : 1re carte, puis 2e carte, entrées de l'enfant bloquées (cf. play).
function botSchedule(delay) {
  if (!bot || solving) return;
  later(delay, () => {
    if (!active || solving || game.current !== 1 || game.pending || game.phase === 'won') return;
    const first = chooseFirst(game, botMemory, botRng);
    play(first, true);
    later(800, () => {
      if (!active || solving || game.current !== 1 || game.pending) return;
      play(chooseSecond(game, botMemory, first, botRng), true);
    });
  });
}

const pairOf = (i) => deck.findIndex((c, j) => j !== i && c.pairKey === deck[i].pairKey);

async function solve() {
  const prev = speed;
  solving = true;
  setSpeed(4);
  while (game && game.phase !== 'won') {
    if (game.pending) { await wait(900 + FLIP_MS + 50); continue; }
    const shown = game.cards.find((c) => c.state === 'shown');
    const first = shown || game.cards.find((c) => c.state === 'hidden');
    if (!shown) { play(first.index, false, true); await wait(120); }
    play(pairOf(first.index), false, true);
    await wait(200);
  }
  await wait(FLIP_MS + 1000);
  setSpeed(prev);
  solving = false;
  return JSON.parse(JSON.stringify(game));
}

window.__memo = {
  state: () => (game ? JSON.parse(JSON.stringify(game)) : null),
  start: (t, l, p, seed) => JSON.parse(JSON.stringify(start(t, l, p, seed))),
  flip: (i) => play(i, false, true),
  resolve: () => resolve(),
  solve,
  pairOf: (i) => pairOf(i),
};

// Entrées
canvas.addEventListener('pointerdown', (e) => {
  unlockAudio();
  const r = canvas.getBoundingClientRect();
  const i = cards.pick(sc.camera, ((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  if (i >= 0) play(i);
});
document.addEventListener('pointerdown', unlockAudio, { once: true });
window.addEventListener('resize', () => sc.resize());

// Boucle
const fpsEl = document.getElementById('fps');
const debug = new URLSearchParams(location.search).has('debug');
if (debug) fpsEl.style.display = 'block';
let last = performance.now(), frames = 0, acc = 0;
function loop(now) {
  const dt = Math.min(now - last, 100);
  last = now;
  cards.update(dt);
  fx.update(dt);
  sc.render();
  if (debug) { frames++; acc += dt; if (acc >= 500) { fpsEl.textContent = `${Math.round(frames * 1000 / acc)} fps`; frames = 0; acc = 0; } }
  requestAnimationFrame(loop);
}

sc.resize();
await preloadTextures(IMAGES, sc.renderer);
ui.showMenu();
requestAnimationFrame(loop);
