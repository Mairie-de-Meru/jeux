// Table 3D : tapis, pioche, défausse, mains des bots, cartes qui volent. Aucune logique de jeu ici.
import * as THREE from 'three';
import { avatarImage } from '../avatarimg.js';
import { backTexture, faceTexture, makeTag, drawTag } from './cardtex.js';

const CW = 0.62, CH = 0.88, TH = 0.03;
const PILE = new THREE.Vector3(0, 0, 0);
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export class TableView {
  constructor(canvas, stage) {
    this.canvas = canvas;
    this.stage = stage;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x446655, 1.7));
    const sun = new THREE.DirectionalLight(0xffffff, 1.3);
    sun.position.set(3, 8, 4);
    this.scene.add(sun);

    const felt = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 0.1, 64), new THREE.MeshStandardMaterial({ color: 0x1f9a66, roughness: 0.95 }));
    felt.position.y = -0.05;
    this.scene.add(felt);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.16, 16, 80), new THREE.MeshStandardMaterial({ color: 0x9a5b2e, roughness: 0.6 }));
    rim.rotation.x = Math.PI / 2;
    this.scene.add(rim);

    this.cardGeo = new THREE.BoxGeometry(CW, TH, CH);
    this.sideMat = new THREE.MeshStandardMaterial({ color: 0xf1f1f1 });
    this.backMat = new THREE.MeshStandardMaterial({ map: backTexture() });
    this.pileMesh = this.makePile();
    this.pileMesh.position.copy(PILE);
    this.scene.add(this.pileMesh);
    this.seats = [];
    this.anims = [];
    this.n = 2;
    this.resize();
    if (window.ResizeObserver) new ResizeObserver(() => this.resize()).observe(stage);
    window.addEventListener('resize', () => this.resize());
    const loop = (t) => { this.frame(t); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }

  makePile() {
    const top = new THREE.MeshStandardMaterial({ map: backTexture() });
    const m = new THREE.Mesh(new THREE.BoxGeometry(CW, 1, CH), [this.sideMat, this.sideMat, top, this.backMat, this.sideMat, this.sideMat]);
    m.userData.top = top;
    return m;
  }

  // pile de défausse personnelle : devant le joueur, un peu de côté
  discPos(i, n = this.n) {
    const th = (i * Math.PI * 2) / n;
    const d = new THREE.Vector3(Math.sin(th), 0, Math.cos(th));
    const side = new THREE.Vector3(Math.cos(th), 0, -Math.sin(th));
    return d.multiplyScalar(1.5).add(side.multiplyScalar(i === 0 ? 0.8 : 0.9));
  }

  seatPos(i, n = this.n) {
    const th = (i * Math.PI * 2) / n;
    return new THREE.Vector3(Math.sin(th) * 2.35, 0, Math.cos(th) * 2.35);
  }

  setPlayers(players) {
    this.seats.forEach((s) => this.scene.remove(s.group, s.sprite, s.disc, s.slot, s.skipMesh));
    this.n = players.length;
    this.seats = players.map((p, i) => {
      const th = (i * Math.PI * 2) / this.n;
      const group = new THREE.Group();
      group.position.copy(this.seatPos(i));
      group.rotation.y = th;
      this.scene.add(group);
      const tag = makeTag();
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tag.t, depthTest: false, transparent: true }));
      const pos = this.seatPos(i).multiplyScalar(i === 0 ? 1.27 : 1.12);
      sprite.position.set(pos.x, 0.5, pos.z);
      sprite.scale.set(1.1, 0.64, 1);
      sprite.visible = i > 0;
      sprite.renderOrder = 10;
      this.scene.add(sprite);
      const disc = this.makePile();
      disc.position.copy(this.discPos(i));
      disc.rotation.y = 0.12;
      const slot = new THREE.Mesh(new THREE.PlaneGeometry(CW + 0.06, CH + 0.06), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22 }));
      slot.rotation.x = -Math.PI / 2;
      slot.rotation.z = -0.12;
      slot.position.set(disc.position.x, 0.004, disc.position.z);
      const skipTop = new THREE.MeshStandardMaterial({ map: backTexture() });
      const skipMesh = new THREE.Mesh(new THREE.BoxGeometry(CW, TH, CH), [this.sideMat, this.sideMat, skipTop, this.backMat, this.sideMat, this.sideMat]);
      skipMesh.userData.top = skipTop;
      const dpos = this.discPos(i);
      const dd = new THREE.Vector3(Math.sin(th), 0, Math.cos(th));
      skipMesh.position.set(dpos.x - dd.z * 0.0 + (Math.cos(th)) * -1.0, 0.05, dpos.z + (-Math.sin(th)) * -1.0);
      skipMesh.rotation.y = -0.25;
      skipMesh.visible = false;
      this.scene.add(disc, slot, skipMesh);
      return { group, sprite, tag, cards: [], disc, slot, skipMesh };
    });
    this.resize();
  }

  sync(g) {
    const n = g.drawPile.length;
    this.pileMesh.visible = n > 0;
    this.pileMesh.scale.y = 0.03 + n * 0.0055;
    this.pileMesh.position.y = this.pileMesh.scale.y / 2;
    g.players.forEach((p, i) => {
      const s = this.seats[i];
      if (!s) return;
      const top = p.discard[p.discard.length - 1];
      s.skipMesh.visible = !!p.skip;
      if (p.skip) { s.skipMesh.userData.top.map = faceTexture(p.skip); s.skipMesh.userData.top.needsUpdate = true; }
      s.disc.visible = !!top;
      if (top) {
        s.disc.userData.top.map = faceTexture(top);
        s.disc.userData.top.needsUpdate = true;
        s.disc.scale.y = 0.03 + p.discard.length * 0.0055;
        s.disc.position.y = s.disc.scale.y / 2;
      }
      if (i > 0) {
        const count = Math.min(p.hand.length, 12);
        while (s.cards.length < count) {
          const m = new THREE.Mesh(this.cardGeo, [this.sideMat, this.sideMat, this.backMat, this.backMat, this.sideMat, this.sideMat]);
          s.group.add(m); s.cards.push(m);
        }
        s.cards.forEach((m, k) => {
          m.visible = k < count;
          const step = Math.min(0.2, 1.7 / Math.max(count, 1));
          m.position.set((k - (count - 1) / 2) * step, 0.03 + k * 0.004, 0);
          m.rotation.y = (k - (count - 1) / 2) * 0.03;
        });
      }
      drawTag(s.tag, { emoji: p.emoji, img: avatarImage(p.avatar), count: p.hand.length, active: g.status === 'playing' && g.current === i });
    });
  }

  // from/to : 'pile' | { disc: i } | { seat: i } ; card : carte visible ou null (dos)
  fly({ from, to, card, ms = 450 }) {
    const pos = (w) => (w === 'pile' ? PILE : w.disc !== undefined ? this.discPos(w.disc) : this.seatPos(w.seat));
    const a = pos(from).clone();
    const b = pos(to).clone();
    if (!ms) return Promise.resolve();
    const top = new THREE.MeshStandardMaterial({ map: card ? faceTexture(card) : backTexture() });
    const m = new THREE.Mesh(this.cardGeo, [this.sideMat, this.sideMat, top, this.backMat, this.sideMat, this.sideMat]);
    m.position.copy(a);
    this.scene.add(m);
    return new Promise((resolve) => {
      let done = false;
      const end = () => { if (done) return; done = true; this.scene.remove(m); top.dispose(); resolve(); };
      this.anims.push({ m, a, b, t0: performance.now(), ms, end });
      setTimeout(end, ms + 120);
    });
  }

  frame(now) {
    this.anims = this.anims.filter((an) => {
      const t = Math.min(1, (now - an.t0) / an.ms);
      const e = ease(t);
      an.m.position.set(an.a.x + (an.b.x - an.a.x) * e, 0.1 + Math.sin(Math.PI * e) * 0.9, an.a.z + (an.b.z - an.a.z) * e);
      an.m.rotation.y = e * 0.3;
      if (t >= 1) { an.end(); return false; }
      return true;
    });
    this.renderer.render(this.scene, this.camera);
  }

  resize() {
    const w = Math.max(1, this.stage.clientWidth);
    const h = Math.max(1, this.stage.clientHeight);
    this.renderer.setSize(w, h, false);
    const asp = w / h;
    this.camera.aspect = asp;
    this.camera.updateProjectionMatrix();
    // la table (bord compris) et les mains des bots doivent remplir le stage, avec ~6 % de marge
    const pitch = ((asp < 0.9 ? 64 : 58) * Math.PI) / 180;
    const pts = [];
    for (let k = 0; k < 32; k++) {
      const a = (k / 32) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.sin(a) * 3.56, 0, Math.cos(a) * 3.56));
      pts.push(new THREE.Vector3(Math.sin(a) * 2.75, 0.5, Math.cos(a) * 2.75));
    }
    const fits = (d) => {
      this.camera.position.set(0, Math.sin(pitch) * d, Math.cos(pitch) * d + 0.2);
      this.camera.lookAt(0, 0, 0.2);
      this.camera.updateMatrixWorld(true);
      return pts.every((p) => { const q = p.clone().project(this.camera); return Math.abs(q.x) <= 0.94 && Math.abs(q.y) <= 0.94; });
    };
    let lo = 2;
    let hi = 60;
    for (let it = 0; it < 24; it++) { const mid = (lo + hi) / 2; if (fits(mid)) hi = mid; else lo = mid; }
    fits(hi);
  }

  toScreen(v) {
    const r = this.canvas.getBoundingClientRect();
    const p = v.clone().project(this.camera);
    return { x: r.left + ((p.x + 1) / 2) * r.width, y: r.top + ((1 - p.y) / 2) * r.height };
  }

  // Pioche ('pile') ou défausse { disc: i } la plus proche du point (tolérance ~56 px).
  pickPile(cx, cy) {
    let best = null;
    let bd = 56;
    const cands = [['pile', PILE], ...this.seats.map((_, i) => [{ disc: i }, this.discPos(i)])];
    for (const [name, v] of cands) {
      const s = this.toScreen(new THREE.Vector3(v.x, 0.1, v.z));
      const d = Math.hypot(s.x - cx, s.y - cy);
      if (d < bd) { bd = d; best = name; }
    }
    return best;
  }
}
