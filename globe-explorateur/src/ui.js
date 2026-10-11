// Interface DOM : accueil, bandeau, drapeaux, album, étoiles, confettis, sauvegarde.
import { drawFlag } from './flags.js';
import { ALBUM_SLOTS, count, hasSticker, serialize, deserialize, createAlbum } from './logic/album.js';
import { CONTINENT_LIST, OCEAN_LIST, ITEM_LIST, COUNTRY_LIST, WONDER_LIST } from './data/items.js';
import { emojiCanvas } from './sprites.js';
import { PALIERS } from './logic/missions.js';

const $ = (id) => document.getElementById(id);
const CLE = 'globe-explorateur-v1';

export function charger() {
  try {
    const d = JSON.parse(localStorage.getItem(CLE) || 'null');
    if (d && typeof d === 'object') {
      return { album: deserialize(d.album), palierMax: Math.max(1, Math.min(PALIERS.length, Number(d.palierMax) || 1)) };
    }
  } catch { /* stockage indisponible ou corrompu */ }
  return { album: createAlbum(), palierMax: 1 };
}

export function sauver(album, palierMax) {
  try { localStorage.setItem(CLE, JSON.stringify({ album: serialize(album), palierMax })); } catch { /* ignoré */ }
}

const ICONES_PALIER = ['🌍', '🌊', '🦁', '🚩', '🏔️'];

