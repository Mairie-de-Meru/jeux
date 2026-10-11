import { tokenize, wordIndexAtChar, estimateWordTimings } from './logic/words.js';

const FALLBACK_DELAY = 600;
const RATE = 0.9;

export function createSpeech() {
  const synth = window.speechSynthesis;
  const supported = Boolean(synth) && typeof SpeechSynthesisUtterance !== 'undefined';
  let ticket = 0;
  let timers = [];
  let voice = null;

  if (supported) {
    const pick = () => {
      voice = synth.getVoices().find((v) => /^fr/i.test(v.lang)) ?? null;
    };
    pick();
    synth.addEventListener?.('voiceschanged', pick);
  }

  function clearTimers() {
    timers.forEach(clearTimeout);
    timers = [];
  }

  function cancel() {
    ticket++;
    clearTimers();
    if (supported) synth.cancel();
  }

  // onWord(i) : indice du mot lu (-1 = plus aucun) ; onEnd() : fin de lecture.
  function speak(text, { onWord = () => {}, onEnd = () => {} } = {}) {
    if (!supported) return;
    cancel();
    const mine = ticket;
    const tokens = tokenize(text);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = RATE;
    if (voice) utterance.voice = voice;
    let boundarySeen = false;

    utterance.onboundary = (e) => {
      if (mine !== ticket || (e.name && e.name !== 'word')) return;
      boundarySeen = true;
      clearTimers();
      onWord(wordIndexAtChar(tokens, e.charIndex));
    };
    // Repli armé dès l'appel (certains navigateurs n'émettent ni `start` ni `boundary`) :
    // si aucun `boundary` n'est arrivé après FALLBACK_DELAY, on surligne selon les durées estimées.
    timers.push(setTimeout(() => {
      if (mine !== ticket || boundarySeen) return;
      const timings = estimateWordTimings(tokens, RATE);
      for (const { i, t } of timings) {
        timers.push(setTimeout(() => mine === ticket && !boundarySeen && onWord(i), Math.max(0, t - FALLBACK_DELAY)));
      }
      const last = tokens[tokens.length - 1];
      const endT = (timings.at(-1)?.t ?? 0) + (90 + 65 * (last?.word.length ?? 0)) / RATE;
      timers.push(setTimeout(() => mine === ticket && !boundarySeen && onWord(-1), endT - FALLBACK_DELAY));
    }, FALLBACK_DELAY));
    utterance.onend = utterance.onerror = () => {
      if (mine !== ticket) return;
      clearTimers();
      onWord(-1);
      onEnd();
    };
    synth.speak(utterance);
  }

  return { supported, speak, cancel };
}
