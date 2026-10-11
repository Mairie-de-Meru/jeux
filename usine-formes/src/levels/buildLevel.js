// Palier 4 : assembler un objet (maison, glace, fusée, bonhomme) à partir de pièces.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makeBuildRounds, createAssembly, hintBuild, RECIPES } from '../logic/assembly.mjs';
import { COLOR_IDS } from '../logic/shapes.mjs';
import { makeShape, shapeHeight, GEO, colorHex, textures, disposeTree, shared } from '../meshes.js';
import { ease, tweens, wait, squash, wiggle, flyTo, popIn } from '../fx.js';

const SOCLE = { x: 3.8, top: 0.2 };
const SHELF_X = [-5.6, -4.0, -2.4, -0.8];
const SHELF_TOP = 0.15;

// Emplacements (bas en haut) : position relative au socle, échelle, rotation x.
const LAYOUT = {
  maison: [{ y: 0.8, s: [1.6, 1.6, 1.6], rx: 0 }, { y: 2.4, s: [1.6, 1.6, 1.6], rx: 0 }],
  glace: [{ y: 0.7, s: [1.4, 1.4, 1.4], rx: Math.PI }, { y: 1.85, s: [1.3, 1.3, 1.3], rx: 0 }],
  fusee: [{ y: 1.0, s: [1.2, 2.0, 1.2], rx: 0 }, { y: 2.6, s: [1.2, 1.2, 1.2], rx: 0 }],
  bonhomme: [{ y: 0.9, s: [1.8, 1.8, 1.8], rx: 0 }, { y: 2.2, s: [1.2, 1.2, 1.2], rx: 0 }],
};

const ghostMat = shared(new THREE.MeshStandardMaterial({ color: 0x7fb2ff, transparent: true, opacity: 0.35, roughness: 0.6, depthWrite: false }));

