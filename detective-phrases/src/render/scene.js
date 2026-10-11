// Scène three.js : renderer, caméra cadrée selon le format, animations, confettis, raycast.
import * as THREE from 'three';
import { MAISONS, creerMaison, creerArbre, creerDetective, creerNuage, creerVillage, dessinerPanneau, appliquerTextures } from './ville.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { HorizontalTiltShiftShader } from 'three/addons/shaders/HorizontalTiltShiftShader.js';
import { VerticalTiltShiftShader } from 'three/addons/shaders/VerticalTiltShiftShader.js';
import { creerTerrain, creerCiel, chargerKit, MAT, devantPorte } from './terrain.js';
import { creerHabitants } from './habitants.js';
import { creerAnims, easeOutBack, easeInOutCubic, squash } from './anim.js';

const FOV = 40;
const TAN = Math.tan((FOV / 2) * Math.PI / 180);
const ELEVATION = 0.65;
const CENTRE_DETECTIVE = new THREE.Vector3(0, 0, 0.8);

// Distance de caméra pour qu'un rectangle (demi-largeur w, demi-hauteur h, en unités monde) tienne à l'écran.
export function distanceCadrage(aspect, w, h) {
  return Math.max(w / (TAN * aspect), h / TAN);
}

export function creerScene(canvas, { onMaison } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const fond = document.createElement('canvas');
  fond.width = 2;
  fond.height = 256;
  const fctx = fond.getContext('2d');
  const grad = fctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#5bbcff');
  grad.addColorStop(1, '#d9f4ff');
  fctx.fillStyle = grad;
  fctx.fillRect(0, 0, 2, 256);
  const texFond = new THREE.CanvasTexture(fond);
  texFond.colorSpace = THREE.SRGBColorSpace;
  scene.background = texFond;
  // Perspective aérienne : le lointain se fond dans la couleur de l'horizon.
  scene.fog = new THREE.Fog(0xcfeaff, 20, 78);

  scene.add(new THREE.HemisphereLight(0xcdeeff, 0x7fcf7f, 1.1));
  const soleil = new THREE.DirectionalLight(0xfff2d6, 2.2);
  soleil.position.set(6, 11, 7);
  soleil.castShadow = true;
  soleil.shadow.mapSize.set(2048, 2048);
  Object.assign(soleil.shadow.camera, { left: -17, right: 17, top: 17, bottom: -17, near: 1, far: 45 });
  soleil.shadow.bias = -0.0005;
  scene.add(soleil);

  const habitants = creerHabitants();
  scene.add(creerTerrain(), creerCiel(), creerVillage(), habitants.groupe);
  const maisons = MAISONS.map((def, i) => creerMaison(def, i));
  maisons.forEach((m) => scene.add(m));
  [[-7, 2, 1], [7, 1, 1.1], [-1.2, -4.2, 0.9], [2.2, -3.8, 1.2], [0.3, 6, 1], [-7.2, -3.4, 0.9], [7.4, 5.4, 1]].forEach(([x, z, s]) => scene.add(creerArbre(x, z, s)));
  const nuages = [creerNuage(-6, 8, -6), creerNuage(5, 9, -7)];
  nuages.forEach((n) => scene.add(n));

  const detective = creerDetective();
  detective.position.copy(CENTRE_DETECTIVE);
  scene.add(detective);

  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 170);

  // Profondeur : léger flou « tilt-shift » au-dessus et au-dessous de la bande nette (effet maquette).
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 }));
  composer.addPass(new RenderPass(scene, camera));
  const flouH = new ShaderPass(HorizontalTiltShiftShader);
  const flouV = new ShaderPass(VerticalTiltShiftShader);
  flouH.uniforms.r.value = flouV.uniforms.r.value = 0.42;
  composer.addPass(flouH);
  composer.addPass(flouV);
  composer.addPass(new OutputPass());
  const anims = creerAnims();
  const raycaster = new THREE.Raycaster();
  const pointeur = new THREE.Vector2();

  // État de caméra et de détective (interpolés vers leur cible)
  const etat = {
    mode: 'ville',
    maison: 0,
    cible: new THREE.Vector3(0, 0.8, 1.0),
    cibleVoulue: new THREE.Vector3(0, 0.8, 1.0),
    dist: 12,
    distVoulue: 12,
    azim: 0,
    azimVoulu: 0,
    detectivePos: CENTRE_DETECTIVE.clone(),
    detectiveVoulu: CENTRE_DETECTIVE.clone(),
    orbite: false,
    elev: ELEVATION,
    elevVoulue: ELEVATION,
  };

  function cadrer() {
    const aspect = camera.aspect;
    if (etat.mode === 'partie') {
      const pos = maisons[etat.maison].position;
      etat.cibleVoulue.set(pos.x * 0.85, 1.3, pos.z * 0.85 + 0.4);
      etat.distVoulue = distanceCadrage(aspect, 3.4, 2.7) * 1.05;
      // devant la porte (façades tournées vers la caméra), loin du panneau et de la boîte aux lettres
      const p = devantPorte(maisons[etat.maison].userData.def, 2.2);
      etat.detectiveVoulu.set(p.x - 0.15, 0, p.z);
    } else if (etat.mode === 'titre') {
      // caméra basse : la ville, les collines et le ciel derrière la carte de titre
      etat.cibleVoulue.set(0, 3, -2);
      etat.distVoulue = distanceCadrage(aspect, 8.5, 3.5);
      etat.detectiveVoulu.copy(CENTRE_DETECTIVE);
    } else {
      etat.cibleVoulue.set(0, 0.9, 0.9);
      etat.distVoulue = distanceCadrage(aspect, 7.0, 4.3) * 1.05;
      etat.detectiveVoulu.copy(CENTRE_DETECTIVE);
    }
  }

  function redimensionner() {
    const w = Math.max(1, window.innerWidth), h = Math.max(1, window.innerHeight);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(w, h);
    flouH.uniforms.h.value = 1.6 / w;
    flouV.uniforms.v.value = 1.6 / h;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    cadrer();
  }

  function placerCamera() {
    const c = Math.cos(etat.elev);
    camera.position.set(
      etat.cible.x + Math.sin(etat.azim) * c * etat.dist,
      etat.cible.y + Math.sin(etat.elev) * etat.dist,
      etat.cible.z + Math.cos(etat.azim) * c * etat.dist,
    );
    camera.lookAt(etat.cible);
  }

  function mode(nom, maison = 0) {
    etat.mode = nom;
    etat.maison = maison;
    etat.orbite = nom === 'titre';
    etat.elevVoulue = nom === 'titre' ? 0.2 : ELEVATION;
    cadrer();
  }

  function jouerSurDetective(duree, fn) {
    anims.ajouter(duree, fn, () => {
      detective.scale.set(1, 1, 1);
      detective.userData.tete.rotation.z = 0;
      detective.userData.bras.rotation.x = 0;
      detective.position.y = 0;
    });
  }

  // Détective qui saute (réponse juste) avec squash & stretch.
  function sauter() {
    jouerSurDetective(0.85, (p) => {
      let sy, sx;
      if (p < 0.15) { const k = p / 0.15; sy = 1 - 0.22 * k; sx = 1 + 0.18 * k; }
      else if (p < 0.85) { const k = (p - 0.15) / 0.7; sy = 1 + 0.18 * Math.sin(k * Math.PI); sx = 1 - 0.1 * Math.sin(k * Math.PI); }
      else { const [a, b] = squash((p - 0.85) / 0.15, 0.3); sx = a; sy = b; }
      const k = Math.max(0, (p - 0.12) / 0.76);
      detective.position.y = Math.sin(Math.min(1, k) * Math.PI) * 1.1;
      detective.scale.set(sx, sy, sx);
    });
  }

  // Détective qui penche la tête et se gratte (erreur, sans punition).
  function gratter() {
    jouerSurDetective(1.1, (p) => {
      const env = Math.sin(p * Math.PI);
      detective.userData.tete.rotation.z = Math.sin(p * Math.PI * 5) * 0.12 * env + 0.22 * env;
      detective.userData.bras.rotation.x = -Math.PI * 0.85 * easeInOutCubic(Math.min(1, env * 1.6));
      detective.scale.set(1, 1 - 0.05 * env, 1);
    });
  }

  function tapeMaison(i) {
    const m = maisons[i];
    anims.ajouter(0.5, (p) => {
      const [a, b] = squash(p, 0.18);
      m.scale.set(a, b, a);
    }, () => m.scale.set(1, 1, 1));
  }

  // Confettis 3D (InstancedMesh, retirés à la fin).
  let confettis = null;
  function lancerConfettis() {
    if (confettis) { scene.remove(confettis.mesh); confettis.mesh.dispose(); }
    const N = 140;
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 0.16, 0.03), new THREE.MeshBasicMaterial({ toneMapped: false }), N);
    const couleurs = [0xff6b6b, 0xffd43b, 0x51cf66, 0x4dabf7, 0xe64980, 0xff922b];
    const vit = [], pos = [], rot = [];
    for (let i = 0; i < N; i++) {
      mesh.setColorAt(i, new THREE.Color(couleurs[i % couleurs.length]));
      pos.push(new THREE.Vector3((Math.random() - 0.5) * 2, 3.5 + Math.random(), 1 + Math.random()));
      vit.push(new THREE.Vector3((Math.random() - 0.5) * 6, 2 + Math.random() * 5, (Math.random() - 0.5) * 4));
      rot.push(new THREE.Vector3(Math.random() * 6, Math.random() * 6, Math.random() * 6));
    }
    mesh.frustumCulled = false;
    scene.add(mesh);
    confettis = { mesh, vit, pos, rot, t: 0, N };
  }
  const dummy = new THREE.Object3D();
  function majConfettis(dt) {
    if (!confettis) return;
    const c = confettis;
    c.t += dt;
    for (let i = 0; i < c.N; i++) {
      c.vit[i].y -= 9 * dt;
      c.pos[i].addScaledVector(c.vit[i], dt);
      c.vit[i].multiplyScalar(1 - 0.6 * dt);
      dummy.position.copy(c.pos[i]);
      dummy.rotation.set(c.rot[i].x + c.t * 4, c.rot[i].y + c.t * 3, c.rot[i].z);
      dummy.updateMatrix();
      c.mesh.setMatrixAt(i, dummy.matrix);
    }
    c.mesh.instanceMatrix.needsUpdate = true;
    if (c.t > 3.6) { scene.remove(c.mesh); c.mesh.dispose(); confettis = null; }
  }

  // Remplace l'emoji d'un panneau par l'image listée au manifeste.
  function setIcone(i, img) {
    const ud = maisons[i].userData;
    dessinerPanneau(ud.canvas, ud.def, img);
    ud.tex.needsUpdate = true;
  }

  function surPointeur(e) {
    if (etat.mode !== 'ville') return;
    const r = canvas.getBoundingClientRect();
    pointeur.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(pointeur, camera);
    const touche = raycaster.intersectObjects(maisons, true)[0];
    if (touche) {
      const i = touche.object.userData.maison;
      if (i !== undefined) { tapeMaison(i); if (onMaison) onMaison(i); }
    }
  }
  canvas.addEventListener('pointerdown', surPointeur);
  window.addEventListener('resize', redimensionner);

  const horloge = new THREE.Clock();
  function boucle() {
    requestAnimationFrame(boucle);
    const dt = Math.min(horloge.getDelta(), 0.05);
    const t = horloge.elapsedTime;
    const k = 1 - Math.exp(-3.5 * dt);
    etat.cible.lerp(etat.cibleVoulue, k);
    etat.dist += (etat.distVoulue - etat.dist) * k;
    if (!Number.isFinite(etat.dist)) etat.dist = etat.distVoulue; // fenêtre 0×0 au chargement
    etat.azimVoulu = etat.orbite ? Math.sin(t * 0.25) * 0.35 : 0;
    etat.azim += (etat.azimVoulu - etat.azim) * k;
    etat.elev += (etat.elevVoulue - etat.elev) * k;
    etat.detectivePos.lerp(etat.detectiveVoulu, k);
    detective.position.x = etat.detectivePos.x;
    detective.position.z = etat.detectivePos.z;
    anims.maj(dt);
    habitants.maj(t);
    // petite vie au repos
    detective.userData.corps.position.y = 0.62 + Math.sin(t * 2) * 0.02;
    detective.userData.tete.position.y = 1.36 + Math.sin(t * 2) * 0.02;
    detective.rotation.y = Math.sin(t * 0.8) * 0.15;
    detective.userData.tete.rotation.x = -0.35; // lève les yeux vers la caméra, haute
    nuages.forEach((n, i) => { n.position.x += Math.sin(t * 0.2 + i) * 0.002; });
    if (MAT.eau.map) MAT.eau.map.offset.set(Math.sin(t * 0.4) * 0.05, t * 0.02);
    majConfettis(dt);
    placerCamera();
    composer.render(dt);
  }

  redimensionner();
  etat.cible.copy(etat.cibleVoulue);
  etat.dist = etat.distVoulue;
  boucle();

  return {
    mode,
    sauter,
    gratter,
    confettis: lancerConfettis,
    setIcone,
    chargerKit: (urlImage) => chargerKit(scene, urlImage, appliquerTextures),
    redimensionner,
    maisons,
    easeOutBack,
    etat: () => ({ mode: etat.mode, maison: etat.maison, dist: etat.dist, aspect: camera.aspect }),
  };
}
