// Scène à peindre : formes plates arrondies, chaque zone est un mesh touchable (blanc au départ).
import * as THREE from 'three';
import { createAnimator, wobble } from '../ease.js';
import { ZONES } from '../logic/paint.js';

const LARGEUR = 16;
const HAUTEUR = 10;

function rectArrondi(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return new THREE.ShapeGeometry(s, 10);
}

function triangleArrondi(w, h) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, -h / 2);
  s.lineTo(w / 2, -h / 2);
  s.lineTo(0, h / 2);
  s.closePath();
  return new THREE.ShapeGeometry(s);
}

export function createPainting3D() {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-LARGEUR / 2, LARGEUR / 2, HAUTEUR / 2, -HAUTEUR / 2, 0.1, 50);
  camera.position.set(0, 0, 20);
  const anim = createAnimator();
  const matContour = new THREE.MeshBasicMaterial({ color: 0x4a3f55 });
  const zones = new Map(); // id -> { groupe, mats[] }
  const racine = new THREE.Group();
  scene.add(racine);

  // ajoute une zone : géométries fournies [{geo, x, y, echelleContour}], z = ordre d'empilement
  function zone(id, parts, x, y, z) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.userData.zone = id;
    const mats = [];
    for (const part of parts) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      mats.push(mat);
      const m = new THREE.Mesh(part.geo, mat);
      m.position.set(part.x || 0, part.y || 0, 0.02);
      m.userData.zone = id;
      const c = new THREE.Mesh(part.geo, matContour);
      c.position.set(part.x || 0, part.y || 0, 0);
      c.scale.setScalar(part.contour || 1.05);
      c.userData.zone = id;
      g.add(c, m);
    }
    racine.add(g);
    zones.set(id, { groupe: g, mats });
  }

  const cercle = (r) => new THREE.CircleGeometry(r, 36);
  zone('ciel', [{ geo: rectArrondi(15.4, 9.4, 0.5), contour: 1.015 }], 0, 0, 0);
  zone('soleil', [{ geo: cercle(0.95) }], -5.6, 3.1, 1);
  zone('herbe', [{ geo: rectArrondi(15.4, 3.3, 0.5), contour: 1.02 }], 0, -3.65, 1);
  zone('maison', [{ geo: rectArrondi(3.8, 2.7, 0.25) }], -1.7, -1.25, 2);
  zone('toit', [{ geo: triangleArrondi(4.8, 1.8) }], -1.7, 0.95, 2);
  zone('porte', [{ geo: rectArrondi(0.95, 1.55, 0.2) }], -1.7, -1.85, 3);
  zone('tronc', [{ geo: rectArrondi(0.6, 2.2, 0.15) }], 4.3, -1.35, 2);
  zone('feuillage', [{ geo: cercle(1.55) }], 4.3, 0.6, 3);
  const petales = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + Math.PI / 2;
    petales.push({ geo: cercle(0.3), x: Math.cos(a) * 0.38, y: Math.sin(a) * 0.38, contour: 1.15 });
  }
  zone('fleur', petales, 1.3, -3.4, 3);
  // coeur de la fleur et tige (décor fixe)
  const coeur = new THREE.Mesh(cercle(0.22), new THREE.MeshBasicMaterial({ color: 0xf9b233 }));
  coeur.position.set(1.3, -3.4, 3.1);
  const tige = new THREE.Mesh(rectArrondi(0.12, 1.2, 0.05), new THREE.MeshBasicMaterial({ color: 0x4caf50 }));
  tige.position.set(1.3, -4.2, 2.9);
  racine.add(tige, coeur);

  const caster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function pickZone(clientX, clientY, rect) {
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    caster.setFromCamera(ndc, camera);
    const hits = caster.intersectObjects(racine.children, true).filter((h) => h.object.userData.zone);
    if (!hits.length) return null;
    // la plus proche de la caméra
    return hits[0].object.userData.zone;
  }

  function colorZone(id, hex, animer = true) {
    const z = zones.get(id);
    if (!z) return;
    z.mats.forEach((m) => m.color.set(hex || '#ffffff'));
    if (animer) {
      anim.tween(0.45, (p) => {
        const w = wobble(p, 0.12);
        z.groupe.scale.set(w, 2 - w, 1);
      }, () => z.groupe.scale.set(1, 1, 1));
    }
  }

  function applyPainting(p) {
    for (const zn of ZONES) colorZone(zn.id, p.couleurs[zn.id], false);
  }

  function resize(w, h, haut = 120, bas = 150) {
    const utileH = Math.max(200, h - haut - bas);
    const echelle = Math.min(w / LARGEUR, utileH / HAUTEUR); // px par unité
    const demiW = w / 2 / echelle;
    const demiH = h / 2 / echelle;
    const decalage = (bas - haut) / 2 / echelle; // recentre dans la zone utile
    camera.left = -demiW; camera.right = demiW;
    camera.top = demiH - decalage; camera.bottom = -demiH - decalage;
    camera.updateProjectionMatrix();
  }

  function update(dt) { anim.update(dt); }

  return { scene, camera, update, resize, pickZone, colorZone, applyPainting };
}
