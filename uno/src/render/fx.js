// Effets spéciaux (DOM + 3D) : passe, sens inverse, +2/+4, Uno !, bulles. Éléments réutilisés (pool de éclats).
const SHARD_COLORS = ['#e8454d', '#2d78d6', '#2ba866', '#f2b21f', '#ff8fd0', '#ffffff'];

export function createFx({ root, scene, dur, avatarOf }) {
  const off = () => dur(1) === 0; // mode rapide : aucun effet
  const wait = (ms) => new Promise((r) => setTimeout(r, dur(ms)));
  const shards = [];

  function mk(cls, html = '', ms = 1000) {
    const e = document.createElement('div');
    e.className = cls; e.innerHTML = html; root.appendChild(e);
    setTimeout(() => e.remove(), window.__fxHold ? 60000 : ms + 100); // __fxHold : captures de contrôle
    return e;
  }
    function placeAt(el, pt) { el.style.left = pt.x + 'px'; el.style.top = pt.y + 'px'; }
  function seatPoint(p, dy = 0) {
    if (p === 0) {
      const h = document.getElementById('hand').getBoundingClientRect();
      return { x: h.left + h.width / 2, y: h.top - 10 + dy };
    }
    const s = scene.screenOf(scene.seatPos(p));
    return { x: s.x, y: s.y - 45 + dy };
  }

  function burst(pt, n = 16, spread = 120) {
    for (let i = 0; i < n; i++) {
      let s = shards.find((x) => !x.busy);
      if (!s) { s = { el: document.createElement('i'), busy: false }; s.el.className = 'fx-shard'; root.appendChild(s.el); shards.push(s); }
      s.busy = true;
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.5, r = spread * (0.6 + Math.random() * 0.7);
      const e = s.el;
      e.style.cssText = `left:${pt.x}px;top:${pt.y}px;--dx:${Math.cos(a) * r}px;--dy:${Math.sin(a) * r}px;--c:${SHARD_COLORS[i % SHARD_COLORS.length]}`;
      e.classList.remove('go'); void e.offsetWidth; e.classList.add('go');
      setTimeout(() => { e.classList.remove('go'); s.busy = false; }, 800);
    }
  }

  const POWER = {
    skip: { title: 'Passe !', cls: 'skip' },
    reverse: { title: 'Sens inverse !', cls: 'reverse' },
    draw2: { title: '+2 !', cls: 'draw2' },
    draw4: { title: '+4 !', cls: 'draw4' },
    wild: { title: 'Joker !', cls: 'wild' },
  };
  const mix = (hex, t) => { // t > 0 : vers le blanc, t < 0 : vers le noir
    const n = parseInt(hex.slice(1), 16), ch = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(t > 0 ? v + (255 - v) * t : v * (1 + t)));
    return `rgb(${ch.join(',')})`;
  };
  const COLORS = { R: '#e8454d', B: '#2d78d6', G: '#2ba866', Y: '#f2b21f' };
  const ART = {
    skip: '<div class="pw-ban"><b></b></div>',
    reverse: '<svg class="pw-arrows" viewBox="0 0 100 100"><path d="M14 56 A38 38 0 0 1 70 18" fill="none" stroke="var(--fg)" stroke-width="12" stroke-linecap="round"/><polygon points="58,2 92,22 56,40" fill="var(--fg)"/><g transform="rotate(180 50 50)"><path d="M14 56 A38 38 0 0 1 70 18" fill="none" stroke="var(--c3)" stroke-width="12" stroke-linecap="round"/><polygon points="58,2 92,22 56,40" fill="var(--c3)"/></g></svg>',
    draw2: '<div class="pw-cards"><i style="--r:-22deg;--x:-70px"></i><i style="--r:22deg;--x:70px"></i></div><div class="pw-big">+2</div>',
    draw4: '<svg class="pw-bolts" viewBox="0 0 200 200"><polygon points="40,0 70,0 55,60 85,60 30,160 45,85 20,85" fill="#fff36b"/><polygon points="150,10 180,10 165,70 190,70 140,170 150,95 125,95" fill="#fff36b"/></svg><div class="pw-cards"><i style="--r:-36deg;--x:-105px"></i><i style="--r:-12deg;--x:-35px"></i><i style="--r:12deg;--x:35px"></i><i style="--r:36deg;--x:105px"></i></div><div class="pw-big shake">+4</div>',
    wild: '<div class="pw-wheel"></div>',
  };

  // Écran de puissance plein écran (~0,9 s) : même rendu pour humains et robots.
  async function power(kind, { p = 0, color = null } = {}) {
    if (off() || !POWER[kind]) return;
    const d = POWER[kind];
    const who = p >= 0 && avatarOf ? avatarOf(p) : '';
    const hex = COLORS[color] || '#8a8aa8';
    const sw = kind === 'wild' || kind === 'draw4'; // couleur choisie : le fond bascule après la roue / les éclairs
    const el = mk(`pw pw-${d.cls}${sw ? ' pw-sw' : ''}`, `<div class="pw-bg"></div>${sw ? '<div class="pw-bgc"></div>' : ''}<div class="pw-rays"></div><div class="pw-art">${ART[kind]}</div><div class="pw-who">${who}</div><div class="pw-title">${d.title}</div>`, sw ? 1500 : 1000);
    const yellow = color === 'Y';
    el.style.cssText += `--c:${hex};--c2:${mix(hex, -0.35)};--c3:${mix(hex, 0.35)};--fg:${yellow ? '#4a2f00' : '#fff'};--st:${yellow ? 'rgba(255,255,255,.7)' : 'rgba(0,0,0,.35)'};`;
    el.style.setProperty('--dur', dur(sw ? 1400 : 900) / 1000 + 's'); // joker / +4 : 0,5 s de plus pour voir la couleur choisie
    const app = document.getElementById('app');
    app.classList.remove('quake'); void app.offsetWidth; app.classList.add('quake');
    setTimeout(() => app.classList.remove('quake'), 450);
    setTimeout(() => burst({ x: innerWidth / 2, y: innerHeight * 0.42 }, kind === 'draw4' ? 28 : 20, Math.min(innerWidth, innerHeight) * 0.45), dur(250));
    await wait(sw ? 1250 : 750);
  }

  function uno(name) {
    if (off()) return;
    const el = mk('fx-uno', `<div class="word">${['U', 'N', 'O', '!'].map((c, i) => `<span style="--i:${i}">${c}</span>`).join('')}</div>`, 1250);
    const r = el.getBoundingClientRect();
    burst({ x: r.width / 2, y: r.height / 2 }, 22, Math.min(r.width, r.height) * 0.4);
  }

  // Texte « Uno ! » animé au-dessus de l'avatar (ou de l'éventail pour le joueur), ~1,5 s
  function unoText(p) {
    if (off()) return;
    const el = mk('fx-unotext', ['U', 'N', 'O', '!'].map((c, i) => `<span style="--i:${i}">${c}</span>`).join(''), 1500);
    if (p === 0) return placeAt(el, seatPoint(0, -34));
    // robot du haut : à côté de l'avatar, au-delà de la bulle ; robots de côté : au-dessus de la tête, vers le centre
    const pt = seatPoint(p, 0), side = pt.x > innerWidth / 2 ? -1 : 1;
    const r = el.getBoundingClientRect(), w = r.width / 2 + 8, top = pt.y < innerHeight * 0.3;
    const x = top ? pt.x + side * (60 + w) : pt.x + side * 40;
    placeAt(el, { x: Math.max(w, Math.min(innerWidth - w, x)), y: top ? pt.y + 10 : Math.max(r.height / 2 + 60, pt.y - 40) });
  }

  function bubble(p, text, ms = 2200) {
    if (off()) return;
    const el = mk('fx-bubble', text, ms);
    placeAt(el, seatPoint(p, p === 0 ? -20 : 70));
  }

  return { power, uno, unoText, bubble, burst };
}
