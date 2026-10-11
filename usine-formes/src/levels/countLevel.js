// Palier 3 : compter les faces et les sommets d'un solide qu'on fait tourner.
import * as THREE from 'three';
import { makeCountRounds, createCounter, answerChoices, checkAnswer } from '../logic/counting.mjs';
import { polyhedron } from '../logic/shapes.mjs';
import { makeRng } from '../logic/rng.mjs';
import { disposeTree, shared } from '../meshes.js';
import { ease, tweens, wait, squash, hop } from '../fx.js';

const PASTEL = [0xffd6e0, 0xd6ecff, 0xfff3c4, 0xd9f5d9, 0xe6d9ff, 0xffe1c4];
const VIVID = [0xff5a5f, 0x3d8bff, 0xffc928, 0x3ccf6e, 0xb06bff, 0xff9a3c];
const SOLID_SCALE = 1.35;

const edgeGeo = shared(new THREE.CylinderGeometry(0.035, 0.035, 1, 8));
const edgeMat = shared(new THREE.MeshStandardMaterial({ color: 0x3a4258, roughness: 0.5 }));
const vertGeo = shared(new THREE.SphereGeometry(0.24, 20, 14));
const proxyGeo = shared(new THREE.SphereGeometry(0.36, 8, 6));
const proxyMat = shared(new THREE.MeshBasicMaterial({ visible: false }));

function numberSprite(n, hex) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.beginPath(); g.arc(64, 64, 58, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#' + hex.toString(16).padStart(6, '0'); g.beginPath(); g.arc(64, 64, 48, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fff'; g.font = '900 72px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(String(n), 64, 70);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthWrite: false }));
  sp.scale.set(0.6, 0.6, 1);
  return sp;
}

