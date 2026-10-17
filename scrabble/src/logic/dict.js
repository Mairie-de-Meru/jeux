// Dictionnaire : module pur (ensemble de mots + index par longueur).
import { WORDS } from '../mots.js';

export function createDict(list = WORDS) {
  const set = new Set(list);
  const byLen = [];
  for (const w of set) (byLen[w.length] ||= []).push(w);
  return {
    has: (w) => set.has(w),
    size: set.size,
    words: [...set],
    byLen,
  };
}

export const defaultDict = createDict();
