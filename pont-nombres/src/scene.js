import * as THREE from 'three';
import { getTexture, skyTex, grassTex, waterTex, woodTex } from './assets.js';

const FOV = 40;
const BANK_W = 16;

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = getTexture('sky.png', skyTex);

  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 200);

  scene.add(new THREE.HemisphereLight(0xdff1ff, 0x77a35a, 1.1));
  const sun = new THREE.DirectionalLight(0xfff4e0, 2.2);
  sun.position.set(-8, 16, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.bias = -0.0008;
  scene.add(sun, sun.target);

  const box = new THREE.BoxGeometry(1, 1, 1);
  const grassMat = new THREE.MeshStandardMaterial({ map: getTexture('grass.png', grassTex), roughness: 0.95 });
  const dirtMat = new THREE.MeshStandardMaterial({ color: 0x9a6b3f, roughness: 1 });
  const woodMat = new THREE.MeshStandardMaterial({ map: woodTex(), roughness: 0.8 });
  const railMat = new THREE.MeshStandardMaterial({ color: 0x8a5a33, roughness: 0.8 });
  const tickMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });

  // Collines de fond
  const hillMat = new THREE.MeshStandardMaterial({ color: 0x86d97a, roughness: 1 });
  const hillGeo = new THREE.SphereGeometry(1, 20, 12);
  [[-14, 7, 5], [-2, 8, 6], [10, 6, 4.5], [22, 9, 6], [-26, 8, 5]].forEach(([x, w, h]) => {
    const m = new THREE.Mesh(hillGeo, hillMat);
    m.scale.set(w, h, 4);
    m.position.set(x, -h * 0.35, -13);
    scene.add(m);
  });

  // Berges
  const banks = new THREE.Group();
  const mkBank = () => {
    const g = new THREE.Group();
    const grass = new THREE.Mesh(box, grassMat);
    grass.scale.set(BANK_W, 0.2, 10);
    grass.position.y = -0.15;
    grass.receiveShadow = true;
    const dirt = new THREE.Mesh(box, dirtMat);
    dirt.scale.set(BANK_W, 1.6, 10);
    dirt.position.y = -1.05;
    g.add(grass, dirt);
    return g;
  };
  const bankL = mkBank(), bankR = mkBank();
  banks.add(bankL, bankR);
  scene.add(banks);

  // Ponts fixes
  const mkDeck = () => {
    const g = new THREE.Group();
    const deck = new THREE.Mesh(box, woodMat);
    deck.scale.set(3, 0.5, 1.1);
    deck.position.y = -0.25;
    deck.castShadow = deck.receiveShadow = true;
    g.add(deck);
    for (const z of [-0.5, 0.5]) {
      const rail = new THREE.Mesh(box, railMat);
      rail.scale.set(3, 0.12, 0.1);
      rail.position.set(0, 0.35, z);
      rail.castShadow = true;
      g.add(rail);
      for (const x of [-1.4, 1.4]) {
        const post = new THREE.Mesh(box, railMat);
        post.scale.set(0.14, 0.5, 0.14);
        post.position.set(x, 0.15, z);
        post.castShadow = true;
        g.add(post);
      }
    }
    return g;
  };
  const deckL = mkDeck(), deckR = mkDeck();
  scene.add(deckL, deckR);

  // Rivière
  const waterTexture = getTexture('water.png', waterTex);
  const waterGeo = new THREE.PlaneGeometry(1, 1, 36, 14);
  waterGeo.rotateX(-Math.PI / 2);
  const waterBase = Float32Array.from(waterGeo.attributes.position.array);
  const water = new THREE.Mesh(waterGeo, new THREE.MeshStandardMaterial({ map: waterTexture, roughness: 0.25, metalness: 0.1, color: 0xbfe4ff }));
  water.position.y = -0.9;
  water.receiveShadow = true;
  scene.add(water);

  const ticks = new THREE.Group();
  scene.add(ticks);

  let N = 6;

  function fit() {
    const w = window.innerWidth, h = window.innerHeight;
    const aspect = w / h;
    camera.aspect = aspect;
    const tanV = Math.tan((FOV / 2) * Math.PI / 180);
    const halfW = N / 2 + 6.5;
    const dW = halfW / (tanV * aspect);
    const dH = 8 / tanV;
    const d = Math.max(dW, dH * 0.75, 14);
    camera.position.set(0, d * 0.4, d * 0.92);
    camera.lookAt(0, 0.4, 0);
    camera.updateProjectionMatrix();
  }

  function resize() {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    fit();
  }

  function setTarget(n) {
    N = n;
    const h = n / 2;
    bankL.position.x = -(h + BANK_W / 2);
    bankR.position.x = h + BANK_W / 2;
    deckL.position.x = -(h + 1.5);
    deckR.position.x = h + 1.5;
    water.scale.set(n + 0.1, 1, 10);
    ticks.clear();
    for (let k = 0; k <= n; k++) {
      const big = k % 5 === 0;
      const t = new THREE.Mesh(box, tickMat);
      t.scale.set(0.06, big ? 0.5 : 0.28, 0.06);
      t.position.set(-h + k, big ? -0.62 : -0.5, 0.7);
      ticks.add(t);
    }
    const s = h + 9;
    const cam = sun.shadow.camera;
    cam.left = -s; cam.right = s; cam.top = 8; cam.bottom = -8;
    cam.near = 1; cam.far = 50;
    cam.updateProjectionMatrix();
    fit();
  }

  function update(t) {
    const pos = waterGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = waterBase[i * 3], z = waterBase[i * 3 + 2];
      pos.setY(i, Math.sin(x * 14 + t * 1.8) * 0.05 + Math.cos(z * 6 + t * 1.3) * 0.04);
    }
    pos.needsUpdate = true;
    waterTexture.offset.x = (t * 0.03) % 1;
    waterTexture.offset.y = (t * 0.015) % 1;
  }

  const render = () => renderer.render(scene, camera);
  window.addEventListener('resize', resize);
  resize();
  setTarget(N);

  return { renderer, scene, camera, setTarget, resize, update, render, get half() { return N / 2; } };
}
