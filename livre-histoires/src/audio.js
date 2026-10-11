export function createAudio() {
  let ctx = null;

  // À appeler depuis un geste de l'utilisateur.
  function unlock() {
    if (!ctx) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, delay, duration, gain, endFreq = freq) {
    const c = unlock();
    if (!c) return;
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const amp = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t0 + duration);
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(amp).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  // Joue un buffer mono rempli par fill(data, sampleRate) à travers un filtre.
  function noiseLayer(c, t0, seconds, fill, type, freq, q, gain) {
    const length = Math.floor(c.sampleRate * seconds);
    const buffer = c.createBuffer(1, length, c.sampleRate);
    fill(buffer.getChannelData(0), c.sampleRate);
    const src = c.createBufferSource();
    src.buffer = buffer;
    const filter = c.createBiquadFilter();
    filter.type = type;
    filter.Q.value = q;
    if (typeof freq === 'function') freq(filter.frequency, t0);
    else filter.frequency.value = freq;
    const amp = c.createGain();
    amp.gain.value = gain;
    src.connect(filter).connect(amp).connect(c.destination);
    src.start(t0);
    return filter;
  }

  // Page qui tourne (calée sur l'animation de 0,7 s) : souffle d'air qui enfle puis retombe,
  // petits craquements de papier, et « flap » sourd quand la feuille se pose.
  function page() {
    const c = unlock();
    if (!c) return;
    const t0 = c.currentTime + 0.01;
    const D = 0.7;
    const vary = 0.9 + Math.random() * 0.2;
    const bump = (x) => Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, x))), 1.6);

    // 1. Souffle : bruit brun-rosé, enveloppe en cloche centrée sur la mi-course.
    noiseLayer(c, t0, D, (data, sr) => {
      let last = 0;
      for (let k = 0; k < data.length; k++) {
        last = 0.82 * last + 0.18 * (Math.random() * 2 - 1);
        data[k] = last * 2.6 * bump(k / sr / D);
      }
    }, 'bandpass', (f, t) => {
      f.setValueAtTime(450 * vary, t);
      f.linearRampToValueAtTime(1700 * vary, t + D * 0.45);
      f.linearRampToValueAtTime(700 * vary, t + D);
    }, 0.7, 0.25);

    // 2. Papier : grains brefs et aléatoires, plus denses au milieu du geste.
    noiseLayer(c, t0, D, (data, sr) => {
      let grain = 0;
      let amp = 0;
      for (let k = 0; k < data.length; k++) {
        const e = bump(k / sr / D);
        if (grain <= 0 && Math.random() < 0.0016 * e) {
          grain = Math.floor(sr * (0.002 + Math.random() * 0.006));
          amp = 0.4 + Math.random() * 0.6;
        }
        data[k] = grain-- > 0 ? (Math.random() * 2 - 1) * amp * e : 0;
      }
    }, 'highpass', 2200 * vary, 0.5, 0.11);

    // 3. Flap : la feuille se pose à plat, petit choc étouffé.
    noiseLayer(c, t0 + D * 0.86, 0.12, (data, sr) => {
      for (let k = 0; k < data.length; k++) data[k] = (Math.random() * 2 - 1) * Math.exp(-k / (sr * 0.018));
    }, 'lowpass', 380, 0.8, 0.35);
  }

  function success() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, k) => tone(f, k * 0.12, 0.5, 0.14));
  }

  // Petit « hop » doux : jamais punitif.
  function hop() {
    tone(392, 0, 0.22, 0.12, 294);
  }

  function pop() {
    tone(660, 0, 0.12, 0.1, 880);
  }

  return { unlock, page, success, hop, pop };
}
