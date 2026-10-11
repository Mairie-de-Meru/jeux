// Formes, couleurs, libellés et géométrie des polyèdres.
export const SHAPES = {
  cube: { id: 'cube', nom: 'cube', feminin: false, faces: 6, sommets: 8, aretes: 12, polyedre: true },
  pave: { id: 'pave', nom: 'pavé', feminin: false, faces: 6, sommets: 8, aretes: 12, polyedre: true },
  cylindre: { id: 'cylindre', nom: 'cylindre', feminin: false, faces: 3, sommets: 0, aretes: 2, polyedre: false },
  cone: { id: 'cone', nom: 'cône', feminin: false, faces: 2, sommets: 1, aretes: 1, polyedre: false },
  sphere: { id: 'sphere', nom: 'sphère', feminin: true, faces: 1, sommets: 0, aretes: 0, polyedre: false },
  pyramide: { id: 'pyramide', nom: 'pyramide', feminin: true, faces: 5, sommets: 5, aretes: 8, polyedre: true },
  prisme: { id: 'prisme', nom: 'prisme', feminin: false, faces: 5, sommets: 6, aretes: 9, polyedre: true },
};
export const SHAPE_IDS = Object.keys(SHAPES);

export const COLORS = {
  rouge: { id: 'rouge', nom: 'rouge', nomF: 'rouge', hex: 0xff5a5f },
  bleu: { id: 'bleu', nom: 'bleu', nomF: 'bleue', hex: 0x3d8bff },
  jaune: { id: 'jaune', nom: 'jaune', nomF: 'jaune', hex: 0xffc928 },
  vert: { id: 'vert', nom: 'vert', nomF: 'verte', hex: 0x3ccf6e },
};
export const COLOR_IDS = Object.keys(COLORS);

// « un cube », « une sphère bleue », « un pavé vert »
export function label(shapeId, colorId) {
  const s = SHAPES[shapeId];
  let txt = `${s.feminin ? 'une' : 'un'} ${s.nom}`;
  if (colorId) {
    const c = COLORS[colorId];
    txt += ` ${s.feminin ? c.nomF : c.nom}`;
  }
  return txt;
}

// Sommets/faces, faces en ordre anti-horaire vu de l'extérieur.
export function polyhedron(id) {
  if (id === 'cube' || id === 'pave') {
    const [x, y, z] = id === 'cube' ? [1, 1, 1] : [1.3, 0.8, 0.8];
    return {
      vertices: [
        [-x, -y, -z], [x, -y, -z], [x, y, -z], [-x, y, -z],
        [-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z],
      ],
      faces: [[4, 5, 6, 7], [0, 3, 2, 1], [1, 2, 6, 5], [0, 4, 7, 3], [3, 7, 6, 2], [0, 1, 5, 4]],
    };
  }
  if (id === 'pyramide') {
    const a = 1.1;
    return {
      vertices: [[-a, -1, -a], [a, -1, -a], [a, -1, a], [-a, -1, a], [0, 1, 0]],
      faces: [[0, 1, 2, 3], [0, 4, 1], [1, 4, 2], [2, 4, 3], [3, 4, 0]],
    };
  }
  if (id === 'prisme') {
    const R = 2.2 / Math.sqrt(3);
    const v = [];
    for (const y of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const t = (i * 2 * Math.PI) / 3;
        v.push([R * Math.cos(t), y, R * Math.sin(t)]);
      }
    }
    return {
      vertices: v,
      faces: [[0, 1, 2], [3, 5, 4], [0, 3, 4, 1], [1, 4, 5, 2], [2, 5, 3, 0]],
    };
  }
  throw new Error(`Pas de polyèdre pour la forme : ${id}`);
}
