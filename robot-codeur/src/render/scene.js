import * as THREE from 'three';
import { Animator, ease, lerp } from './anim.js';
import { TOP, mats, makeGround, makeBridge, makeRock, makeChest, makeKey, makeRobot, makeQuestionSprite } from './models.js';
import { dirVec } from '../logic/engine.mjs';
import { sfx } from '../audio.js';
import { whenImage } from '../assets.js';
import { buildDecor } from './decor.js';

const YAW = { N: Math.PI, E: Math.PI / 2, S: 0, W: -Math.PI / 2 };

export class Stage {
  constructor(container) {
    this.container = container;
    this.anim = new Animator();
    this.world = null;
    this.time = 0;
    this.visible = false;

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 600);
    this.view = 'top';
    this.camLook = new THREE.Vector3();
    this._cp = new THREE.Vector3();
    this._cl = new THREE.Vector3();

    this.scene.add(new THREE.HemisphereLight(0xcfe9ff, 0x7a9a5a, 1.1));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(4, 9, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -6; sun.shadow.camera.right = 6;
    sun.shadow.camera.top = 6; sun.shadow.camera.bottom = -6;
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 25;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);

    this.decor = buildDecor(this.scene);
    whenImage('sky.png', (url) => {
      new THREE.TextureLoader().load(url, (tex) => {
        tex.mapping = THREE.EquirectangularReflectionMapping;
        tex.colorSpace = THREE.SRGBColorSpace;
        this.decor.skyMat.map = tex;
        this.decor.skyMat.needsUpdate = true;
      });
    });

    this.board = new THREE.Group();
    this.scene.add(this.board);

    this.robot = makeRobot();
    this.robot.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    this.question = makeQuestionSprite();
    this.scene.add(this.robot, this.question);
    this.yaw = 0;

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.frame(dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  setVisible(v) {
    this.visible = v;
    if (v) this.resize();
  }

  // Le canvas couvre tout l'écran de jeu (décor sous l'en-tête et le panneau),
  // mais la projection reste centrée et cadrée sur la zone de la scène.
  resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    const host = this.container.parentElement;
    const W = host.clientWidth;
    const H = host.clientHeight;
    if (!w || !h || !W || !H) return;
    const ox = this.container.offsetLeft;
    const oy = this.container.offsetTop;
    this.renderer.setSize(W, H, false);
    Object.assign(this.renderer.domElement.style, {
      left: `${-ox}px`, top: `${-oy}px`, width: `${W}px`, height: `${H}px`,
    });
    this.stageAspect = w / h;
    // cadre virtuel symétrique autour du centre de la scène
    const yc = oy + h / 2;
    const Hv = 2 * Math.max(yc, H - yc);
    this.proj = { W, H, h, Hv, y: Hv / 2 - yc };
    this.applyProjection();
    if (this.view === 'top') this.fitCamera();
  }

  applyProjection() {
    const base = this.view === 'fps' ? 70 : 38;
    const p = this.proj;
    if (!p) return;
    const t = Math.tan((base * Math.PI) / 360) * (p.Hv / p.h);
    this.camera.fov = (Math.atan(t) * 360) / Math.PI;
    this.camera.aspect = p.W / p.Hv;
    this.camera.setViewOffset(p.W, p.Hv, 0, p.y, p.W, p.H);
    this.camera.updateProjectionMatrix();
  }

  setView(v) {
    this.view = v === 'fps' ? 'fps' : 'top';
    this.applyProjection();
    // à la première personne, le robot est caché pour ne pas boucher la vue
    this.robot.visible = this.view !== 'fps';
    if (this.view === 'fps') this.snapCamera();
    else this.fitCamera();
  }

  toggleView() {
    this.setView(this.view === 'fps' ? 'top' : 'fps');
    return this.view;
  }

