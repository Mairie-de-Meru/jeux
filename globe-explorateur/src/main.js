// Amorçage, boucle de rendu, interactions et crochet de débogage window.__globe.
import { createScene } from './scene.js';
import { createGlobe } from './globe.js';
import { createPins } from './pins.js';
import { creerUI, charger, sauver } from './ui.js';
import { sons, parle, debloquer, setVoixAuto, voixActive, stopParole } from './audio.js';
import { RIVERS } from './data/rivers.js';
import { IMAGES } from './data/images.js';
import { CONTINENT_LIST, OCEAN_LIST, ITEM_LIST, COUNTRY_LIST, WONDER_LIST } from './data/items.js';
import { createSpin, dragStart, dragMove, dragEnd, step, aimAt, isTap } from './logic/inertia.js';
import { createZoom, zoomBy, pinch, stepZoom, resetZoom, rotationScale } from './logic/zoom.js';
import { createGame, currentMission, answerTap, answerFlag, nextPalier, targetPosition, PALIERS } from './logic/missions.js';
import { addSticker, count } from './logic/album.js';
import { continentAt } from './logic/geo.js';

function chargerImage(url) {
  return new Promise((res) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => res(null); // le jeu reste jouable sans l'image
    im.src = url;
  });
}

async function boot() {
  const entrees = await Promise.all(Object.entries(IMAGES).map(async ([k, u]) => [k, await chargerImage(u)]));
  const images = Object.fromEntries(entrees);

  const stage = document.getElementById('stage');
  const canvas = document.getElementById('gl');
  const sc = createScene(stage, canvas);
  const globe = createGlobe(images);
  sc.scene.add(globe.pivot);
  const pins = createPins(globe.pivot, images);
  const spin = createSpin();
  const zoom = createZoom({ min: 1, max: 2.5, value: 1 });
  spin.yaw = -0.3; spin.pitch = 0.25;

  const save = charger();
  let album = save.album, palierMax = save.palierMax;
  let game = createGame({ palier: 1 });
  let mode = 'accueil';
  let busy = false;
  let delai = new URLSearchParams(location.search).has('debug') ? 50 : 1700;

  const ui = creerUI({
    jouer: () => demarrer(palierMax),
    palier: (n) => demarrer(n),
    accueil: () => versAccueil(),
    ecouter: () => { const m = currentMission(game); if (m && mode === 'jeu') parle(m.parle, true); },
    basculerVoix: () => { setVoixAuto(!voixActive()); return voixActive(); },
    album: () => ui.showAlbum(album),
    suivant: () => suite(),
  }, images);
  ui.showAccueil(palierMax);

  // ---------- mission ----------
  function specPour(m) {
    if (m.kind === 'continent') return { continent: m.target };
    if (m.kind === 'ocean') return { ocean: m.target };
    if (m.kind === 'item') { const it = ITEM_LIST.find((i) => i.id === m.target); return { continent: it.continent, point: { ...it.pos, rayon: 6 } }; }
    if (m.kind === 'wonder') {
      const w = WONDER_LIST.find((x) => x.id === m.target);
      if (w.ocean) return { ocean: w.ocean };
      if (w.bande) return { bande: w.bande };
      if (w.fleuve) return { lignes: RIVERS[w.fleuve].lignes };
      return { points: w.cibles, rayon: Math.min(w.rayon, 8) };
    }
    return { point: { ...COUNTRY_LIST.find((c) => c.id === m.target).centre, rayon: 6 } };
  }

  function afficherMission() {
    if (mode !== 'jeu') return;
    busy = false;
    const m = currentMission(game);
    if (!m) { finPalier(); return; }
    ui.showMission(m.texte);
    globe.setHighlight(null);
    parle(m.parle);
    if (m.kind === 'flag') {
      const c = COUNTRY_LIST.find((x) => x.id === m.target);
      aimAt(spin, c.centre.lat, c.centre.lon);
      globe.setHighlight(specPour(m));
      ui.showFlags(m.choix.map((id) => ({ id, nom: COUNTRY_LIST.find((x) => x.id === id).nom })), (id) => repondreDrapeau(id, false));
    } else ui.hideFlags();
  }

  function demarrer(n) {
    debloquer(); stopParole();
    game = createGame({ palier: n });
    resetZoom(zoom);
    pins.clear(); globe.setHighlight(null);
    mode = 'jeu'; busy = false;
    ui.showJeu(); ui.setEtoiles(game.etoiles); ui.setVoix(voixActive());
    afficherMission();
  }

  function versAccueil() {
    stopParole(); mode = 'accueil'; busy = false; resetZoom(zoom);
    globe.setHighlight(null); ui.hideFlags(); ui.showAccueil(palierMax);
  }

  function finPalier() {
    const dernier = game.palier >= PALIERS.length;
    palierMax = Math.max(palierMax, Math.min(PALIERS.length, game.palier + 1));
    sauver(album, palierMax);
    mode = 'fin'; ui.showMission(''); ui.hideFlags(); globe.setHighlight(null);
    sons.fanfare(); ui.confetti(220);
    const titre = dernier ? 'Tu es un grand explorateur !' : 'Bravo ! Palier terminé !';
    const texte = dernier ? 'Tu connais tout le globe !' : PALIERS[game.palier].titre + ' : à toi de jouer !';
    ui.showFin({ titre, texte, etoiles: game.etoiles, dernier });
    parle(titre);
  }

  function suite() {
    ui.hideFin();
    if (game.palier >= PALIERS.length) { versAccueil(); return; }
    const g = nextPalier(game);
    game = g; pins.clear(); mode = 'jeu'; resetZoom(zoom);
    ui.showJeu(); ui.setEtoiles(game.etoiles);
    afficherMission();
  }

  function appliquer(res, m) {
    game = res.newState;
    if (res.ok) {
      busy = true;
      album = addSticker(album, res.reward);
      sauver(album, palierMax);
      sons.ok(); setTimeout(() => sons.etoile(), 350);
      ui.starsBurst(res.gain); ui.setEtoiles(game.etoiles); ui.confetti(); ui.pulseAlbum();
      globe.setHighlight(specPour(m));
      if (m.kind === 'item') { pins.addPin(m.target); setTimeout(() => sons.pose(), 150); }
      const fiche = m.kind === 'wonder' ? m.fiche : null;
      if (fiche) { ui.setIndice(fiche); parle(['Bravo !', 'Super !', 'Bien joué !'][game.etoiles % 3] + ' ' + fiche); }
      else parle(['Bravo !', 'Super !', 'Bien joué !'][game.etoiles % 3]);
      setTimeout(() => { if (mode === 'jeu') { if (game.termine) finPalier(); else afficherMission(); } }, fiche ? delai + (delai > 100 ? 3500 : 0) : delai);
    } else {
      sons.oups();
      const h = res.hint;
      if (h) {
        ui.setIndice(h.type === 'nom' ? h.dit : 'Regarde, c’est ici !');
        if (h.type === 'nom') parle(h.dit);
        else {
          parle('Regarde, c’est ici !');
          aimAt(spin, h.lat, h.lon);
          globe.setHighlight(specPour(m));
          if (m.kind === 'flag') ui.flagIndice(h.cible);
        }
      }
    }
    return res;
  }

  function repondreTap(lat, lon, force) {
    if (mode !== 'jeu' || (busy && !force)) return null;
    const m = currentMission(game);
    if (!m || m.kind === 'flag') return null;
    return appliquer(answerTap(game, { lat, lon }), m);
  }

  function repondreDrapeau(id, force) {
    if (mode !== 'jeu' || (busy && !force)) return null;
    const m = currentMission(game);
    if (!m || m.kind !== 'flag') return null;
    const res = answerFlag(game, id);
    ui.flagFeedback(id, res.ok);
    return appliquer(res, m);
  }

  // ---------- pointeur : rotation avec inertie, pincement = zoom, tap = réponse ----------
  const pointeurs = new Map(); // id -> {x, y}
  let ptr = null;     // doigt qui fait tourner le globe
  let pincement = null; // { d0, v0 } tant que deux doigts sont posés
  let sansTap = false;  // un pincement a eu lieu pendant ce geste : pas de tap
  const dist = () => { const [a, b] = [...pointeurs.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };

  canvas.addEventListener('pointerdown', (e) => {
    debloquer();
    canvas.setPointerCapture(e.pointerId);
    pointeurs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointeurs.size === 2) {
      pincement = { d0: Math.max(1, dist()), v0: zoom.target };
      sansTap = true; ptr = null; dragEnd(spin);
      return;
    }
    if (pointeurs.size > 2) return;
    sansTap = false;
    ptr = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), t0: performance.now(), total: 0 };
    dragStart(spin);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (pointeurs.has(e.pointerId)) pointeurs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pincement && pointeurs.size === 2) { pinch(zoom, pincement.d0, dist(), pincement.v0); return; }
    if (!ptr || e.pointerId !== ptr.id) return;
    const now = performance.now();
    const dx = e.clientX - ptr.x, dy = e.clientY - ptr.y;
    ptr.total += Math.hypot(dx, dy);
    const k = rotationScale(zoom); // plus on est près, plus la rotation est lente
    dragMove(spin, dx * k, dy * k, Math.max(0.001, (now - ptr.t) / 1000));
    ptr.x = e.clientX; ptr.y = e.clientY; ptr.t = now;
  });
  const fin = (e) => {
    const etait = pointeurs.delete(e.pointerId);
    if (pincement) {
      if (pointeurs.size < 2) pincement = null;
      if (pointeurs.size === 0) sansTap = false;
      return;
    }
    if (!etait || !ptr || e.pointerId !== ptr.id) return;
    dragEnd(spin);
    const duree = performance.now() - ptr.t0;
    const tap = e.type === 'pointerup' && !sansTap && isTap(ptr.total, duree);
    ptr = null;
    if (tap && mode === 'jeu') {
      const p = globe.pick(e.clientX, e.clientY, canvas, sc.camera);
      if (p) { sons.tap(); repondreTap(p.lat, p.lon, false); }
    }
  };
  canvas.addEventListener('pointerup', fin);
  canvas.addEventListener('pointercancel', fin);
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoomBy(zoom, Math.exp(-e.deltaY * 0.0015));
  }, { passive: false });
  document.getElementById('zoom-plus').addEventListener('click', () => zoomBy(zoom, 1.35));
  document.getElementById('zoom-moins').addEventListener('click', () => zoomBy(zoom, 1 / 1.35));

  // ---------- boucle ----------
  let last = performance.now();
  function boucle(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const t = now / 1000;
    if (mode !== 'jeu' && !spin.dragging && !spin.aim && Math.abs(spin.vYaw) < 0.2) spin.yaw += 0.12 * dt; // dérive douce
    stepZoom(zoom, dt); sc.setZoom(zoom.value);
    step(spin, dt);
    globe.setRotation(spin);
    globe.update(t);
    pins.update(t, dt, sc.camera);
    sc.stars.rotation.y = t * 0.01;
    sc.render();
    requestAnimationFrame(boucle);
  }
  requestAnimationFrame(boucle);

  // ---------- crochet de débogage ----------
  let pointsTerre = null;
  function pointDans(id) {
    pointsTerre = pointsTerre || {};
    if (pointsTerre[id]) return pointsTerre[id];
    const c = CONTINENT_LIST.find((x) => x.id === id).centre;
    let best = null, bd = 1e9;
    for (let la = -85; la <= 85; la += 2.5) for (let lo = -180; lo < 180; lo += 2.5) {
      if (continentAt(la, lo) !== id) continue;
      const d = (la - c.lat) ** 2 + (lo - c.lon) ** 2;
      if (d < bd) { bd = d; best = { lat: la, lon: lo }; }
    }
    return (pointsTerre[id] = best);
  }

  const resume = (r) => r && { ok: r.ok, hint: r.hint, etoiles: game.etoiles, termine: game.termine };
  window.__globe = {
    state() {
      const m = currentMission(game);
      return { mode, palier: game.palier, index: game.index, total: game.queue.length, etoiles: game.etoiles,
        erreurs: game.erreurs, termine: game.termine, fini: game.fini, mission: m, vignettes: count(album), palierMax,
        pins: pins.count(), zoom: zoom.value, yaw: spin.yaw, pitch: spin.pitch, occupe: busy };
    },
    palier(n) { demarrer(Math.max(1, Math.min(PALIERS.length, n))); return this.state(); },
    answer(lat, lon) { return resume(repondreTap(lat, lon, true)); },
    answerFlag(id) { return resume(repondreDrapeau(id, true)); },
    solve() {
      const m = currentMission(game);
      if (!m || mode !== 'jeu') return null;
      if (m.kind === 'flag') return resume(repondreDrapeau(m.target, true));
      let p;
      if (m.kind === 'continent') p = pointDans(m.target);
      else if (m.kind === 'ocean') p = OCEAN_LIST.find((o) => o.id === m.target).centre;
      else p = targetPosition(m.kind, m.target);
      return resume(repondreTap(p.lat, p.lon, true));
    },
    aim(lat, lon) { aimAt(spin, lat, lon); },
    zoomBy(f) { zoomBy(zoom, f); },
    setDelay(ms) { delai = ms; },
  };
}

boot().catch((e) => { console.error(e); });
