// Sons synthétisés (Web Audio). Le contexte est créé au premier geste de l'utilisateur.
export function createSound() {
  let ac = null;
  function ctx() {
    try {
      if (!ac) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ac = new AC();
      }
      if (ac.state === 'suspended') ac.resume();
      return ac;
    } catch (e) { return null; }
  }
  function tone(freq, dur = 0.12, { type = 'sine', gain = 0.15, delay = 0, slideTo = null } = {}) {
    const a = ctx();
    if (!a) return;
    try {
      const t = a.currentTime + delay;
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(a.destination);
      o.start(t); o.stop(t + dur + 0.02);
    } catch (e) { /* silencieux */ }
  }
  return {
    unlock: () => { ctx(); },
    tap: () => tone(520, 0.07, { type: 'triangle', gain: 0.1 }),
    paint: () => { tone(380, 0.12, { type: 'sine', slideTo: 760 }); tone(760, 0.1, { delay: 0.08, gain: 0.08 }); },
    brush: () => tone(300 + Math.random() * 200, 0.05, { type: 'triangle', gain: 0.04 }),
    stamp: () => { tone(660, 0.08, { type: 'square', gain: 0.06 }); tone(990, 0.1, { delay: 0.07, gain: 0.07 }); },
    erase: () => tone(240, 0.12, { type: 'sawtooth', gain: 0.05, slideTo: 120 }),
    oops: () => tone(220, 0.18, { type: 'sine', gain: 0.1, slideTo: 180 }),
    undo: () => tone(500, 0.12, { type: 'triangle', slideTo: 330, gain: 0.1 }),
    redo: () => tone(330, 0.12, { type: 'triangle', slideTo: 500, gain: 0.1 }),
    whoosh: () => tone(200, 0.5, { type: 'sawtooth', gain: 0.04, slideTo: 900 }),
    success: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.2, { delay: i * 0.1, gain: 0.12 })),
  };
}