function nomDe(slot) {
  const l = { continent: CONTINENT_LIST, ocean: OCEAN_LIST, item: ITEM_LIST, flag: COUNTRY_LIST, wonder: WONDER_LIST }[slot.kind];
  const x = l.find((e) => e.id === slot.id);
  if (slot.kind === 'continent') return x.nom;
  const n = x.nom.replace(/^(l'|le |la |les )/, '');
  return n.charAt(0).toUpperCase() + n.slice(1);
}

export function creerUI(cb, images) {
  const el = {
    body: document.body, hud: $('hud'), texte: $('mission-texte'), indice: $('indice'), nb: $('nb-etoiles'),
    flags: $('flags'), accueil: $('accueil'), fin: $('fin'), album: $('album'), pop: $('pop'),
    paliers: $('paliers'), btnAlbum: $('btn-album'), voix: $('btn-voix'),
  };

  if (images.titre) { const t = $('titre-img'); t.src = images.titre.src; t.hidden = false; $('titre-txt').hidden = true; }

  $('btn-home').addEventListener('click', () => cb.accueil());
  $('btn-ecouter').addEventListener('click', () => cb.ecouter());
  el.voix.addEventListener('click', () => { el.voix.classList.toggle('off', !cb.basculerVoix()); });
  $('btn-jouer').addEventListener('click', () => cb.jouer());
  el.btnAlbum.addEventListener('click', () => cb.album());
  $('album-fermer').addEventListener('click', () => { el.album.hidden = true; });
  $('fin-suivant').addEventListener('click', () => cb.suivant());
  $('fin-accueil').addEventListener('click', () => cb.accueil());

  function mesurer() {
    const haut = el.hud.hidden ? 0 : el.hud.offsetHeight;
    const bas = el.flags.hidden ? 0 : el.flags.offsetHeight;
    document.documentElement.style.setProperty('--top', haut + 'px');
    document.documentElement.style.setProperty('--bottom', bas + 'px');
  }
  if (typeof ResizeObserver !== 'undefined') { new ResizeObserver(mesurer).observe(el.hud); new ResizeObserver(mesurer).observe(el.flags); }
  window.addEventListener('resize', mesurer);

  const ui = {
    mesurer,
    showAccueil(palierMax) {
      el.body.className = 'mode-accueil';
      el.hud.hidden = true; el.flags.hidden = true; el.fin.hidden = true; el.album.hidden = true; el.accueil.hidden = false;
      el.paliers.innerHTML = '';
      PALIERS.forEach((p, i) => {
        const b = document.createElement('button');
        b.className = 'gros'; b.disabled = p.n > palierMax;
        b.innerHTML = (b.disabled ? '🔒' : ICONES_PALIER[i]) + `<small>${p.n}</small>`;
        b.setAttribute('aria-label', p.titre);
        b.addEventListener('click', () => cb.palier(p.n));
        el.paliers.appendChild(b);
      });
      mesurer();
    },
    showJeu() {
      el.body.className = 'mode-jeu';
      el.accueil.hidden = true; el.fin.hidden = true; el.hud.hidden = false;
      mesurer();
    },
    showMission(texte) { el.texte.textContent = texte; el.indice.textContent = ''; },
    setIndice(t) { el.indice.textContent = t || ''; },
    setEtoiles(n) { el.nb.textContent = String(n); },
    setVoix(on) { el.voix.classList.toggle('off', !on); },

    showFlags(choix, onPick) {
      el.flags.innerHTML = '';
      for (const c of choix) {
        const b = document.createElement('button');
        b.className = 'gros'; b.dataset.id = c.id; b.setAttribute('aria-label', 'Drapeau ' + c.nom);
        const cv = document.createElement('canvas'); drawFlag(cv, c.id); b.appendChild(cv);
        b.addEventListener('click', () => onPick(c.id));
        el.flags.appendChild(b);
      }
      el.flags.hidden = false; mesurer();
    },
    hideFlags() { el.flags.hidden = true; el.flags.innerHTML = ''; mesurer(); },
    flagFeedback(id, ok) {
      const b = el.flags.querySelector(`button[data-id="${id}"]`); if (!b) return;
      b.classList.remove('essaie', 'bon', 'indice'); void b.offsetWidth;
      b.classList.add(ok ? 'bon' : 'essaie');
    },
    flagIndice(id) { const b = el.flags.querySelector(`button[data-id="${id}"]`); if (b) b.classList.add('indice'); },

    pulseAlbum() { el.btnAlbum.classList.remove('pulse'); void el.btnAlbum.offsetWidth; el.btnAlbum.classList.add('pulse'); },

    starsBurst(n) {
      const s = document.createElement('span'); s.className = 'p'; s.textContent = '⭐'.repeat(Math.max(1, n));
      el.pop.innerHTML = ''; el.pop.appendChild(s);
    },

    showAlbum(album) {
      const g = $('album-grille'); g.innerHTML = '';
      $('album-compte').textContent = `${count(album)} / ${ALBUM_SLOTS.length}`;
      for (const slot of ALBUM_SLOTS) {
        const plein = hasSticker(album, slot.id);
        const d = document.createElement('div'); d.className = 'vignette ' + (plein ? 'plein' : 'vide');
        const ico = document.createElement('div'); ico.className = 'ico';
        if (!plein) ico.textContent = '❓';
        else if (slot.kind === 'flag') ico.appendChild(drawFlag(document.createElement('canvas'), slot.id));
        else if (slot.kind === 'item' && images[slot.id]) { const im = document.createElement('img'); im.src = images[slot.id].src; im.alt = ''; ico.appendChild(im); }
        else if (slot.kind === 'item' || slot.kind === 'wonder') {
          const e = (slot.kind === 'item' ? ITEM_LIST : WONDER_LIST).find((x) => x.id === slot.id).emoji;
          const cv = emojiCanvas(e, 96); cv.style.width = '52px'; cv.style.height = '52px'; ico.appendChild(cv);
        } else ico.textContent = slot.kind === 'ocean' ? '🌊' : '🌍';
        d.appendChild(ico);
        const nom = document.createElement('div'); nom.textContent = plein ? nomDe(slot) : '?'; d.appendChild(nom);
        g.appendChild(d);
      }
      el.album.hidden = false;
    },

    showFin({ titre, texte, etoiles, dernier }) {
      $('fin-titre').textContent = titre; $('fin-texte').textContent = texte;
      $('fin-etoiles').textContent = '⭐ ' + etoiles;
      $('fin-suivant').textContent = dernier ? '🏆 Rejouer' : '▶ Suite';
      el.fin.hidden = false;
    },
    hideFin() { el.fin.hidden = true; },
    confetti,
  };
  return ui;
}

// --- confettis (canvas 2D plein écran, boucle active seulement pendant l'animation) ---
let parts = [], enCours = false;
function confetti(n = 110) {
  const cv = $('confetti'), ctx = cv.getContext('2d');
  cv.width = window.innerWidth; cv.height = window.innerHeight;
  const cols = ['#ff5d73', '#ffd93d', '#3ecf6e', '#1e6bff', '#a66cff', '#ff9f1c'];
  for (let i = 0; i < n; i++) {
    parts.push({ x: cv.width / 2, y: cv.height * 0.4, vx: (Math.random() - 0.5) * 900, vy: -Math.random() * 700 - 200,
      r: Math.random() * 6, c: cols[i % cols.length], rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12, vie: 2 + Math.random() });
  }
  if (enCours) return;
  enCours = true;
  let t0 = performance.now();
  const boucle = (t) => {
    const dt = Math.min(0.05, (t - t0) / 1000); t0 = t;
    ctx.clearRect(0, 0, cv.width, cv.height);
    parts = parts.filter((p) => p.vie > 0 && p.y < cv.height + 20);
    for (const p of parts) {
      p.vy += 1100 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; p.vie -= dt;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c;
      ctx.fillRect(-p.r - 3, -p.r, p.r * 2 + 6, p.r * 1.4 + 3); ctx.restore();
    }
    if (parts.length) requestAnimationFrame(boucle); else { enCours = false; ctx.clearRect(0, 0, cv.width, cv.height); }
  };
  requestAnimationFrame(boucle);
}
