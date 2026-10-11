// Interface DOM : écrans, boutons, bulles, gestes. Aucune logique de jeu ici.
const $ = (id) => document.getElementById(id);
const GENRES = {
  passage: ['🚸', 'Passage piéton'],
  entreVoitures: ['🚗🚗', 'Entre les voitures'],
  horsPassage: ['📍', 'Ici'],
};

export function createUI(h) {
  const el = {
    home: $('home'), hud: $('hud'), bubble: $('bubble'), hint: $('hint'), bottom: $('bottom'),
    choose: $('act-choose'), move: $('act-move'), levelend: $('levelend'), diploma: $('diploma'),
    left: $('btn-left'), right: $('btn-right'), walk: $('btn-walk'), run: $('btn-run'),
    levels: $('levels'), debug: $('debug'), layer: $('star-layer'),
  };
  const pulseKey = { regarderGauche: el.left, regarderDroite: el.right, marcher: el.walk };
  let chooseBtns = [];
  let mascotteUrl = null;

  $('btn-play').onclick = () => h.onPlay();
  $('btn-voice').onclick = () => h.onVoiceToggle();
  $('btn-speak').onclick = () => h.onSpeak();
  $('btn-home').onclick = () => h.onHome();
  $('btn-end-home').onclick = () => h.onHome();
  $('btn-diploma-home').onclick = () => h.onHome();
  $('btn-next').onclick = () => h.onNext();
  $('btn-retry').onclick = () => h.onRetry();
  $('btn-replay').onclick = () => h.onReplay();
  el.left.onclick = () => h.onLook('gauche');
  el.right.onclick = () => h.onLook('droite');
  el.walk.onclick = () => h.onGo('marcher');
  el.run.onclick = () => h.onGo('courir');

  const stars = (n) => '⭐'.repeat(n) + '☆'.repeat(3 - n);
  const show = (node, v) => node.classList.toggle('hidden', !v);

  return {
    showHome(etoiles, isUnlocked, levels, voiceOn) {
      show(el.home, true); show(el.hud, false); show(el.bubble, false); show(el.hint, false);
      show(el.bottom, false); show(el.levelend, false); show(el.diploma, false);
      $('btn-voice').classList.toggle('off', !voiceOn);
      el.levels.textContent = '';
      levels.forEach((lv, i) => {
        const b = document.createElement('button');
        const ok = isUnlocked(i);
        b.className = 'level-card' + (ok ? '' : ' locked');
        b.disabled = !ok;
        b.innerHTML = `<span class="ico">${ok ? ['🏫', '🌳', '🥖'][i] : '🔒'}</span><span>${lv.nom}</span><span class="st">${ok ? stars(etoiles[i]) : ''}</span>`;
        b.onclick = () => h.onLevel(i);
        el.levels.appendChild(b);
      });
    },
    showPlay() {
      show(el.home, false); show(el.levelend, false); show(el.diploma, false);
      show(el.hud, true); show(el.bottom, true);
    },
    showLevelEnd(n, hasNext) {
      $('end-stars').textContent = stars(n);
      show($('btn-next'), hasNext);
      show(el.levelend, true); show(el.bottom, false); show(el.hint, false); show(el.bubble, false);
    },
    showDiploma(etoiles, levels) {
      const box = $('diploma-stars'); box.textContent = '';
      etoiles.forEach((n, i) => {
        const r = document.createElement('div'); r.className = 'drow';
        r.textContent = `${['🏫', '🌳', '🥖'][i] ?? '📍'} ${stars(n)}`;
        r.title = levels[i]?.nom ?? '';
        box.appendChild(r);
      });
      const tot = document.createElement('div'); tot.className = 'dtotal';
      tot.textContent = `${etoiles.reduce((a, b) => a + b, 0)} / ${etoiles.length * 3}`;
      box.appendChild(tot);
      show(el.diploma, true); show(el.bottom, false); show(el.hint, false); show(el.bubble, false);
    },
    setBranding(assets) {
      const t = $('titre');
      if (assets.has('titre.png')) { t.classList.add('img'); t.style.backgroundImage = `url(${assets.url('titre.png')})`; t.textContent = 'Code de la Rue'; }
      if (assets.has('mascotte.png')) { const m = $('mascotte'); m.src = assets.url('mascotte.png'); show(m, true); mascotteUrl = assets.url('mascotte.png'); }
      if (assets.has('diplome.png')) el.diploma.style.backgroundImage = `url(${assets.url('diplome.png')})`;
      if (assets.has('icone.png')) $('favicon').href = assets.url('icone.png');
    },
    setHud(nom, etoiles) { $('hud-level').textContent = nom; $('hud-stars').textContent = '⭐ ' + etoiles; },
    setBubble(text, kind = '') {
      if (!text) { show(el.bubble, false); return; }
      el.bubble.textContent = '';
      if (mascotteUrl) { const im = document.createElement('img'); im.src = mascotteUrl; im.alt = ''; el.bubble.appendChild(im); }
      const sp = document.createElement('span'); sp.textContent = text; el.bubble.appendChild(sp);
      el.bubble.className = kind;
      el.bubble.style.animation = 'none'; void el.bubble.offsetWidth; el.bubble.style.animation = '';
      show(el.bubble, true);
    },
    // spots : [{id, genre}] pendant la phase de choix, sinon []
    setChoices(spots) {
      el.choose.textContent = ''; chooseBtns = [];
      show(el.choose, spots.length > 0); show(el.move, spots.length === 0);
      for (const s of spots) {
        const [e, l] = GENRES[s.genre] ?? ['📍', 'Ici'];
        const b = document.createElement('button');
        b.className = 'act'; b.dataset.id = s.id;
        b.innerHTML = `<span class="e">${e}</span><span class="l">${l}</span>`;
        b.onclick = () => h.onChoose(s.id);
        el.choose.appendChild(b); chooseBtns.push(b);
      }
    },
    setEnabled(v) {
      for (const b of [el.left, el.right, el.walk, el.run, ...chooseBtns]) b.disabled = !v;
    },
    setProgress(leftDone, rightDone) {
      el.left.classList.toggle('done', leftDone); el.right.classList.toggle('done', rightDone);
    },
    // action : sortie de prochaineAction ; hintSpot : id du spot à mettre en valeur
    setHint(action, visible, hintSpot) {
      for (const b of [el.left, el.right, el.walk, ...chooseBtns]) b.classList.remove('pulse');
      show(el.hint, visible && action === 'attendre');
      if (!visible) return;
      if (pulseKey[action]) pulseKey[action].classList.add('pulse');
      if (action === 'choisir') chooseBtns.find((b) => b.dataset.id === hintSpot)?.classList.add('pulse');
    },
    popStar(px, py) {
      const s = document.createElement('div');
      s.className = 'fly-star'; s.textContent = '⭐';
      s.style.left = px + 'px'; s.style.top = py + 'px';
      el.layer.appendChild(s);
      setTimeout(() => s.remove(), 1400);
    },
    debug(text) { if (text == null) show(el.debug, false); else { el.debug.textContent = text; show(el.debug, true); } },
  };
}

// Glissé horizontal = regarder (gauche/droite) ; simple appui = toucher une zone lumineuse.
export function attachGestures(canvas, { onSwipe, onTap }) {
  let start = null;
  canvas.addEventListener('pointerdown', (e) => { start = { x: e.clientX, y: e.clientY, id: e.pointerId }; });
  const end = (e) => {
    if (!start || start.id !== e.pointerId) return;
    const dx = e.clientX - start.x, dy = e.clientY - start.y;
    const s = start; start = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.2) onSwipe(dx < 0 ? 'gauche' : 'droite');
    else if (Math.hypot(dx, dy) < 14) onTap(s.x, s.y);
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', () => { start = null; });
}
