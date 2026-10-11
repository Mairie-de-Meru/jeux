// Album de vignettes (pur). 61 vignettes : 6 + 5 + 20 + 19 + 11.
import { CONTINENT_LIST, OCEAN_LIST, ITEM_LIST, COUNTRY_LIST, WONDER_LIST } from '../data/items.js';

export const ALBUM_SLOTS = [
  ...CONTINENT_LIST.map((c) => ({ id: c.id, kind: 'continent', palier: 1 })),
  ...OCEAN_LIST.map((c) => ({ id: c.id, kind: 'ocean', palier: 2 })),
  ...ITEM_LIST.map((c) => ({ id: c.id, kind: 'item', palier: 3 })),
  ...COUNTRY_LIST.map((c) => ({ id: c.id, kind: 'flag', palier: 4 })),
  ...WONDER_LIST.map((c) => ({ id: c.id, kind: 'wonder', palier: 5 })),
];

const KNOWN = new Set(ALBUM_SLOTS.map((s) => s.id));

export function createAlbum() {
  return { stickers: [] };
}

export function addSticker(album, id) {
  if (!KNOWN.has(id) || album.stickers.includes(id)) return album;
  return { stickers: [...album.stickers, id] };
}

export function hasSticker(album, id) {
  return album.stickers.includes(id);
}

export function count(album) {
  return album.stickers.length;
}

export function serialize(album) {
  return JSON.stringify({ v: 1, stickers: album.stickers });
}

export function deserialize(text) {
  try {
    const data = typeof text === 'string' ? JSON.parse(text) : text;
    const list = data && Array.isArray(data.stickers) ? data.stickers : [];
    const out = [];
    for (const id of list) if (typeof id === 'string' && KNOWN.has(id) && !out.includes(id)) out.push(id);
    return { stickers: out };
  } catch {
    return createAlbum();
  }
}
