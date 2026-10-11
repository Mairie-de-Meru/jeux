// Signaux en fonction du temps (purs, temps injecté).
export const DEFAULT_CYCLE = { vertVoiture: 6, orange: 2, rougeVoiture: 7 };
const DEGAGEMENT = 2; // secondes de rouge voiture avant que le piéton passe au vert

export function lightAt(t, cycle = DEFAULT_CYCLE) {
  const { vertVoiture, orange, rougeVoiture } = cycle;
  const dg = Math.min(cycle.degagement ?? DEGAGEMENT, rougeVoiture);
  const total = vertVoiture + orange + rougeVoiture;
  const u = ((t % total) + total) % total;
  if (u < vertVoiture) return { voiture: 'vert', pieton: 'rouge' };
  if (u < vertVoiture + orange) return { voiture: 'orange', pieton: 'rouge' };
  const r = u - vertVoiture - orange;
  return { voiture: 'rouge', pieton: r >= dg ? 'vert' : 'rouge' };
}

export function trafficAt(t, schedule) {
  const { periode, passage } = schedule;
  const u = ((t % periode) + periode) % periode;
  return { voitureProche: u < passage };
}

// periode optionnelle : le garage recommence à 'ferme' après chaque période.
export function garageAt(t, { debut, duree, periode }) {
  const u = periode ? ((t % periode) + periode) % periode : t;
  if (u < debut) return 'ferme';
  if (u < debut + duree) return 'sortie';
  return 'partie';
}
