// HUD DOM : accueil, cible, jauge « presque ! », palette, boutons. Très peu de texte.
export function createUI(h, images = {}) {
  const root = document.getElementById('hud');
  root.innerHTML = `
    <div id="top">
      <div id="cible"><div id="pastille"></div><div id="cibleNom"></div></div>
      <div id="jauge"><div id="jaugePiste"><div id="jaugeRemplie"></div></div><div id="jaugeEmoji">🙂</div><div id="jaugeTexte"></div></div>
      <div id="actions">
        <button id="btnVider" class="rond" aria-label="Vider">🧽</button>
        <button id="btnIndice" class="rond" aria-label="Indice">💡</button>
        <button id="btnLire" class="rond" aria-label="Lire à voix haute">🔊</button>
      </div>
    </div>
    <div id="message" class="hidden"></div>
    <button id="peindreBtn" class="grand hidden">🎨 Peindre !</button>
    <button id="retourBtn" class="grand hidden">✔ Suite</button>
    <div class="palette" id="palette"><div id="etoiles">⭐ 0</div><div id="swatches"></div></div>
    <div id="fin" class="ecran hidden"><div class="goutte">🎉</div><h1 id="titreFin" style="font-size:64px;margin:0">Bravo !</h1><div id="etoilesFin" style="font-size:48px;font-weight:800"></div><button id="rejouerBtn" class="grand">🔁 Rejouer</button></div>
    <div id="accueil" class="ecran">
      ${images.titre ? `<img id="titreImg" src="${images.titre}" alt="Atelier Couleurs">` : '<h1 id="titre">Atelier Couleurs</h1>'}
      ${images.peintre ? `<img class="peintre" src="${images.peintre}" alt="">` : '<div class="goutte">🎨</div>'}
      <button id="jouerBtn" class="grand">▶ Jouer</button>
      <button id="lireAccueil" class="rond" aria-label="Lire à voix haute">🔊</button>
    </div>`;
  const $ = (id) => document.getElementById(id);
  const el = {
    accueil: $('accueil'), top: $('top'), palette: $('palette'), swatches: $('swatches'), etoiles: $('etoiles'),
    pastille: $('pastille'), nom: $('cibleNom'), remplie: $('jaugeRemplie'), emoji: $('jaugeEmoji'), texte: $('jaugeTexte'),
    message: $('message'), peindre: $('peindreBtn'), retour: $('retourBtn'), fin: $('fin'),
    vider: $('btnVider'), indice: $('btnIndice'), lire: $('btnLire'),
  };
  let timerMsg = null;
  let palette = [];
  let mode = 'atelier';
  let brush = null;

  $('jouerBtn').onclick = () => h.onPlay();
  $('lireAccueil').onclick = () => h.onReadHome();
  el.vider.onclick = () => h.onEmpty();
  el.indice.onclick = () => h.onHint();
  el.lire.onclick = () => h.onRead();
  el.peindre.onclick = () => h.onPaintGo();
  el.retour.onclick = () => h.onBack();
  $('rejouerBtn').onclick = () => h.onReplay();

  function renderPalette(arrivee = null) {
    el.swatches.innerHTML = '';
    for (const c of palette) {
      const b = document.createElement('button');
      b.className = 'sw' + (c.hex === brush && mode === 'peinture' ? ' sel' : '') + (c.id === arrivee ? ' arrive' : '');
      b.style.background = c.hex;
      b.setAttribute('aria-label', c.nom);
      b.dataset.id = c.id;
      b.onclick = () => { if (mode === 'peinture') { brush = c.hex; renderPalette(); h.onBrush(c.hex); } };
      el.swatches.appendChild(b);
    }
  }

  return {
    showHome(v) { el.accueil.classList.toggle('hidden', !v); },
    showFin(v, etoiles = 0) { el.fin.classList.toggle('hidden', !v); if (v) $('etoilesFin').textContent = '⭐ ' + etoiles; },
    setMode(m) {
      mode = m;
      const atelier = m === 'atelier';
      el.top.classList.toggle('hidden', !atelier);
      el.retour.classList.toggle('hidden', atelier);
      el.peindre.classList.add('hidden');
      renderPalette();
    },
    setTarget(cible, hex) {
      el.pastille.style.background = cible ? hex : '#eee';
      el.nom.textContent = cible ? cible.nom : '';
    },
    setGauge(prox, trouve) {
      el.remplie.style.width = Math.round(prox * 100) + '%';
      el.emoji.textContent = trouve ? '🤩' : prox >= 0.7 ? '😃' : prox >= 0.4 ? '🙂' : prox > 0 ? '🤔' : '🫧';
      el.texte.textContent = trouve ? 'Bravo !' : prox >= 0.7 ? 'Presque !' : '';
    },
    setStars(n) { el.etoiles.textContent = '⭐ ' + n; },
    setPalette(list, nouveauId = null) { palette = list; renderPalette(nouveauId); },
    setBrush(hex) { brush = hex; renderPalette(); },
    message(txt, ms = 2600) {
      el.message.textContent = '';
      if (images.peintre) { const i = document.createElement('img'); i.src = images.peintre; i.alt = ''; el.message.appendChild(i); }
      el.message.appendChild(document.createTextNode(txt));
      el.message.classList.remove('hidden');
      clearTimeout(timerMsg);
      timerMsg = setTimeout(() => el.message.classList.add('hidden'), ms);
    },
    pulse(nom) {
      const b = el[nom];
      b.classList.remove('pulse');
      void b.offsetWidth;
      b.classList.add('pulse');
    },
    showPeindre(v) { el.peindre.classList.toggle('hidden', !v); },
    // Une pastille de la couleur trouvée vole de la cible vers la palette.
    voler(hex, fini) {
      const a = el.pastille.getBoundingClientRect();
      const b = el.swatches.getBoundingClientRect();
      const d = document.createElement('div');
      d.className = 'vole';
      d.style.background = hex;
      d.style.left = a.left + 'px';
      d.style.top = a.top + 'px';
      document.body.appendChild(d);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        d.style.transform = `translate(${b.left + Math.min(b.width, palette.length * 80) - a.left}px, ${b.top - a.top + 10}px) scale(.85)`;
      }));
      setTimeout(() => { d.remove(); if (fini) fini(); }, 850);
    },
    // Hauteurs occupées par le HUD (px), pour cadrer la caméra.
    insets() {
      el.message.style.top = el.top.offsetHeight + 4 + 'px';
      return { haut: mode === 'atelier' ? el.top.offsetHeight + 8 : 90, bas: el.palette.offsetHeight + 8 };
    },
  };
}
