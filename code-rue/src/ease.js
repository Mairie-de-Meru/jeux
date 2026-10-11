// Easing maison + mini-gestionnaire d'animations (pas de lib de tween).
export const lerp = (a, b, t) => a + (b - a) * t;

export function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export function easeOutElastic(t) {
  if (t === 0 || t === 1) return t;
  const c4 = (2 * Math.PI) / 3;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

export function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// tweens.add({ dur, ease, update(e, t), done }) ; tweens.update(dt)
export function createTweens() {
  const list = [];
  return {
    add(opts) {
      const tw = { t: 0, dur: opts.dur ?? 0.4, delay: opts.delay ?? 0, ease: opts.ease ?? easeInOutCubic, ...opts };
      tw.dur = opts.dur ?? 0.4;
      list.push(tw);
      return tw;
    },
    update(dt) {
      for (let i = list.length - 1; i >= 0; i--) {
        const tw = list[i];
        if (tw.cancelled) { list.splice(i, 1); continue; }
        if (tw.delay > 0) { tw.delay -= dt; continue; }
        tw.t += dt;
        const k = Math.min(1, tw.t / tw.dur);
        tw.update?.(tw.ease(k), k);
        if (k >= 1) {
          list.splice(i, 1);
          tw.done?.();
        }
      }
    },
    clear() { list.length = 0; },
    get size() { return list.length; },
  };
}