export function createCountLevel(ctx, seed) {
  const { root, input, sfx, confetti, say, ui } = ctx;
  ctx.stage.setView([0, 0.6, 9.5], [0, 0, 0], 40, 1.2);
  const rounds = makeCountRounds(seed);
  const group = new THREE.Group();
  root.add(group);
  let solid = null, S = null; // S : données de la manche courante
  let roundIdx = 0, errors = 0, locked = false, finished = false;
  let yaw = 0.6, pitch = 0.35, vYaw = 0, vPitch = 0, pressing = false, lastX = 0, lastY = 0, lastT = 0;
  const tmpV = new THREE.Vector3(), tmpN = new THREE.Vector3(), tmpC = new THREE.Vector3(), q = new THREE.Quaternion();

  function applyRot() { solid.rotation.set(pitch, yaw, 0, 'XYZ'); }

  function buildSolid(round) {
    if (solid) { group.remove(solid); disposeTree(solid); }
    solid = new THREE.Group();
    solid.scale.setScalar(SOLID_SCALE);
    group.add(solid);
    const poly = polyhedron(round.shape);
    const V = poly.vertices.map((v) => new THREE.Vector3(...v));
    const faces = [], verts = [];
    const sommetsMode = round.quoi === 'sommets';
    const adj = V.map(() => []);

    poly.faces.forEach((idx, fi) => {
      const c = new THREE.Vector3();
      idx.forEach((i) => c.add(V[i]));
      c.divideScalar(idx.length);
      const n = new THREE.Vector3().crossVectors(tmpV.copy(V[idx[1]]).sub(V[idx[0]]), tmpN.copy(V[idx[2]]).sub(V[idx[0]])).normalize();
      if (n.dot(c) < 0) n.negate();
      const pts = idx.map((i) => V[i].clone().sub(c).multiplyScalar(0.92).add(c));
      const pos = [];
      for (let k = 1; k < pts.length - 1; k++) pos.push(pts[0].x, pts[0].y, pts[0].z, pts[k].x, pts[k].y, pts[k].z, pts[k + 1].x, pts[k + 1].y, pts[k + 1].z);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.computeVertexNormals();
      const base = new THREE.Color(PASTEL[fi % PASTEL.length]);
      if (sommetsMode) base.lerp(new THREE.Color(0xffffff), 0.45);
      const mat = new THREE.MeshStandardMaterial({ color: base, roughness: 0.55, side: THREE.DoubleSide, flatShading: true });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.userData = { kind: 'face', id: 'face-' + fi };
      solid.add(mesh);
      idx.forEach((i) => adj[i].push(fi));
      faces.push({ id: 'face-' + fi, mesh, normal: n, centroid: c, lit: false });
    });

    // arêtes (dédoublonnées)
    const seen = new Set();
    for (const idx of poly.faces) {
      for (let k = 0; k < idx.length; k++) {
        const a = idx[k], b = idx[(k + 1) % idx.length];
        const key = Math.min(a, b) + '-' + Math.max(a, b);
        if (seen.has(key)) continue;
        seen.add(key);
        const m = new THREE.Mesh(edgeGeo, edgeMat);
        const dir = tmpV.copy(V[b]).sub(V[a]);
        const len = dir.length();
        m.position.copy(V[a]).addScaledVector(dir, 0.5);
        m.quaternion.setFromUnitVectors(tmpN.set(0, 1, 0), dir.normalize());
        m.scale.set(1, len, 1);
        solid.add(m);
      }
    }

    // sommets
    V.forEach((p, i) => {
      const mat = new THREE.MeshStandardMaterial({ color: 0x4a5578, roughness: 0.4 });
      const m = new THREE.Mesh(vertGeo, mat);
      m.position.copy(p);
      m.scale.setScalar(sommetsMode ? 1 : 0.5);
      solid.add(m);
      const proxy = new THREE.Mesh(proxyGeo, proxyMat);
      proxy.position.copy(p);
      proxy.userData = { kind: 'vertex', id: 'v-' + i };
      solid.add(proxy);
      verts.push({ id: 'v-' + i, mesh: m, proxy, pos: p.clone(), adj: adj[i], lit: false });
    });

    S = { round, faces, verts, counter: createCounter(round.reponse), pickables: [] };
    S.pickables = faces.map((f) => f.mesh);
    if (sommetsMode) S.pickables.push(...verts.map((v) => v.proxy));
    applyRot();
  }

  function sayCount() {
    const q2 = S.round.quoi === 'faces' ? 'Combien de faces ?' : 'Combien de sommets ?';
    say(`${q2}  👆 ${S.counter.compte}`, 'info');
  }

  function startRound() {
    const r = rounds[roundIdx];
    buildSolid(r);
    locked = false;
    hop(solid, 0.4, 0.5);
    squash(solid, 0.15, 0.5);
    const q2 = r.quoi === 'faces' ? 'Combien de faces ?' : 'Combien de sommets ?';
    say(q2 + '  👆 0', 'consigne');
    ui.showAnswers(answerChoices(r.reponse, makeRng(seed * 31 + roundIdx + 1)), onAnswer);
    ui.setProgress(roundIdx);
  }

  function lightFace(f, n) {
    f.lit = true;
    f.mesh.material.color.setHex(VIVID[(n - 1) % VIVID.length]);
    const sp = numberSprite(n, VIVID[(n - 1) % VIVID.length]);
    sp.position.copy(f.centroid).addScaledVector(f.normal, 0.12);
    solid.add(sp);
    const nx = f.normal;
    tweens.add({ dur: 0.45, ease: ease.linear, update: (_, k) => { f.mesh.position.copy(nx).multiplyScalar(Math.sin(k * Math.PI) * 0.25); }, done: () => f.mesh.position.set(0, 0, 0) });
    tweens.add({ dur: 0.4, ease: ease.outBack, update: (t) => sp.scale.set(0.6 * t, 0.6 * t, 1) });
  }

  function lightVertex(v, n) {
    v.lit = true;
    v.mesh.material.color.setHex(0xffd400);
    v.mesh.material.emissive.setHex(0x553f00);
    tweens.add({ dur: 0.45, ease: ease.outBack, update: (t) => v.mesh.scale.setScalar(1 + 0.6 * t) });
    const sp = numberSprite(n, 0xff9a3c);
    sp.position.copy(v.pos).normalize().multiplyScalar(0.55).add(v.pos);
    solid.add(sp);
    tweens.add({ dur: 0.4, ease: ease.outBack, update: (t) => sp.scale.set(0.6 * t, 0.6 * t, 1) });
  }

  function onTap(x, y) {
    if (locked) return;
    const hits = input.pickAll(S.pickables, x, y);
    if (!hits.length) return;
    const ud = hits[0].object.userData;
    if (S.round.quoi === 'faces' && ud.kind === 'face') {
      const f = S.faces.find((o) => o.id === ud.id);
      const r = S.counter.touch(f.id);
      if (!r.nouveau) { sfx.click(); return; }
      lightFace(f, r.compte);
      sfx.note(r.compte - 1);
      sayCount();
    } else if (S.round.quoi === 'sommets' && ud.kind === 'vertex') {
      const v = S.verts.find((o) => o.id === ud.id);
      const r = S.counter.touch(v.id);
      if (!r.nouveau) { sfx.click(); return; }
      lightVertex(v, r.compte);
      sfx.note(r.compte - 1);
      sayCount();
    }
  }

  function onAnswer(n, btn) {
    if (locked) return;
    const r = S.round;
    if (checkAnswer(r, n)) {
      locked = true;
      ui.setAnswersEnabled(false);
      sfx.success();
      confetti.burst(tmpC.set(0, 1, 2), 70);
      hop(solid, 0.8, 0.6);
      squash(solid, 0.25, 0.6);
      say('Bravo ! 🎉 ' + r.reponse + ' ' + r.quoi, 'bravo');
      ui.setProgress(roundIdx + 1);
      wait(1.8, () => {
        if (finished) return;
        roundIdx++;
        if (roundIdx >= rounds.length) { finished = true; ctx.finish(errors); } else startRound();
      });
    } else {
      errors++;
      sfx.hint();
      ui.shake(btn);
      say(r.quoi === 'faces' ? 'Touche les faces pour les compter !' : 'Touche les sommets pour les compter !', 'hint');
    }
  }

  input.setHandler({
    down(e) { pressing = true; lastX = e.x; lastY = e.y; lastT = performance.now(); vYaw = vPitch = 0; },
    move(e) {
      if (!e.dragging) return;
      const now = performance.now(), dtm = Math.max((now - lastT) / 1000, 0.008);
      const dy = (e.x - lastX) * 0.012, dp = (e.y - lastY) * 0.012;
      yaw += dy; pitch = Math.max(-1.4, Math.min(1.4, pitch + dp));
      vYaw = Math.max(-8, Math.min(8, dy / dtm)); vPitch = Math.max(-8, Math.min(8, dp / dtm));
      lastX = e.x; lastY = e.y; lastT = now;
      applyRot();
    },
    up(e) {
      pressing = false;
      if (!e.dragging && !e.cancelled) { vYaw = vPitch = 0; onTap(e.x, e.y); }
      else if (performance.now() - lastT > 120) vYaw = vPitch = 0;
    },
  });

  function visibleFace(f) {
    tmpN.copy(f.normal).applyQuaternion(solid.quaternion);
    tmpC.copy(f.centroid).multiplyScalar(SOLID_SCALE).applyQuaternion(solid.quaternion);
    tmpV.copy(ctx.stage.camera.position).sub(tmpC).normalize();
    return tmpN.dot(tmpV) > 0.15;
  }

  return {
    total: rounds.length,
    start() { startRound(); },
    update(dt) {
      if (!solid) return;
      if (!pressing && (Math.abs(vYaw) > 0.01 || Math.abs(vPitch) > 0.01)) {
        yaw += vYaw * dt; pitch = Math.max(-1.4, Math.min(1.4, pitch + vPitch * dt));
        const d = Math.exp(-3 * dt);
        vYaw *= d; vPitch *= d;
        applyRot();
      }
    },
    dispose() { input.setHandler(null); root.remove(group); disposeTree(group); },
    debug() {
      if (!S) return {};
      solid.updateMatrixWorld(true);
      const proj = (local) => input.project(solid.localToWorld(tmpV.copy(local)));
      const faces = S.faces.map((f) => {
        const p = proj(f.centroid);
        return { id: f.id, x: p.x, y: p.y, visible: visibleFace(f), lit: f.lit };
      });
      const sommets = S.verts.map((v) => {
        const p = proj(v.pos);
        return { id: v.id, x: p.x, y: p.y, visible: v.adj.some((fi) => visibleFace(S.faces[fi])), lit: v.lit };
      });
      return {
        round: roundIdx, shape: S.round.shape, quoi: S.round.quoi, reponse: S.round.reponse, compte: S.counter.compte,
        faces, sommets, choix: answerChoices(S.round.reponse, makeRng(seed * 31 + roundIdx + 1)),
      };
    },
  };
}