  // Position et point regardé de la caméra à la première personne.
  fpsTarget(pos, look) {
    const p = this.robot.position;
    const yaw = this.robot.rotation.y;
    const fx = Math.sin(yaw);
    const fz = Math.cos(yaw);
    pos.set(p.x - fx * 0.15, p.y + 0.95, p.z - fz * 0.15);
    look.set(p.x + fx * 3, p.y + 0.35, p.z + fz * 3);
  }

  snapCamera() {
    if (this.view !== 'fps' || !this.world) return;
    this.fpsTarget(this.camera.position, this.camLook);
    this.camera.lookAt(this.camLook);
  }

  // Cadrage automatique sur le plateau.
  fitCamera() {
    if (!this.world) return;
    const { width: bw, height: bh } = this.world;
    const vfov = (38 * Math.PI) / 180; // champ de la zone de scène (voir applyProjection)
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * (this.stageAspect || this.camera.aspect));
    const elev = (52 * Math.PI) / 180;
    const halfW = bw / 2 + 0.7;
    const halfD = (bh * Math.sin(elev)) / 2 + 0.9;
    const dH = halfW / Math.tan(hfov / 2);
    const dV = halfD / Math.tan(vfov / 2);
    const d = (Math.max(dH, dV) + 1.2) * 1.25;
    this.camera.position.set(0, Math.sin(elev) * d, Math.cos(elev) * d);
    this.camera.lookAt(0, 0, 0);
  }

  cell(x, y) {
    return new THREE.Vector3(x - (this.world.width - 1) / 2, 0, y - (this.world.height - 1) / 2);
  }

  setLevel(world) {
    this.anim.cancelAll();
    this.world = world;
    while (this.board.children.length) this.board.remove(this.board.children[0]);
    const walk = (x, y) => ['ground', 'bridge', 'rock'].includes(world.tiles[y]?.[x] ?? 'water');

    for (let y = 0; y < world.height; y++) {
      for (let x = 0; x < world.width; x++) {
        const t = world.tiles[y][x];
        const p = this.cell(x, y);
        if (t === 'ground' || t === 'rock') {
          const g = makeGround(x, y);
          g.position.copy(p);
          this.board.add(g);
          if (t === 'rock') { const r = makeRock(); r.position.add(p); this.board.add(r); }
        } else if (t === 'bridge') {
          const b = makeBridge(walk(x - 1, y) || walk(x + 1, y));
          b.position.copy(p);
          this.board.add(b);
        }
      }
    }
    this.keyMesh = null;
    if (world.key) {
      this.keyMesh = makeKey();
      this.keyMesh.userData.base = this.cell(world.key.x, world.key.y);
      this.board.add(this.keyMesh);
    }
    this.chest = makeChest();
    const tp = this.cell(world.treasure.x, world.treasure.y);
    this.chest.position.set(tp.x, 0, tp.z - 0.05);
    this.chest.scale.setScalar(1.05);
    this.board.add(this.chest);

    // le lac et la prairie sont dans le décor (construit une fois), on ajuste le lac au plateau
    this.decor.setBoard(world.width, world.height, { x: 0, z: 0 });
    this.resetRobot();
    if (this.view === 'top') this.fitCamera();
  }

  resetRobot() {
    this.anim.cancelAll();
    const s = this.world.start;
    this.setRobotCell(s.x, s.y);
    this.yaw = YAW[s.dir];
    this.robot.rotation.y = this.yaw;
    this.resetPose();
    this.snapCamera();
    this.question.visible = false;
    this.chest.userData.lidPivot.rotation.x = 0;
    this.chest.userData.glow.material.opacity = 0;
    const lk = this.chest.userData.lock;
    lk.visible = !!this.world.key; lk.scale.setScalar(1); lk.position.y = lk.userData.y0;
    if (this.keyMesh) { this.keyMesh.visible = true; this.keyMesh.userData.taken = false; this.keyMesh.scale.setScalar(1); }
  }

  resetPose() {
    const u = this.robot.userData;
    u.squash.scale.set(1, 1, 1);
    u.squash.position.set(0, 0, 0);
    u.torso.rotation.set(0, 0, 0);
    u.head.rotation.set(0, 0, 0);
    u.armL.rotation.set(0, 0, 0);
    u.armR.rotation.set(0, 0, 0);
  }

  setRobotCell(x, y) {
    const p = this.cell(x, y);
    this.robot.position.set(p.x, 0, p.z);
  }

  frame(dt) {
    this.time += dt;
    this.anim.update(dt);
    if (!this.visible || !this.world) return;
    // clé qui tourne et flotte
    const km = this.keyMesh;
    if (km && !km.userData.taken) {
      const b = km.userData.base;
      km.position.set(b.x, TOP + 0.5 + Math.sin(this.time * 2) * 0.06, b.z);
      km.rotation.y = this.time * 1.8;
    }
    // lac, nuages, dôme de ciel
    this.decor.update(this.time, dt, this.camera.position);
    // caméra à la première personne (lissage léger)
    if (this.view === 'fps') {
      const k = 1 - Math.exp(-dt * 16);
      this.fpsTarget(this._cp, this._cl);
      this.camera.position.lerp(this._cp, k);
      this.camLook.lerp(this._cl, k);
      this.camera.lookAt(this.camLook);
    }
    // point d'interrogation au-dessus de la tête
    if (this.question.visible) {
      const p = this.robot.position;
      this.question.position.set(p.x, 1.35 + Math.sin(this.time * 4) * 0.05, p.z);
    }
    this.renderer.render(this.scene, this.camera);
  }

  // ---------- animations du robot ----------
  async squashBounce(amount = 0.18, dur = 0.14) {
    const sq = this.robot.userData.squash;
    await this.anim.run(dur, (t) => {
      const k = 1 - ease.outBack(t);
      sq.scale.set(1 + amount * 0.6 * k, 1 - amount * k, 1 + amount * 0.6 * k);
    });
    sq.scale.set(1, 1, 1);
  }

  async slideTo(x2, y2, hop = 0.1, dur = 0.38) {
    const a = this.robot.position.clone();
    const b = this.cell(x2, y2);
    const sq = this.robot.userData.squash;
    await this.anim.run(dur, (t) => {
      const e = ease.inOut(t);
      this.robot.position.set(lerp(a.x, b.x, e), Math.sin(t * Math.PI) * hop, lerp(a.z, b.z, e));
      const st = Math.sin(t * Math.PI) * 0.12;
      sq.scale.set(1 - st * 0.5, 1 + st, 1 - st * 0.5);
    });
    this.robot.position.set(b.x, 0, b.z);
    await this.squashBounce(0.16, 0.12);
  }

  async turnBy(delta, dur = 0.34) {
    const from = this.yaw;
    const to = from + delta;
    const sq = this.robot.userData.squash;
    await this.anim.run(dur, (t) => {
      this.yaw = lerp(from, to, ease.outBack(t));
      this.robot.rotation.y = this.yaw;
      const st = Math.sin(t * Math.PI) * 0.08;
      sq.scale.set(1 - st, 1 + st, 1 - st);
    });
    this.yaw = to;
    this.robot.rotation.y = to;
    sq.scale.set(1, 1, 1);
  }

  async squashPre() {
    const sq = this.robot.userData.squash;
    await this.anim.run(0.1, (t) => {
      const k = Math.sin(t * Math.PI * 0.5) * 0.2;
      sq.scale.set(1 + k * 0.5, 1 - k, 1 + k * 0.5);
    });
  }

  // La clé s'envole vers le robot et disparaît dans un petit « pop ».
  async pickKey() {
    const km = this.keyMesh;
    if (!km) return;
    km.userData.taken = true;
    sfx.key();
    const from = km.position.clone();
    const rp = this.robot.position;
    await this.anim.run(0.45, (t) => {
      const e = ease.out(t);
      km.position.set(lerp(from.x, rp.x, e), from.y + Math.sin(t * Math.PI) * 0.5 + e * 0.35, lerp(from.z, rp.z, e));
      km.rotation.y += 0.4;
      km.scale.setScalar(t < 0.7 ? 1 + t * 0.4 : Math.max(0.01, (1 - t) / 0.3 * 1.28));
    });
    km.visible = false;
    const lk = this.chest.userData.lock;
    await this.anim.run(0.35, (t) => {
      lk.position.y = lk.userData.y0 + Math.sin(t * Math.PI) * 0.3 + t * 0.1;
      lk.scale.setScalar(Math.max(0.01, 1 - ease.in(t)));
    });
    lk.visible = false;
    await this.squashBounce(0.12, 0.12);
  }

  // Petit coup vers l'avant puis recul (obstacle).
  async bump(distance = 0.22) {
    const [dx, dy] = dirVec(this.currentDir);
    const base = this.robot.position.clone();
    await this.anim.run(0.2, (t) => {
      const k = Math.sin(t * Math.PI) * distance;
      this.robot.position.set(base.x + dx * k, 0, base.z + dy * k);
    });
    this.robot.position.copy(base);
    sfx.bonk();
    await this.squashBounce(0.22, 0.2);
  }

  async scratchHead() {
    const u = this.robot.userData;
    this.question.visible = true;
    const t0 = this.time;
    await this.anim.run(0.35, (t) => {
      const e = ease.out(t);
      u.armR.rotation.z = -2.7 * e;
      u.head.rotation.z = 0.28 * e;
    });
    await this.anim.run(0.7, (t) => {
      u.armR.rotation.z = -2.7 + Math.sin(t * Math.PI * 6) * 0.22;
      u.head.rotation.z = 0.28 + Math.sin(t * Math.PI * 6) * 0.03;
    });
    void t0;
  }

  // Animation d'un pas calculé par le moteur. `prev` = état avant, step.state = état après.
  async perform(step, prev) {
    this.currentDir = prev.dir;
    if (!step.ok) {
      if (step.error === 'water' || step.error === 'rock') {
        await this.bump();
      } else {
        sfx.bonk();
        await this.squashBounce(0.2, 0.2);
      }
      await this.scratchHead();
      return;
    }
    const s = step.state;
    switch (step.action) {
      case 'forward':
        sfx.step();
        await this.slideTo(s.x, s.y);
        if (step.event === 'key') await this.pickKey();
        break;
      case 'left': sfx.turn(); await this.turnBy(Math.PI / 2); break;
      case 'right': sfx.turn(); await this.turnBy(-Math.PI / 2); break;
      default: break;
    }
  }

  // Message d'échec sans erreur de pas (pas arrivé) : petite pause perplexe.
  async shrug() {
    await this.squashBounce(0.12, 0.15);
    await this.scratchHead();
  }

  async win() {
    const u = this.robot.userData;
    const lid = this.chest.userData.lidPivot;
    const glow = this.chest.userData.glow;
    this.chest.userData.lock.visible = false;
    sfx.win();
    await this.anim.run(0.5, (t) => {
      lid.rotation.x = -1.35 * ease.outBack(t);
      glow.material.opacity = 0.85 * t;
      glow.position.y = TOP + 0.34 + t * 0.25;
    });
    for (let i = 0; i < 2; i++) {
      await this.anim.run(0.38, (t) => {
        this.robot.position.y = Math.sin(t * Math.PI) * 0.5;
        u.armL.rotation.z = 2.6 * Math.sin(t * Math.PI);
        u.armR.rotation.z = -2.6 * Math.sin(t * Math.PI);
        const st = Math.sin(t * Math.PI) * 0.12;
        u.squash.scale.set(1 - st * 0.5, 1 + st, 1 - st * 0.5);
      });
      this.robot.position.y = 0;
      await this.squashBounce(0.2, 0.14);
    }
  }
}
