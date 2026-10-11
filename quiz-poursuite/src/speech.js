// Lecture à voix haute (speechSynthesis fr-FR). Ne plante jamais si l'API est absente.
let enabled = true;
let voice = null;

function synth() {
  try { return window.speechSynthesis || null; } catch (e) { return null; }
}

function pickVoice() {
  const s = synth();
  if (!s || !s.getVoices) return;
  const vs = s.getVoices();
  voice = vs.find((v) => /^fr[-_]FR/i.test(v.lang)) || vs.find((v) => /^fr/i.test(v.lang)) || null;
}

const s0 = synth();
if (s0) {
  pickVoice();
  try { s0.addEventListener('voiceschanged', pickVoice); } catch (e) { /* ignore */ }
}

export function setEnabled(v) {
  enabled = !!v;
  if (!enabled) cancel();
}
export function isEnabled() { return enabled; }

export function cancel() {
  const s = synth();
  try { if (s) s.cancel(); } catch (e) { /* ignore */ }
}

export function speak(text) {
  const s = synth();
  if (!s || !enabled || !text) return;
  try {
    s.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR';
    if (voice) u.voice = voice;
    u.rate = 0.95;
    u.pitch = 1.05;
    s.speak(u);
  } catch (e) { /* ignore */ }
}
