// Paliers 1 et 2 : trier les solides du tapis roulant dans les bonnes caisses.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makeSortRound, matches, hintFor } from '../logic/sorting.mjs';
import { SPEED, nextSpeed } from '../logic/speed.mjs';
import { makeShape, shapeHeight, GREY, colorHex, textures, disposeTree } from '../meshes.js';
import { ease, tweens, wait, squash, popIn, shrinkOut, wiggle, flyTo } from '../fx.js';

const BELT_Z = -3.2, BELT_TOP = 0.5, X0 = -7.6, X_END = 8.2, SPACING = 2.5;
const BIN_Z = 2.4, BIN_GAP = 3.6;
const TOUCH_TOL = 44;
const BRAVOS = ['Bravo !', 'Super !', 'Bien joué !', 'Génial !'];

export function createSortLevel(ctx, level, seed) {
  const { root, input, sfx, confetti, say } = ctx;
  const round = makeSortRound(level, seed);
  const group = new THREE.Group();
  root.add(group);
  ctx.stage.setView([0, 9, 9.5], [0, 0.4, 0.4], 42, 1.75);

  // ---- décor : sol, tapis, rouleaux, goulotte
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 30), new THREE.MeshStandardMaterial({ color: 0xcfe9f7, roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
  group.add(floor);

  const beltBody = new THREE.Mesh(new RoundedBoxGeometry(16.6, 0.5, 2.1, 3, 0.1), new THREE.MeshStandardMaterial({ color: 0x59627a, roughness: 0.6 }));
  beltBody.position.set(0, 0.25, BELT_Z); beltBody.receiveShadow = true; beltBody.castShadow = true;
  group.add(beltBody);

  function stripeTexture() {
    const c = document.createElement('canvas'); c.width = 128; c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#3a4156'; g.fillRect(0, 0, 128, 64);
    g.strokeStyle = '#6f7a99'; g.lineWidth = 10;
    for (let x = -64; x < 160; x += 32) { g.beginPath(); g.moveTo(x, 64); g.lineTo(x + 32, 32); g.lineTo(x, 0); g.stroke(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const beltTex = textures.tapis ? textures.tapis.clone() : stripeTexture();
  beltTex.needsUpdate = true;
  beltTex.wrapS = THREE.RepeatWrapping; beltTex.repeat.set(8, 1);
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(16, 1.7), new THREE.MeshStandardMaterial({ map: beltTex, roughness: 0.8 }));
  surface.rotation.x = -Math.PI / 2; surface.position.set(0, BELT_TOP + 0.005, BELT_Z); surface.receiveShadow = true;
  group.add(surface);

  const rollerGeo = new THREE.CylinderGeometry(0.34, 0.34, 1.9, 20);
  const rollerMat = new THREE.MeshStandardMaterial({ color: 0xffc928, roughness: 0.4 });
  const rollers = [];
  for (const x of [-8.1, 8.1]) {
    const r = new THREE.Mesh(rollerGeo, rollerMat);
    r.rotation.x = Math.PI / 2; r.position.set(x, 0.36, BELT_Z); r.castShadow = true;
    // petits boulons pour voir la rotation
    const bolt = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.95, 0.14), new THREE.MeshStandardMaterial({ color: 0x2b3150 }));
    bolt.position.set(0.3, 0, 0);
    r.add(bolt);
    group.add(r); rollers.push(r);
  }
  const chute = new THREE.Mesh(new RoundedBoxGeometry(2.2, 0.2, 2.1, 3, 0.05), new THREE.MeshStandardMaterial({ color: 0x8e99b8, roughness: 0.6 }));
  chute.position.set(9.6, 0.1, BELT_Z); chute.rotation.z = -0.5; chute.receiveShadow = true;
  group.add(chute);

  // ---- caisses
  const woodColor = 0xd9a066;
  const bins = round.bins.map((b, i) => {
    const bg = new THREE.Group();
    const inner = new THREE.Group();
    bg.add(inner);
    const x = (i - (round.bins.length - 1) / 2) * BIN_GAP;
    bg.position.set(x, 0, BIN_Z);
    const tint = b.color ? colorHex(b.color) : woodColor;
    const mat = new THREE.MeshStandardMaterial({ color: tint, roughness: 0.65, map: textures.bois || null });
    const parts = [[2.4, 0.2, 2.4, 0, 0.1, 0], [2.4, 1, 0.22, 0, 0.55, 1.09], [2.4, 1, 0.22, 0, 0.55, -1.09], [0.22, 1, 2.4, 1.09, 0.55, 0], [0.22, 1, 2.4, -1.09, 0.55, 0]];
    for (const [w, hh, d, px, py, pz] of parts) {
      const m = new THREE.Mesh(new RoundedBoxGeometry(w, hh, d, 3, 0.08), mat);
      m.position.set(px, py, pz); m.castShadow = true; m.receiveShadow = true;
      inner.add(m);
    }
    const label = makeShape(b.shape, b.color ? colorHex(b.color) : GREY);
    label.position.set(0, 2.5, 0);
    inner.add(label);
    group.add(bg);
    return { data: b, group: bg, inner, label, x, z: BIN_Z, scale: 1, target: 1 };
  });

  // ---- objets
  const items = round.items.map((d) => {
    const holder = new THREE.Group();
    const mesh = makeShape(d.shape, colorHex(d.color));
    holder.add(mesh);
    holder.visible = false;
    group.add(holder);
    return { data: d, holder, mesh, state: 'queued', x: X0, rest: BELT_TOP + shapeHeight(d.shape) / 2 };
  });
  const queue = items.slice();
  let speed = SPEED.start, errors = 0, solved = 0, finished = false, selected = null, pressed = null, time = 0;
  const g1 = new THREE.Vector3(), g2 = new THREE.Vector3(), tgt = new THREE.Vector3(), tmpP = new THREE.Vector3();

  const isOnBelt = (it) => it.state === 'belt' || it.state === 'dragging' || it.state === 'bounce';

  function spawn(it) {
    it.state = 'belt'; it.x = X0;
    it.holder.visible = true;
    it.holder.rotation.set(0, 0, 0); it.holder.scale.set(1, 1, 1);
    it.holder.position.set(it.x, it.rest, BELT_Z);
    popIn(it.mesh, 0.4);
  }

  function binAt(x, y) {
    const p = input.ground(x, y, 0.4, g2);
    if (!p) return null;
    let best = null, bd = 1e9;
    for (const b of bins) {
      const dx = Math.abs(p.x - b.x), dz = Math.abs(p.z - b.z);
      if (dx < 1.7 && dz < 1.7 && dx + dz < bd) { bd = dx + dz; best = b; }
    }
    return best;
  }

  function setSelected(it) {
    if (selected && selected !== it) { selected.holder.scale.set(1, 1, 1); selected.holder.position.y = selected.rest; }
    selected = it;
    if (it) {
      it.holder.position.y = it.rest + 0.6;
      squash(it.mesh, 0.35, 0.45);
      sfx.pop();
    }
  }

  function returnToBelt(it, fromBin) {
    it.state = 'bounce';
    const sx = it.holder.position.x, sy = it.holder.position.y, sz = it.holder.position.z;
    const arc = fromBin ? 2.2 : 0.8;
    tweens.add({
      dur: fromBin ? 0.7 : 0.35, ease: ease.linear,
      update: (_, k) => {
        const t = ease.outCubic(k);
        const tx = Math.min(it.x, X_END - 0.8);
        it.holder.position.set(sx + (tx - sx) * t, sy + (it.rest - sy) * t + Math.sin(k * Math.PI) * arc, sz + (BELT_Z - sz) * t);
      },
      done: () => {
        it.x = Math.min(it.x, X_END - 0.8);
        it.holder.position.set(it.x, it.rest, BELT_Z);
        it.state = 'belt';
        squash(it.mesh, 0.25, 0.4);
      },
    });
  }

  function fall(it) {
    it.state = 'falling';
    if (selected === it) selected = null;
    say('Pas grave, il revient !', 'hint');
    sfx.hint();
    speed = nextSpeed(speed, 'rate');
    const sx = it.holder.position.x;
    tweens.add({
      dur: 0.8, ease: ease.linear,
      update: (_, k) => {
        it.holder.position.x = sx + k * 1.8;
        it.holder.position.y = it.rest - k * k * 2.2;
        it.holder.rotation.z = -k * 1.6;
      },
      done: () => {
        it.holder.visible = false;
        wait(0.8, () => { it.state = 'queued'; queue.push(it); });
      },
    });
  }

  function attempt(it, bin) {
    if (selected === it) selected = null;
    if (matches(it.data, bin.data, round.mode)) {
      it.state = 'flying';
      tgt.set(bin.x, 0.9, bin.z);
      flyTo(it.holder, tgt, 0.55, 2.2, () => {
        squash(it.mesh, 0.4, 0.4);
        squash(bin.group, 0.12, 0.5);
        sfx.success();
        confetti.sparkle(tmpP.set(bin.x, 1.4, bin.z));
        solved++;
        ctx.ui.setProgress(solved);
        speed = nextSpeed(speed, 'correct');
        say(BRAVOS[solved % BRAVOS.length], 'info');
        shrinkOut(it.holder, 0.3, () => { it.holder.visible = false; it.state = 'done'; });
        if (solved === items.length && !finished) {
          finished = true;
          wait(0.9, () => ctx.finish(errors));
        }
      });
      sfx.pop();
    } else {
      errors++;
      speed = nextSpeed(speed, 'erreur');
      const good = bins.find((b) => matches(it.data, b.data, round.mode)) || bin;
      wiggle(good.group, 0.18, 0.7);
      squash(good.group, 0.1, 0.6);
      say(hintFor(it.data, bin.data, round.mode), 'hint');
      sfx.hint();
      returnToBelt(it, true);
    }
  }

  function itemAt(x, y) {
    const meshes = [];
    for (const it of items) if (it.state === 'belt') meshes.push(it.mesh);
    const hit = input.pick(meshes, x, y);
    if (hit) return items.find((it) => it.mesh === hit.object) || null;
    // Repli tactile : forme du tapis la plus proche du doigt (les solides sont petits en portrait).
    let best = null, bd = TOUCH_TOL;
    for (const it of items) {
      if (it.state !== 'belt') continue;
      const p = input.project(it.holder.position);
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bd) { bd = d; best = it; }
    }
    return best;
  }

  input.setHandler({
    down(e) {
      if (finished) return;
      pressed = itemAt(e.x, e.y);
    },
    move(e) {
      if (!pressed || !e.dragging || finished) return;
      if (pressed.state === 'belt') {
        if (selected) { const s = selected; selected = null; s.holder.position.y = s.rest; }
        pressed.state = 'dragging';
        squash(pressed.mesh, 0.25, 0.3);
      }
      if (pressed.state !== 'dragging') return;
      const p = input.ground(e.x, e.y, 1.6, g1);
      if (p) pressed.holder.position.set(p.x, 1.6, p.z + 0.8);
      const b = binAt(e.x, e.y);
      for (const bb of bins) bb.target = bb === b ? 1.1 : 1;
    },
    up(e) {
      for (const bb of bins) bb.target = 1;
      const it = pressed; pressed = null;
      if (finished) return;
      if (it && it.state === 'dragging') {
        const b = binAt(e.x, e.y);
        if (b && !e.cancelled) attempt(it, b); else returnToBelt(it, false);
        return;
      }
      if (e.dragging) return;
      if (it && it.state === 'belt') {
        if (selected === it) { it.holder.scale.set(1, 1, 1); it.holder.position.y = it.rest; selected = null; }
        else setSelected(it);
        return;
      }
      const b = binAt(e.x, e.y);
      if (b && selected) attempt(selected, b);
      else if (b) { wiggle(b.group, 0.12, 0.4); say('Touche d’abord une forme !', 'info'); }
      else if (selected) { selected.holder.scale.set(1, 1, 1); selected.holder.position.y = selected.rest; selected = null; }
    },
  });

  return {
    total: items.length,
    start() {
      ctx.ui.setProgress(0);
      say(level === 1 ? 'Mets chaque forme dans sa caisse !' : 'Même forme et même couleur !', 'consigne');
    },
    update(dt) {
      time += dt;
      const v = selected ? 0 : speed;
      beltTex.offset.x -= v * dt * (8 / 16);
      for (const r of rollers) r.rotation.y -= v * dt / 0.34;
      let minX = 1e9;
      for (const it of items) {
        if (!isOnBelt(it) && it.state !== 'belt') continue;
        it.x = Math.min(it.x + v * dt, it.state === 'dragging' ? X_END - 0.8 : 1e9);
        if (it.state === 'belt') {
          it.holder.position.x = it.x;
          if (it.x > X_END) { fall(it); continue; }
        }
        if (it.x < minX) minX = it.x;
      }
      if (!selected && queue.length && minX >= X0 + SPACING) spawn(queue.shift());
      if (selected) {
        const s = 1 + 0.07 * Math.sin(time * 9);
        selected.holder.scale.set(s, s, s);
        selected.holder.rotation.y += dt * 2;
      }
      const k = Math.min(1, dt * 12);
      for (const b of bins) {
        b.scale += (b.target - b.scale) * k;
        b.inner.scale.setScalar(b.scale);
        b.label.rotation.y += dt * 0.9;
      }
    },
    dispose() { input.setHandler(null); root.remove(group); disposeTree(group); },
    debug() {
      group.updateMatrixWorld(true);
      return {
        items: items.filter((it) => it.state === 'belt' && it.x > -8 && it.x < 8.2).map((it) => {
          const p = input.project(it.holder.position);
          return { id: it.data.id, shape: it.data.shape, color: it.data.color, x: p.x, y: p.y };
        }),
        bins: bins.map((b) => {
          const p = input.project(tmpP.set(b.x, 0.4, b.z));
          return { id: b.data.id, shape: b.data.shape, color: b.data.color, x: p.x, y: p.y };
        }),
        errors, done: solved, total: items.length,
      };
    },
  };
}
