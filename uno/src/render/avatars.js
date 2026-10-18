// Avatars des places (billboards) : sprite, bulle du nombre de cartes, réactions en squash & stretch.
import * as THREE from 'three';

export const AVATAR_KEYS = { '🦊': 'av-renard', '🐼': 'av-panda', '🐨': 'av-koala', '🦉': 'av-hibou' };
const BASE = 2.9;        // hauteur du sprite (unités monde)
const EDGE = 4.15;       // rayon du bord de la table où se tiennent les avatars

function avatarCanvas(img, emoji) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const x = cv.getContext('2d');
  if (img) { // ajusté et aligné en bas du carré
    const k = Math.min(244 / img.width, 244 / img.height), w = img.width * k, h = img.height * k;
    x.drawImage(img, (256 - w) / 2, 252 - h, w, h); return cv;
  }
  x.fillStyle = 'rgba(255,255,255,0.95)'; x.beginPath(); x.arc(128, 138, 100, 0, Math.PI * 2); x.fill();
  x.lineWidth = 8; x.strokeStyle = 'rgba(40,40,80,0.35)'; x.stroke();
  x.font = '120px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(emoji, 128, 146);
  return cv;
}

function bubbleCanvas(n) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const x = cv.getContext('2d');
  x.fillStyle = '#e8454d'; x.beginPath(); x.arc(64, 64, 54, 0, Math.PI * 2); x.fill();
  x.lineWidth = 8; x.strokeStyle = '#fff'; x.stroke();
  x.fillStyle = '#fff'; x.font = '900 64px "Trebuchet MS", Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(String(n), 64, 70);
  return cv;
}

const canvasTex = (cv) => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; };

export function createAvatars(root) {
  let list = [];       // une entrée par place 1..n-1
  let images = {};     // emoji -> Image

  function build(entry) {
    entry.sprite.material.map?.dispose();
    entry.sprite.material.map = canvasTex(avatarCanvas(images[entry.emoji], entry.emoji));
    entry.sprite.material.needsUpdate = true;
  }

  function setup(seats, players) {
    list.forEach((e) => { root.remove(e.sprite, e.bubble, e.label); e.sprite.material.map?.dispose(); e.bubble.material.map?.dispose(); });
    list = seats.map((s, i) => {
      const pl = players[i + 1];
      const len = Math.hypot(s.world.x, s.world.z) || 1;
      const pos = new THREE.Vector3((s.world.x / len) * EDGE, 0.05, (s.world.z / len) * EDGE);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false }));
      sprite.center.set(0.5, 0); sprite.renderOrder = 8;
      sprite.position.copy(pos); sprite.scale.set(BASE, BASE, 1);
      const bubble = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false }));
      bubble.renderOrder = 9; bubble.scale.set(0.8, 0.8, 1); bubble.center.set(-0.2, 0.5);
      const label = s.label; label.removeFromParent();
      label.center.set(0.5, 1); label.position.copy(pos); label.renderOrder = 10;
      root.add(sprite, bubble, label);
      const e = { pos, sprite, bubble, label, emoji: pl.emoji, count: -1, active: false, anim: null, seed: i * 1.7 };
      build(e);
      return e;
    });
  }

  function setImages(map) {
    images = { ...images, ...map };
    list.forEach(build);
  }

  function setCount(i, n, active) {
    const e = list[i]; if (!e) return;
    if (e.count !== n) {
      e.bubble.material.map?.dispose();
      e.bubble.material.map = canvasTex(bubbleCanvas(n)); e.bubble.material.needsUpdate = true;
      e.count = n;
    }
    e.active = active;
  }

  // kind : 'joy' | 'oops' | 'think' | 'win' ; ms <= 0 : ignoré (mode rapide)
  function react(p, kind, ms = 700) {
    const e = list[p - 1]; if (!e || ms <= 0) return;
    e.anim = { kind, t0: performance.now(), ms };
  }

  const jump = (k) => { // k 0..1 : saut avec étirement en montée et écrasement à l'atterrissage
    const h = Math.sin(k * Math.PI) * 0.45;
    let sy = 1 + 0.22 * Math.sin(k * Math.PI), sx = 1 / sy;
    if (k > 0.8) { const q = Math.sin(((k - 0.8) / 0.2) * Math.PI); sy = 1 - 0.28 * q; sx = 1 + 0.2 * q; }
    return { h, sx, sy, rot: 0 };
  };

  function update(now) {
    for (const e of list) {
      let h = 0, sx = 1, sy = 1, rot = 0;
      if (e.active) { h = Math.abs(Math.sin(now / 280 + e.seed)) * 0.06; }
      const a = e.anim;
      if (a) {
        const k = (now - a.t0) / a.ms;
        if (k >= 1 && a.kind !== 'think') e.anim = null;
        else if (a.kind === 'joy') ({ h, sx, sy, rot } = jump(Math.min(k, 1)));
        else if (a.kind === 'win') ({ h, sx, sy, rot } = jump((k * 3) % 1));
        else if (a.kind === 'oops') { rot = Math.sin(k * Math.PI * 7) * 0.28 * (1 - k); sx = 1 + 0.1 * Math.sin(k * Math.PI); sy = 1 - 0.1 * Math.sin(k * Math.PI); }
        else if (a.kind === 'think') { rot = Math.sin(now / 260) * 0.12; if (k >= 1) e.anim = null; }
      }
      e.sprite.position.y = e.pos.y + h;
      e.sprite.scale.set(BASE * sx, BASE * sy, 1);
      e.sprite.material.rotation = rot;
      e.bubble.position.set(e.pos.x, e.pos.y + h + BASE * 0.62 * sy, e.pos.z);
    }
  }

  return { setup, setImages, setCount, react, update };
}
