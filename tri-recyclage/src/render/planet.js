import * as THREE from 'three';

// Planète souriante : le sourire et les joues suivent la jauge (0..1).
export function createPlanet() {
  const group = new THREE.Group();
  const R = 1.4;
  const sea = new THREE.MeshStandardMaterial({ color: 0x3e8ede, roughness: 0.55 });
  const landMat = new THREE.MeshStandardMaterial({ color: 0x4cc16f, roughness: 0.7 });
  const earth = new THREE.Mesh(new THREE.SphereGeometry(R, 40, 28), sea);
  earth.castShadow = true;
  group.add(earth);

  const landGeo = new THREE.SphereGeometry(1, 16, 12);
  const lands = [[-1.1, 0.6, 0.2, 0.5], [1.0, 0.7, -0.4, 0.55], [-0.6, -0.9, -0.5, 0.45], [0.9, -0.7, 0.2, 0.4], [0, 1.2, -0.5, 0.45], [-1, 0.1, -0.9, 0.5]];
  for (const [x, y, z, s] of lands) {
    const m = new THREE.Mesh(landGeo, landMat);
    const p = new THREE.Vector3(x, y, z).normalize().multiplyScalar(R * 0.99);
    m.position.copy(p);
    m.scale.set(s, s, 0.12);
    m.lookAt(0, 0, 0);
    // lookAt oriente +z vers le centre : on retourne pour que le bombement soit vers l'extérieur
    m.rotateY(Math.PI);
    group.add(m);
  }

  // Visage (côté +z, face caméra)
  const face = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({ color: 0x1e2a3a, roughness: 0.4 });
  const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const eyeGeo = new THREE.SphereGeometry(0.13, 16, 12);
  const glintGeo = new THREE.SphereGeometry(0.04, 8, 6);
  const eyes = [];
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeo, dark);
    eye.position.set(0.45 * s, 0.25, 1.28);
    const glint = new THREE.Mesh(glintGeo, white);
    glint.position.set(0.04, 0.05, 0.11);
    eye.add(glint);
    face.add(eye);
    eyes.push(eye);
  }
  const mouthGeo = new THREE.TorusGeometry(0.32, 0.055, 10, 24, Math.PI);
  const mouth = new THREE.Mesh(mouthGeo, new THREE.MeshStandardMaterial({ color: 0x7a1f2b, roughness: 0.5 }));
  mouth.rotation.z = Math.PI; // arc vers le bas = sourire
  const mouthPivot = new THREE.Group();
  mouthPivot.position.set(0, -0.28, 1.33);
  mouthPivot.add(mouth);
  mouth.position.y = 0.15;
  face.add(mouthPivot);
  const cheekMat = new THREE.MeshBasicMaterial({ color: 0xff8fa3, transparent: true, opacity: 0.8 });
  const cheekGeo = new THREE.SphereGeometry(0.13, 12, 8);
  const cheeks = [];
  for (const s of [-1, 1]) {
    const ch = new THREE.Mesh(cheekGeo, cheekMat);
    ch.position.set(0.78 * s, -0.08, 1.12);
    ch.scale.set(1, 0.6, 0.3);
    face.add(ch);
    cheeks.push(ch);
  }
  group.add(face);

  let target = 0, cur = 0, blink = 0, nextBlink = 2;

  function update(dt, time) {
    cur += (target - cur) * (1 - Math.exp(-5 * dt));
    mouthPivot.scale.set(0.7 + 0.5 * cur, 0.12 + 0.88 * cur, 1);
    for (const c of cheeks) c.scale.set(cur, 0.6 * cur, 0.3 * cur + 0.001);
    nextBlink -= dt;
    if (nextBlink <= 0) { blink = 0.12; nextBlink = 2 + Math.random() * 3; }
    blink = Math.max(0, blink - dt);
    for (const e of eyes) e.scale.y = blink > 0 ? 0.15 : 1;
    group.position.y = 3.4 + Math.sin(time * 1.6) * 0.08 + cur * 0.05;
    group.rotation.z = Math.sin(time * 0.9) * 0.04;
  }
  group.position.set(0, 3.4, -3.4);

  return {
    group, update,
    setGauge(g) { target = Math.max(0, Math.min(1, g)); },
    cheer() { cur = Math.min(1, cur + 0.2); },
    dispose() { sea.dispose(); landMat.dispose(); dark.dispose(); white.dispose(); cheekMat.dispose(); },
  };
}
