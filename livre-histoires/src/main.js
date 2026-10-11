import { validateStory, buildSpreads, filterImages } from './logic/story.js';
import { createReader, next, prev, goTo, canNext, canPrev } from './logic/reader.js';
import { checkAnswer, starsFor } from './logic/quiz.js';
import { tokenize } from './logic/words.js';
import { renderLibrary } from './library.js';
import { createBook3d } from './book3d.js';
import { createFallback } from './fallback.js';
import { createSpeech } from './speech.js';
import { createAudio } from './audio.js';

const $ = (id) => document.getElementById(id);
const speech = createSpeech();
const audio = createAudio();

const app = {
  stories: new Map(),
  view: 'library',
  story: null,
  spreads: [],
  reader: null,
  mode: speech.supported ? 'read' : 'alone', // 'read' = on me lit, 'alone' = je lis seul
  quiz: { essais: 0, fini: false },
  book: null,
  openToken: 0,
};

async function fetchJson(url) {
  try {
    const res = await fetch(url);
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

function loadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

async function loadImages(story) {
  const urls = [story.couverture, ...story.pages.map((p) => p.image)].filter(Boolean);
  const map = new Map();
  await Promise.all(urls.map(async (url) => {
    const img = await loadImage(url);
    if (img) map.set(url, img);
  }));
  return map;
}

// ---- Vues ----
function showView(view) {
  app.view = view;
  $('library').hidden = view !== 'library';
  $('reader').hidden = view === 'library';
  $('quiz').hidden = view !== 'quiz';
}

function ensureBook() {
  if (app.book) return;
  const handlers = {
    onGesture: (kind) => (kind === 'next' ? nextPage() : prevPage()),
    onWordTap: tapWord,
    wordTapEnabled: () => app.mode === 'alone' && app.view === 'reader',
  };
  try {
    if (new URLSearchParams(location.search).has('html')) throw new Error('?html : repli forcé');
    app.book = createBook3d($('stage'), handlers);
  } catch (err) {
    console.warn('WebGL indisponible, lecteur HTML/CSS :', err);
    app.book = createFallback($('stage'), handlers);
  }
}

const currentSpread = () => app.spreads[app.reader.index];

function updateUI() {
  const r = app.reader;
  $('btnPrev').disabled = !canPrev(r);
  $('btnNext').disabled = !canNext(r);
  $('ask').hidden = !(app.view === 'reader' && currentSpread().kind === 'end' && !app.book.animating);
  $('btnRead').hidden = !speech.supported;
  $('btnMode').hidden = !speech.supported;
  $('btnMode').textContent = app.mode === 'read' ? '👂 On me lit' : '👀 Je lis seul';
}

// ---- Lecture à voix haute ----
function readPage() {
  const sp = currentSpread();
  if (sp.kind !== 'page') return;
  speech.speak(sp.texte, { onWord: (i) => app.book.setHighlight(i) });
}

function stopReading() {
  speech.cancel();
  app.book?.setHighlight(-1);
}

function tapWord(i) {
  const sp = currentSpread();
  const tok = tokenize(sp.texte)[i];
  if (!tok) return;
  audio.pop();
  app.book.setHighlight(i);
  speech.speak(tok.word, { onEnd: () => app.book.setHighlight(-1) });
}

function setMode(mode) {
  app.mode = speech.supported ? mode : 'alone';
  if (app.mode === 'alone') stopReading();
  else if (app.view === 'reader' && !app.book.animating) readPage();
  if (app.reader) updateUI();
}

// ---- Navigation ----
function arrive() {
  updateUI();
  if (app.mode === 'read') readPage();
}

function go(target) {
  if (!app.reader) return;
  const to = goTo(app.reader, target);
  if (to.index === app.reader.index) return;
  app.book.finish();
  stopReading();
  app.reader = to;
  audio.page();
  app.book.turnTo(to.index, arrive);
  updateUI();
}

const nextPage = () => app.reader && go(next(app.reader).index);
const prevPage = () => app.reader && go(prev(app.reader).index);

async function open(id) {
  const story = app.stories.get(id);
  if (!story) return;
  const token = ++app.openToken;
  stopReading();
  app.story = story;
  app.spreads = buildSpreads(story);
  app.reader = createReader(app.spreads.length);
  showView('reader');
  ensureBook();
  const images = await loadImages(story);
  if (token !== app.openToken) return;
  await app.book.load(story, app.spreads, images);
  if (token !== app.openToken) return;
  app.book.showSpread(0);
  app.book.start();
  updateUI();
}

function home() {
  app.openToken++;
  app.book?.finish();
  stopReading();
  app.book?.stop();
  app.book?.unload();
  app.reader = null;
  app.story = null;
  showView('library');
}

// ---- Question ----
function openQuiz() {
  const q = app.story.question;
  stopReading();
  app.quiz = { essais: 0, fini: false };
  $('qText').textContent = q.texte;
  $('qMsg').textContent = '';
  $('qStars').replaceChildren();
  $('qHome').hidden = true;
  $('qChoices').replaceChildren(...q.choix.map((c, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'choice';
    b.innerHTML = '<span class="emoji"></span><span class="label"></span>';
    b.firstChild.textContent = c.emoji;
    b.lastChild.textContent = c.texte;
    b.addEventListener('click', () => answer(i));
    return b;
  }));
  showView('quiz');
  if (app.mode === 'read') speech.speak(q.texte);
}

function answer(i) {
  const q = app.story?.question;
  if (!q || app.quiz.fini) return;
  app.quiz.essais++;
  const result = checkAnswer(q, i);
  const button = $('qChoices').children[i];
  $('qMsg').textContent = result.message;
  if (result.correct) {
    app.quiz.fini = true;
    button?.classList.add('good');
    audio.success();
    showStars(starsFor(app.quiz.essais));
    launchConfetti();
    $('qHome').hidden = false;
    if (app.mode === 'read') speech.speak(result.message);
  } else {
    audio.hop();
    button?.classList.remove('shake');
    void button?.offsetWidth;
    button?.classList.add('shake');
    if (app.mode === 'read') speech.speak(result.message);
  }
}

function showStars(count) {
  const box = $('qStars');
  box.replaceChildren();
  for (let k = 0; k < count; k++) {
    const s = document.createElement('span');
    s.textContent = '⭐';
    s.style.animationDelay = `${k * 0.18}s`;
    box.appendChild(s);
  }
}

function launchConfetti() {
  const canvas = $('confetti');
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  const ctx = canvas.getContext('2d');
  const colors = ['#ff5d8f', '#ffd93b', '#4cc9f0', '#80ed99', '#b388ff'];
  const bits = Array.from({ length: 120 }, () => ({
    x: Math.random() * canvas.width, y: -20 - Math.random() * canvas.height * 0.5,
    vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 4, size: 8 + Math.random() * 10,
    color: colors[Math.floor(Math.random() * colors.length)], rot: Math.random() * 6,
  }));
  const start = performance.now();
  (function frame(now) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const b of bits) {
      b.x += b.vx; b.y += b.vy; b.rot += 0.1;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rot);
      ctx.fillStyle = b.color;
      ctx.fillRect(-b.size / 2, -b.size / 4, b.size, b.size / 2);
      ctx.restore();
    }
    if (now - start < 3500) requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  })(start);
}

