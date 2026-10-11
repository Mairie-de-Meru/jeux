// Figurines posées sur le globe : sprites des images du manifeste, sinon petites figures arrondies.
import * as THREE from 'three';
import { ITEM_LIST } from './data/items.js';
import { latLonToVec3 } from './logic/geo.js';
import { limbAlpha, espacer, reglageSprite } from './logic/pins.js';
import { emojiCanvas, mesurerContenu } from './sprites.js';

const HAUTEUR = 0.3; // hauteur du contenu d'un sprite (rayon du globe = 1)
// positions écartées une fois pour toutes : deux pins à moins de ~8° se décalent un peu et rapetissent
const PLACES = espacer(ITEM_LIST.map((i) => ({ id: i.id, lat: i.pos.lat, lon: i.pos.lon })), 8);

const COULEURS = {
  manchot: 0x2b3a67, lion: 0xf0a92c, panda: 0xf4f4f4, kangourou: 0xc9763d, lama: 0xe8d3b0,
  tourEiffel: 0x6b6f80, pyramides: 0xe9c46a, statueLiberte: 0x4fd1b0,
};

const mat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 });
const sph = (r, c, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), mat(c));
  m.position.set(x, y, z); m.scale.set(sx, sy, sz); return m;
};

// Figure orientée sur +z (vers le haut, hors du globe).
function figure(item) {
  const g = new THREE.Group();
  const c = COULEURS[item.id] || 0xff8844;
  if (item.type === 'animal') {
    g.add(sph(0.045, c, 0, 0, 0.05, 1, 1, 1.15));
    g.add(sph(0.03, item.id === 'panda' ? 0xf4f4f4 : c, 0, 0, 0.11));
    g.add(sph(0.012, item.id === 'panda' ? 0x222222 : c, -0.022, 0, 0.14));
    g.add(sph(0.012, item.id === 'panda' ? 0x222222 : c, 0.022, 0, 0.14));
    g.add(sph(0.007, 0x111111, -0.012, 0.024, 0.12));
    g.add(sph(0.007, 0x111111, 0.012, 0.024, 0.12));
    if (item.id === 'manchot') g.add(sph(0.032, 0xffffff, 0, 0.02, 0.05, 1, 0.6, 1.2));
  } else {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.05, item.id === 'tourEiffel' ? 0.2 : 0.11, item.id === 'pyramides' ? 4 : 8), mat(c));
    cone.rotation.x = Math.PI / 2; cone.position.z = item.id === 'tourEiffel' ? 0.1 : 0.055;
    g.add(cone);
    if (item.id === 'statueLiberte') g.add(sph(0.025, 0xffd93d, 0, 0, 0.13));
  }
  return g;
}

export function createPins(pivot, images) {
  const pins = [];
  const up = new THREE.Vector3(0, 0, 1);

  // source du sprite : image du manifeste, sinon emoji dessiné en canvas
  function sourceSprite(item) {
    const img = images[item.image];
    if (img) return img;
    if (item.emoji && typeof document !== 'undefined') {
      try { return emojiCanvas(item.emoji); } catch { return null; }
    }
    return null;
  }

  function addPin(itemId) {
    if (pins.some((p) => p.id === itemId)) return;
    const item = ITEM_LIST.find((i) => i.id === itemId);
    if (!item) return;
    const place = PLACES[item.id] || { ...item.pos, echelle: 1 };
    const root = new THREE.Group();
    const n = latLonToVec3(place.lat, place.lon, 1);
    const normal = new THREE.Vector3(n.x, n.y, n.z).normalize();
    root.position.copy(normal).multiplyScalar(1.03);
    root.quaternion.setFromUnitVectors(up, normal);
    let body, sprite = null;
    const mats = [], objets = [];
    const src = sourceSprite(item);
    if (src) {
      const tex = src instanceof HTMLCanvasElement ? new THREE.CanvasTexture(src) : new THREE.Texture(src);
      tex.colorSpace = THREE.SRGBColorSpace; tex.needsUpdate = true;
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
      sprite = new THREE.Sprite(mat);
      objets.push(sprite);
      // l'ancre est le bas du contenu opaque (les PNG ont du vide transparent en bas)
      const { centerY, hauteur } = reglageSprite(mesurerContenu(src), HAUTEUR * place.echelle);
      sprite.center.set(0.5, centerY);
      const ratio = (src.naturalWidth || src.width) / (src.naturalHeight || src.height) || 1;
      sprite.userData.base = { w: hauteur * ratio, h: hauteur };
      sprite.scale.set(0, 0, 1);
      root.add(sprite);
      mats.push(mat);
      body = sprite;
    } else {
      body = figure(item);
      body.scale.setScalar(0);
      root.add(body);
      body.traverse((o) => { if (o.material) { Object.assign(o.material, { transparent: true, depthTest: false, depthWrite: false }); mats.push(o.material); objets.push(o); } });
    }
    pivot.add(root);
    pins.push({ id: itemId, root, body, sprite, mats, objets, t: 0, echelle: place.echelle });
  }

  // squash & stretch : étirement vertical puis écrasement, retour à 1
  function ease(t) {
    if (t >= 1) return [1, 1];
    const s = 1 - Math.pow(1 - t, 3);
    const w = Math.sin(t * Math.PI * 3) * (1 - t) * 0.35;
    return [Math.max(0.001, s * (1 - w)), Math.max(0.001, s * (1 + w))];
  }

  return {
    addPin,
    clear() { for (const p of pins) pivot.remove(p.root); pins.length = 0; },
    count: () => pins.length,
    update(t, dt, camera) {
      const w = new THREE.Vector3(), d = new THREE.Vector3();
      for (const p of pins) {
        if (camera) {
          // fondu au limbe : normale monde · direction vers la caméra
          p.root.getWorldPosition(w);
          d.copy(camera.position).sub(w).normalize();
          const a = limbAlpha(w.clone().normalize().dot(d));
          for (const m of p.mats) m.opacity = a;
          p.root.visible = a > 0.001;
          p.dist = w.distanceTo(camera.position);
        }
        p.t = Math.min(1, p.t + dt / 0.9);
        if (camera) { // sans test de profondeur : tri manuel, le plus proche de la caméra est dessiné en dernier
          const rang = pins.filter((q) => q.dist > p.dist).length;
          for (const o of p.objets) o.renderOrder = 100 + rang;
        }
        const [sx, sy] = ease(p.t);
        if (p.sprite) {
          const b = p.sprite.userData.base;
          p.sprite.scale.set(b.w * sx, b.h * sy, 1);
        } else {
          p.body.scale.set(sx * p.echelle, sx * p.echelle, sy * p.echelle);
          p.body.position.z = p.t >= 1 ? Math.abs(Math.sin(t * 2 + p.id.length)) * 0.012 : 0;
        }
      }
    },
  };
}
