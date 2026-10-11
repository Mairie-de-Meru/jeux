// Interface DOM : écrans, consigne, carte de scène, étoiles, confettis.
import { imageUrl } from './assets.js';

const $ = (id) => document.getElementById(id);

export function showScreen(name) {
  for (const id of ['home', 'game']) $(id).classList.toggle('hidden', id !== name);
  if (name === 'home') hideEnd();
}

export function stars(n, max = 3) {
  return '⭐'.repeat(n) + '☆'.repeat(Math.max(0, max - n));
}

export function renderHome(levels, best, onPick) {
  const box = $('levels');
  box.textContent = '';
  levels.forEach((L, i) => {
    const b = document.createElement('button');
    const ico = document.createElement('span'); ico.className = 'ico'; ico.textContent = L.icon;
    const name = document.createElement('span'); name.textContent = L.name;
    const st = document.createElement('span'); st.className = 'stars'; st.textContent = stars(best[i] || 0);
    b.append(ico, name, st);
    b.addEventListener('click', () => onPick(i));
    box.appendChild(b);
  });
  const url = imageUrl('titre');
  const img = $('titreImg');
  if (url) { img.src = url; img.classList.remove('hidden'); }
}

export function setCard(moment, fallbackEmoji) {
  const el = $('cardImg');
  const url = moment && moment.image ? imageUrl(moment.id) : null;
  if (url) {
    el.style.backgroundImage = `url("${url}")`;
    el.textContent = '';
  } else {
    el.style.backgroundImage = 'none';
    el.style.background = '#ffeaa8';
    el.textContent = moment ? moment.emoji : fallbackEmoji || '🕐';
  }
  $('cardLabel').textContent = moment ? moment.label.replace(/^l'/, "L'").replace(/^le /, 'Le ') : '';
  $('card').classList.toggle('hidden', false);
}

export function setInstruction(text) { $('instruction').textContent = text; }

export function setDigital(text) {
  const el = $('digital');
  if (text) { el.textContent = text; el.classList.remove('hidden'); }
  else el.classList.add('hidden');
}

export function setProgress(done, total) {
  $('progress').textContent = '⭐'.repeat(done) + '☆'.repeat(Math.max(0, total - done));
}

export function showEnd({ title, starCount, hasNext }) {
  $('endTitle').textContent = title;
  $('endStars').textContent = stars(starCount);
  $('btnNext').classList.toggle('hidden', !hasNext);
  $('end').classList.remove('hidden');
}
export function hideEnd() { $('end').classList.add('hidden'); }

export function bind(id, fn) { $(id).addEventListener('click', fn); }

export function debugPanel(on) { $('debug').classList.toggle('hidden', !on); }
export function debugText(txt) { $('debug').textContent = txt; }

// Confettis (canvas 2D plein écran)
let parts = [];
let running = false;
export function confetti(n = 110) {
  const cv = $('confetti');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
  const colors = ['#ff4f8b', '#ffc233', '#2f7bff', '#21b455', '#ff8a2b', '#9b5cff'];
  for (let i = 0; i < n; i++) {
    parts.push({
      x: innerWidth * (0.2 + Math.random() * 0.6), y: innerHeight * 0.35,
      vx: (Math.random() - 0.5) * 12, vy: -Math.random() * 12 - 2,
      s: 6 + Math.random() * 8, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
      c: colors[i % colors.length], life: 1.8 + Math.random(),
    });
  }
  if (running) return;
  running = true;
  let last = performance.now();
  const g = cv.getContext('2d');
  const step = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, innerWidth, innerHeight);
    parts = parts.filter((p) => p.life > 0 && p.y < innerHeight + 30);
    for (const p of parts) {
      p.vy += 22 * dt; p.x += p.vx * dt * 60 * 0.5; p.y += p.vy * dt * 60 * 0.5; p.r += p.vr; p.life -= dt;
      g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c;
      g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); g.restore();
    }
    if (parts.length) requestAnimationFrame(step);
    else { running = false; g.clearRect(0, 0, innerWidth, innerHeight); }
  };
  requestAnimationFrame(step);
}

let bubbleTimer = null;
export function showBubble(text, ms = 4000) {
  const b = $('bubble');
  b.textContent = text;
  b.classList.remove('hidden');
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => b.classList.add('hidden'), ms);
}
