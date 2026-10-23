import * as THREE from 'three';
import { spiralPositions, boardRadius } from '../logic/layout.js';
import { SPECIALS } from '../logic/texts.js';
import { dur } from '../timing.js';

const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const TILE_COLORS = {
  normal: ['#fff6d6', '#d9f0ff'], depart: '#ffffff', fin: '#ffd54a', oie: '#fff176', pont: '#90caf9',
  auberge: '#ffab91', puits: '#80deea', prison: '#b0bec5', labyrinthe: '#ce93d8', mort: '#ef9a9a',
};
const TILE_EMOJI = { depart: '🚩', fin: '🌸', ...Object.fromEntries(Object.entries(SPECIALS).map(([k, v]) => [k, v.emoji])) };

function tileTexture(c, n) {
  const S = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d');
  const col = c.type === 'normal' ? TILE_COLORS.normal[c.n % 2] : TILE_COLORS[c.type];
  g.fillStyle = col;
  g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2); g.fill();
  g.lineWidth = 6; g.strokeStyle = 'rgba(40,40,80,0.35)'; g.stroke();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const emoji = TILE_EMOJI[c.type];
  if (emoji) {
    const solo = c.type === 'depart';
    g.font = `${solo ? 58 : 46}px ${EMOJI_FONT}`;
    g.fillStyle = '#000';
    g.fillText(emoji, S / 2, solo ? S / 2 : 38);
  }
  if (c.type !== 'depart') {
    g.fillStyle = '#26264d';
    g.font = `bold ${emoji ? 54 : 70}px system-ui,sans-serif`;
    if (emoji) { g.lineWidth = 6; g.strokeStyle = col; g.strokeText(String(c.n), S / 2, 90); }
    g.fillText(String(c.n), S / 2, emoji ? 90 : S / 2 + 3);
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function createWorld(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.autoClear = false;
  renderer.setScissorTest(true);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6f9a7a, 1.6));
  const dl = new THREE.DirectionalLight(0xffffff, 1.4);
  dl.position.set(4, 10, 6);
  scene.add(dl);

  let boardGroup = null, P = [], R = 5, n = 0, bigBoard = true;
  const pawns = [];
  const tweens = [];
  const halo = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.56, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthTest: false }));
  halo.rotation.x = -Math.PI / 2;
  halo.renderOrder = 5;
  halo.visible = false;
  scene.add(halo);

  let follow = null, overview = false, focus = null;
  // Cadrage : caméra et vecteurs temporaires réutilisés (aucune allocation par frame)
  const fitCam = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
  const fitCorner = [];
  const fitV = new THREE.Vector3(), fitPts = [], fitCenter = new THREE.Vector3();
  const FIT_OFF = [[0, 0], [0.6, 0], [-0.6, 0], [0, 0.6], [0, -0.6]];
  const TILT = THREE.MathUtils.degToRad(62);
  const FOLLOW_NEAR_BIG = 0.42, FOLLOW_NEAR_SMALL = 0.55, AHEAD = 4;
  // true si tous les points (avec un rayon de case) sont dans |ndc| <= lim pour une caméra au centre c à la distance d
  function fitsView(c, d, pts, n, lim) {
    fitCam.fov = camera.fov; fitCam.aspect = camera.aspect;
    fitCam.position.set(c.x, d * Math.sin(TILT), c.z + d * Math.cos(TILT));
    fitCam.lookAt(c.x, 0, c.z);
    fitCam.updateProjectionMatrix();
    fitCam.updateMatrixWorld();
    for (let i = 0; i < n; i++) {
      for (let o = 0; o < FIT_OFF.length; o++) {
        fitV.set(pts[i].x + FIT_OFF[o][0], 0, pts[i].z + FIT_OFF[o][1]).project(fitCam);
        if (Math.abs(fitV.x) > lim || Math.abs(fitV.y) > lim) return false;
      }
    }
    return true;
  }
  const camTarget = new THREE.Vector3(), camDist = { v: 10 };
  let camInit = false;

  const offset = (pid) => { const a = pid * 1.9 + 0.6; return new THREE.Vector3(Math.cos(a) * 0.2, 0, Math.sin(a) * 0.2); };
  const pawnPoint = (pid, i) => P[i].clone().add(offset(pid)).setY(0.27);

  function build(game) {
    if (boardGroup) { scene.remove(boardGroup); boardGroup.traverse((o) => { if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } if (o.geometry) o.geometry.dispose(); }); }
    pawns.length = 0;
    boardGroup = new THREE.Group();
    scene.add(boardGroup);
    n = game.n;
    bigBoard = n > 30;
    const pts = spiralPositions(n);
    P = pts.map((p) => new THREE.Vector3(p.x, 0.18, p.z));
    R = boardRadius(pts) + 0.95;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(R, R + 0.15, 0.3, 64), new THREE.MeshStandardMaterial({ color: 0x3aa57a, roughness: 0.9 }));
    base.position.y = -0.1;
    boardGroup.add(base);
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.3, R - 0.3, 0.06, 64), new THREE.MeshStandardMaterial({ color: 0x5fcf94, roughness: 0.9 }));
    inner.position.y = 0.06;
    boardGroup.add(inner);
    const sideGeo = new THREE.CylinderGeometry(0.47, 0.5, 0.16, 28);
    const topGeo = new THREE.CircleGeometry(0.45, 28);
    topGeo.rotateX(-Math.PI / 2);
    game.board.cases.forEach((c, i) => {
      const big = c.type === 'fin';
      const k = big ? 1.35 : 1;
      const side = new THREE.Mesh(sideGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }));
      side.scale.set(k, 1, k);
      side.position.copy(P[i]);
      const top = new THREE.Mesh(topGeo, new THREE.MeshBasicMaterial({ map: tileTexture(c, n) }));
      top.scale.set(k, 1, k);
      top.position.copy(P[i]).setY(0.265);
      boardGroup.add(side, top);
    });
    game.players.forEach((pl) => {
      const g = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color: pl.color, roughness: 0.4 });
      // bonhomme seul (corps + tête), un peu plus grand pour rester bien visible sans emoji
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.25, 0.6, 20), mat);
      body.position.y = 0.3;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 20, 16), mat);
      head.position.y = 0.72;
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.26, 0.34, 28), new THREE.MeshBasicMaterial({ color: pl.color, side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.02;
      ring.visible = false;
      g.add(body, head, ring);
      g.userData = { index: 0, ring };
      g.position.copy(pawnPoint(pl.id, 0));
      boardGroup.add(g);
      pawns[pl.id] = g;
    });
    camInit = false;
  }

  function tween(ms, fn) {
    return new Promise((resolve) => { tweens.push({ t0: performance.now(), d: Math.max(1, dur(ms)), fn, resolve }); });
  }

  function hop(pid, to, ms = 380, height = 0.6) {
    const p = pawns[pid];
    const a = p.position.clone();
    const b = pawnPoint(pid, to);
    p.userData.index = to;
    return tween(ms, (u) => {
      p.position.lerpVectors(a, b, u);
      p.position.y = a.y + (b.y - a.y) * u + Math.sin(u * Math.PI) * height;
      const s = Math.sin(u * Math.PI);
      p.scale.set(1 - 0.12 * s, 1 + 0.2 * s, 1 - 0.12 * s);
      if (u >= 1) p.scale.set(1, 1, 1);
    });
  }
  const jump = (pid, to) => hop(pid, to, 900, 2.2);
  function place(pid, i) { pawns[pid].userData.index = i; pawns[pid].position.copy(pawnPoint(pid, i)); }
  function wiggle(pid) {
    const p = pawns[pid];
    return tween(500, (u) => { p.rotation.z = Math.sin(u * Math.PI * 4) * 0.35 * (1 - u); p.position.y = 0.27 + Math.abs(Math.sin(u * Math.PI * 2)) * 0.3; });
  }
  function showHalo(i, color = 0xffffff) {
    if (i == null || i < 0) { halo.visible = false; return; }
    halo.visible = true;
    halo.material.color.set(color);
    halo.position.copy(P[i]).setY(0.34);
  }
  function setActive(pid) { pawns.forEach((p, i) => { p.userData.ring.visible = i === pid; }); }

  function frame(now, dt, board, die, dice, W, H) {
    for (let i = tweens.length - 1; i >= 0; i--) {
      const t = tweens[i];
      const u = Math.min(1, (now - t.t0) / t.d);
      t.fn(u);
      if (u >= 1) { tweens.splice(i, 1); t.resolve(); }
    }
    if (halo.visible) halo.scale.setScalar(1 + 0.12 * Math.sin(now / 130));
    pawns.forEach((p) => { if (p.userData.ring.visible) p.userData.ring.rotation.z += dt * 2; });
    dice.update(now);
    renderer.setViewport(0, 0, W, H);
    renderer.setScissor(0, 0, W, H);
    renderer.clear();
    if (board.w > 4 && board.h > 4 && P.length) {
      // caméra : cadrage du plateau, suivi du pion actif
      const aspect = board.w / board.h;
      camera.aspect = aspect;
      const v = THREE.MathUtils.degToRad(camera.fov);
      const hf = 2 * Math.atan(Math.tan(v / 2) * aspect);
      const fit = (R * 0.95) / Math.sin(Math.min(v, hf) / 2);
      const tracking = !(overview || follow == null);
      // suivi : on part de près (cases lisibles sur téléphone) et fitsView recule jusqu'à tout cadrer
      let wantD = tracking ? fit * (bigBoard ? FOLLOW_NEAR_BIG : FOLLOW_NEAR_SMALL) : fit;
      const want = fitCenter.set(0, 0, 0);
      let n = 0;
      if (tracking) {
        const pp = pawns[follow].position;
        fitPts[n++] = pp;
        if (focus && focus.length) { for (const i of focus) if (P[i]) fitPts[n++] = P[i]; }
        else {
          // sans focus : la case d'avant, le pion et les cases devant lui (pion moins collé au bord)
          const idx = pawns[follow].userData.index | 0;
          if (idx > 0) fitPts[n++] = P[idx - 1];
          for (let k = 1; k <= AHEAD; k++) fitPts[n++] = P[Math.min(idx + k, P.length - 1)];
        }
        let x0 = pp.x, x1 = pp.x, z0 = pp.z, z1 = pp.z;
        for (let i = 1; i < n; i++) {
          const q = fitPts[i];
          if (q.x < x0) x0 = q.x; if (q.x > x1) x1 = q.x;
          if (q.z < z0) z0 = q.z; if (q.z > z1) z1 = q.z;
        }
        want.set((x0 + x1) / 2, 0, (z0 + z1) / 2).clampLength(0, R);
      } else {
        // bord du plateau : 8 points sur le cercle de rayon R - 0.6 (le décalage d'une case ramène au bord)
        for (let o = 0; o < 8; o++) {
          fitCorner[o] = fitCorner[o] || new THREE.Vector3();
          fitCorner[o].set(Math.cos(o * Math.PI / 4) * (R - 0.6), 0, Math.sin(o * Math.PI / 4) * (R - 0.6));
          fitPts[n++] = fitCorner[o];
        }
      }
      for (let it = 0; it < 30 && !fitsView(want, wantD, fitPts, n, tracking ? 0.8 : 0.82); it++) wantD *= 1.08;
      if (!camInit) { camTarget.copy(want); camDist.v = wantD; camInit = true; }
      const k = 1 - Math.exp(-dt * 3.5);
      camTarget.lerp(want, k);
      camDist.v += (wantD - camDist.v) * k;
      const tilt = TILT;
      camera.position.set(camTarget.x, camDist.v * Math.sin(tilt), camTarget.z + camDist.v * Math.cos(tilt));
      camera.lookAt(camTarget.x, 0, camTarget.z);
      camera.updateProjectionMatrix();
      renderer.setViewport(board.x, H - board.y - board.h, board.w, board.h);
      renderer.setScissor(board.x, H - board.y - board.h, board.w, board.h);
      renderer.render(scene, camera);
    }
    if (die.w > 4 && die.h > 4) {
      dice.layout(die.w / die.h);
      renderer.setViewport(die.x, H - die.y - die.h, die.w, die.h);
      renderer.setScissor(die.x, H - die.y - die.h, die.w, die.h);
      renderer.clearDepth();
      renderer.render(dice.scene, dice.camera);
    }
  }

  // Case la plus proche du doigt (tolérance 40 px), coordonnées client ; boardRect = rect client de la zone plateau.
  function pickCase(cx, cy, rect) {
    camera.updateMatrixWorld();
    const v = new THREE.Vector3();
    let best = -1, bd = 1e9;
    for (let i = 1; i < P.length; i++) {
      v.copy(P[i]).project(camera);
      const sx = rect.left + ((v.x + 1) / 2) * rect.width;
      const sy = rect.top + ((1 - v.y) / 2) * rect.height;
      const d = Math.hypot(sx - cx, sy - cy);
      if (d < bd) { bd = d; best = i; }
    }
    return bd <= 40 ? best : -1;
  }

  function screenOf(i, rect) {
    camera.updateMatrixWorld();
    const v = P[i].clone().project(camera);
    return { x: rect.left + ((v.x + 1) / 2) * rect.width, y: rect.top + ((1 - v.y) / 2) * rect.height };
  }

  return {
    screenOf, renderer, build, hop, jump, place, wiggle, showHalo, setActive, frame, pickCase, tween,
    setFollow: (pid) => { follow = pid; },
    setFocus: (idx) => { focus = idx && idx.length ? idx : null; },
    setOverview: (v) => { overview = v; },
    get overview() { return overview; },
    resize: (w, h) => renderer.setSize(w, h, false),
    get pawns() { return pawns; },
  };
}