// ---- Démarrage ----
async function boot() {
  const [index, manifest] = await Promise.all([fetchJson('stories/index.json'), fetchJson('assets/manifest.json')]);
  const available = new Set(manifest?.images ?? []);
  for (const id of index?.histoires ?? []) {
    const story = await fetchJson(`stories/${id}.json`);
    const check = validateStory(story);
    if (!check.ok) {
      console.warn(`Histoire « ${id} » ignorée :`, check.errors);
      continue;
    }
    app.stories.set(story.id, filterImages(story, available));
  }
  renderLibrary($('shelf'), [...app.stories.values()], open);
}

document.addEventListener('pointerdown', () => audio.unlock());
$('btnHome').addEventListener('click', home);
$('btnPrev').addEventListener('click', prevPage);
$('btnNext').addEventListener('click', nextPage);
$('btnRead').addEventListener('click', readPage);
$('btnMode').addEventListener('click', () => setMode(app.mode === 'read' ? 'alone' : 'read'));
$('ask').addEventListener('click', openQuiz);
$('qRead').addEventListener('click', () => speech.speak(app.story.question.texte));
$('qHome').addEventListener('click', home);
document.addEventListener('keydown', (e) => {
  if (app.view !== 'reader') return;
  if (e.key === 'ArrowRight') nextPage();
  else if (e.key === 'ArrowLeft') prevPage();
});
window.addEventListener('resize', () => app.book?.resize());

window.__livre = {
  open,
  next: nextPage,
  prev: prevPage,
  goTo: (i) => go(i),
  answer,
  home,
  setMode,
  state: () => ({
    view: app.view,
    storyId: app.story?.id ?? null,
    index: app.reader?.index ?? 0,
    count: app.reader?.count ?? 0,
    mode: app.mode,
    animating: Boolean(app.book?.animating),
    quiz: { essais: app.quiz.essais, fini: app.quiz.fini },
  }),
};

boot();
