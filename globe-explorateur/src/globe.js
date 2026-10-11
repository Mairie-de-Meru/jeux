// Globe : texture des continents peinte en canvas, relief (displacement), surbrillance, raycast.
import * as THREE from 'three';
import { CONTINENTS } from './data/continents.js';
import { RIVERS } from './data/rivers.js';
import { CONTINENT_LIST } from './data/items.js';
import { vec3ToLatLon } from './logic/geo.js';

const TW = 2048, TH = 1024;

const px = (lon, W) => ((lon + 180) / 360) * W;
const py = (lat, H) => ((90 - lat) / 180) * H;

function tracer(ctx, ring, W, H) {
  ctx.beginPath();
  ring.forEach(([lon, lat], i) => (i ? ctx.lineTo(px(lon, W), py(lat, H)) : ctx.moveTo(px(lon, W), py(lat, H))));
  ctx.closePath();
}

function peindreCarte() {
  const c = document.createElement('canvas'); c.width = TW; c.height = TH;
  const ctx = c.getContext('2d');
  const fond = ctx.createLinearGradient(0, 0, 0, TH);
  fond.addColorStop(0, '#2f9bff'); fond.addColorStop(0.5, '#1673e6'); fond.addColorStop(1, '#2f9bff');
  ctx.fillStyle = fond; ctx.fillRect(0, 0, TW, TH);
  ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 2;
  for (let lon = -180; lon <= 180; lon += 30) { ctx.beginPath(); ctx.moveTo(px(lon, TW), 0); ctx.lineTo(px(lon, TW), TH); ctx.stroke(); }
  for (let lat = -60; lat <= 60; lat += 30) { ctx.beginPath(); ctx.moveTo(0, py(lat, TH)); ctx.lineTo(TW, py(lat, TH)); ctx.stroke(); }
  ctx.lineJoin = 'round';
  for (const cont of CONTINENT_LIST) {
    const rings = CONTINENTS[cont.id] || [];
    ctx.fillStyle = cont.couleur;
    for (const r of rings) { tracer(ctx, r, TW, TH); ctx.fill(); }
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 4;
    for (const r of rings) { tracer(ctx, r, TW, TH); ctx.stroke(); }
  }
  // fleuves : tracés bleu vif à liseré blanc, limités à la terre
  ctx.save();
  ctx.beginPath();
  for (const id of Object.keys(CONTINENTS)) for (const ring of CONTINENTS[id]) {
    ring.forEach(([lon, lat], i) => (i ? ctx.lineTo(px(lon, TW), py(lat, TH)) : ctx.moveTo(px(lon, TW), py(lat, TH)))); ctx.closePath();
  }
  ctx.clip();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const [largeur, couleur] of [[7, 'rgba(255,255,255,.9)'], [4, '#35b6ff']]) {
    ctx.lineWidth = largeur; ctx.strokeStyle = couleur;
    for (const r of Object.values(RIVERS)) for (const l of r.lignes) {
      ctx.beginPath(); l.forEach(([lon, lat], i) => (i ? ctx.lineTo(px(lon, TW), py(lat, TH)) : ctx.moveTo(px(lon, TW), py(lat, TH)))); ctx.stroke();
    }
  }
  ctx.restore();
  // l'Antarctique recouvre tout le bas de la carte
  ctx.fillStyle = CONTINENT_LIST.find((x) => x.id === 'antarctique').couleur;
  ctx.fillRect(0, py(-84, TH), TW, TH);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

// Masque terre doux : peint en basse résolution puis agrandi (lissage = flou).
function peindreMasque() {
  const s = document.createElement('canvas'); s.width = 128; s.height = 64;
  const sc = s.getContext('2d');
  sc.fillStyle = '#000'; sc.fillRect(0, 0, 128, 64);
  sc.fillStyle = '#fff';
  for (const id of Object.keys(CONTINENTS)) for (const r of CONTINENTS[id]) { tracer(sc, r, 128, 64); sc.fill(); }
  sc.fillRect(0, py(-84, 64), 128, 64);
  const b = document.createElement('canvas'); b.width = 512; b.height = 256;
  const bc = b.getContext('2d');
  bc.imageSmoothingEnabled = true; bc.imageSmoothingQuality = 'high';
  bc.drawImage(s, 0, 0, 512, 256);
  return new THREE.CanvasTexture(b);
}

