// Rendu three.js de l'atelier : table, chaudron, liquide, pots, gouttes, bulles, confettis.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createAnimator, easeInQuad, wobble } from '../ease.js';
import { PIGMENTS, PIGMENT_IDS, reflectanceToRgb, rgbToHex } from '../logic/pigments.js';

export const EAU = { r: 200, g: 232, b: 246 };
const POT_Z = 3.3;
const POT_DX = 2.2;
const CHAUDRON_Y = 1.25; // hauteur du bord
const COULEURS_CONFETTIS = ['#e44533', '#f9d85d', '#279de0', '#7ed957', '#ff7eb6', '#9b6bff'];

export function couleurPigment(id) {
  const p = PIGMENTS[id];
  const hex = rgbToHex(reflectanceToRgb(p.reflectance));
  if (id === 'blanc') return '#fbfbfb';
  if (id === 'noir') return '#2c2c36';
  return hex;
}

export function createAtelier(renderer, images = {}) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  const anim = createAnimator();
  const cible = new THREE.Vector3(0, 0.5, 1.2);
  const ELEV = (52 * Math.PI) / 180;

  // Lumières
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8c8b0, 1.15));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(-4, 9, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.radius = 4;
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 7, bottom: -5, near: 1, far: 25 });
  scene.add(sun);

  // Géométries et matériaux partagés
  const geoSphere = new THREE.SphereGeometry(1, 20, 14);
  const geoPotBody = new THREE.CylinderGeometry(0.78, 0.7, 1.0, 28);
  const geoPotRim = new THREE.TorusGeometry(0.74, 0.1, 12, 28);
  const geoPotTop = new THREE.CircleGeometry(0.7, 28);
  const geoConfetti = new THREE.PlaneGeometry(0.18, 0.28);
  const matCreme = new THREE.MeshStandardMaterial({ color: 0xfff6e8, roughness: 0.6 });

  // Table
  let bois = null;
  if (images.bois) {
    bois = new THREE.TextureLoader().load(images.bois);
    bois.colorSpace = THREE.SRGBColorSpace;
    bois.wrapS = bois.wrapT = THREE.RepeatWrapping;
    bois.repeat.set(2.2, 1.4);
  }
  const table = new THREE.Mesh(
    new RoundedBoxGeometry(15, 0.7, 9, 4, 0.25),
    new THREE.MeshStandardMaterial({ color: bois ? 0xffffff : 0xd9965a, roughness: 0.75, map: bois })
  );
  table.position.set(0, -0.35, 1.5);
  table.receiveShadow = true;
  scene.add(table);

  // Chaudron : corps en révolution (fonte arrondie), bord, pieds, anse
  // profil explicite : fond arrondi puis flancs
  const lathe = [];
  lathe.push(new THREE.Vector2(0.01, 0.12));
  lathe.push(new THREE.Vector2(0.55, 0.12));
  lathe.push(new THREE.Vector2(0.95, 0.3));
  lathe.push(new THREE.Vector2(1.25, 0.65));
  lathe.push(new THREE.Vector2(1.32, 0.95));
  lathe.push(new THREE.Vector2(1.25, CHAUDRON_Y));
  lathe.push(new THREE.Vector2(1.12, CHAUDRON_Y - 0.02));
  lathe.push(new THREE.Vector2(1.15, 0.95));
  lathe.push(new THREE.Vector2(1.1, 0.6));
  lathe.push(new THREE.Vector2(0.8, 0.35));
  lathe.push(new THREE.Vector2(0.01, 0.3));
  const chaudronGroup = new THREE.Group();
  const matFonte = new THREE.MeshStandardMaterial({ color: 0x3b3f58, roughness: 0.45, metalness: 0.25, side: THREE.DoubleSide });
  const corps = new THREE.Mesh(new THREE.LatheGeometry(lathe, 40), matFonte);
  corps.castShadow = true;
  chaudronGroup.add(corps);
  const bord = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.1, 12, 40), matFonte);
  bord.rotation.x = Math.PI / 2;
  bord.position.y = CHAUDRON_Y;
  chaudronGroup.add(bord);
  for (const a of [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4]) {
    const pied = new THREE.Mesh(geoSphere, matFonte);
    pied.scale.setScalar(0.22);
    pied.position.set(Math.cos(a) * 0.8, 0.15, Math.sin(a) * 0.8);
    pied.castShadow = true;
    chaudronGroup.add(pied);
  }
  scene.add(chaudronGroup);

  // Liquide
  const liquideMat = new THREE.MeshStandardMaterial({ color: 0xc8e8f6, roughness: 0.15, metalness: 0.0 });
  const liquide = new THREE.Mesh(new THREE.CircleGeometry(1.1, 40), liquideMat);
  liquide.rotation.x = -Math.PI / 2;
  liquide.position.y = 0.85;
  scene.add(liquide);
  const liq = { cur: { ...EAU }, tgt: { ...EAU }, niveau: 0.85, niveauCible: 0.85, plein: false, pulse: 0 };

  // Bulles
  const bulles = [];
  const matBulle = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, roughness: 0.1 });
  for (let i = 0; i < 7; i++) {
    const b = new THREE.Mesh(geoSphere, matBulle);
    b.userData = { phase: Math.random(), vit: 0.25 + Math.random() * 0.25, taille: 0.05 + Math.random() * 0.07, a: Math.random() * 6.28, r: Math.random() * 0.8 };
    scene.add(b);
    bulles.push(b);
  }

  // Pots de peinture
  const pots = [];
  const potsGroup = new THREE.Group();
  PIGMENT_IDS.forEach((id, i) => {
    const g = new THREE.Group();
    const couleur = couleurPigment(id);
    const mat = new THREE.MeshStandardMaterial({ color: couleur, roughness: 0.5 });
    const corpsPot = new THREE.Mesh(geoPotBody, new THREE.MeshStandardMaterial({ color: 0xfff6e8, roughness: 0.55 }));
    corpsPot.position.y = 0.5;
    corpsPot.castShadow = true;
    const bande = new THREE.Mesh(new THREE.CylinderGeometry(0.795, 0.725, 0.45, 28), mat);
    bande.position.y = 0.5;
    const rim = new THREE.Mesh(geoPotRim, matCreme);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 1.0;
    const top = new THREE.Mesh(geoPotTop, mat);
    top.rotation.x = -Math.PI / 2;
    top.position.y = 0.99;
    g.add(corpsPot, bande, rim, top);
    g.position.set((i - 2) * POT_DX, 0, POT_Z);
    g.userData = { pigment: id, baseY: 0, base: g.position.clone() };
    // zone de toucher généreuse (invisible)
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 1.6, 12), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.y = 0.8;
    hit.userData.hit = true;
    g.add(hit);
    potsGroup.add(g);
    pots.push(g);
  });
  scene.add(potsGroup);

  // Éclaboussures (pool)
  const matSplash = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
  const splashs = [];
  for (let i = 0; i < 10; i++) {
    const s = new THREE.Mesh(geoSphere, matSplash.clone());
    s.visible = false;
    s.userData = { vx: 0, vy: 0, vz: 0, vie: 0 };
    scene.add(s);
    splashs.push(s);
  }

  // Confettis (pool)
  const matsConf = COULEURS_CONFETTIS.map((c) => new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
  const confettis = [];
  for (let i = 0; i < 70; i++) {
    const c = new THREE.Mesh(geoConfetti, matsConf[i % matsConf.length]);
    c.visible = false;
    c.userData = { v: new THREE.Vector3(), r: new THREE.Vector3(), vie: 0 };
    scene.add(c);
    confettis.push(c);
  }

  // ---- API ----
  const caster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function pickPot(clientX, clientY, rect) {
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    caster.setFromCamera(ndc, camera);
    const hits = caster.intersectObjects(potsGroup.children, true);
    if (!hits.length) return null;
    let o = hits[0].object;
    while (o && !o.userData.pigment) o = o.parent;
    return o ? o.userData.pigment : null;
  }

  function potDe(id) {
    return pots.find((p) => p.userData.pigment === id);
  }

  function squashPot(pot) {
    anim.tween(0.45, (p) => {
      const w = wobble(p, 0.18);
      pot.scale.set(1 / Math.sqrt(w), w, 1 / Math.sqrt(w));
    }, () => pot.scale.set(1, 1, 1));
  }

  function eclabousser(rgb, n = 8) {
    const col = new THREE.Color().setRGB(rgb.r / 255, rgb.g / 255, rgb.b / 255, THREE.SRGBColorSpace);
    for (let i = 0; i < n; i++) {
      const s = splashs[i];
      s.visible = true;
      s.material.color.copy(col);
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.5;
      const v = 1.2 + Math.random() * 0.9;
      s.userData.vx = Math.cos(a) * v * 0.6;
      s.userData.vz = Math.sin(a) * v * 0.6;
      s.userData.vy = 2.4 + Math.random() * 1.6;
      s.userData.vie = 0.65;
      s.position.set(Math.cos(a) * 0.3, liq.niveau + 0.05, Math.sin(a) * 0.3);
      s.scale.setScalar(0.07 + Math.random() * 0.05);
    }
  }

  // Fait tomber une goutte du pot vers le chaudron. onLand appelé à l'arrivée.
  function drop(pigmentId, onLand) {
    const pot = potDe(pigmentId);
    if (!pot) { if (onLand) onLand(); return; }
    squashPot(pot);
    const couleur = new THREE.Color(couleurPigment(pigmentId));
    const goutte = new THREE.Mesh(geoSphere, new THREE.MeshStandardMaterial({ color: couleur, roughness: 0.2 }));
    goutte.castShadow = true;
    scene.add(goutte);
    const debut = new THREE.Vector3(pot.position.x, 1.5, pot.position.z);
    const fin = new THREE.Vector3((Math.random() - 0.5) * 0.5, liq.niveau, (Math.random() - 0.5) * 0.4);
    const hex = couleurPigment(pigmentId);
    anim.tween(0.62, (p) => {
      const e = easeInQuad(p);
      goutte.position.lerpVectors(debut, fin, p);
      goutte.position.y = debut.y + (fin.y - debut.y) * e + Math.sin(p * Math.PI) * 2.4 * (1 - p);
      const etire = 1 + Math.sin(p * Math.PI) * 0.45;
      goutte.scale.set(0.2 / Math.sqrt(etire), 0.2 * etire, 0.2 / Math.sqrt(etire));
    }, () => {
      scene.remove(goutte);
      goutte.material.dispose();
      liq.pulse = 1;
      const c = new THREE.Color(hex);
      eclabousser({ r: Math.round(c.r * 255), g: Math.round(c.g * 255), b: Math.round(c.b * 255) });
      if (onLand) onLand();
    });
  }

  function setLiquid(rgb, total = 0) {
    liq.tgt = rgb ? { ...rgb } : { ...EAU };
    liq.niveauCible = 0.85 + Math.min(total, 12) * 0.03;
  }
  function setLiquidInstant(rgb, total = 0) {
    setLiquid(rgb, total);
    liq.cur = { ...liq.tgt };
    liq.niveau = liq.niveauCible;
  }

  function confetti() {
    confettis.forEach((c, i) => {
      c.visible = true;
      c.position.set((Math.random() - 0.5) * 1.5, 1.6, (Math.random() - 0.5) * 1.2);
      const a = Math.random() * Math.PI * 2;
      const v = 2 + Math.random() * 3.5;
      c.userData.v.set(Math.cos(a) * v, 5 + Math.random() * 4, Math.sin(a) * v * 0.8 + 1);
      c.userData.r.set(Math.random() * 8, Math.random() * 8, Math.random() * 8);
      c.userData.vie = 2.2 + Math.random() * 0.6;
    });
  }

  function highlightPot(id) {
    const pot = potDe(id);
    if (!pot) return;
    anim.tween(1.4, (p) => {
      pot.position.y = Math.abs(Math.sin(p * Math.PI * 4)) * 0.45 * (1 - p);
      const s = 1 + 0.08 * Math.sin(p * Math.PI * 8) * (1 - p);
      pot.scale.set(s, s, s);
    }, () => { pot.position.y = 0; pot.scale.set(1, 1, 1); });
  }

  function chaudronSecoue() {
    anim.tween(0.5, (p) => {
      chaudronGroup.rotation.z = Math.sin(p * Math.PI * 6) * 0.06 * (1 - p);
    }, () => { chaudronGroup.rotation.z = 0; });
  }

  // Cadrage : chaudron + 5 pots visibles en paysage et portrait. haut/bas = hauteur HUD (px).
  function resize(w, h, haut = 120, bas = 110) {
    camera.aspect = w / h;
    const tan = Math.tan((camera.fov * Math.PI) / 360);
    const utile = Math.max(200, h - haut - bas);
    const dV = (6.4 * h) / (utile * 2 * tan);
    const dH = 11.8 / (2 * tan * camera.aspect);
    const d = Math.max(dV, dH, 9);
    camera.position.set(cible.x, cible.y + Math.sin(ELEV) * d, cible.z + Math.cos(ELEV) * d);
    camera.lookAt(cible);
    camera.setViewOffset(w, h, 0, -(haut - bas) / 2, w, h);
    camera.updateProjectionMatrix();
  }

  const tmp = new THREE.Color();
  function update(dt, t) {
    anim.update(dt);
    // liquide : lissage de la couleur et du niveau
    const k = 1 - Math.exp(-dt * 12);
    liq.cur.r += (liq.tgt.r - liq.cur.r) * k;
    liq.cur.g += (liq.tgt.g - liq.cur.g) * k;
    liq.cur.b += (liq.tgt.b - liq.cur.b) * k;
    liq.niveau += (liq.niveauCible - liq.niveau) * k;
    liq.pulse = Math.max(0, liq.pulse - dt * 3);
    tmp.setRGB(liq.cur.r / 255, liq.cur.g / 255, liq.cur.b / 255, THREE.SRGBColorSpace);
    liquideMat.color.copy(tmp);
    liquide.position.y = liq.niveau + Math.sin(liq.pulse * Math.PI) * 0.04;
    const sc = 1 + Math.sin(liq.pulse * Math.PI) * 0.03;
    liquide.scale.set(sc, sc, 1);
    const vide = Math.abs(liq.tgt.r - EAU.r) + Math.abs(liq.tgt.g - EAU.g) < 2;
    // bulles
    for (const b of bulles) {
      const u = b.userData;
      u.phase = (u.phase + dt * u.vit) % 1;
      b.visible = !vide;
      b.position.set(Math.cos(u.a) * u.r, liq.niveau + 0.05 + Math.sin(u.phase * Math.PI) * 0.22, Math.sin(u.a) * u.r);
      const s = u.taille * (0.4 + Math.sin(u.phase * Math.PI));
      b.scale.setScalar(Math.max(0.001, s));
    }
    // éclaboussures
    for (const s of splashs) {
      if (!s.visible) continue;
      const u = s.userData;
      u.vie -= dt;
      if (u.vie <= 0) { s.visible = false; continue; }
      u.vy -= 12 * dt;
      s.position.x += u.vx * dt;
      s.position.y += u.vy * dt;
      s.position.z += u.vz * dt;
      const st = 1 + Math.abs(u.vy) * 0.05;
      s.scale.y = s.scale.x * st;
    }
    // confettis
    for (const c of confettis) {
      if (!c.visible) continue;
      const u = c.userData;
      u.vie -= dt;
      if (u.vie <= 0 || c.position.y < -0.3) { c.visible = false; continue; }
      u.v.y -= 9 * dt;
      c.position.addScaledVector(u.v, dt);
      c.rotation.x += u.r.x * dt;
      c.rotation.y += u.r.y * dt;
      c.rotation.z += u.r.z * dt;
    }
    // respiration douce des pots
    pots.forEach((p, i) => {
      if (p.position.y === 0) p.rotation.y = Math.sin(t * 0.8 + i) * 0.05;
    });
  }

  setLiquidInstant(null, 0);
  return { scene, camera, update, resize, pickPot, drop, setLiquid, setLiquidInstant, confetti, highlightPot, chaudronSecoue, squashPot: (id) => squashPot(potDe(id)) };
}
