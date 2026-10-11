import * as CANNON from 'cannon-es';
import { SHAPES, ARCH_PARTS, triangleProfile } from './logic/levels.js';
import { platformTilt } from './logic/platform.js';
import { windForce } from './logic/wind.js';

const DENSITY = 0.8;
export const GROUND_Y = -4;
export const PLATFORM_DEPTH = 2.6;
export const FIXED_DT = 1 / 120;
const MAX_SPEED = 9; // chute depuis la grue (3 m) ≈ 7,7 m/s
const MAX_SPIN = 8;

export function createPhysics() {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
  world.solver.iterations = 20;
  const mat = new CANNON.Material('block');
  world.defaultMaterial = mat;
  world.defaultContactMaterial.friction = 0.7;
  world.defaultContactMaterial.restitution = 0.05;
  world.addContactMaterial(new CANNON.ContactMaterial(mat, mat, { friction: 0.7, restitution: 0.05 }));

  let level = null;
  let platform = null;
  let ground = null;
  const dynamics = new Set();

  world.addEventListener('preStep', () => {
    const t = world.time;
    if (platform && level && level.platform) {
      const p = level.platform;
      platform.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), platformTilt(t, p));
      platform.aabbNeedsUpdate = true;
      platform.angularVelocity.set(0, 0, ((p.amplitude * 2 * Math.PI) / p.period) * Math.cos((2 * Math.PI * t) / p.period));
    }
    if (level && level.wind) {
      const f = windForce(t, level.wind);
      for (const b of dynamics) b.applyForce(new CANNON.Vec3(b.mass * f * 0.5, 0, 0));
    }
  });

  // Garde-fou anti-explosion : un bloc coincé (pénétration profonde) ne doit pas être projeté.
  world.addEventListener('postStep', () => {
    for (const b of dynamics) {
      const v = b.velocity.length();
      if (v > MAX_SPEED) b.velocity.scale(MAX_SPEED / v, b.velocity);
      const w = b.angularVelocity.length();
      if (w > MAX_SPIN) b.angularVelocity.scale(MAX_SPIN / w, b.angularVelocity);
    }
  });

  function flat(body) {
    body.angularFactor.set(0, 0, 1); // jeu en 2D : pas de rotation hors plan
    body.linearFactor.set(1, 1, 0);
  }

  function setLevel(lv) {
    clearBlocks();
    level = lv;
    if (platform) world.removeBody(platform);
    if (ground) world.removeBody(ground);
    world.time = 0;
    world.allowSleep = !lv.platform; // une plateforme mobile ne réveille pas les blocs endormis
    platform = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC, material: mat });
    platform.addShape(new CANNON.Box(new CANNON.Vec3(lv.platformWidth / 2, 0.5, PLATFORM_DEPTH / 2)));
    platform.position.set(0, -0.5, 0);
    world.addBody(platform);
    ground = new CANNON.Body({ mass: 0, material: mat });
    ground.addShape(new CANNON.Box(new CANNON.Vec3(60, 2, 10)));
    ground.position.set(0, GROUND_Y - 2, 0);
    world.addBody(ground);
  }

  function triangleShape() {
    const { d } = SHAPES.triangle;
    const prof = triangleProfile();
    const vs = [];
    for (const z of [-d / 2, d / 2]) for (const [x, y] of prof) vs.push(new CANNON.Vec3(x, y, z));
    // 0,1,2 = face arrière ; 3,4,5 = face avant. Faces orientées vers l'extérieur (CCW).
    const faces = [[0, 2, 1], [3, 4, 5], [0, 1, 4, 3], [1, 2, 5, 4], [0, 3, 5, 2]];
    return new CANNON.ConvexPolyhedron({ vertices: vs, faces });
  }

  function addBlock(name, x, y) {
    const s = SHAPES[name];
    const body = new CANNON.Body({
      mass: 1, material: mat, allowSleep: true,
      sleepSpeedLimit: 0.15, sleepTimeLimit: 0.5, linearDamping: 0.01, angularDamping: 0.05,
    });
    let volume;
    if (name === 'cylinder') {
      body.addShape(new CANNON.Cylinder(s.r, s.r, s.h, 20));
      volume = Math.PI * s.r * s.r * s.h;
    } else if (name === 'triangle') {
      body.addShape(triangleShape());
      volume = (s.w * s.h * s.d) / 2;
    } else if (name === 'arch') {
      volume = 0;
      for (const p of ARCH_PARTS) {
        body.addShape(new CANNON.Box(new CANNON.Vec3(p.w / 2, p.h / 2, p.d / 2)), new CANNON.Vec3(p.x, p.y, 0));
        volume += p.w * p.h * p.d;
      }
    } else {
      body.addShape(new CANNON.Box(new CANNON.Vec3(s.w / 2, s.h / 2, s.d / 2)));
      volume = s.w * s.h * s.d;
    }
    body.mass = volume * DENSITY;
    body.updateMassProperties();
    flat(body);
    body.position.set(x, y, 0);
    world.addBody(body);
    dynamics.add(body);
    return body;
  }

  function removeBody(b) { dynamics.delete(b); world.removeBody(b); }
  function clearBlocks() { for (const b of [...dynamics]) removeBody(b); }

  function step(dt, maxSub = 3) {
    world.step(FIXED_DT, dt, maxSub);
  }

  function aabbOf(b) {
    b.updateAABB();
    return { top: b.aabb.upperBound.y, bottom: b.aabb.lowerBound.y, x: b.position.x };
  }
  function speedOf(b) {
    return Math.max(b.velocity.length(), b.angularVelocity.length());
  }

  return {
    world, setLevel, addBlock, removeBody, clearBlocks, step, aabbOf, speedOf,
    get time() { return world.time; },
    get platformBody() { return platform; },
  };
}
