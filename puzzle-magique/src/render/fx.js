// Étincelles et confettis (systèmes de particules à pool fixe).
import * as THREE from 'three';

function dotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

class Particles {
  constructor(parent, { count, size, additive, tex }) {
    this.n = count; this.next = 0;
    this.pos = new Float32Array(count * 3);
    this.col = new Float32Array(count * 3);
    this.vel = new Float32Array(count * 3);
    this.life = new Float32Array(count);
    this.max = new Float32Array(count);
    this.grav = new Float32Array(count);
    this.pos.fill(0); for (let i = 0; i < count; i++) this.pos[i * 3 + 2] = -1000;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    const mat = new THREE.PointsMaterial({
      size, map: tex, vertexColors: true, transparent: true, depthWrite: false, sizeAttenuation: true,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 10;
    parent.add(this.points);
    this.geo = geo;
  }
  emit(x, y, z, { n = 20, speed = 3, gravity = 4, life = 0.8, colors = [0xffffff], spread = 1 }) {
    const c = new THREE.Color();
    for (let k = 0; k < n; k++) {
      const i = this.next; this.next = (this.next + 1) % this.n;
      const a = Math.random() * Math.PI * 2, s = speed * (0.4 + Math.random() * 0.8);
      this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
      this.vel[i * 3] = Math.cos(a) * s * spread; this.vel[i * 3 + 1] = Math.sin(a) * s * spread + speed * 0.4; this.vel[i * 3 + 2] = (Math.random() - 0.3) * s * 0.6;
      this.life[i] = this.max[i] = life * (0.7 + Math.random() * 0.6);
      this.grav[i] = gravity;
      c.set(colors[Math.floor(Math.random() * colors.length)]);
      this.col[i * 3] = c.r; this.col[i * 3 + 1] = c.g; this.col[i * 3 + 2] = c.b;
    }
  }
  update(dt) {
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) { this.pos[i * 3 + 2] = -1000; continue; }
      this.vel[i * 3 + 1] -= this.grav[i] * dt;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
  }
}

export function createFx(parent) {
  const tex = dotTexture();
  const sparks = new Particles(parent, { count: 300, size: 0.3, additive: true, tex });
  const confetti = new Particles(parent, { count: 400, size: 0.26, additive: false, tex });
  return {
    sparkle(x, y, z = 0.4) {
      sparks.emit(x, y, z, { n: 26, speed: 3.2, gravity: 3, life: 0.7, colors: [0xfff3a0, 0xffd447, 0xffffff, 0xff9ad5] });
    },
    confetti(x, y, z = 0.6) {
      confetti.emit(x, y, z, { n: 60, speed: 6, gravity: 5, life: 2.2, colors: [0xff5d73, 0xffc93c, 0x4cd97b, 0x4d96ff, 0xb983ff, 0xff9a3c] });
    },
    update(dt) { sparks.update(dt); confetti.update(dt); },
    clear() { sparks.life.fill(0); confetti.life.fill(0); sparks.pos.forEach((_, i) => { if (i % 3 === 2) sparks.pos[i] = -1000; }); confetti.pos.forEach((_, i) => { if (i % 3 === 2) confetti.pos[i] = -1000; }); },
  };
}
