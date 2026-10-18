// Éléments d'interface : pastille de messages, confettis, places de l'écran de départ.
export const $ = (id) => document.getElementById(id);

let toastTimer = 0;
export function toast(text, ms = 1800) {
  const el = $('toast');
  clearTimeout(toastTimer);
  if (!text) { el.classList.remove('show'); return; }
  el.textContent = text;
  el.classList.add('show');
  if (ms > 0) toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}
export const hideToast = () => toast('');

export function confetti(n = 70) {
  const box = $('confetti');
  const colors = ['#e23b3b', '#ffd23f', '#3b82f6', '#4cd07d', '#ff8a3d', '#f4ead2'];
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i');
    p.style.left = Math.random() * 100 + '%';
    p.style.background = colors[i % colors.length];
    p.style.animationDuration = 2 + Math.random() * 2.2 + 's';
    p.style.animationDelay = Math.random() * 0.6 + 's';
    box.appendChild(p);
    setTimeout(() => p.remove(), 5200);
  }
}

// Noms par défaut des places.
export function defaultName(side, seats) {
  const mine = seats[side], oth = seats[side === 'white' ? 'black' : 'white'];
  if (mine.type === 'human') return oth.type === 'human' && side === 'black' ? 'Joueur 2' : 'Toi';
  return oth.type === 'bot' && side === 'black' ? 'Robot 2' : 'Robot';
}
export function normalizeSeats(seats) {
  for (const side of ['white', 'black']) {
    const s = seats[side];
    if (s.auto || !s.name.trim()) { s.auto = true; s.name = defaultName(side, seats); }
  }
}
export function renderSeats(seats, onChange) {
  for (const side of ['white', 'black']) {
    const row = $('seat-' + side), s = seats[side];
    const input = row.querySelector('input');
    if (document.activeElement !== input) input.value = s.name;
    row.querySelectorAll('.chip').forEach((b) => b.classList.toggle('sel', b.dataset.t === s.type));
  }
  if (onChange) onChange();
}
export function bindSeats(seats, onChange) {
  for (const side of ['white', 'black']) {
    const row = $('seat-' + side);
    row.querySelectorAll('.chip').forEach((b) => b.addEventListener('click', () => {
      seats[side].type = b.dataset.t;
      normalizeSeats(seats);
      renderSeats(seats, onChange);
    }));
    row.querySelector('input').addEventListener('input', (e) => {
      seats[side].name = e.target.value.slice(0, 12);
      seats[side].auto = e.target.value.trim() === '';
      if (seats[side].auto) { seats[side].name = defaultName(side, seats); }
      if (onChange) onChange();
    });
  }
}
