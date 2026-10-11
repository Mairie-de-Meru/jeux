// Orchestration des écrans + crochet de débogage window.__coloriage.
import { IMAGES } from './manifest.js';
import { PAGES } from './logic/pages.js';
import { PALETTE } from './logic/palette.js';
import { replaceArtwork } from './logic/gallery.js';
import { safeStorage, loadGallery, saveGallery } from './logic/storage.js';
import { createEditor } from './ui/editor.js';
import { createToolbar } from './ui/toolbar.js';
import { createScreens } from './ui/screens.js';
import { createSound } from './ui/sound.js';
import { speak } from './ui/speech.js';
import { confetti } from './ui/confetti.js';
import { drawLineArt, exampleCanvas } from './ui/lineart.js';
import { createGallery3D } from './three/gallery3d.js';

const $ = (id) => document.getElementById(id);
const sound = createSound();
const screens = createScreens();
const store = safeStorage(window);
let gallery = loadGallery(store);
let pageId = null;
let mode = 'coloriage';
let gallery3d = null;
let editingId = null;

const CONSIGNES = {
  accueil: 'Bienvenue ! Choisis : coloriage, dessin libre, ou la galerie.',
  choix: 'Choisis un dessin à colorier.',
  coloriage: 'Choisis une couleur, puis touche une zone pour la peindre.',
  libre: 'Choisis un pinceau et une couleur, puis dessine avec ton doigt.',
};

// --- atelier
const editor = createEditor($('stage'), { sound, onChange: (h) => toolbar.setHistory(h) });
const toolbar = createToolbar({
  toolsEl: $('tools'),
  paletteEl: $('palette'),
  topbarEl: $('atelier-topbar'),
  onTool: (id) => setTool(id),
  onColor: (i) => setColor(i),
  onAction: (a) => action(a),
});

function setTool(id) { editor.setTool(id); toolbar.setTool(id); }
function setColor(i) { editor.setColor(i); toolbar.setColor(editor.getColor()); }

function enterAtelier(m) {
  mode = m;
  toolbar.setMode(m);
  toolbar.setTool(editor.getTool());
  toolbar.setColor(editor.getColor());
  toolbar.setHistory({ canUndo: false, canRedo: false });
  show('atelier');
  editor.lock();
  editor.fit();
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image absente'));
    img.src = src;
  });
}

async function openPage(id, keepEdit = false) {
  if (keepEdit !== true) editingId = null;
  const page = PAGES.find((p) => p.id === id);
  if (!page) return false;
  let drawFn = null;
  if (page.image) {
    try {
      const img = await loadImage(page.image);
      drawFn = (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h);
    } catch (e) { /* repli ci-dessous */ }
  }
  if (!drawFn && page.draw) drawFn = (ctx, w, h) => drawLineArt(ctx, w, h, page.draw);
  if (!drawFn) { screens.toast('Ce dessin n\'est pas disponible'); show('choix'); return false; }
  pageId = id;
  editor.loadLine(drawFn);
  enterAtelier('coloriage');
  setTool('pot');
  return true;
}

function freeDraw(keepEdit = false) {
  if (keepEdit !== true) editingId = null;
  pageId = null;
  editor.freeDraw();
  enterAtelier('libre');
  setTool('gros');
  return true;
}

function hang() {
  const page = PAGES.find((p) => p.id === pageId);
  const item = {
    id: editingId || Date.now().toString(36) + Math.floor(Math.random() * 1000),
    titre: page ? page.titre : 'Dessin libre',
    mode: page ? 'coloriage' : 'libre',
    pageId: page ? page.id : null,
    dataUrl: editor.thumbnail(),
    source: editor.snapshotSource(),
    date: new Date().toISOString().slice(0, 10),
  };
  gallery = replaceArtwork(gallery, item, 8);
  editingId = null;
  const saved = saveGallery(store, gallery);
  sound.success();
  show('galerie', { enter: true });
  confetti(document.body);
  if (!saved) screens.toast('Ton dessin est là, mais je ne peux pas le garder pour demain');
  return gallery.length;
}

let clearTimer = null;
function resetClearBtn() {
  const b = document.querySelector('[data-action="clear"]');
  clearTimeout(clearTimer); clearTimer = null;
  if (b) { b.classList.remove('danger'); b.querySelector('.lbl').textContent = 'Effacer'; }
}
function clearSheet() {
  resetClearBtn();
  editor.clear();
  screens.toast('Feuille propre !');
  return true;
}
function askClear() {
  if (clearTimer) { clearSheet(); return; }
  const b = document.querySelector('[data-action="clear"]');
  b.classList.add('danger'); b.querySelector('.lbl').textContent = 'Sûr ?';
  sound.tap();
  clearTimer = setTimeout(resetClearBtn, 3000);
}

