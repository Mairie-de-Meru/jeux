import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { COLORS } from './logic.js';
import { tween, easeInQuad, easeOutQuad, easeOutBack, easeOutElastic, easeInOutSine } from './anim.js';

const H = 0.5, D = 0.9;
const geoCache = new Map();
const matCache = new Map();
const decalMatCache = new Map();
const decalGeo = new THREE.PlaneGeometry(0.46, 0.46);
decalGeo.rotateX(-Math.PI / 2);

function brickGeo(v) {
  if (!geoCache.has(v)) geoCache.set(v, new RoundedBoxGeometry(v - 0.06, H, D, 3, 0.1));
  return geoCache.get(v);
}
function brickMat(v) {
  if (!matCache.has(v)) matCache.set(v, new THREE.MeshStandardMaterial({ color: COLORS[v], roughness: 0.45 }));
  return matCache.get(v);
}
function decalMat(v) {
  if (!decalMatCache.has(v)) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const col = new THREE.Color(COLORS[v]);
    const lum = 0.299 * col.r + 0.587 * col.g + 0.114 * col.b;
    g.fillStyle = lum > 0.55 ? 'rgba(40,30,20,0.85)' : 'rgba(255,255,255,0.92)';
    g.font = 'bold 46px system-ui, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(String(v), 32, 36);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    decalMatCache.set(v, new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
  }
  return decalMatCache.get(v);
}

const ghostMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 });
const dotGeo = new THREE.SphereGeometry(0.14, 12, 8);
const dashMat = new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.12, gapSize: 0.1 });

export function createBridge(scene) {
  const group = new THREE.Group();
  scene.add(group);
  const ghosts = new THREE.Group();
  scene.add(ghosts);
  let bricks = [];
  let N = 6;
  let warning = false;

  const startOf = (i) => -N / 2 + bricks.slice(0, i).reduce((s, b) => s + b.v, 0);
  const liftOf = (i) => (startOf(i) + bricks[i].v > N / 2 + 0.01 ? 0.3 : 0);

  function layout() {
    bricks.forEach((b, i) => {
      b.lift = liftOf(i);
      b.group.userData.settled = true;
      tween(b.group.position, { x: startOf(i), y: b.lift }, 0.3, easeOutBack);
    });
    if (warning) setWarn(true);
  }

  function setTarget(n) {
    N = n;
    clear();
  }

  function add(v, { instant = false, delay = 0 } = {}) {
    const g = new THREE.Group();
    const mesh = new THREE.Mesh(brickGeo(v), brickMat(v));
    mesh.position.set(v / 2, -H / 2, 0);
    mesh.castShadow = mesh.receiveShadow = true;
    const decal = new THREE.Mesh(decalGeo, decalMat(v));
    decal.position.set(0, H / 2 + 0.003, 0);
    decal.raycast = () => {};
    mesh.add(decal);
    g.add(mesh);
    const b = { v, group: g, mesh, base: brickMat(v), lift: 0 };
    bricks.push(b);
    b.lift = liftOf(bricks.length - 1);
    g.position.set(startOf(bricks.length - 1), instant ? b.lift : b.lift + 4, 0);
    group.add(g);
    if (!instant) {
      mesh.scale.set(1, 1, 1);
      tween(g.position, { y: b.lift }, 0.35, easeInQuad, { delay }).then(() => {
        mesh.scale.set(1, 0.7, 1.1);
        tween(mesh.scale, { x: 1, y: 1, z: 1 }, 0.5, easeOutElastic);
      });
    }
    clearGhosts();
    return b;
  }

  function remove(i) {
    const b = bricks[i];
    if (!b) return;
    bricks.splice(i, 1);
    tween(b.group.position, { y: b.group.position.y + 2.5 }, 0.35, easeOutQuad);
    tween(b.mesh.scale, { x: 0.01, y: 0.01, z: 0.01 }, 0.35, easeInOutSine).then(() => {
      group.remove(b.group);
      if (b.mesh.material !== b.base) b.mesh.material.dispose();
    });
    clearGhosts();
    layout();
  }

  function clear() {
    for (const b of bricks) {
      group.remove(b.group);
      if (b.mesh.material !== b.base) b.mesh.material.dispose();
    }
    bricks = [];
    warning = false;
    clearGhosts();
  }

  function sum() {
    return bricks.reduce((s, b) => s + b.v, 0);
  }

  function pick(raycaster) {
    const hits = raycaster.intersectObjects(bricks.map((b) => b.mesh), false);
    if (!hits.length) return -1;
    return bricks.findIndex((b) => b.mesh === hits[0].object);
  }

  async function bendLast() {
    const b = bricks[bricks.length - 1];
    if (!b) return;
    await tween(b.group.rotation, { z: -0.5 }, 0.5, easeOutBack);
  }

  async function unbend() {
    await Promise.all(bricks.map((b) => tween(b.group.rotation, { z: 0 }, 0.4, easeInOutSine)));
  }

  function showGhosts() {
    clearGhosts();
    const s = sum();
    const diff = N - s;
    if (diff <= 0) return;
    const x0 = -N / 2 + s;
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(diff - 0.06, H, D)), dashMat);
    edges.computeLineDistances();
    edges.position.set(x0 + diff / 2, -H / 2, 0);
    ghosts.add(edges);
    const fill = new THREE.Mesh(new THREE.BoxGeometry(diff - 0.1, H - 0.04, D - 0.04), ghostMat.clone());
    fill.material.opacity = 0.18;
    fill.position.copy(edges.position);
    ghosts.add(fill);
    for (let k = 0; k < diff; k++) {
      const d = new THREE.Mesh(dotGeo, ghostMat);
      d.position.set(x0 + k + 0.5, -H / 2, D / 2 + 0.05);
      ghosts.add(d);
    }
  }

  function clearGhosts() {
    for (const c of [...ghosts.children]) {
      ghosts.remove(c);
      if (c.geometry && c.geometry !== dotGeo) c.geometry.dispose();
    }
  }

  function setWarn(on) {
    warning = on;
    bricks.forEach((b, i) => {
      const over = startOf(i) + b.v > N / 2 + 0.01;
      if (on && over) {
        if (b.mesh.material === b.base) {
          b.mesh.material = b.base.clone();
          b.mesh.material.emissive = new THREE.Color(0xff2020);
        }
      } else if (b.mesh.material !== b.base) {
        b.mesh.material.dispose();
        b.mesh.material = b.base;
      }
    });
  }

  async function wave() {
    await Promise.all(bricks.map((b, k) =>
      tween(b.group.position, { y: b.lift + 0.55 }, 0.18, easeOutQuad, { delay: k * 0.07 })
        .then(() => tween(b.group.position, { y: b.lift }, 0.3, easeOutBack))));
  }

  function update(t) {
    if (!warning) return;
    const k = 0.35 + 0.35 * Math.sin(t * 7);
    for (const b of bricks) if (b.mesh.material !== b.base) b.mesh.material.emissiveIntensity = k;
  }

  return {
    get count() { return bricks.length; },
    setTarget, add, remove, clear, sum, pick, bendLast, unbend,
    showGhosts, clearGhosts, setWarn, wave, update,
  };
}
