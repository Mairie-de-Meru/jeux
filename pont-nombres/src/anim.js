// Easings maison et petit gestionnaire de tweens.

export const linear = (t) => t;
export const easeInQuad = (t) => t * t;
export const easeOutQuad = (t) => 1 - (1 - t) * (1 - t);
export const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
export const easeOutBack = (t) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
export const easeOutElastic = (t) => {
  if (t === 0 || t === 1) return t;
  const c4 = (2 * Math.PI) / 3;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

const active = new Set();

// tween(obj, {x: 3}, 0.4, easeOutBack, {delay, onUpdate(p)}) -> Promise
export function tween(obj, props, dur, ease = easeInOutSine, opts = {}) {
  return new Promise((resolve) => {
    active.add({ obj, props, dur: Math.max(dur, 0.0001), ease, t: -(opts.delay || 0), from: null, onUpdate: opts.onUpdate, resolve });
  });
}

export function delay(sec) {
  return tween({ v: 0 }, { v: 1 }, sec, linear);
}

export function updateTweens(dt) {
  for (const tw of [...active]) {
    tw.t += dt;
    if (tw.t < 0) continue;
    if (!tw.from) {
      tw.from = {};
      for (const k in tw.props) tw.from[k] = tw.obj[k];
    }
    const p = Math.min(1, tw.t / tw.dur);
    const e = tw.ease(p);
    for (const k in tw.props) tw.obj[k] = tw.from[k] + (tw.props[k] - tw.from[k]) * e;
    if (tw.onUpdate) tw.onUpdate(p);
    if (p >= 1) {
      active.delete(tw);
      tw.resolve();
    }
  }
}
