import * as THREE from 'three';

const COLORS = [0xff5a5f, 0xffc93c, 0x4cd964, 0x3db2ff, 0xb06cff, 0xff8fb8, 0xff9a3c];
const COUNT = 140;

export function createConfetti(scene) {
  const geo = new THREE.PlaneGeometry(0.16, 0.26);
  const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const mesh = new THREE.InstancedMesh(geo, mat, COUNT);
  mesh.frustumCulled = false;
  mesh.visible = false;
  const c = new THREE.Color();
  for (let i = 0; i < COUNT; i++) mesh.setColorAt(i, c.setHex(COLORS[i % COLORS.length]));
  mesh.instanceColor.needsUpdate = true;
  scene.add(mesh);

  const dummy = new THREE.Object3D();
  const parts = Array.from({ length: COUNT }, () => ({
    p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Vector3(), s: new THREE.Vector3(), life: 0,
  }));
  let active = 0;

  return {
    burst(origin = new THREE.Vector3(0, 3, 0)) {
      for (const q of parts) {
        q.p.copy(origin).add(new THREE.Vector3((Math.random() - 0.5) * 3, Math.random(), (Math.random() - 0.5) * 2));
        q.v.set((Math.random() - 0.5) * 7, 5 + Math.random() * 5, (Math.random() - 0.5) * 5);
        q.r.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
        q.s.set((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12);
        q.life = 2.2 + Math.random() * 1.2;
      }
      active = COUNT;
      mesh.visible = true;
    },
    update(dt) {
      if (!active) return;
      active = 0;
      for (let i = 0; i < COUNT; i++) {
        const q = parts[i];
        if (q.life > 0) {
          q.life -= dt;
          q.v.y -= 11 * dt;
          q.v.multiplyScalar(1 - 0.6 * dt);
          q.p.addScaledVector(q.v, dt);
          q.r.addScaledVector(q.s, dt);
          if (q.p.y < 0.05) { q.p.y = 0.05; q.v.set(0, 0, 0); q.s.multiplyScalar(0.9); }
          active++;
        }
        dummy.position.copy(q.p);
        dummy.rotation.set(q.r.x, q.r.y, q.r.z);
        dummy.scale.setScalar(q.life > 0 ? Math.min(1, q.life * 2) : 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (!active) mesh.visible = false;
    },
  };
}
