// Confettis sur un canvas DOM léger.
const COLORS = ['#ff8a1f', '#3cc45a', '#2f8cff', '#ffd21f', '#b25cff', '#ff4f6d'];
let canvas = null, ctx = null, parts = [], running = false;

function ensure() {
  if (canvas) return;
  canvas = document.getElementById('confetti');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
}

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function loop() {
  if (!canvas) { running = false; return; }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const p of parts) {
    p.vy += 0.12;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vr;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.c;
    ctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.6);
    ctx.restore();
  }
  parts = parts.filter((p) => p.y < canvas.height + 30);
  if (parts.length) requestAnimationFrame(loop);
  else { running = false; ctx.clearRect(0, 0, canvas.width, canvas.height); }
}

export function burst(n = 120) {
  ensure();
  if (!canvas) return;
  resize();
  for (let i = 0; i < n; i++) {
    parts.push({
      x: canvas.width / 2 + (Math.random() - 0.5) * canvas.width * 0.4,
      y: canvas.height * 0.35,
      vx: (Math.random() - 0.5) * 12,
      vy: -Math.random() * 10 - 2,
      s: 8 + Math.random() * 8,
      c: COLORS[i % COLORS.length],
      rot: Math.random() * 6,
      vr: (Math.random() - 0.5) * 0.4,
    });
  }
  if (!running) { running = true; requestAnimationFrame(loop); }
}