function action(a) {
  switch (a) {
    case 'back': show(mode === 'coloriage' ? 'choix' : 'accueil'); break;
    case 'undo': editor.undo(); break;
    case 'redo': editor.redo(); break;
    case 'clear': askClear(); break;
    case 'export': editor.exportPNG(); screens.toast('Image enregistrée !'); break;
    case 'hang': hang(); break;
    case 'speak': speak(CONSIGNES[mode]); break;
  }
}

// --- galerie
async function edit(index) {
  const item = gallery[index];
  if (!item) return false;
  let ok = false;
  if (item.source && item.mode === 'coloriage' && item.pageId) {
    if (await openPage(item.pageId, true)) ok = await editor.loadSource(item.source);
  }
  if (!ok) {
    freeDraw(true);
    ok = await editor.loadSource(item.source || item.dataUrl);
  }
  editingId = item.id;
  return ok;
}

function updateEditBtn(st) {
  $('btn-edit').classList.toggle('hidden', !(st && st.focus >= 0 && gallery.length > 0));
}

function refreshGallery() {
  if (!gallery3d) {
    gallery3d = createGallery3D({ container: $('gallery-host'), images: IMAGES, onChange: updateEditBtn });
  }
  const items = gallery.length ? gallery : ['soleil', 'fleur', 'voiture'].map((n) => ({ canvas: exampleCanvas(n) }));
  gallery3d.setArtworks(items);
  return !gallery.length;
}

function show(name, opts = {}) {
  if (name !== 'galerie') $('btn-edit').classList.add('hidden');
  resetClearBtn();
  editor.lock();
  if (name !== 'galerie' && gallery3d) gallery3d.stop();
  screens.show(name);
  if (name === 'galerie') {
    let examples = false;
    try {
      examples = refreshGallery();
      gallery3d.start();
      gallery3d.enter();
      sound.whoosh();
    } catch (e) {
      screens.toast('La galerie 3D ne marche pas ici');
      console.warn('galerie 3D indisponible', e);
    }
    if (examples && !opts.enter) screens.toast('Voici des exemples. Colorie pour remplir ta galerie !');
  }
  return true;
}

// --- accueil, navigation
document.addEventListener('click', (e) => {
  const go = e.target.closest('[data-go]');
  if (go) {
    sound.unlock(); sound.tap();
    const to = go.dataset.go;
    if (to === 'libre') freeDraw(); else show(to);
    return;
  }
  const sp = e.target.closest('[data-speak]');
  if (sp) { sound.unlock(); speak(CONSIGNES[sp.dataset.speak]); return; }
  if (e.target.closest('[data-edit]') && gallery3d) { sound.unlock(); sound.tap(); edit(gallery3d.state().focus); return; }
  const turn = e.target.closest('[data-turn]');
  if (turn && gallery3d) { sound.tap(); gallery3d.turn(Number(turn.dataset.turn)); }
});

screens.buildChoix($('choix-list'), PAGES, (id) => { sound.unlock(); sound.tap(); openPage(id); });

// image de titre : repli = dégradé du CSS
{
  const img = new Image();
  img.onload = () => { $('title-art').style.backgroundImage = `url("${IMAGES.titre}")`; };
  img.src = IMAGES.titre;
}

// --- crochet de débogage
window.__coloriage = {
  state: () => ({
    screen: screens.current(), mode, pageId, tool: editor.getTool(), color: editor.getColor(),
    colorHex: PALETTE[editor.getColor()].hex, canUndo: editor.canUndo(), canRedo: editor.canRedo(),
    gallerySize: gallery.length, gallery3d: gallery3d ? gallery3d.state() : null,
  }),
  goto: (n) => (n === 'libre' ? freeDraw() : show(n)),
  openPage,
  freeDraw,
  setTool,
  setColor,
  tap: (x, y) => editor.tap(x, y),
  stroke: (pts) => editor.stroke(pts),
  undo: () => editor.undo(),
  redo: () => editor.redo(),
  clear: clearSheet,
  hang,
  edit,
  gallery: () => ({ count: gallery.length, items: gallery.map((g) => ({ id: g.id, titre: g.titre, mode: g.mode || 'libre', editable: !!g.source })), state: gallery3d ? gallery3d.state() : null }),
  pages: () => PAGES.map((p) => ({ id: p.id, titre: p.titre, palier: p.palier })),
  pixel: (x, y) => editor.pixel(x, y),
};

show('accueil');
