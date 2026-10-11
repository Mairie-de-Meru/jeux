// Images : chargement à la demande, repli généré si le fichier manque (aucun 404 hors manifeste).
import * as THREE from 'three';
import { IMAGES, CATEGORIES, TITLE_FILE } from './manifest.js';

export { IMAGES, CATEGORIES };

const sources = {};   // id -> image réelle chargée
const fallbacks = {}; // id -> canvas de repli
const falls = {};     // id -> data URL du repli
const textures = {};
const loading = {};
let titleUrl = null;

export const imageDef = (id) => IMAGES.find((x) => x.id === id);

function fallbackCanvas(id) {
  if (fallbacks[id]) return fallbacks[id];
  const def = imageDef(id);
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 768;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 768);
  grad.addColorStop(0, def.c1); grad.addColorStop(1, def.c2);
  g.fillStyle = grad; g.fillRect(0, 0, 1024, 768);
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.beginPath(); g.arc(800, 170, 110, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.25)';
  g.beginPath(); g.ellipse(200, 600, 330, 120, 0, 0, Math.PI * 2); g.fill();
  g.font = '380px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(def.emoji, 512, 400);
  g.font = 'bold 64px sans-serif'; g.fillStyle = 'rgba(255,255,255,0.9)';
  g.fillText(def.label, 512, 690);
  return (fallbacks[id] = c);
}

export const fallbackUrl = (id) => falls[id] || (falls[id] = fallbackCanvas(id).toDataURL('image/jpeg', 0.7));
export const imageUrl = (id) => imageDef(id).file;

function loadImg(url) {
  return new Promise((res) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => res(null);
    im.src = url;
  });
}

// Charge l'image réelle d'un puzzle (une seule fois) ; met la texture à jour si elle existe déjà.
export function ensureImage(id) {
  if (!loading[id]) {
    loading[id] = loadImg(imageUrl(id)).then((im) => {
      if (im) {
        sources[id] = im;
        if (textures[id]) {
          // la taille change : libérer l'ancien stockage GPU avant de renvoyer l'image réelle
          textures[id].dispose();
          textures[id].image = im;
          textures[id].needsUpdate = true;
        }
      }
      return !!im;
    });
  }
  return loading[id];
}

export const isLoaded = (id) => !!sources[id];

// Attend l'image réelle (8 s maximum par défaut) ; le repli ne sert qu'en cas d'erreur ou de délai dépassé.
export function whenReady(id, ms = 8000) {
  return Promise.race([ensureImage(id), new Promise((r) => setTimeout(() => r(false), ms))]);
}

// Préchargement d'une liste d'images, une à la fois ; une nouvelle liste annule la précédente.
let prefetchToken = 0;
export async function prefetch(ids) {
  const my = ++prefetchToken;
  for (const id of ids) {
    if (my !== prefetchToken) return;
    await ensureImage(id);
  }
}

export async function loadTitle() {
  const im = await loadImg(TITLE_FILE);
  titleUrl = im ? TITLE_FILE : null;
}
export const getTitleUrl = () => titleUrl;

export function imageAspect(id) {
  const s = sources[id];
  return s ? s.naturalWidth / s.naturalHeight || 4 / 3 : 4 / 3;
}

// Synchrone : texture de repli tout de suite, remplacée par l'image réelle dès qu'elle est chargée.
export function getTexture(id) {
  if (!textures[id]) {
    const t = new THREE.Texture(sources[id] || fallbackCanvas(id));
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    t.needsUpdate = true;
    textures[id] = t;
    ensureImage(id);
  }
  return textures[id];
}
