import * as THREE from 'three';

const MAX_SPARKS = 400;
const MAX_CONFETTI = 160;
const PALETTE = [0xff5d73, 0xffd23f, 0x3d9bff, 0x5fd35f, 0xb36bff, 0xff9f40];

function dotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, '#fff'); grad.addColorStop(0.5, '#fff'); grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export function createEffects(scene) {
  // Étincelles : un seul Points partagé, pool circulaire.
  const sPos = new Float32Array(MAX_SPARKS * 3);
  const sCol = new Float32Array(MAX_SPARKS * 4);
  const sVel = new Float32Array(MAX_SPARKS * 3);
  const sLife = new Float32Array(MAX_SPARKS); // secondes restantes
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(sCol, 4));
  const sparks = new THREE.Points(geo, new THREE.PointsMaterial({
    size: 0.22, map: dotTexture(), vertexColors: true, transparent: true, depthWrite: false,
  }));
  sparks.frustumCulled = false;
  scene.add(sparks);
  let sNext = 0;
  const col = new THREE.Color();

  function burst(pos, colorHex = 0xffd23f, n = 26) {
    for (let k = 0; k < n; k++) {
      const i = sNext; sNext = (sNext + 1) % MAX_SPARKS;
      const a = Math.random() * Math.PI * 2, up = 1.5 + Math.random() * 2.5, sp = 0.8 + Math.random() * 1.8;
      sPos.set([pos.x, pos.y + 0.1, pos.z], i * 3);
      sVel.set([Math.cos(a) * sp, up, Math.sin(a) * sp], i * 3);
      col.set(Math.random() < 0.5 ? colorHex : 0xffffff);
      sCol.set([col.r, col.g, col.b, 1], i * 4);
      sLife[i] = 0.7 + Math.random() * 0.4;
    }
  }

  // Confettis : InstancedMesh partagé.
  const cGeo = new THREE.PlaneGeometry(0.16, 0.26);
  const cMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const confetti = new THREE.InstancedMesh(cGeo, cMat, MAX_CONFETTI);
  confetti.frustumCulled = false;
  confetti.visible = false;
  scene.add(confetti);
  const cp = new Float32Array(MAX_CONFETTI * 3), cv = new Float32Array(MAX_CONFETTI * 3);
  const cr = new Float32Array(MAX_CONFETTI * 3), cw = new Float32Array(MAX_CONFETTI * 3);
  let confettiLife = 0;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1);
  const p3 = new THREE.Vector3();

  function confettiBurst(width = 6) {
    for (let i = 0; i < MAX_CONFETTI; i++) {
      cp.set([(Math.random() - 0.5) * width * 1.4, 4 + Math.random() * 4, (Math.random() - 0.5) * width], i * 3);
      cv.set([(Math.random() - 0.5) * 1.2, -(1 + Math.random() * 1.5), (Math.random() - 0.5) * 1.2], i * 3);
      cr.set([Math.random() * 6, Math.random() * 6, Math.random() * 6], i * 3);
      cw.set([(Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8], i * 3);
      confetti.setColorAt(i, col.set(PALETTE[i % PALETTE.length]));
    }
    confetti.instanceColor.needsUpdate = true;
    confettiLife = 4.5;
    confetti.visible = true;
  }

  function update(dtMs) {
    const dt = Math.min(dtMs, 50) / 1000;
    let any = false;
    for (let i = 0; i < MAX_SPARKS; i++) {
      if (sLife[i] <= 0) continue;
      any = true;
      sLife[i] -= dt;
      sVel[i * 3 + 1] -= 7 * dt;
      for (let a = 0; a < 3; a++) sPos[i * 3 + a] += sVel[i * 3 + a] * dt;
      sCol[i * 4 + 3] = Math.max(0, Math.min(1, sLife[i] / 0.5));
      if (sLife[i] <= 0) sPos[i * 3 + 1] = -100;
    }
    if (any) { geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true; }

    if (confettiLife > 0) {
      confettiLife -= dt;
      for (let i = 0; i < MAX_CONFETTI; i++) {
        for (let a = 0; a < 3; a++) { cp[i * 3 + a] += cv[i * 3 + a] * dt; cr[i * 3 + a] += cw[i * 3 + a] * dt; }
        if (cp[i * 3 + 1] < -0.3) cp[i * 3 + 1] = -50;
        e.set(cr[i * 3], cr[i * 3 + 1], cr[i * 3 + 2]);
        q.setFromEuler(e);
        m.compose(p3.set(cp[i * 3], cp[i * 3 + 1], cp[i * 3 + 2]), q, one);
        confetti.setMatrixAt(i, m);
      }
      confetti.instanceMatrix.needsUpdate = true;
      if (confettiLife <= 0) confetti.visible = false;
    }
  }

  return { burst, confettiBurst, update };
}
