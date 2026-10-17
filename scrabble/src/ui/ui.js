// Aides DOM : raccourcis, message, pop de score, confettis.
export const $ = (id) => document.getElementById(id);

let msgTimer = 0;
export function showMsg(text, { bad = false, ms = 4500 } = {}) {
  const el = $('msg');
  clearTimeout(msgTimer);
  el.innerHTML = '';
  if (!text) return;
  const s = document.createElement('span');
  s.textContent = text;
  if (bad) s.className = 'bad';
  el.appendChild(s);
  msgTimer = setTimeout(() => { el.innerHTML = ''; }, ms);
}

export function showPop(text) {
  const el = $('pop');
  el.innerHTML = '';
  const s = document.createElement('span');
  s.textContent = text;
  el.appendChild(s);
  setTimeout(() => { if (el.firstChild === s) el.innerHTML = ''; }, 1600);
}

export function seg(id, onChange) {
  const root = $(id);
  root.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    for (const x of root.children) x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
    onChange(b.dataset.v);
  });
}

// --- confettis 2D ---
let parts = [];
let running = false;
export function confetti(n = 120) {
  const cv = $('confetti');
  cv.width = innerWidth; cv.height = innerHeight;
  const colors = ['#ff6b6b', '#ffd43b', '#51cf66', '#4dabf7', '#cc5de8', '#ff922b'];
  for (let i = 0; i < n; i++) {
    parts.push({ x: Math.random() * cv.width, y: -20 - Math.random() * cv.height * 0.4, vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 4, s: 6 + Math.random() * 8, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, c: colors[i % colors.length] });
  }
  if (!running) { running = true; requestAnimationFrame(step); }
}
function step() {
  const cv = $('confetti');
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, cv.width, cv.height);
  parts = parts.filter((p) => p.y < cv.height + 30);
  for (const p of parts) {
    p.x += p.vx; p.y += p.vy; p.r += p.vr;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
    ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
    ctx.restore();
  }
  if (parts.length) requestAnimationFrame(step); else running = false;
}
