import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CELL } from './scene.js';
import { THEMES } from '../logic/themes.js';
import { clamp01, easeInOutCubic, squash } from './ease.js';
import { getBackTexture, getFaceTexture } from './textures.js';

export const PLAYER_COLORS = [0xff5d73, 0x3d9bff];
const SOLO_MATCH_COLOR = 0xffe27a;
const REST_Y = 0.04;       // demi-épaisseur : la carte repose sur la table
const FLIP_MS = 350, JUMP_MS = 520, SHAKE_MS = 420;

// Géométries partagées
const bodyGeo = new RoundedBoxGeometry(1, 0.08, 1, 3, 0.07);
const planeGeo = new THREE.PlaneGeometry(0.86, 0.86);

export function createCards(scene) {
  const root = new THREE.Group();
  scene.add(root);
  let cards = [];        // { group, body, bodyMat, faceMat, angle, flip, jump, shake, faceUp }
  let clock = 0;         // horloge interne (ms), accélérable
  let speed = 1;
  const raycaster = new THREE.Raycaster();

  function clear() {
    for (const c of cards) { c.bodyMat.dispose(); c.faceMat.dispose(); }
    root.clear();
    cards = [];
  }

  // Orientation : dos sur le dessus (plan -90° X), face dessous (plan +90° X).
  // Retourner = rotation.x 0 -> PI : la face monte, le haut de l'image reste vers le fond de l'écran.
  function build(deck, level, themeId) {
    clear();
    const backMat = new THREE.MeshStandardMaterial({ map: getBackTexture(), roughness: 0.6 });
    const items = THEMES[themeId].items;
    deck.forEach((card) => {
      const item = items.find((it) => it.key === card.pairKey) || card;
      const group = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.castShadow = true;
      body.userData.index = card.index;
      const back = new THREE.Mesh(planeGeo, backMat);
      back.rotation.x = -Math.PI / 2; back.position.y = 0.042;
      const faceMat = new THREE.MeshStandardMaterial({ map: getFaceTexture(themeId, item), roughness: 0.6 });
      const face = new THREE.Mesh(planeGeo, faceMat);
      face.rotation.x = Math.PI / 2; face.position.y = -0.042;
      group.add(body, back, face);
      const r = Math.floor(card.index / level.cols), c = card.index % level.cols;
      group.position.set((c - (level.cols - 1) / 2) * CELL, REST_Y, (r - (level.rows - 1) / 2) * CELL);
      root.add(group);
      cards.push({ group, body, bodyMat, faceMat, angle: 0, flip: null, jump: null, shake: null, faceUp: false, tint: null });
    });
  }

  function flip(i, faceUp) {
    const c = cards[i];
    if (!c || c.faceUp === faceUp) return;
    c.flip = { t0: clock, from: c.angle, to: faceUp ? Math.PI : 0 };
    c.faceUp = faceUp;
  }
  const jump = (indices) => indices.forEach((i) => { if (cards[i]) cards[i].jump = { t0: clock + FLIP_MS * 0.6 }; });
  const shake = (indices) => indices.forEach((i) => { if (cards[i]) cards[i].shake = { t0: clock + FLIP_MS * 0.8 }; });
  function tint(indices, player) {
    for (const i of indices) {
      if (cards[i]) cards[i].bodyMat.color.set(player == null ? SOLO_MATCH_COLOR : PLAYER_COLORS[player]);
    }
  }
  const position = (i) => cards[i].group.position.clone();

  function update(dtMs) {
    clock += dtMs * speed;
    for (const c of cards) {
      let y = REST_Y, sx = 1, sz = 1, ry = 0;
      if (c.flip) {
        const t = clamp01((clock - c.flip.t0) / FLIP_MS);
        c.angle = c.flip.from + (c.flip.to - c.flip.from) * easeInOutCubic(t);
        y += Math.sin(t * Math.PI) * 0.75;
        const s = 1 + 0.12 * Math.sin(t * Math.PI);          // étirement en vol
        sx = sz = s;
        if (t >= 1) c.flip = null;
      }
      if (c.jump) {
        const t = (clock - c.jump.t0) / JUMP_MS;
        if (t >= 1) c.jump = null;
        else if (t > 0) {
          y += Math.abs(Math.sin(t * Math.PI)) * 0.55 * (1 - t * 0.3);
          const q = squash(t, 0.1);
          sx *= q; sz *= q;
        }
      }
      if (c.shake) {
        const t = (clock - c.shake.t0) / SHAKE_MS;
        if (t >= 1) c.shake = null;
        else if (t > 0) ry = Math.sin(t * Math.PI * 6) * 0.1 * (1 - t);
      }
      c.group.position.y = y;
      c.group.rotation.set(c.angle, ry, 0);
      c.group.scale.set(sx, 1, sz);
    }
  }

  // ndcX/ndcY dans [-1,1] ; renvoie l'index de la carte touchée ou -1.
  function pick(camera, ndcX, ndcY) {
    raycaster.setFromCamera({ x: ndcX, y: ndcY }, camera);
    const hits = raycaster.intersectObjects(cards.map((c) => c.body), false);
    return hits.length ? hits[0].object.userData.index : -1;
  }

  return {
    build, clear, flip, jump, shake, tint, position, update, pick,
    setSpeed: (s) => { speed = s; },
    get count() { return cards.length; },
  };
}
