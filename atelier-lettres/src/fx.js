// Easing maison, tweens (sans dépendance), squash & stretch, confettis.
export const debug = { skipAnim: false };

export const ease = {
  linear: (t) => t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inCubic: (t) => t * t * t,
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  outBack: (t) => { const c1 = 1.70158; const c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
};

const active = [];

export function updateTweens(dt) {
  for (let i = active.length - 1; i >= 0; i--) {
    const a = active[i];
    a.t += dt;
    const k = Math.min(1, a.t / a.d);
    a.fn(a.ease(k), k);
    if (k >= 1) {
      active.splice(i, 1);
      a.res();
    }
  }
}

export function clearTweens() {
  for (const a of active.splice(0)) a.res();
}

export function tween(dur, fn, easing = ease.linear) {
  const d = Math.max(0.001, debug.skipAnim ? Math.min(dur, 0.03) : dur);
  return new Promise((res) => active.push({ t: 0, d, fn, ease: easing, res }));
}

export const wait = (sec) => tween(sec, () => {});

// Rebond amorti : squash & stretch autour de l'échelle de base.
export function squash(obj, base = 1, amp = 0.22, dur = 0.5) {
  return tween(dur, (k) => {
    const f = Math.sin(k * Math.PI * 3) * (1 - k) * amp;
    obj.scale.set(base * (1 - f * 0.7), base * (1 + f), base * (1 - f * 0.7));
  }).then(() => obj.scale.setScalar(base));
}

// Apparition : jaillit en z avec dépassement, puis squash.
export async function popIn(obj, { z0 = 0, z1 = 0.4, dur = 0.45 } = {}) {
  obj.scale.setScalar(0.01);
  await tween(dur, (k) => {
    obj.scale.setScalar(Math.max(0.01, k));
    obj.position.z = z0 + (z1 - z0) * k;
  }, ease.outBack);
  await squash(obj, 1, 0.2, 0.45);
}

export async function popOut(obj, dur = 0.3) {
  const s = obj.scale.x;
  await tween(dur, (k) => obj.scale.setScalar(Math.max(0.001, s * (1 - k))), ease.inCubic);
}

// Saut (tuiles) : arc vertical + squash à l'atterrissage.
export async function jump(obj, { h = 0.8, dur = 0.5 } = {}) {
  const y0 = obj.position.y;
  await tween(dur, (k) => { obj.position.y = y0 + Math.sin(k * Math.PI) * h; });
  obj.position.y = y0;
  await squash(obj, obj.scale.x, 0.18, 0.35);
}

export async function shake(obj, { amp = 0.18, dur = 0.4 } = {}) {
  const x0 = obj.position.x;
  await tween(dur, (k) => { obj.position.x = x0 + Math.sin(k * Math.PI * 6) * amp * (1 - k); });
  obj.position.x = x0;
}

export async function moveTo(obj, x, y, z, dur = 0.35) {
  const x0 = obj.position.x;
  const y0 = obj.position.y;
  const z0 = obj.position.z;
  await tween(dur, (k) => {
    obj.position.set(x0 + (x - x0) * k, y0 + (y - y0) * k, z0 + (z - z0) * k);
  }, ease.outCubic);
}

// Confettis sur un canvas 2D plein écran (#fx).
const parts = [];
let looping = false;
const COLORS = ['#ff5c8a', '#ffc933', '#3ec1d3', '#7bd957', '#8e6cef', '#ff8a3d'];

export function confetti(count = 120) {
  const cv = document.getElementById('fx');
  if (!cv) return;
  const w = (cv.width = innerWidth);
  cv.height = innerHeight;
  for (let i = 0; i < count; i++) {
    parts.push({
      x: w / 2 + (Math.random() - 0.5) * w * 0.3, y: innerHeight * 0.4,
      vx: (Math.random() - 0.5) * 900, vy: -Math.random() * 800 - 200,
      r: 5 + Math.random() * 7, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12,
      c: COLORS[i % COLORS.length], life: 2.2 + Math.random(),
    });
  }
  if (!looping) {
    looping = true;
    let last = performance.now();
    const step = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, cv.width, cv.height);
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life -= dt;
        p.vy += 1400 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        if (p.life <= 0 || p.y > cv.height + 20) { parts.splice(i, 1); continue; }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
        ctx.restore();
      }
      if (parts.length) requestAnimationFrame(step);
      else { looping = false; ctx.clearRect(0, 0, cv.width, cv.height); }
    };
    requestAnimationFrame(step);
  }
}
