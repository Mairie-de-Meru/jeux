// Voix : enregistrements pré-générés (assets/voice/manifest.json, tools/gen-voice.mjs) lus par un seul <audio> réutilisé,
// speechSynthesis (en-GB -> en-US -> en ; fr-FR) en repli pour tout élément absent du manifeste ou en erreur.
// ?tts force la synthèse seule (debug). File d'attente, repli silencieux.
const synth = typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined' ? window.speechSynthesis : null;

let voices = [];
let enabled = true;
let readyPromise = null;
let gen = 0;
const FORCE_TTS = typeof location !== 'undefined' && new URLSearchParams(location.search).has('tts');
let manifest = null; // { "en|texte": "fichier.m4a" } ; {} si indisponible
let manifestLoading = null;
let audioEl = null;
const keep = []; // références aux énoncés en cours (évite le ramasse-miettes qui coupe la voix)

function loadVoices() {
  try {
    voices = synth ? synth.getVoices() || [] : [];
  } catch (e) {
    voices = [];
  }
  return voices.length > 0;
}

// Attend voiceschanged (au plus 1,5 s) avant le premier énoncé.
function ready() {
  if (!synth) return Promise.resolve();
  if (loadVoices()) return Promise.resolve();
  if (!readyPromise) {
    readyPromise = new Promise((resolve) => {
      const done = () => {
        loadVoices();
        resolve();
      };
      try {
        synth.addEventListener('voiceschanged', done, { once: true });
      } catch (e) {
        /* ancien navigateur */
      }
      setTimeout(done, 1500);
    });
  }
  return readyPromise;
}

if (synth) {
  loadVoices();
  try {
    synth.addEventListener('voiceschanged', loadVoices);
  } catch (e) {
    /* ignoré */
  }
}

const norm = (l) => String(l || '').replace('_', '-').toLowerCase();

function pickVoice(lang) {
  const order = lang === 'en' ? ['en-gb', 'en-us', 'en'] : ['fr-fr', 'fr'];
  for (const want of order) {
    const exact = voices.find((v) => norm(v.lang) === want);
    if (exact) return exact;
    if (want.length === 2) {
      const loose = voices.find((v) => norm(v.lang).startsWith(want));
      if (loose) return loose;
    }
  }
  return null;
}

function makeUtterance(text, lang) {
  const u = new SpeechSynthesisUtterance(text);
  const v = pickVoice(lang);
  if (v) {
    u.voice = v;
    u.lang = v.lang;
  } else {
    u.lang = lang === 'en' ? 'en-GB' : 'fr-FR';
  }
  u.rate = lang === 'en' ? 0.85 : 0.95;
  u.pitch = 1.1;
  return u;
}

function loadManifest() {
  if (FORCE_TTS || typeof fetch === 'undefined') return Promise.resolve((manifest = {}));
  if (!manifestLoading) {
    manifestLoading = fetch('./assets/voice/manifest.json')
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}))
      .then((m) => (manifest = m && typeof m === 'object' ? m : {}));
  }
  return manifestLoading;
}

// Joue un fichier ; résout true à la fin normale, false sur erreur (repli TTS) ou annulation.
function playClip(file, my) {
  return new Promise((resolve) => {
    try {
      if (!audioEl) audioEl = new Audio();
      const a = audioEl;
      const done = (ok) => {
        a.onended = a.onerror = null;
        resolve(ok);
      };
      a.onended = () => done(true);
      a.onerror = () => done(false);
      a.src = './assets/voice/' + file;
      const p = a.play();
      if (p && p.catch) p.catch(() => done(false));
    } catch (e) {
      resolve(false);
    }
  });
}

function speakTts(it) {
  try {
    const u = makeUtterance(it.text, it.lang);
    keep.push(u);
    synth.speak(u);
  } catch (e) {
    /* repli silencieux */
  }
}

export function isSupported() {
  return !!synth || typeof Audio !== 'undefined';
}

export function setEnabled(on) {
  enabled = !!on;
  if (!enabled) stop();
}

function stopOutput() {
  keep.length = 0;
  try {
    if (audioEl) {
      audioEl.onended = audioEl.onerror = null;
      audioEl.pause();
    }
  } catch (e) {
    /* ignoré */
  }
  try {
    if (synth) synth.cancel();
  } catch (e) {
    /* ignoré */
  }
}

export function stop() {
  gen++;
  stopOutput();
}

// Dit une suite d'énoncés [{ text, lang: 'en'|'fr' }] après avoir coupé la voix en cours.
export async function sayQueue(items) {
  if (!enabled) return;
  const my = ++gen;
  stopOutput();
  const [m] = await Promise.all([loadManifest(), ready()]);
  for (const it of items) {
    if (my !== gen) return;
    const file = m[`${it.lang}|${it.text}`];
    if (file && (await playClip(file, my))) continue;
    if (my !== gen) return;
    if (!synth) continue;
    // Synthèse : les énoncés restants sont mis en file d'un coup seulement si aucun clip ne suit ; sinon un par un.
    speakTts(it);
    await new Promise((resolve) => {
      const u = keep[keep.length - 1];
      if (!u) return resolve();
      let t = setTimeout(resolve, 4000);
      u.onend = u.onerror = () => {
        clearTimeout(t);
        resolve();
      };
    });
  }
}

export function say(text, lang = 'en') {
  return sayQueue([{ text, lang }]);
}
