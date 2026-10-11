import { unlockState } from '../logic/progress.mjs';

export function showScreen(name) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.dataset.screen === name));
}

export function starsText(n) {
  return '⭐'.repeat(n) + '☆'.repeat(3 - n);
}

export function renderLevelGrid(gridEl, levels, progress, all, onPick) {
  gridEl.innerHTML = '';
  for (const s of unlockState(progress, levels.length, all)) {
    const b = document.createElement('button');
    b.className = `level-btn${s.unlocked ? '' : ' locked'}${s.stars ? ' done' : ''}`;
    b.setAttribute('aria-label', `Niveau ${s.id}`);
    b.disabled = !s.unlocked;
    const num = document.createElement('span');
    num.className = 'level-num';
    num.textContent = s.unlocked ? String(s.id) : '🔒';
    const st = document.createElement('span');
    st.className = 'level-stars';
    st.textContent = s.unlocked ? starsText(s.stars) : '';
    b.append(num, st);
    b.addEventListener('click', () => onPick(s.id));
    gridEl.appendChild(b);
  }
}

export function confetti(layer, n = 48) {
  const colors = ['#ff4d6d', '#ffd23f', '#37e08c', '#4fc3f7', '#b25cff', '#ff7a1a'];
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i');
    p.className = 'confetti';
    p.style.left = `${Math.random() * 100}%`;
    p.style.background = colors[i % colors.length];
    p.style.animationDelay = `${Math.random() * 0.6}s`;
    p.style.animationDuration = `${1.6 + Math.random() * 1.4}s`;
    p.style.setProperty('--dx', `${(Math.random() - 0.5) * 160}px`);
    p.style.setProperty('--rot', `${Math.random() * 720}deg`);
    layer.appendChild(p);
    setTimeout(() => p.remove(), 3600);
  }
}
