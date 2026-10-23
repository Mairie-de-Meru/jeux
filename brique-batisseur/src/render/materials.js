// Matériaux partagés : un par couleur (plein) et un par couleur (hologramme).
import * as THREE from 'three';
import { COLORS } from '../logic/pieces.js';

const solid = new Map();
const holo = new Map();

export function solidMaterial(colorId) {
  let m = solid.get(colorId);
  if (!m) {
    const hex = COLORS.find((c) => c.id === colorId)?.hex ?? '#cccccc';
    m = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.38, metalness: 0 });
    solid.set(colorId, m);
  }
  return m;
}

export function holoMaterial(colorId) {
  let m = holo.get(colorId);
  if (!m) {
    const hex = COLORS.find((c) => c.id === colorId)?.hex ?? '#cccccc';
    m = new THREE.MeshStandardMaterial({
      color: hex, roughness: 0.5, transparent: true, opacity: 0.28, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
    });
    holo.set(colorId, m);
  }
  return m;
}

const faded = new Map();
/** Pièce posée en cours de déplacement : semi-transparente. */
export function fadedMaterial(colorId) {
  let m = faded.get(colorId);
  if (!m) {
    const hex = COLORS.find((c) => c.id === colorId)?.hex ?? '#cccccc';
    m = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.4, transparent: true, opacity: 0.3, depthWrite: false });
    faded.set(colorId, m);
  }
  return m;
}

/** Brique suivante du mode pas à pas : translucide et lumineuse (opacité animée par Stage). */
export const stepMaterial = new THREE.MeshStandardMaterial({
  color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.35, roughness: 0.4,
  transparent: true, opacity: 0.55, depthWrite: false,
});

/** Matériau unique du fantôme : couleur et état mis à jour à la volée. */
export const ghostMaterial = new THREE.MeshStandardMaterial({
  color: '#ffffff', roughness: 0.4, transparent: true, opacity: 0.45, depthWrite: false,
});

export const ghostBadColor = new THREE.Color('#ff8a80');