export function createGlobe(images) {
  const pivot = new THREE.Group(); // reçoit yaw / pitch ; repère : lon 0 face à +z
  const map = peindreCarte(), masque = peindreMasque();

  const mat = new THREE.MeshStandardMaterial({
    map, bumpMap: masque, bumpScale: 2, displacementMap: masque, displacementScale: 0.03, roughness: 0.62, metalness: 0,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 192, 96), mat);
  mesh.rotation.y = -Math.PI / 2; // la SphereGeometry place lon 0 sur +x
  pivot.add(mesh);

  // halo d'atmosphère
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(1.1, 48, 24),
    new THREE.MeshBasicMaterial({ color: 0x9fe0ff, transparent: true, opacity: 0.22, side: THREE.BackSide, depthWrite: false }),
  );
  pivot.add(halo);

  // surbrillance : seconde sphère transparente, texture 1024×512 repeinte à chaque changement
  const oc = document.createElement('canvas'); oc.width = 1024; oc.height = 512;
  const octx = oc.getContext('2d');
  const otex = new THREE.CanvasTexture(oc); otex.colorSpace = THREE.SRGBColorSpace;
  const omat = new THREE.MeshBasicMaterial({ map: otex, transparent: true, opacity: 0, depthWrite: false });
  const over = new THREE.Mesh(new THREE.SphereGeometry(1.037, 96, 48), omat);
  over.rotation.y = -Math.PI / 2;
  pivot.add(over);

  let spec = null;

  function halo2(ctx, lat, lon, rDeg, alpha = 1) {
    const r = (rDeg / 360) * 1024, y = py(lat, 512);
    for (const dx of [-1024, 0, 1024]) {
      const x = px(lon, 1024) + dx;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(255,250,170,${0.95 * alpha})`); g.addColorStop(0.6, `rgba(255,240,120,${0.6 * alpha})`); g.addColorStop(1, 'rgba(255,240,120,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
  }

  function repeindre() {
    octx.clearRect(0, 0, 1024, 512);
    if (!spec) return;
    if (spec.continent) {
      octx.lineJoin = 'round';
      for (const r of CONTINENTS[spec.continent] || []) {
        tracer(octx, r, 1024, 512);
        octx.fillStyle = 'rgba(255,255,255,.7)'; octx.fill();
        octx.strokeStyle = '#ffe14d'; octx.lineWidth = 5; octx.stroke();
      }
      if (spec.continent === 'antarctique') { octx.fillStyle = 'rgba(255,255,255,.7)'; octx.fillRect(0, py(-84, 512), 1024, 512); }
    }
    if (spec.ocean) {
      const o = spec.ocean;
      if (o === 'arctique' || o === 'austral') {
        const arct = o === 'arctique';
        const g = octx.createLinearGradient(0, arct ? 0 : 512, 0, arct ? py(62, 512) : py(-50, 512));
        g.addColorStop(0, 'rgba(255,250,170,.95)'); g.addColorStop(1, 'rgba(255,250,170,0)');
        octx.fillStyle = g;
        if (arct) octx.fillRect(0, 0, 1024, py(62, 512)); else octx.fillRect(0, py(-50, 512), 1024, 512);
      } else {
        const c = { pacifique: [0, -150, 40], atlantique: [0, -30, 24], indien: [-20, 75, 26] }[o];
        halo2(octx, c[0], c[1], c[2]);
        if (o === 'pacifique') halo2(octx, 5, 180, 34);
      }
    }
    if (spec.lignes) {
      octx.lineCap = 'round'; octx.lineJoin = 'round';
      for (const [largeur, couleur] of [[14, 'rgba(255,255,255,.9)'], [8, '#ffe14d']]) {
        octx.lineWidth = largeur; octx.strokeStyle = couleur;
        for (const l of spec.lignes) { octx.beginPath(); l.forEach(([lon, lat], i) => (i ? octx.lineTo(px(lon, 1024), py(lat, 512)) : octx.moveTo(px(lon, 1024), py(lat, 512)))); octx.stroke(); }
      }
    }
    if (spec.points) for (const q of spec.points) halo2(octx, q.lat, q.lon, spec.rayon || 7);
    if (spec.bande) {
      const y0 = py(spec.bande, 512), y1 = py(-spec.bande, 512);
      octx.fillStyle = 'rgba(255,250,170,.8)'; octx.fillRect(0, y0, 1024, y1 - y0);
    }
    if (spec.point) halo2(octx, spec.point.lat, spec.point.lon, spec.point.rayon || 7);
    otex.needsUpdate = true;
  }

  const rc = new THREE.Raycaster();
  const sphere = new THREE.Sphere(new THREE.Vector3(), 1);
  const hit = new THREE.Vector3();
  const inv = new THREE.Matrix4();

  return {
    pivot,
    setRotation(spin) { pivot.rotation.set(spin.pitch, spin.yaw, 0, 'XYZ'); },
    setHighlight(s) { spec = s || null; repeindre(); if (!spec) omat.opacity = 0; },
    hasHighlight() { return !!spec; },
    update(t) { if (spec) omat.opacity = 0.35 + 0.65 * Math.abs(Math.sin(t * 4)); },
    // clientX/Y → {lat, lon} ou null si le tap est à côté du globe
    pick(clientX, clientY, canvas, camera) {
      const r = canvas.getBoundingClientRect();
      const ndc = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
      rc.setFromCamera(ndc, camera);
      pivot.updateMatrixWorld(true);
      inv.copy(pivot.matrixWorld).invert();
      const ray = rc.ray.clone().applyMatrix4(inv);
      if (!ray.intersectSphere(sphere, hit)) return null;
      return vec3ToLatLon(hit);
    },
  };
}
