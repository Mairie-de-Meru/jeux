// Confettis en DOM/CSS.
const COLORS = ['#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#8e24aa', '#f06292'];

export function confetti(container, count = 60) {
  for (let i = 0; i < count; i++) {
    const el = document.createElement('i');
    el.className = 'confetti';
    el.style.left = Math.random() * 100 + 'vw';
    el.style.background = COLORS[i % COLORS.length];
    el.style.animationDuration = 1.8 + Math.random() * 1.6 + 's';
    el.style.animationDelay = Math.random() * 0.6 + 's';
    el.style.setProperty('--drift', (Math.random() * 160 - 80).toFixed(0) + 'px');
    el.style.setProperty('--spin', (Math.random() * 720 - 360).toFixed(0) + 'deg');
    container.appendChild(el);
    setTimeout(() => el.remove(), 4200);
  }
}
