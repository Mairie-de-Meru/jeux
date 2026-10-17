import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const COLORS = {
  empty: { bg: '#e9e7ff', edge: '#b9b4f7', ink: '#2a2466', side: 0x8f89e0 },
  correct: { bg: '#e63946', edge: '#ff8a93', ink: '#ffffff', side: 0xa81f2b },
  present: { bg: '#2f6fe0', edge: '#7aa5f5', ink: '#2a2466', side: 0x1d4aa8 },
  absent: { bg: '#2b4c94', edge: '#4a68ad', ink: '#b9c9ee', side: 0x1a326a },
};
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const bump = (t) => Math.sin(Math.min(1, Math.max(0, t)) * Math.PI);

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Dessine une tuile : carré rouge / rond jaune sur bleu / gris ardoise / vide.
export function drawTile(ctx, S, { letter = '', state = 'empty', ghost = false, first = false }) {
  const c = COLORS[state];
  ctx.clearRect(0, 0, S, S);
  rr(ctx, 4, 4, S - 8, S - 8, S * 0.16);
  ctx.fillStyle = c.bg; ctx.fill();
  ctx.lineWidth = first ? 7 : 6; ctx.strokeStyle = first ? '#1a1a1a' : c.edge; ctx.stroke();
  if (state === 'present') {
    ctx.beginPath(); ctx.arc(S / 2, S / 2, S * 0.36, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd23f'; ctx.fill();
    ctx.lineWidth = 5; ctx.strokeStyle = '#ffe98a'; ctx.stroke();
  }
  if (letter) {
    ctx.font = `800 ${Math.round(S * 0.58)}px "Trebuchet MS", "Avenir Next", system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = ghost ? 'rgba(42,36,102,0.38)' : c.ink;
    ctx.fillText(letter.toUpperCase(), S / 2, S / 2 + S * 0.04);
  }
}

export class Board {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8878d8, 1.5));
    const d = new THREE.DirectionalLight(0xffffff, 1.6);
    d.position.set(-3, 6, 8);
    this.scene.add(d);
    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.geo = new RoundedBoxGeometry(0.9, 0.9, 0.24, 3, 0.09);
    this.faceGeo = new THREE.PlaneGeometry(0.84, 0.84);
    this.sideMats = {};
    for (const k of Object.keys(COLORS)) this.sideMats[k] = new THREE.MeshStandardMaterial({ color: COLORS[k].side, roughness: 0.5 });
    // Lettres absentes : bleu ombré et un peu transparent (on voit le fond au travers).
    Object.assign(this.sideMats.absent, { transparent: true, opacity: 0.3, depthWrite: false });
    this.rows = 0; this.cols = 0; this.tiles = [];
    this.rowGroups = [];
    this.clock = new THREE.Clock();
    this.now = 0;
    this.anims = [];
    this.running = true;
    this.resize();
    const loop = () => { if (!this.running) return; this.frame(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }

  build(rows, cols) {
    for (const g of this.rowGroups) {
      this.root.remove(g);
      g.traverse((o) => { if (o.material && o.material.map) { o.material.map.dispose(); o.material.dispose(); } });
    }
    this.rowGroups = []; this.tiles = []; this.anims = [];
    this.rows = rows; this.cols = cols;
    for (let r = 0; r < rows; r++) {
      const rg = new THREE.Group();
      rg.position.y = (rows - 1) / 2 - r;
      const row = [];
      for (let c = 0; c < cols; c++) {
        const g = new THREE.Group();
        g.position.x = c - (cols - 1) / 2;
        const body = new THREE.Mesh(this.geo, this.sideMats.empty);
        const cv = document.createElement('canvas');
        cv.width = cv.height = 128;
        const tex = new THREE.CanvasTexture(cv);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        const face = new THREE.Mesh(this.faceGeo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }));
        face.position.z = 0.125;
        g.add(body, face);
        rg.add(g);
        const tile = { g, body, face, cv, ctx: cv.getContext('2d'), tex, data: { letter: '', state: 'empty', ghost: false } };
        this.paint(tile);
        row.push(tile);
      }
      this.root.add(rg);
      this.rowGroups.push(rg);
      this.tiles.push(row);
    }
    this.resize();
  }

  paint(tile) {
    drawTile(tile.ctx, 128, tile.data);
    tile.tex.needsUpdate = true;
    tile.body.material = this.sideMats[tile.data.state];
    tile.face.material.opacity = tile.data.state === 'absent' ? 0.45 : 1;
  }

  set(r, c, data) {
    const t = this.tiles[r] && this.tiles[r][c];
    if (!t) return;
    const prev = t.data;
    t.data = { letter: '', state: 'empty', ghost: false, first: false, ...data };
    if (prev.letter !== t.data.letter || prev.state !== t.data.state || prev.ghost !== t.data.ghost || prev.first !== t.data.first) this.paint(t);
  }

  pop(r, c) { this.anims.push({ kind: 'pop', r, c, t0: this.now, dur: 0.18 }); }

  shake(r) { this.anims.push({ kind: 'shake', r, t0: this.now, dur: 0.5 }); }

  // Retourne la ligne r colorée case par case ; renvoie une promesse résolue à la fin.
  reveal(r, letters, results, onFlip) {
    return new Promise((resolve) => {
      const n = this.cols;
      results.forEach((st, c) => {
        const last = c === n - 1;
        this.anims.push({
          kind: 'flip', r, c, t0: this.now + c * 0.28, dur: 0.5, applied: false,
          data: { letter: letters[c], state: st, ghost: false, first: c === 0 },
          onHalf: () => onFlip && onFlip(c, st),
          done: last ? resolve : null,
        });
      });
    });
  }

  dance(r) {
    for (let c = 0; c < this.cols; c++) this.anims.push({ kind: 'jump', r, c, t0: this.now + c * 0.1, dur: 0.55 });
  }

  resize() {
    const p = this.canvas.parentElement || this.canvas;
    const w = Math.max(60, p.clientWidth), h = Math.max(60, p.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    const halfH = (this.rows || 6) / 2 + 0.25;
    const halfW = (this.cols || 5) / 2 + 0.25;
    const tan = Math.tan((this.camera.fov * Math.PI) / 360);
    const dist = Math.max(halfH / tan, halfW / (tan * this.camera.aspect));
    this.camera.position.set(0, 0, dist + 0.3);
    this.camera.lookAt(0, 0, 0);
  }

  frame() {
    this.now = this.clock.getElapsedTime();
    const t = this.now;
    // repos de toutes les tuiles puis application des animations
    for (const row of this.tiles) for (const tl of row) {
      tl.g.rotation.x = 0; tl.g.scale.setScalar(1); tl.g.position.y = 0; tl.g.position.z = 0;
    }
    for (const rg of this.rowGroups) rg.position.x = 0;
    this.root.rotation.y = Math.sin(t * 0.6) * 0.04;
    this.root.rotation.x = Math.sin(t * 0.45) * 0.025;
    const keep = [];
    for (const a of this.anims) {
      const p = (t - a.t0) / a.dur;
      if (p < 0) { keep.push(a); if (a.kind === 'flip') this.flipHold(a); continue; }
      const tl = a.c !== undefined ? this.tiles[a.r][a.c] : null;
      if (a.kind === 'pop') {
        tl.g.scale.setScalar(1 + 0.18 * bump(p));
      } else if (a.kind === 'shake') {
        this.rowGroups[a.r].position.x = Math.sin(p * Math.PI * 6) * 0.14 * (1 - p);
      } else if (a.kind === 'jump') {
        tl.g.position.y = 0.35 * bump(p);
        tl.g.scale.setScalar(1 + 0.12 * bump(p));
      } else if (a.kind === 'flip') {
        if (p < 0.5) tl.g.rotation.x = (Math.PI / 2) * easeOut(p / 0.5);
        else {
          if (!a.applied) {
            a.applied = true; tl.data = a.data; this.paint(tl); a.onHalf && a.onHalf();
          }
          tl.g.rotation.x = -(Math.PI / 2) * (1 - easeOut((p - 0.5) / 0.5));
        }
        tl.g.position.z = 0.25 * bump(p);
      }
      if (p < 1) keep.push(a);
      else if (a.done) a.done();
    }
    this.anims = keep;
    this.renderer.render(this.scene, this.camera);
  }

  flipHold() {}

  dispose() { this.running = false; this.renderer.dispose(); }
}
