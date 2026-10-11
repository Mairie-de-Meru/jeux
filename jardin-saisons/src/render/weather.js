import * as THREE from 'three';

const dummy = new THREE.Object3D();
const rnd = (a, b) => a + Math.random() * (b - a);

// Météo en particules (InstancedMesh) : pluie, neige, feuilles au vent, soleil à rayons.
export function createWeather(scene) {
  const group = new THREE.Group();
  scene.add(group);
  const X = 7, Z = 4.5, TOP = 7;

  function pool(geo, material, n, init) {
    const m = new THREE.InstancedMesh(geo, material, n);
    m.frustumCulled = false; m.visible = false;
    const data = [];
    for (let i = 0; i < n; i++) data.push(init(i));
    group.add(m);
    return { m, data, n };
  }
  const rain = pool(new THREE.CylinderGeometry(0.018, 0.018, 0.5, 4), new THREE.MeshBasicMaterial({ color: '#5aa9ff', transparent: true, opacity: 0.7 }), 260,
    () => ({ x: rnd(-X, X), y: rnd(0, TOP), z: rnd(-Z, Z), v: rnd(8, 12) }));
  const snow = pool(new THREE.SphereGeometry(0.075, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' }), 240,
    () => ({ x: rnd(-X, X), y: rnd(0, TOP), z: rnd(-Z, Z), v: rnd(0.6, 1.4), ph: rnd(0, 6.28) }));
  const leaves = pool(new THREE.CircleGeometry(0.13, 6), new THREE.MeshBasicMaterial({ color: '#e8782a', side: THREE.DoubleSide }), 60,
    () => ({ x: rnd(-X, X), y: rnd(0.3, 4.5), z: rnd(-Z, Z), v: rnd(0.4, 0.9), ph: rnd(0, 6.28), sp: rnd(2, 5) }));
  // couleurs variées pour les feuilles
  const cols = ['#e8782a', '#d1452b', '#f2b134', '#a8531f'];
  for (let i = 0; i < leaves.n; i++) leaves.m.setColorAt(i, new THREE.Color(cols[i % 4]));
  leaves.m.instanceColor.needsUpdate = true;
  leaves.m.material.color.set('#ffffff');

  // soleil : disque + rayons qui tournent
  const sunG = new THREE.Group(); sunG.position.set(4.2, 5.6, -3); sunG.visible = false;
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.75, 20, 16), new THREE.MeshBasicMaterial({ color: '#ffd23f' }));
  sunG.add(core);
  const rays = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 0.7, 0.05), new THREE.MeshBasicMaterial({ color: '#ffe27a' }), 14);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    dummy.position.set(Math.cos(a) * 1.35, Math.sin(a) * 1.35, 0); dummy.rotation.set(0, 0, a - Math.PI / 2); dummy.scale.set(1, 1, 1); dummy.updateMatrix();
    rays.setMatrixAt(i, dummy.matrix);
  }
  sunG.add(rays); group.add(sunG);

  // nuages (pluie / neige)
  const cloudG = new THREE.Group(); cloudG.visible = false;
  const cm = new THREE.MeshStandardMaterial({ color: '#eef2f7', roughness: 1 });
  [[0, 0, 1], [0.9, -0.1, 0.8], [-0.9, -0.15, 0.75], [0.3, 0.35, 0.7]].forEach(([x, y, s]) => {
    const c = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), cm); c.position.set(x, y, 0); c.scale.set(s * 1.1, s * 0.75, s * 0.8); cloudG.add(c);
  });
  cloudG.position.set(-2.5, 5.8, -2.5); group.add(cloudG);

  let kind = null, t = 0;
  function setWeather(k) {
    kind = k;
    rain.m.visible = k === 'pluie'; snow.m.visible = k === 'neige'; leaves.m.visible = k === 'vent';
    sunG.visible = k === 'soleil'; cloudG.visible = k === 'pluie' || k === 'neige';
    if (k === 'pluie') cm.color.set('#b9c4d3'); else cm.color.set('#f3f6fb');
  }

  function update(dt) {
    t += dt;
    if (kind === 'pluie') {
      for (let i = 0; i < rain.n; i++) {
        const p = rain.data[i]; p.y -= p.v * dt; if (p.y < 0) { p.y = TOP; p.x = rnd(-X, X); p.z = rnd(-Z, Z); }
        dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(0, 0, 0.08); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); rain.m.setMatrixAt(i, dummy.matrix);
      }
      rain.m.instanceMatrix.needsUpdate = true;
    } else if (kind === 'neige') {
      for (let i = 0; i < snow.n; i++) {
        const p = snow.data[i]; p.y -= p.v * dt; if (p.y < 0.05) { p.y = TOP; p.x = rnd(-X, X); p.z = rnd(-Z, Z); }
        dummy.position.set(p.x + Math.sin(t + p.ph) * 0.25, p.y, p.z); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); snow.m.setMatrixAt(i, dummy.matrix);
      }
      snow.m.instanceMatrix.needsUpdate = true;
    } else if (kind === 'vent') {
      for (let i = 0; i < leaves.n; i++) {
        const p = leaves.data[i]; p.x += (2.2 + Math.sin(t + p.ph)) * dt; p.y -= p.v * dt * 0.7 - Math.sin(t * 2 + p.ph) * dt * 0.5;
        if (p.x > X + 1 || p.y < 0.1) { p.x = -X - 1; p.y = rnd(1, 4.8); p.z = rnd(-Z, Z); }
        dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(t * p.sp + p.ph, t * p.sp * 0.7, p.ph); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); leaves.m.setMatrixAt(i, dummy.matrix);
      }
      leaves.m.instanceMatrix.needsUpdate = true;
    } else if (kind === 'soleil') {
      rays.rotation.z = t * 0.4;
      const s = 1 + Math.sin(t * 2) * 0.05; core.scale.setScalar(s);
    }
    if (cloudG.visible) cloudG.position.x = -2.5 + Math.sin(t * 0.3) * 0.5;
  }
  return { setWeather, update, get kind() { return kind; } };
}
