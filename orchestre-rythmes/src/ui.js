// Interface DOM : écrans, HUD, atelier, confettis, voix. Aucune logique de jeu ici.
import { getInstrument } from './logic/instruments.js';
import { PAS } from './logic/atelier.js';
import { palierDebloque, totalEtoiles } from './logic/score.js';

const $ = (id) => document.getElementById(id);
const ECRANS = { accueil: 'ecran-accueil', mode: 'ecran-mode', palier: 'ecran-palier', fin: 'ecran-fin' };

export function createUI(h) {
  let ecran = 'accueil';
  let voixActive = true;
  let timerBulle = 0;

  // ----- câblage statique -----
  $('btn-jouer').addEventListener('click', () => h.onJouer());
  $('btn-voix-accueil').addEventListener('click', () => h.onConsigne());
  $('btn-voix').addEventListener('click', () => h.onConsigne());
  $('btn-encore').addEventListener('click', () => h.onEncore());
  $('btn-suivant').addEventListener('click', () => h.onSuivant());
  document.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => h.onMode(b.dataset.mode)));
  document.querySelectorAll('[data-action]').forEach((b) =>
    b.addEventListener('click', () => (b.dataset.action === 'modes' ? h.onModes() : h.onMaison())),
  );
  $('at-play').addEventListener('click', () => h.onAtelierPlay());
  $('at-vider').addEventListener('click', () => h.onAtelierVider());

  function montrer(nom, { hud = false, atelier = false } = {}) {
    ecran = nom;
    for (const [k, id] of Object.entries(ECRANS)) $(id).classList.toggle('cache', k !== nom);
    $('hud').classList.toggle('cache', !hud);
    $('atelier').classList.toggle('cache', !atelier);
    if (!hud) setBulle('');
  }

  function setBulle(texte, type = '') {
    const b = $('bulle');
    b.textContent = texte;
    b.className = `bulle ${type}`.trim();
    if (texte) {
      b.classList.add('pop');
      clearTimeout(timerBulle);
      timerBulle = setTimeout(() => b.classList.remove('pop'), 180);
    }
  }

  /** `fait` pastilles pleines sur `total`. */
  function setPips(fait, total) {
    const c = $('pips');
    c.textContent = '';
    for (let i = 0; i < total; i++) {
      const p = document.createElement('span');
      p.className = `pip${i < fait ? ' plein' : ''}`;
      c.appendChild(p);
    }
  }

  function etoilesTexte(n) {
    return '★'.repeat(n) + '☆'.repeat(3 - n);
  }

  function majAccueil(prog) {
    const t = totalEtoiles(prog);
    $('accueil-etoiles').textContent = t > 0 ? `⭐ ${t}` : '';
  }

  function construirePaliers(mode, prog) {
    const c = $('paliers');
    c.textContent = '';
    for (let n = 1; n <= 3; n++) {
      const ouvert = palierDebloque(prog, mode, n);
      const b = document.createElement('button');
      b.className = 'palier-btn';
      b.disabled = !ouvert;
      b.setAttribute('aria-label', `Niveau ${n}`);
      const num = document.createElement('span');
      num.textContent = ouvert ? String(n) : '🔒';
      const et = document.createElement('span');
      et.className = 'p-etoiles';
      et.textContent = etoilesTexte(prog[mode][n - 1]);
      et.style.color = '#f5a800';
      b.append(num, et);
      b.addEventListener('click', () => ouvert && h.onPalier(n));
      c.appendChild(b);
    }
  }

  function afficherFin(etoiles, peutSuivant) {
    const c = $('fin-etoiles');
    c.textContent = '';
    for (let i = 0; i < 3; i++) {
      const s = document.createElement('span');
      s.className = `s${i < etoiles ? ' on' : ''}`;
      s.textContent = '⭐';
      s.style.animationDelay = `${0.3 + i * 0.35}s`;
      c.appendChild(s);
    }
    $('btn-suivant').classList.toggle('cache', !peutSuivant);
    montrer('fin');
    confettis();
  }

  // ----- atelier -----
  let boutonsCases = {};
  function construireAtelier(grille) {
    const g = $('at-grille');
    g.textContent = '';
    boutonsCases = {};
    for (const id of grille.ids) {
      const inst = getInstrument(id);
      boutonsCases[id] = [];
      const pastille = document.createElement('span');
      pastille.className = 'at-pastille';
      pastille.style.setProperty('--c', inst.couleur);
      pastille.title = inst.nom;
      g.appendChild(pastille);
      for (let pas = 0; pas < PAS; pas++) {
        const b = document.createElement('button');
        b.className = 'at-case';
        b.style.setProperty('--c', inst.couleur);
        b.setAttribute('aria-label', `${inst.nom}, temps ${pas + 1}`);
        b.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          h.onAtelierCase(id, pas);
        });
        g.appendChild(b);
        boutonsCases[id].push(b);
      }
    }
    majAtelier(grille);
  }
  function majAtelier(grille) {
    for (const id of grille.ids) grille.cases[id].forEach((on, i) => boutonsCases[id]?.[i]?.classList.toggle('on', on));
  }
  function setCurseur(pas) {
    for (const lignes of Object.values(boutonsCases)) lignes.forEach((b, i) => b.classList.toggle('cur', i === pas));
  }
  function setPlay(enCours) {
    $('at-play').textContent = enCours ? '⏸' : '▶';
    if (!enCours) setCurseur(-1);
  }

  // ----- images (manifeste) -----
  function appliquerImages(images) {
    if (images.titre) $('ecran-accueil').style.setProperty('--img-titre', `url("${images.titre}")`);
    if (images.fond) document.body.style.setProperty('--fond-img', `url("${images.fond}")`);
    if (images.icone) {
      let l = document.querySelector('link[rel="icon"]');
      if (!l) {
        l = document.createElement('link');
        l.rel = 'icon';
        document.head.appendChild(l);
      }
      l.type = 'image/png';
      l.href = images.icone;
    }
    document.querySelectorAll('.carte-img[data-img]').forEach((el) => {
      const src = images[el.dataset.img];
      if (!src) return;
      const img = new Image();
      img.alt = '';
      img.onload = () => el.replaceChildren(img);
      img.src = src;
    });
  }

  // ----- voix -----
  function dire(texte) {
    if (!voixActive || !('speechSynthesis' in window) || !texte) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(texte);
      u.lang = 'fr-FR';
      u.rate = 0.9;
      speechSynthesis.speak(u);
    } catch {
      /* voix indisponible */
    }
  }

  // ----- confettis -----
  let rafConf = 0;
  function confettis() {
    const cv = $('confettis');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = innerWidth * dpr;
    cv.height = innerHeight * dpr;
    const cx = cv.getContext('2d');
    cx.scale(dpr, dpr);
    const couleurs = ['#ff6b9d', '#ffd23f', '#3a86ff', '#2ec4b6', '#9b5de5', '#fb8500'];
    const ps = Array.from({ length: 140 }, () => ({
      x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight * 0.5,
      vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 4, r: 5 + Math.random() * 7,
      a: Math.random() * 6, va: (Math.random() - 0.5) * 0.3, c: couleurs[(Math.random() * couleurs.length) | 0],
    }));
    const debut = performance.now();
    cancelAnimationFrame(rafConf);
    const boucle = (now) => {
      cx.clearRect(0, 0, innerWidth, innerHeight);
      for (const p of ps) {
        p.x += p.vx; p.y += p.vy; p.a += p.va;
        cx.save();
        cx.translate(p.x, p.y);
        cx.rotate(p.a);
        cx.fillStyle = p.c;
        cx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
        cx.restore();
      }
      if (now - debut < 3500) rafConf = requestAnimationFrame(boucle);
      else cx.clearRect(0, 0, innerWidth, innerHeight);
    };
    rafConf = requestAnimationFrame(boucle);
  }

  return {
    montrer, setBulle, setPips, majAccueil, construirePaliers, afficherFin,
    construireAtelier, majAtelier, setCurseur, setPlay, appliquerImages, dire, confettis,
    ecran: () => ecran,
    debug: (texte) => {
      const d = $('debug');
      d.classList.remove('cache');
      d.textContent = texte;
    },
  };
}
