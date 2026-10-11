import { clamp } from './ease.js';

export const createReader = (count) => ({ index: 0, count });
export const goTo = (s, i) => ({ ...s, index: clamp(Math.trunc(i), 0, s.count - 1) });
export const next = (s) => goTo(s, s.index + 1);
export const prev = (s) => goTo(s, s.index - 1);
export const canNext = (s) => s.index < s.count - 1;
export const canPrev = (s) => s.index > 0;
export const direction = (from, to) => Math.sign(to - from);
