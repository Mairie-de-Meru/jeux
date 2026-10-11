import * as THREE from 'three';

// Images optionnelles dans assets/img/. Liste vide pour la v1 : aucune requête réseau.
export const AVAILABLE_IMAGES = [];

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function toTexture(canvas, repeat = false) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function skyTex() {
  const [c, g] = makeCanvas(8, 256);
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#5db8ff');
  grad.addColorStop(0.6, '#bfe6ff');
  grad.addColorStop(1, '#fff1c9');
  g.fillStyle = grad; g.fillRect(0, 0, 8, 256);
  return toTexture(c);
}

export function grassTex() {
  const [c, g] = makeCanvas(256, 256);
  g.fillStyle = '#62d45a'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 500; i++) {
    g.fillStyle = Math.random() < 0.5 ? '#79e06c' : '#4fbf4c';
    g.fillRect(Math.random() * 256, Math.random() * 256, 3, 7);
  }
  const t = toTexture(c, true);
  t.repeat.set(4, 2);
  return t;
}

export function waterTex() {
  const [c, g] = makeCanvas(256, 256);
  g.fillStyle = '#3aa3f2'; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 4; g.lineCap = 'round';
  for (let i = 0; i < 14; i++) {
    const x = Math.random() * 256, y = Math.random() * 256;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 20, y - 8, x + 40, y); g.stroke();
  }
  const t = toTexture(c, true);
  t.repeat.set(3, 2);
  return t;
}

export function woodTex() {
  const [c, g] = makeCanvas(256, 64);
  g.fillStyle = '#c98a4b'; g.fillRect(0, 0, 256, 64);
  g.strokeStyle = 'rgba(110,64,26,0.45)'; g.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    const y = 4 + i * 7 + Math.random() * 3;
    g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(80, y + 4, 170, y - 4, 256, y); g.stroke();
  }
  g.strokeStyle = 'rgba(90,50,20,0.6)'; g.lineWidth = 3;
  for (let x = 64; x < 256; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 64); g.stroke(); }
  return toTexture(c, true);
}

// Texture procédurale tout de suite ; image remplaçante seulement si listée.
export function getTexture(file, makeFallback) {
  const tex = makeFallback();
  if (AVAILABLE_IMAGES.includes(file)) {
    new THREE.TextureLoader().load(`assets/img/${file}`, (img) => {
      tex.image = img.image;
      tex.needsUpdate = true;
    }, undefined, () => {});
  }
  return tex;
}

export function titleImage() {
  return AVAILABLE_IMAGES.includes('title.png') ? 'assets/img/title.png' : null;
}
