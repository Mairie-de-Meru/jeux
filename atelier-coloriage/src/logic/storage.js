// Sauvegarde locale : tout est protégé, aucune exception ne remonte.
const KEY = 'atelier-coloriage:galerie:v1';

export function safeStorage(globalObj) {
  let ls = null;
  try { ls = globalObj && globalObj.localStorage ? globalObj.localStorage : null; } catch (e) { ls = null; }
  return {
    get(k) { try { return ls ? ls.getItem(k) : null; } catch (e) { return null; } },
    set(k, v) { try { if (!ls) return false; ls.setItem(k, v); return true; } catch (e) { return false; } },
    remove(k) { try { if (ls) ls.removeItem(k); return true; } catch (e) { return false; } },
  };
}

export function loadGallery(store) {
  try {
    const raw = store.get(KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.filter((it) => it && typeof it === 'object' && typeof it.dataUrl === 'string');
  } catch (e) {
    return [];
  }
}

/** Enregistre ; si le quota est dépassé, retire d'abord `source` des plus anciens (vignettes gardées), puis les plus anciens éléments. */
export function saveGallery(store, list) {
  let cur = Array.isArray(list) ? list.slice() : [];
  while (true) {
    let ok = false;
    try { ok = store.set(KEY, JSON.stringify(cur)) !== false; } catch (e) { ok = false; }
    if (ok) return true;
    let i = cur.length - 1;
    while (i >= 0 && !(cur[i] && cur[i].source)) i--;
    if (i >= 0) {
      const { source, ...light } = cur[i];
      cur[i] = light;
      continue;
    }
    if (cur.length <= 1) return false;
    cur = cur.slice(0, -1);
  }
}
