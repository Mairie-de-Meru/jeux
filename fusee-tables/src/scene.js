// Scène three.js : pas de tir, fusée, lancement, espace.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const STAGE_H = 0.9;
const BASE_H = 1.2;
const STAGE_COLORS = [0xff4d6d, 0xffc928, 0x3ddc84, 0x4da6ff, 0xb06cff];
const SKY_TOP = '#5fb4ff';
const SKY_BOTTOM = '#d6f0ff';

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const easeOutQuad = (t) => 1 - (1 - t) * (1 - t);
const easeInQuad = (t) => t * t;
const easeOutBack = (t) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
// squash & stretch : étirement avant l'impact, écrasement puis retour
function squash(t) {
  if (t < 0.5) return { sx: 1 - 0.12 * (t / 0.5), sy: 1 + 0.25 * (t / 0.5) };
  const k = (t - 0.5) / 0.5;
  const w = Math.sin(k * Math.PI);
  return { sx: 1 + 0.25 * w, sy: 1 - 0.25 * w };
}

function gradientTexture(top, bottom) {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, top);
  grad.addColorStop(1, bottom);
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const skyTex = gradientTexture(SKY_TOP, SKY_BOTTOM);
  scene.background = skyTex;
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 600);
  const camBase = new THREE.Vector3(0, 4, 15);
  const camLook = new THREE.Vector3(0, 3.2, 0);

  // Lumières
  scene.add(new THREE.HemisphereLight(0xffffff, 0x88aa66, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(6, 12, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 14, bottom: -4, near: 1, far: 40 });
  scene.add(sun);

  // Matériaux / géométries partagés
  const mat = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05, ...opts });
  const stageMats = STAGE_COLORS.map((c) => mat(c));
  const whiteMat = mat(0xf4f4f8);
  const redMat = mat(0xff4d6d);
  const stageGeo = new RoundedBoxGeometry(1.5, STAGE_H, 1.5, 4, 0.3);
  const smokeGeo = new THREE.SphereGeometry(0.5, 10, 8);
  const smokeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.85 });

  // Sol et pas de tir
  const ground = new THREE.Group();
  scene.add(ground);
  const grass = new THREE.Mesh(new THREE.CircleGeometry(120, 48), mat(0x7ed957));
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = -0.31;
  grass.receiveShadow = true;
  ground.add(grass);
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(3, 3.3, 0.6, 40), mat(0xb8bcc8));
  pad.position.y = -0.3;
  pad.receiveShadow = true;
  ground.add(pad);
  const tower = new THREE.Group();
  const towerMat = mat(0xff9f1c);
  for (const [x, z] of [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 9, 8), towerMat);
    leg.position.set(x, 4.5, z);
    leg.castShadow = true;
    tower.add(leg);
  }
  for (let y = 1; y <= 8; y += 1.75) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.6), towerMat);
    bar.position.y = y;
    tower.add(bar);
  }
  tower.position.set(-2.6, 0, -0.5);
  ground.add(tower);

  // Fusée
  const rocket = new THREE.Group();
  scene.add(rocket);
  const body = new THREE.Group();
  rocket.add(body);
  const baseCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.8, BASE_H, 20), whiteMat);
  baseCyl.position.y = BASE_H / 2;
  baseCyl.castShadow = true;
  body.add(baseCyl);
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.55, 0.3, 16), mat(0x555a6e));
  nozzle.position.y = 0.05;
  body.add(nozzle);
  for (let i = 0; i < 3; i++) {
    const fin = new THREE.Mesh(new RoundedBoxGeometry(0.15, 1, 0.8, 3, 0.06), redMat);
    const ang = (i / 3) * Math.PI * 2;
    fin.position.set(Math.cos(ang) * 0.95, 0.5, Math.sin(ang) * 0.95);
    fin.rotation.y = -ang;
    fin.castShadow = true;
    body.add(fin);
  }
  const stagesGroup = new THREE.Group();
  body.add(stagesGroup);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.3, 20), redMat);
  cone.castShadow = true;
  body.add(cone);
  const stageMeshes = [];
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.6, 12), new THREE.MeshBasicMaterial({ color: 0xffb02e }));
  flame.rotation.x = Math.PI;
  flame.position.y = -0.6;
  flame.visible = false;
  body.add(flame);

  const coneY = (n) => BASE_H + n * STAGE_H + 0.65;
  cone.position.y = coneY(0);

  // Étoiles + planètes décoratives
  const starCount = 900;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(150 + Math.random() * 100);
    starPos.set([v.x, v.y, v.z], i * 3);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: true, transparent: true, opacity: 0 });
  const stars = new THREE.Points(starGeo, starMat);
  stars.frustumCulled = false;
  stars.visible = false;
  scene.add(stars);

  const planetGeo = new THREE.SphereGeometry(1, 28, 20);
  const decor = new THREE.Group();
  decor.visible = false;
  scene.add(decor);
  [[-22, 8, -40, 3, 0xff9f1c], [26, -6, -60, 5, 0x4da6ff], [-14, -14, -70, 2, 0xb06cff]].forEach(([x, y, z, s, c]) => {
    const m = new THREE.Mesh(planetGeo, mat(c));
    m.position.set(x, y, z);
    m.scale.setScalar(s);
    decor.add(m);
  });

  function makePlanet(p) {
    const g = new THREE.Group();
    const pm = mat(new THREE.Color(p.color));
    // dans l'espace la lumière est faible : léger éclat propre pour garder la couleur vive
    pm.emissive = new THREE.Color(p.color).multiplyScalar(0.35);
    const m = new THREE.Mesh(planetGeo, pm);
    g.add(m);
    if (p.ring) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.12, 8, 48), mat(0xffffff));
      ring.rotation.x = Math.PI / 2.3;
      g.add(ring);
    }
    return g;
  }
  let hero = null;

  // Fumée
  const smoke = [];
  const smokeGroup = new THREE.Group();
  scene.add(smokeGroup);
  for (let i = 0; i < 28; i++) {
    const m = new THREE.Mesh(smokeGeo, smokeMat);
    m.visible = false;
    smokeGroup.add(m);
    smoke.push({ mesh: m, age: 99, vx: 0, vz: 0, life: 1 });
  }
  let smokeIdx = 0;
  function emitSmoke(y) {
    const s = smoke[smokeIdx++ % smoke.length];
    const a = Math.random() * Math.PI * 2;
    s.age = 0;
    s.life = 1.4 + Math.random() * 0.8;
    s.vx = Math.cos(a) * (1 + Math.random() * 1.5);
    s.vz = Math.sin(a) * (1 + Math.random() * 1.5);
    s.mesh.position.set(0, y, 0);
    s.mesh.visible = true;
  }

  // État
  let stages = 0;
  const drops = []; // { mesh, t, fromY, toY }
  let timeline = null; // { t, planet, resolve }
  let conePop = 0;

  function addStageMesh(i) {
    const m = new THREE.Mesh(stageGeo, stageMats[i % stageMats.length]);
    m.castShadow = true;
    m.position.y = BASE_H + i * STAGE_H + STAGE_H / 2;
    stagesGroup.add(m);
    stageMeshes[i] = m;
    return m;
  }

  function setStages(n, animate = false) {
    while (stageMeshes.length > n) {
      stagesGroup.remove(stageMeshes.pop());
    }
    drops.length = 0;
    while (stageMeshes.length < n) {
      const i = stageMeshes.length;
      const m = addStageMesh(i);
      if (animate && i === n - 1) {
        drops.push({ mesh: m, t: 0, toY: m.position.y });
        m.position.y += 9;
      }
    }
    stages = n;
    if (animate) conePop = 0.0001;
    else cone.position.y = coneY(n);
  }

  // Taille / cadrage
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    if (w > h) camera.setViewOffset(w, h, w * 0.2, 0, w, h);
    else camera.setViewOffset(w, h, 0, h * 0.3, w, h);
    camera.updateProjectionMatrix();
  }
  const camDistance = () => (camera.aspect < 1 ? 19 : 15);

  function reset() {
    if (timeline) timeline.resolve(); // le vol abandonné se termine proprement
    timeline = null;
    rocket.visible = true;
    rocket.position.set(0, 0, 0);
    rocket.rotation.set(0, 0, 0);
    flame.visible = false;
    ground.visible = true;
    scene.background = skyTex;
    stars.visible = false;
    decor.visible = false;
    smoke.forEach((s) => (s.mesh.visible = false));
    if (hero) {
      scene.remove(hero);
      hero = null;
    }
    setStages(0, false);
  }

  function launch(planet) {
    return new Promise((resolve) => {
      // étages encore en chute (onglet ralenti) : les poser avant le décollage
      for (const d of drops) {
        d.mesh.position.y = d.toY;
        d.mesh.scale.set(1, 1, 1);
      }
      drops.length = 0;
      conePop = 0;
      cone.scale.set(1, 1, 1);
      cone.position.y = coneY(stages);
      hero = makePlanet(planet);
      hero.visible = false;
      scene.add(hero);
      timeline = { t: 0, resolve, ended: false, smokeAcc: 0 };
      flame.visible = true;
    });
  }

  const skyColor = new THREE.Color(SKY_BOTTOM);
  const nightColor = new THREE.Color(0x0b1033);
  const tmpColor = new THREE.Color();

  function update(dt, time) {
    // chutes d'étages
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      d.t += dt / 0.7;
      const k = clamp01(d.t);
      d.mesh.position.y = d.toY + 9 * (1 - easeInQuad(k));
      if (k >= 0.7) {
        const sq = squash((k - 0.7) / 0.3);
        d.mesh.scale.set(sq.sx, sq.sy, sq.sx);
      }
      if (d.t >= 1) {
        d.mesh.position.y = d.toY;
        d.mesh.scale.set(1, 1, 1);
        drops.splice(i, 1);
      }
    }
    // coiffe qui monte
    if (conePop > 0 && !timeline) {
      conePop += dt / 0.6;
      const target = coneY(stages);
      cone.position.y += (target - cone.position.y) * Math.min(1, dt * 8);
      const s = squash(clamp01(conePop));
      cone.scale.set(s.sx, s.sy, s.sx);
      if (conePop >= 1) {
        conePop = 0;
        cone.scale.set(1, 1, 1);
        cone.position.y = target;
      }
    }
    // légère oscillation de repos
    if (!timeline) rocket.rotation.z = Math.sin(time * 1.5) * 0.008;

    // caméra par défaut
    let camPos = camBase.clone();
    camPos.z = camDistance();
    let look = camLook.clone();

    if (timeline) {
      const tl = timeline;
      tl.t += dt;
      const t = tl.t;
      // décollage : accélération quadratique après 1,2 s de vibration
      const lift = Math.max(0, t - 1.2);
      const y = 0.9 * lift * lift * lift * 0.35 + 1.5 * lift * lift * 0.5;
      rocket.position.y = y;
      rocket.position.x = t < 1.2 ? (Math.random() - 0.5) * 0.04 : 0;
      tl.smokeAcc += dt;
      if (y < 30 && tl.smokeAcc > 0.05) {
        tl.smokeAcc = 0;
        emitSmoke(Math.max(0.2, y));
      }
      flame.scale.set(1, 0.8 + Math.random() * 0.5, 1);
      // caméra suiveuse
      camPos.set(0, 4 + y * 0.85, camDistance() + Math.min(y * 0.2, 6));
      look.set(0, 3.2 + y * 0.9, 0);
      // ciel -> nuit
      const sk = clamp01((y - 15) / 60);
      if (sk > 0) {
        scene.background = tmpColor.copy(skyColor).lerp(nightColor, sk);
        starMat.opacity = clamp01((sk - 0.3) / 0.5);
        stars.visible = starMat.opacity > 0;
        decor.visible = sk > 0.7;
        if (sk >= 1) decor.visible = true;
      }
      if (y > 60) ground.visible = false;
      decor.position.y = camPos.y;
      // planète héroïne
      const pt = t - 9;
      if (pt > 0) {
        hero.visible = true;
        const k = easeOutBack(clamp01(pt / 1.8));
        hero.scale.setScalar(Math.max(0.01, 4.5 * k));
        const fwd = new THREE.Vector3().subVectors(look, camPos).normalize();
        hero.position.copy(camPos).addScaledVector(fwd, 20);
        hero.rotation.y += dt * 0.6;
        // la fusée repart sur le côté
      }
      if (t > 12 && !tl.ended) {
        tl.ended = true;
        tl.resolve();
      }
    }

    // fumée
    for (const s of smoke) {
      if (!s.mesh.visible) continue;
      s.age += dt;
      const k = s.age / s.life;
      if (k >= 1) {
        s.mesh.visible = false;
        continue;
      }
      s.mesh.position.x += s.vx * dt;
      s.mesh.position.z += s.vz * dt;
      s.mesh.position.y += dt * 0.8;
      s.mesh.scale.setScalar(0.5 + easeOutQuad(k) * 1.8);
    }

    camera.position.copy(camPos);
    camera.lookAt(look);
    if (timeline) stars.position.copy(camera.position);
  }

  // Boucle unique
  const clock = new THREE.Clock();
  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    update(dt, clock.elapsedTime);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  resize();
  setStages(0, false);
  requestAnimationFrame(frame);

  return { setStages, launch, reset, resize };
}
