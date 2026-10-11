import * as THREE from 'three';
import { BOARD_SIZE } from '../logic/board.js';
import { ease, tween } from './anim.js';
import { makeCharacter, idle, cheer, hop, rest } from './character.js';
import { tilePos, tileTop } from './board3d.js';

const SCALE = 1.1;

export function createPawns3D(scene, board) {
  const pawns = [];
  let positions = [];

  function offsetFor(idx) {
    const here = positions.map((p, i) => (p === positions[idx] ? i : -1)).filter((i) => i >= 0);
    const n = here.length;
    if (n === 1) return { x: 0, z: 0 };
    const k = here.indexOf(idx);
    const a = (k / n) * Math.PI * 2 + 0.6;
    return { x: 0.42 * Math.cos(a), z: 0.42 * Math.sin(a) };
  }
  function target(idx) {
    const c = tilePos(positions[idx]);
    const o = offsetFor(idx);
    return { x: c.x + o.x, y: tileTop(board, positions[idx]), z: c.z + o.z };
  }

  function clear() {
    pawns.forEach((p) => scene.remove(p.group));
    pawns.length = 0;
  }

  return {
    // players : [{couleur, bot, pos}]
    setup(players) {
      clear();
      positions = players.map((p) => p.pos);
      players.forEach((p, i) => {
        const group = new THREE.Group();
        const ch = makeCharacter(p.couleur || '#ff6bb5', { bot: !!p.bot });
        ch.scale.setScalar(SCALE);
        group.add(ch);
        scene.add(group);
        pawns.push({ group, ch, mode: 'rest' });
      });
      this.layout(true);
    },
    // Animation d'attente : le joueur courant fait idle, le gagnant fait cheer
    setMood(current, winner = null) {
      pawns.forEach((p, i) => {
        p.mode = i === winner ? 'cheer' : (winner === null && i === current ? 'idle' : 'rest');
        if (p.mode === 'rest') { rest(p.ch); p.ch.position.y = 0; }
        if (p.mode !== 'cheer') p.ch.position.y = 0;
      });
    },
    update(time) {
      pawns.forEach((p) => {
        if (p.moving) return;
        if (p.mode === 'idle') idle(p.ch, time);
        else if (p.mode === 'cheer') cheer(p.ch, time);
      });
    },
    layout(immediate = true) {
      return Promise.all(pawns.map((p, i) => {
        const t = target(i);
        if (immediate) { p.group.position.set(t.x, t.y, t.z); return Promise.resolve(); }
        const f = p.group.position.clone();
        return tween(180, (k) => p.group.position.set(f.x + (t.x - f.x) * k, f.y + (t.y - f.y) * k, f.z + (t.z - f.z) * k));
      }));
    },
    // Fait sauter le pion `idx` de case en case vers `dest` en `steps` pas, dans le sens `dir` (+1 / -1)
    async move(idx, dest, steps, dir, onStep) {
      const p = pawns[idx];
      p.moving = true;
      let cur = positions[idx];
      for (let s = 0; s < steps; s++) {
        const next = (((cur + dir) % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE;
        const last = s === steps - 1;
        positions[idx] = next;
        const to = last ? target(idx) : (() => { const c = tilePos(next); return { x: c.x, y: tileTop(board, next), z: c.z }; })();
        const from = p.group.position.clone();
        await tween(300, (k) => {
          p.group.position.x = from.x + (to.x - from.x) * k;
          p.group.position.z = from.z + (to.z - from.z) * k;
          const base = from.y + (to.y - from.y) * k;
          p.group.position.y = base + 0.9 * Math.sin(Math.PI * k);
          let sy, sxz;
          if (k < 0.8) { sy = 1 + 0.2 * Math.sin(Math.PI * k / 0.8); }
          else { sy = 1 - 0.25 * Math.sin(Math.PI * (k - 0.8) / 0.2); }
          sxz = 1 / Math.sqrt(sy);
          p.group.scale.set(sxz, sy, sxz);
          hop(p.ch, k);
        }, ease.linear);
        p.group.scale.set(1, 1, 1);
        p.group.position.y = to.y;
        cur = next;
        if (onStep) onStep(s);
      }
      positions[idx] = dest;
      await this.layout(false);
      p.moving = false;
      rest(p.ch);
    },
  };
}