export function createBuildLevel(ctx, seed) {
  const { root, input, sfx, confetti, say, ui } = ctx;
  ctx.stage.setView([0, 4, 12.5], [0, 1.3, 0], 40, 1.75);
  const rounds = makeBuildRounds(seed);
  const group = new THREE.Group();
  root.add(group);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 20), new THREE.MeshStandardMaterial({ color: 0xcfe9f7, roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.3; floor.receiveShadow = true;
  group.add(floor);
  const woodMat = new THREE.MeshStandardMaterial({ color: 0xd9a066, roughness: 0.65, map: textures.bois || null });
  const shelf = new THREE.Mesh(new RoundedBoxGeometry(6.8, 0.3, 2, 3, 0.08), woodMat);
  shelf.position.set(-3.2, 0, 0); shelf.receiveShadow = true; shelf.castShadow = true;
  group.add(shelf);
  const socle = new THREE.Mesh(new RoundedBoxGeometry(3.6, 0.4, 3.2, 3, 0.1), new THREE.MeshStandardMaterial({ color: 0x8e99b8, roughness: 0.6 }));
  socle.position.set(SOCLE.x, 0, 0); socle.receiveShadow = true; socle.castShadow = true;
  group.add(socle);

  let roundIdx = 0, errors = 0, finished = false, locked = false, pressed = null;
  let R = null; // manche courante
  const g1 = new THREE.Vector3(), tmpP = new THREE.Vector3(), tgt = new THREE.Vector3();

  function articleBravo(rc) { return `Bravo, ${rc.feminin ? 'une' : 'un'} ${rc.nom} !`; }

  function clearRound() {
    if (!R) return;
    for (const o of [...R.pieces.map((p) => p.holder), ...R.ghosts]) { group.remove(o); disposeTree(o); }
  }

  function startRound() {
    clearRound();
    const def = rounds[roundIdx];
    const recipe = RECIPES[def.recipe];
    const layout = LAYOUT[def.recipe];
    const asm = createAssembly(def.recipe);
    const ghosts = recipe.pieces.map((shape, i) => {
      const L = layout[i];
      const m = new THREE.Mesh(GEO[shape], ghostMat);
      m.position.set(SOCLE.x, SOCLE.top + L.y, 0);
      m.scale.set(...L.s); m.rotation.x = L.rx;
      group.add(m);
      popIn(m, 0.5, i * 0.1);
      return m;
    });
    const pieces = def.tray.map((shape, i) => {
      const holder = new THREE.Group();
      const mesh = makeShape(shape, colorHex(COLOR_IDS[(i + roundIdx) % COLOR_IDS.length]));
      holder.add(mesh);
      const rest = new THREE.Vector3(SHELF_X[i], SHELF_TOP + shapeHeight(shape) / 2, 0);
      holder.position.copy(rest);
      group.add(holder);
      popIn(mesh, 0.45, 0.15 + i * 0.08);
      return { id: 'piece-' + i, shape, holder, mesh, rest, state: 'tray' };
    });
    R = { def, recipe, layout, asm, ghosts, pieces };
    locked = false;
    say(`Construis ${recipe.feminin ? 'une' : 'un'} ${recipe.nom} !`, 'consigne');
    ui.setProgress(roundIdx);
  }

  function backToShelf(p, hint) {
    p.state = 'returning';
    const sx = p.holder.position.x, sy = p.holder.position.y, sz = p.holder.position.z;
    tweens.add({
      dur: 0.45, ease: ease.linear,
      update: (_, k) => {
        const t = ease.outCubic(k);
        p.holder.position.set(sx + (p.rest.x - sx) * t, sy + (p.rest.y - sy) * t + Math.sin(k * Math.PI) * 0.8, sz + (p.rest.z - sz) * t);
      },
      done: () => { p.holder.position.copy(p.rest); p.state = 'tray'; if (hint) squash(p.mesh, 0.2, 0.4); },
    });
  }

  function attempt(p) {
    if (locked || p.state === 'placed' || p.state === 'flying') return;
    const r = R.asm.place(p.shape);
    if (!r.ok) {
      errors++;
      wiggle(p.holder, 0.35, 0.6);
      say(hintBuild(R.def.recipe, p.shape), 'hint');
      sfx.hint();
      wait(0.45, () => backToShelf(p, true));
      return;
    }
    p.state = 'flying';
    const L = R.layout[r.slot];
    tgt.set(SOCLE.x, SOCLE.top + L.y, 0);
    sfx.pop();
    const sc0 = p.holder.scale.clone(), rx0 = p.holder.rotation.x;
    tweens.add({
      dur: 0.55, ease: ease.inOutQuad,
      update: (t) => {
        p.holder.scale.set(sc0.x + (L.s[0] - sc0.x) * t, sc0.y + (L.s[1] - sc0.y) * t, sc0.z + (L.s[2] - sc0.z) * t);
        p.holder.rotation.x = rx0 + (L.rx - rx0) * t;
      },
    });
    flyTo(p.holder, tgt, 0.55, 1.8, () => {
      p.state = 'placed';
      p.slot = r.slot;
      R.ghosts[r.slot].visible = false;
      squash(p.mesh, 0.3, 0.45);
      sfx.success();
      confetti.sparkle(tmpP.copy(tgt));
      if (r.complet) complete();
    });
  }

  function complete() {
    locked = true;
    wait(0.4, () => {
      sfx.fanfare();
      const rc = R.recipe;
      say(articleBravo(rc), 'bravo');
      confetti.burst(tmpP.set(SOCLE.x, 2.5, 0), 90);
      for (const p of R.pieces) {
        if (p.state !== 'placed') continue;
        const y0 = p.holder.position.y;
        tweens.add({ dur: 0.7, ease: ease.linear, update: (_, k) => { p.holder.position.y = y0 + Math.abs(Math.sin(k * Math.PI * 2)) * 0.7 * (1 - k); }, done: () => { p.holder.position.y = y0; } });
        squash(p.mesh, 0.25, 0.7);
      }
    });
    wait(2.4, () => {
      if (finished) return;
      roundIdx++;
      ui.setProgress(roundIdx);
      if (roundIdx >= rounds.length) { finished = true; ctx.finish(errors); } else startRound();
    });
  }

  function pieceAt(x, y) {
    const meshes = R.pieces.filter((p) => p.state === 'tray').map((p) => p.mesh);
    const hit = input.pick(meshes, x, y);
    return hit ? R.pieces.find((p) => p.mesh === hit.object) : null;
  }

  input.setHandler({
    down(e) { if (!locked && !finished && R) pressed = pieceAt(e.x, e.y); },
    move(e) {
      if (!pressed || !e.dragging) return;
      if (pressed.state === 'tray') { pressed.state = 'dragging'; squash(pressed.mesh, 0.2, 0.3); }
      const p = input.wall(e.x, e.y, 1.5, g1);
      if (p) pressed.holder.position.set(p.x, Math.max(p.y, 0.5), 1.5);
    },
    up(e) {
      const p = pressed; pressed = null;
      if (!p) return;
      if (p.state === 'dragging') {
        const inSocle = Math.abs(p.holder.position.x - SOCLE.x) < 2.8 && p.holder.position.y < 5;
        if (inSocle && !e.cancelled) { p.state = 'tray'; attempt(p); } else backToShelf(p, false);
      } else if (p.state === 'tray' && !e.dragging) attempt(p);
    },
  });

  return {
    total: rounds.length,
    start() { startRound(); },
    update() {},
    dispose() { input.setHandler(null); root.remove(group); disposeTree(group); },
    debug() {
      if (!R) return {};
      return {
        round: roundIdx, recipe: R.def.recipe,
        tray: R.pieces.filter((p) => p.state === 'tray').map((p) => {
          const s = input.project(p.holder.position);
          return { id: p.id, shape: p.shape, x: s.x, y: s.y };
        }),
        socle: input.project(tmpP.set(SOCLE.x, 1.2, 0)),
      };
    },
  };
}
