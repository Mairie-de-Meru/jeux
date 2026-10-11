// Sons synthétisés (Web Audio), démarrés au premier geste.

let ctx = null;
let master = null;

export function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
}

function tone(freq, start, dur, { type = 'sine', gain = 0.3, slideTo = null } = {}) {
  if (!ctx) return;
  const t0 = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

const noteFor = (v) => 262 * Math.pow(2, (v - 1) / 6);

export function pop(value) {
  const f = noteFor(value);
  tone(f * 1.4, 0, 0.14, { slideTo: f * 0.8, gain: 0.32 });
  tone(f * 2, 0, 0.06, { type: 'triangle', gain: 0.08 });
}

export function remove() {
  tone(520, 0, 0.16, { slideTo: 880, gain: 0.2, type: 'triangle' });
}

export function arpeggio() {
  [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, i * 0.09, 0.3, { gain: 0.25, type: 'triangle' }));
}

export function hint() {
  tone(440, 0, 0.25, { gain: 0.18, slideTo: 392 });
  tone(349, 0.18, 0.35, { gain: 0.16 });
}

export function soft() {
  tone(330, 0, 0.18, { gain: 0.12 });
}

export function hop() {
  tone(300, 0, 0.09, { slideTo: 520, gain: 0.1 });
}

export function speak(text) {
  if (!('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR';
    u.rate = 0.9;
    u.pitch = 1.1;
    window.speechSynthesis.speak(u);
  } catch (e) { /* voix indisponible : on ignore */ }
}
