import { tokenize } from './logic/words.js';
import { classifyPointer } from './logic/gesture.js';

const FADE_MS = 250;

// Lecteur HTML/CSS (sans WebGL) : même interface que book3d.js.
export function createFallback(host, handlers) {
  const root = document.createElement('div');
  root.className = 'fb';
  const left = document.createElement('div');
  const right = document.createElement('div');
  left.className = right.className = 'fb-page';
  root.append(left, right);
  host.appendChild(root);

  let story = null;
  let spreads = [];
  let images = new Map();
  let current = 0;
  let anim = null;
  let down = null;

  function illustration(url, emoji) {
    const box = document.createElement('div');
    box.className = 'fb-art';
    const img = images.get(url);
    if (img) {
      const el = document.createElement('img');
      el.src = img.src;
      el.alt = '';
      box.appendChild(el);
    } else {
      box.style.background = `linear-gradient(${story.couleur}, #fff8e8)`;
      box.textContent = emoji;
    }
    return box;
  }

  function textBox(texte) {
    const p = document.createElement('p');
    p.className = 'fb-text';
    let pos = 0;
    tokenize(texte).forEach((tok, i) => {
      p.append(texte.slice(pos, tok.start));
      const span = document.createElement('span');
      span.dataset.i = i;
      span.textContent = tok.word;
      p.appendChild(span);
      pos = tok.end;
    });
    p.append(texte.slice(pos));
    return p;
  }

  function render(i) {
    const sp = spreads[i];
    left.replaceChildren();
    right.replaceChildren();
    left.hidden = sp.kind === 'cover';
    if (sp.kind === 'cover') {
      right.append(illustration(sp.image, '🦊'));
      const title = document.createElement('h2');
      title.textContent = sp.titre;
      right.appendChild(title);
    } else if (sp.kind === 'page') {
      left.appendChild(illustration(sp.image, '🦊'));
      right.appendChild(textBox(sp.texte));
    } else {
      left.appendChild(illustration(null, '⭐'));
      const fin = document.createElement('h2');
      fin.textContent = 'Fin 🌟';
      right.appendChild(fin);
    }
  }

  function complete() {
    clearTimeout(anim.timer);
    const { target, done } = anim;
    anim = null;
    current = target;
    render(target);
    root.classList.remove('fade');
    done?.();
  }

  const finish = () => anim && complete();

  root.addEventListener('pointerdown', (e) => {
    down = { x: e.clientX, y: e.clientY, t: performance.now() };
  });
  root.addEventListener('pointerup', (e) => {
    if (!down) return;
    const dx = e.clientX - down.x;
    const dy = e.clientY - down.y;
    const dt = performance.now() - down.t;
    down = null;
    const word = e.target.closest?.('[data-i]');
    if (word && Math.abs(dx) < 10 && Math.abs(dy) < 10 && dt < 300 && handlers.wordTapEnabled()) {
      handlers.onWordTap(Number(word.dataset.i));
      return;
    }
    const rect = root.getBoundingClientRect();
    const kind = classifyPointer({ dx, dy, dt, x: e.clientX - rect.left, width: rect.width });
    if (kind) handlers.onGesture(kind);
  });

  return {
    async load(newStory, newSpreads, newImages) {
      story = newStory;
      spreads = newSpreads;
      images = newImages;
      current = 0;
      render(0);
    },
    unload() {
      anim = null;
      root.replaceChildren(left, right);
    },
    showSpread(i) {
      finish();
      current = i;
      render(i);
    },
    turnTo(target, done) {
      finish();
      root.classList.add('fade');
      anim = { target, done, timer: setTimeout(() => complete(), FADE_MS) };
    },
    finish,
    setHighlight(i) {
      root.querySelectorAll('[data-i]').forEach((el) => el.classList.toggle('hl', Number(el.dataset.i) === i));
    },
    resize() {},
    start() { root.hidden = false; },
    stop() { root.hidden = true; },
    get animating() { return anim !== null; },
  };
}
