// Confettis sur un canvas 2D plein écran.
export function createConfetti(canvas) {
  const ctx = canvas.getContext('2d');
  let parts = [], raf = 0, last = 0;
  const colors = ['#ff5d73', '#ffd23f', '#5fd35f', '#3d9bff', '#b784ff', '#ff9a3c'];
  function size() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function loop(t) {
    const dt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    parts = parts.filter((p) => p.y < innerHeight + 30 && p.life > 0);
    for (const p of parts) {
      p.vy += 500 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt; p.life -= dt;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
      ctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.6); ctx.restore();
    }
    if (parts.length) raf = requestAnimationFrame(loop); else { raf = 0; ctx.clearRect(0, 0, innerWidth, innerHeight); }
  }
  function burst(n = 140) {
    size();
    for (let i = 0; i < n; i++) {
      const fromLeft = i % 2 === 0;
      parts.push({ x: fromLeft ? 0 : innerWidth, y: innerHeight * 0.55, vx: (fromLeft ? 1 : -1) * (150 + Math.random() * 450),
        vy: -(300 + Math.random() * 550), r: Math.random() * 6, vr: (Math.random() - 0.5) * 12, s: 8 + Math.random() * 10,
        c: colors[i % colors.length], life: 3.2 });
    }
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
  }
  return { burst };
}
