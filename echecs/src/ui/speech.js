let voice = null;
export function speak(text) {
  if (!('speechSynthesis' in window)) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'fr-FR'; u.rate = 0.95;
  const vs = window.speechSynthesis.getVoices();
  voice = voice || vs.find((v) => v.lang && v.lang.startsWith('fr')) || null;
  if (voice) u.voice = voice;
  window.speechSynthesis.speak(u);
  return true;
}
export function stopSpeech() { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); }
