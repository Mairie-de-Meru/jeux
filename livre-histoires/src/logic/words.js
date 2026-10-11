const WORD = /[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu;
const OPENING = /^[«“"(\[¿¡]+$/;

export function tokenize(texte) {
  return [...texte.matchAll(WORD)].map((m) => ({
    word: m[0],
    start: m.index,
    end: m.index + m[0].length,
  }));
}

export function wordIndexAtChar(tokens, charIndex) {
  return tokens.findIndex((t) => charIndex < t.end);
}

// Découpe en « mots affichés » : la ponctuation suit le mot précédent,
// les guillemets ouvrants précèdent le mot suivant.
function displayWords(texte) {
  const tokens = tokenize(texte);
  const out = [];
  let prefix = '';
  for (const m of texte.matchAll(/\S+/g)) {
    const start = m.index;
    const end = start + m[0].length;
    const i = tokens.findIndex((t) => t.start >= start && t.start < end);
    if (i >= 0) {
      out.push({ i, text: prefix + m[0] });
      prefix = '';
    } else if (OPENING.test(m[0]) || out.length === 0) {
      prefix += m[0] + ' ';
    } else {
      out[out.length - 1].text += ' ' + m[0];
    }
  }
  return out;
}

export function layoutText(texte, measure, maxWidth, lineHeight) {
  const space = measure(' ');
  const lines = [];
  let line = null;
  let x = 0;
  for (const dw of displayWords(texte)) {
    const w = measure(dw.text);
    if (!line || x + space + w > maxWidth) {
      line = { y: lines.length * lineHeight, words: [] };
      lines.push(line);
      x = 0;
    } else {
      x += space;
    }
    line.words.push({ i: dw.i, x, w, text: dw.text });
    x += w;
  }
  return { lines, height: lines.length * lineHeight };
}

export function hitWord(layout, x, y, lineHeight) {
  const line = layout.lines[Math.floor(y / lineHeight)];
  if (!line || y < 0) return -1;
  const word = line.words.find((w) => x >= w.x && x <= w.x + w.w);
  return word ? word.i : -1;
}

// Instants de début (ms) de chaque mot ; une pause suit la ponctuation.
export function estimateWordTimings(tokens, rate = 1) {
  let t = 0;
  return tokens.map((tok, k) => {
    const entry = { i: k, t: Math.round(t) };
    const next = tokens[k + 1];
    const pause = next && next.start - tok.end > 1 ? 280 : 0;
    t += (90 + 65 * tok.word.length + pause) / rate;
    return entry;
  });
}
