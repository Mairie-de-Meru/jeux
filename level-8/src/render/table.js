// Table 3D : tapis, pioche, défausse, mains des bots, cartes qui volent. Aucune logique de jeu ici.
import * as THREE from 'three';
import { avatarImage } from '../avatarimg.js';
import { backTexture, faceTexture, makeTag, drawTag } from './cardtex.js';

const CW = 0.71, CH = 1.01, TH = 0.03; // cartes 3D (x1.15 depuis le 2026-10-23)
// Disposition rapprochée (2026-10-23) : mains à SEAT_R du centre, défausses à DISC_R + décalage DISC_SIDE.
const SEAT_R = 1.95, DISC_R = 0.9, DISC_SIDE = 0.9, SKIP_R = 0.98, FELT_R = 2.85;
const HAND_HALF = 0.85; // demi-largeur max de l'éventail (pas 1.7 / nombre de cartes)
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

    const felt = new THREE.Mesh(new THREE.CylinderGeometry(FELT_R, FELT_R, 0.1, 64), new THREE.MeshStandardMaterial({ color: 0x1f9a66, roughness: 0.95 }));
    felt.position.y = -0.05;
    this.scene.add(felt);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(FELT_R, 0.16, 16, 80), new THREE.MeshStandardMaterial({ color: 0x9a5b2e, roughness: 0.6 }));
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

  // pile de défausse personnelle : entre la pioche et la main du joueur, décalée de côté
  // (à 4 joueurs les 4 défausses forment un carré de ±0.9 autour de la pioche, sans chevauchement)
  discPos(i, n = this.n) {
    const th = (i * Math.PI * 2) / n;
    const d = new THREE.Vector3(Math.sin(th), 0, Math.cos(th));
    const side = new THREE.Vector3(Math.cos(th), 0, -Math.sin(th));
    return d.multiplyScalar(DISC_R).add(side.multiplyScalar(DISC_SIDE));
  }

  seatPos(i, n = this.n) {
    const th = (i * Math.PI * 2) / n;
    return new THREE.Vector3(Math.sin(th) * SEAT_R, 0, Math.cos(th) * SEAT_R);
  }

  // étiquette (avatar + nombre de cartes) posée sur la main du joueur, au centre de l'éventail
  tagPos(i, n = this.n) {
    return this.seatPos(i, n).multiplyScalar(i === 0 ? 1.27 : 1.0);
  }

  // carte Passe posée devant le joueur : dans l'axe du siège, couchée en travers, entre pioche et main
  skipPos(i, n = this.n) {
    const th = (i * Math.PI * 2) / n;
    return new THREE.Vector3(Math.sin(th) * SKIP_R, 0.05, Math.cos(th) * SKIP_R);
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
      const pos = this.tagPos(i);
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
      skipMesh.position.copy(this.skipPos(i));
      skipMesh.rotation.y = th + Math.PI / 2;
      skipMesh.visible = false;
      this.scene.add(disc, slot, skipMesh);
      return { group, sprite, tag, cards: [], disc, slot, skipMesh };
    });
    this.resize();
  }

  // viewer : joueur dont la main est affichée en DOM (les autres montrent leurs dos de cartes)
  sync(g, viewer = 0) {
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
      s.sprite.visible = i !== viewer;
      {
        const count = i === viewer ? 0 : Math.min(p.hand.length, 12);
        while (s.cards.length < count) {
          const m = new THREE.Mesh(this.cardGeo, [this.sideMat, this.sideMat, this.backMat, this.backMat, this.sideMat, this.sideMat]);
          s.group.add(m); s.cards.push(m);
        }
        s.cards.forEach((m, k) => {
          m.visible = k < count;
          const step = Math.min(0.2, (2 * HAND_HALF) / Math.max(count, 1));
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

  // Points utiles à garder à l'écran : pioche, défausses, mains des robots (siège 0 exclu, face à l'écran),
  // étiquettes, cartes Passe. Le tapis peut être coupé par les bords.
  usefulPoints(pitch = Math.PI / 3) {
    const pts = [];
    const card = (c, rotY, y, w = CW, h = CH) => {
      const cs = Math.cos(rotY), sn = Math.sin(rotY);
      for (const [x, z] of [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]) {
        pts.push(new THREE.Vector3(c.x + x * cs + z * sn, y, c.z - x * sn + z * cs));
      }
    };
    card(PILE, 0, 0.3);
    for (let i = 0; i < this.n; i++) {
      const th = (i * Math.PI * 2) / this.n;
      card(this.discPos(i), 0.12, 0.2);
      card(this.skipPos(i), th + Math.PI / 2, 0.06);
      if (i === 0) continue;
      card(this.seatPos(i), th, 0.1, 2 * HAND_HALF + CW, CH);
      // étiquette (sprite face caméra, 1.1 x 0.64) : droite caméra = axe x du monde (pas de lacet),
      // haut caméra = (0, cos pitch, -sin pitch)
      const t = this.tagPos(i);
      const ux = 0, uy = Math.cos(pitch), uz = -Math.sin(pitch);
      for (const [dx, du] of [[-0.55, -0.32], [0.55, -0.32], [-0.55, 0.32], [0.55, 0.32]]) {
        pts.push(new THREE.Vector3(t.x + dx + ux * du, 0.5 + uy * du, t.z + uz * du));
      }
    }
    return pts;
  }

  place(pitch, d, cz) {
    this.camera.position.set(0, Math.sin(pitch) * d, Math.cos(pitch) * d + cz);
    this.camera.lookAt(0, 0, cz);
    this.camera.updateMatrixWorld(true);
  }

  // Taille projetée (px CSS) d'une carte posée à plat en c (rotation rotY).
  cardPx(c, rotY = 0, y = 0.1, w = CW, h = CH) {
    const W = Math.max(1, this.stage.clientWidth), H = Math.max(1, this.stage.clientHeight);
    const cs = Math.cos(rotY), sn = Math.sin(rotY);
    const xs = [], ys = [];
    for (const [x, z] of [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]) {
      const q = new THREE.Vector3(c.x + x * cs + z * sn, y, c.z - x * sn + z * cs).project(this.camera);
      xs.push(((q.x + 1) / 2) * W); ys.push(((1 - q.y) / 2) * H);
    }
    return [Math.round(Math.max(...xs) - Math.min(...xs)), Math.round(Math.max(...ys) - Math.min(...ys))];
  }

  resize() {
    const w = Math.max(1, this.stage.clientWidth);
    const h = Math.max(1, this.stage.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    // Cadrage sur l'utile (marge 3 %, un peu plus en haut pour les pastilles #chips) :
    // pitch dans [42°, 72°], centre décalé en z, distance par dichotomie ; on garde la plus grande pioche à l'écran.
    // bande réservée en haut du stage pour #chips (pas #msg) : borne NDC = 1 - 2 * réserve / hauteur, marge 2 %
    const top = this.stage.getBoundingClientRect().top;
    const chips = document.getElementById('chips');
    const reserve = chips ? chips.getBoundingClientRect().bottom + 12 - top : 0;
    const yMax = Math.max(0.3, 1 - (2 * Math.max(0, reserve)) / h - 0.02);
    let pts = [];
    const fits = (pitch, d, cz) => {
      this.place(pitch, d, cz);
      return pts.every((p) => { const q = p.clone().project(this.camera); return q.z < 1 && Math.abs(q.x) <= 0.97 && q.y <= yMax && q.y >= -0.97; });
    };
    let best = null;
    for (let deg = 42; deg <= 72; deg += 2) {
      const pitch = (deg * Math.PI) / 180;
      pts = this.usefulPoints(pitch);
      for (let cz = -0.4; cz <= 0.61; cz += 0.2) {
        let lo = 1.5, hi = 40;
        if (!fits(pitch, hi, cz)) continue;
        for (let it = 0; it < 20; it++) { const mid = (lo + hi) / 2; if (fits(pitch, mid, cz)) hi = mid; else lo = mid; }
        this.place(pitch, hi, cz);
        const score = this.cardPx(PILE, 0, 0.3)[1];
        if (!best || score > best.score) best = { score, pitch, d: hi, cz };
      }
    }
    if (!best) best = { pitch: (60 * Math.PI) / 180, d: 12, cz: 0 };
    this.place(best.pitch, best.d, best.cz);
    this.fit = { ...best, yMax };
    this.dodgeMsg();
  }

  // Étiquette du siège tout en haut de l'écran (z le plus négatif) : si #msg la recouvre, on la rapproche du centre (x0.85).
  dodgeMsg() {
    if (!this.seats.length) return;
    let far = -1;
    for (let i = 1; i < this.n; i++) if (far < 0 || this.seatPos(i).z < this.seatPos(far).z) far = i;
    if (far < 0) return;
    const s = this.seats[far];
    const base = this.tagPos(far);
    s.sprite.position.set(base.x, 0.5, base.z);
    const msg = document.getElementById('msg');
    const chips = document.getElementById('chips');
    // bas de #msg ; s'il est vide pour l'instant, estimation sûre : bas de #chips + 36 px
    const msgBottom = msg && msg.offsetHeight ? msg.getBoundingClientRect().bottom : chips ? chips.getBoundingClientRect().bottom + 36 : 0;
    const up = (Math.cos(this.fit.pitch) * 0.32);
    const tagTop = this.toScreen(new THREE.Vector3(base.x, 0.5 + up, base.z - Math.sin(this.fit.pitch) * 0.32)).y;
    if (tagTop < msgBottom) {
      const p = this.seatPos(far).multiplyScalar(0.85);
      s.sprite.position.set(p.x, 0.5, p.z);
    }
  }

  // Mesures en pixels CSS du stage (crochet __level8.metrics).
  metrics() {
    const disc = this.seats.map((_, i) => this.cardPx(this.discPos(i), 0.12, 0.2));
    const hands = this.seats.map((s, i) => {
      const count = s.cards.filter((m) => m.visible).length;
      if (!count) return [0, 0];
      const th = (i * Math.PI * 2) / this.n;
      const step = Math.min(0.2, (2 * HAND_HALF) / count);
      return this.cardPx(this.seatPos(i), th, 0.1, (count - 1) * step + CW, CH);
    });
    return {
      stage: [this.stage.clientWidth, this.stage.clientHeight],
      pilePx: this.cardPx(PILE, 0, 0.3),
      discPx: disc,
      botHandPx: hands,
      pitch: this.fit ? Math.round((this.fit.pitch * 180) / Math.PI) : null,
      dist: this.fit ? +this.fit.d.toFixed(2) : null,
      cz: this.fit ? +this.fit.cz.toFixed(2) : null,
    };
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
