import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { curlPoint } from './logic/curl.js';
import { easeInOutCubic, easeOutBack, lerp, clamp } from './logic/ease.js';
import { createSparkles } from './sparkles.js';
import { classifyPointer } from './logic/gesture.js';
import { hitWord } from './logic/words.js';
import {
  PAGE_W, PAGE_H, PAPER, FONT_FAMILY,
  drawIllustration, drawCover, drawFin, drawEndArt, makeTextPage,
} from './pageCanvas.js';

const W = 1.5; // largeur d'une page (3:4)
const H = 2;
const SEGMENTS = 30;
const DURATION = 700;
const PAGE_Y = 0.003;
const SHEET_Y = 0.012;
const TILT = THREE.MathUtils.degToRad(30);
const BAR_SPACE = 110; // px réservés à la barre de boutons

// Lecteur 3D. handlers : { onGesture('next'|'prev'), onWordTap(i), wordTapEnabled() }.
// Lève une exception si WebGL est indisponible (main.js bascule alors sur fallback.js).
export function createBook3d(host, handlers) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.style.touchAction = 'none';
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb9a6d8, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(2, 6, 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -3.5, right: 3.5, top: 3.5, bottom: -3.5, near: 1, far: 14 });
  sun.shadow.bias = -0.001;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(14, 12), new THREE.ShadowMaterial({ opacity: 0.25 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.085;
  ground.receiveShadow = true;
  scene.add(ground);

  const group = new THREE.Group();
  scene.add(group);
  const sparkles = createSparkles(scene);
  let introStart = -1; // ouverture du livre (squash & stretch)
  let landStart = -1; // petit rebond quand une page se pose
  let lastT = 0;

  // Géométries et matériaux partagés
  const maxAniso = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  const blank = makeTexture(blankCanvas());
  const pageGeo = new THREE.PlaneGeometry(W, H).rotateX(-Math.PI / 2);
  const boardGeo = new RoundedBoxGeometry(W + 0.12, 0.08, H + 0.12, 3, 0.03);
  const boardMat = new THREE.MeshStandardMaterial({ color: 0x3b4cc0, roughness: 0.6 });
  const leftMat = pageMaterial();
  const rightMat = pageMaterial();
  const frontMat = pageMaterial();
  const backMat = pageMaterial();

  function pageMaterial() {
    return new THREE.MeshStandardMaterial({ map: blank, roughness: 0.9 });
  }

  function mesh(geo, mat, x, y) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, 0);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    return m;
  }

  const leftBoard = mesh(boardGeo, boardMat, -W / 2, -0.04);
  const rightBoard = mesh(boardGeo, boardMat, W / 2, -0.04);
  const leftPage = mesh(pageGeo, leftMat, -W / 2, PAGE_Y);
  const rightPage = mesh(pageGeo, rightMat, W / 2, PAGE_Y);
  leftPage.castShadow = rightPage.castShadow = false;

  // Feuille tournante : deux maillages dos à dos partageant les mêmes positions.
  const sheet = createSheet(frontMat, backMat);
  group.add(sheet.front, sheet.back);

  function createSheet(front, back) {
    const count = (SEGMENTS + 1) * 2;
    const positions = new Float32Array(count * 3);
    const uvFront = [];
    const uvBack = [];
    const index = [];
    for (let i = 0; i <= SEGMENTS; i++) {
      const u = i / SEGMENTS;
      uvFront.push(u, 1, u, 0);
      uvBack.push(1 - u, 1, 1 - u, 0);
      if (i < SEGMENTS) {
        const a = 2 * i;
        index.push(a, a + 1, a + 3, a, a + 3, a + 2);
      }
    }
    const make = (uvs, idx, material) => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geo.setIndex(idx);
      const m = new THREE.Mesh(geo, material);
      m.castShadow = true;
      m.receiveShadow = true;
      m.visible = false;
      m.frustumCulled = false;
      return m;
    };
    const reversed = [];
    for (let k = 0; k < index.length; k += 3) reversed.push(index[k], index[k + 2], index[k + 1]);
    return { front: make(uvFront, index, front), back: make(uvBack, reversed, back), positions };
  }

  function setSheetProgress(p) {
    const pos = sheet.positions;
    for (let i = 0; i <= SEGMENTS; i++) {
      for (let row = 0; row < 2; row++) {
        const zWorld = row === 0 ? -H / 2 : H / 2;
        const pt = curlPoint(i / SEGMENTS, zWorld, p, W);
        const k = (2 * i + row) * 3;
        pos[k] = pt.x;
        pos[k + 1] = SHEET_Y + pt.z;
        pos[k + 2] = pt.y;
      }
    }
    for (const m of [sheet.front, sheet.back]) {
      m.geometry.attributes.position.needsUpdate = true;
      m.geometry.computeVertexNormals();
      m.geometry.computeBoundingSphere();
    }
  }

  // ---- Contenu de l'histoire ----
  let story = null;
  let spreads = [];
  let images = new Map();
  let cache = [];
  let current = 0;
  let anim = null;

  function makeTexture(c) {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = maxAniso || 1;
    return t;
  }

  function blankCanvas() {
    const c = document.createElement('canvas');
    c.width = c.height = 4;
    const ctx = c.getContext('2d');
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, 4, 4);
    return c;
  }

  function buildSpread(i) {
    const sp = spreads[i];
    const img = images.get(sp.image);
    let left = null;
    let right;
    let text = null;
    if (sp.kind === 'cover') {
      right = drawCover(img, story.couleur, sp.titre);
    } else if (sp.kind === 'page') {
      left = drawIllustration(img, story.couleur);
      text = makeTextPage(sp.texte, sp.index + 1);
      right = text.canvas;
    } else {
      left = drawEndArt(story.couleur);
      right = drawFin();
    }
    return { left: left && makeTexture(left), right: makeTexture(right), text };
  }

  const spreadAt = (i) => (cache[i] ??= buildSpread(i));
  const coverShift = (i) => (i === 0 ? -W / 2 : 0);

  function showStatic(i) {
    const s = spreadAt(i);
    leftMat.map = s.left ?? blank;
    rightMat.map = s.right;
    leftPage.visible = leftBoard.visible = Boolean(s.left);
    group.position.x = coverShift(i);
    sheet.front.visible = sheet.back.visible = false;
  }

  async function load(newStory, newSpreads, newImages) {
    unload();
    try {
      await document.fonts.load(`56px ${FONT_FAMILY}`);
    } catch { /* police système */ }
    story = newStory;
    spreads = newSpreads;
    images = newImages;
    boardMat.color.set(story.couleur);
    sparkles.setColor(story.couleur);
    current = 0;
    showStatic(0);
  }

  function unload() {
    anim = null;
    for (const s of cache) {
      s?.left?.dispose();
      s?.right.dispose();
    }
    cache = [];
    story = null;
  }

  function showSpread(i) {
    finish();
    current = i;
    showStatic(i);
  }

  function turnTo(target, done) {
    finish();
    const from = current;
    if (Math.abs(target - from) !== 1) {
      showSpread(target);
      done?.();
      return;
    }
    const a = spreadAt(from);
    const b = spreadAt(target);
    const forward = target > from;
    if (forward) {
      frontMat.map = a.right;
      backMat.map = b.left ?? blank;
      rightMat.map = b.right;
      leftMat.map = a.left ?? blank;
      leftPage.visible = leftBoard.visible = Boolean(a.left);
    } else {
      frontMat.map = b.right;
      backMat.map = a.left ?? blank;
      leftMat.map = b.left ?? blank;
      rightMat.map = a.right;
      leftPage.visible = leftBoard.visible = Boolean(b.left);
    }
    anim = {
      start: performance.now(), forward, target, done,
      p0: forward ? 0 : 1, p1: forward ? 1 : 0,
      x0: coverShift(from), x1: coverShift(target),
    };
    sheet.front.visible = sheet.back.visible = true;
    setSheetProgress(anim.p0);
  }

  function complete() {
    const { target, done } = anim;
    anim = null;
    current = target;
    showStatic(target);
    done?.();
  }

  function finish() {
    if (anim) complete();
  }

  function setHighlight(i) {
    const s = cache[current];
    if (!s?.text) return;
    s.text.draw(i);
    s.right.needsUpdate = true;
  }

  // ---- Entrées ----
  const raycaster = new THREE.Raycaster();
  let down = null;

  function wordAt(clientX, clientY) {
    const s = cache[current];
    if (!s?.text) return -1;
    const r = canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObject(rightPage)[0];
    if (!hit) return -1;
    const { origin, layout, lineHeight } = s.text;
    return hitWord(layout, hit.uv.x * PAGE_W - origin.x, (1 - hit.uv.y) * PAGE_H - origin.y, lineHeight);
  }

  canvas.addEventListener('pointerdown', (e) => {
    down = { x: e.clientX, y: e.clientY, t: performance.now() };
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!down) return;
    const dx = e.clientX - down.x;
    const dy = e.clientY - down.y;
    const dt = performance.now() - down.t;
    down = null;
    const tap = Math.abs(dx) < 10 && Math.abs(dy) < 10 && dt < 300;
    if (tap && !anim && handlers.wordTapEnabled()) {
      const i = wordAt(e.clientX, e.clientY);
      if (i >= 0) {
        handlers.onWordTap(i);
        return;
      }
    }
    const rect = canvas.getBoundingClientRect();
    const kind = classifyPointer({ dx, dy, dt, x: e.clientX - rect.left, width: rect.width });
    if (kind) handlers.onGesture(kind);
  });
  canvas.addEventListener('pointercancel', () => { down = null; });

  // ---- Cadrage et boucle de rendu ----
  function resize() {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const usable = Math.max(h - BAR_SPACE, h * 0.4) / h;
    const needV = ((H / 2 + 0.15) * Math.cos(TILT) + 0.25) / (tan * usable);
    const needH = (W + 0.15) / (tan * camera.aspect);
    const d = Math.max(needV, needH) * 1.12;
    camera.position.set(0, d * Math.cos(TILT), d * Math.sin(TILT));
    camera.lookAt(0, 0, 0);
    camera.setViewOffset(w, h, 0, BAR_SPACE / 2, w, h);
    camera.updateProjectionMatrix();
  }

  function tick(time) {
    const t = time / 1000;
    if (anim) {
      const k = clamp((performance.now() - anim.start) / DURATION);
      const e = easeInOutCubic(k);
      setSheetProgress(lerp(anim.p0, anim.p1, e));
      group.position.x = lerp(anim.x0, anim.x1, e);
      if (k >= 1) {
        sparkles.pop(group.position.x + (anim.p1 > anim.p0 ? -W / 2 : W / 2), 0.15, 0, t);
        landStart = t;
        complete();
      }
    }
    group.position.y = Math.sin(t * 1.2) * 0.012;
    // Ouverture : le livre arrive écrasé, s'étire puis se pose avec un rebond.
    const ki = introStart < 0 ? 1 : clamp((t - introStart) / 0.75);
    const grow = lerp(0.5, 1, easeOutBack(ki));
    const kl = landStart < 0 ? 1 : clamp((t - landStart) / 0.3);
    const squash = Math.sin(Math.PI * kl) * 0.025;
    group.scale.set(grow * (1 + squash), lerp(2.2, 1, ki) * (1 - squash * 2), grow * (1 + squash));
    group.rotation.y = lerp(-0.5, 0, easeOutBack(ki));
    sparkles.update(t, Math.min(0.05, t - lastT));
    lastT = t;
    sun.position.x = 2 + Math.sin(t * 0.5) * 0.3;
    renderer.render(scene, camera);
  }

  const onResize = () => resize();
  window.addEventListener('resize', onResize);
  resize();

  return {
    load, unload, showSpread, turnTo, finish, setHighlight, resize,
    start() { resize(); introStart = performance.now() / 1000; renderer.setAnimationLoop(tick); },
    stop() { renderer.setAnimationLoop(null); },
    get animating() { return anim !== null; },
  };
}
