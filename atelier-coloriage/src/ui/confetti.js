// Confettis : petit canvas plein écran qui se retire tout seul.
export function confetti(parent = document.body, count = 140, duration = 2200) {
  const c = document.createElement('canvas');
  c.className = 'confetti';
  c.width = parent.clientWidth || window.innerWidth;
  c.height = parent.clientHeight || window.innerHeight;
  parent.appendChild(c);
  const ctx = c.getContext('2d');
  const colors = ['#ff3b30', '#ff9500', '#ffd60a', '#2ecc40', '#4fc3ff', '#9b4dff', '#ff5fb7'];
  const ps = Array.from({ length: count }, () => ({
    x: Math.random() * c.width, y: -Math.random() * c.height * 0.5, vx: (Math.random() - 0.5) * 3,
    vy: 2 + Math.random() * 4, s: 6 + Math.random() * 8, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));
  const t0 = performance.now();
  function frame(t) {
    const el = t - t0;
    ctx.clearRect(0, 0, c.width, c.height);
    for (const p of ps) {
      p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, el - duration * 0.6) / (duration * 0.4));
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      ctx.restore();
    }
    if (el < duration) requestAnimationFrame(frame); else c.remove();
  }
  requestAnimationFrame(frame);
}
