// Barre d'outils et palette : boutons DOM, aucune logique de dessin.
import { PALETTE } from '../logic/palette.js';

const TOOLS_COLORIAGE = [
  { id: 'pot', icone: '🪣', nom: 'Peinture' },
  { id: 'pinceau', icone: '🖌️', nom: 'Pinceau' },
  { id: 'gomme', icone: '🧽', nom: 'Gomme' },
  { id: 'etoile', icone: '⭐', nom: 'Étoile' },
  { id: 'coeur', icone: '❤️', nom: 'Cœur' },
];
const TOOLS_LIBRE = [
  { id: 'fin', icone: '✏️', nom: 'Fin' },
  { id: 'gros', icone: '🖍️', nom: 'Gros' },
  { id: 'feutre', icone: '🖊️', nom: 'Feutre' },
  { id: 'arcenciel', icone: '🌈', nom: 'Arc-en-ciel' },
  { id: 'paillettes', icone: '✨', nom: 'Paillettes' },
  { id: 'gomme', icone: '🧽', nom: 'Gomme' },
  { id: 'etoile', icone: '⭐', nom: 'Étoile' },
  { id: 'coeur', icone: '❤️', nom: 'Cœur' },
  { id: 'pot', icone: '🪣', nom: 'Peinture' },
];

export function createToolbar({ toolsEl, paletteEl, topbarEl, onTool, onColor, onAction }) {
  const toolButtons = new Map();
  const colorButtons = [];

  PALETTE.forEach((c, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch';
    b.style.background = c.hex;
    b.setAttribute('aria-label', c.nom);
    b.addEventListener('click', () => onColor(i));
    paletteEl.appendChild(b);
    colorButtons.push(b);
  });

  topbarEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-action]');
    if (b && !b.disabled) onAction(b.dataset.action);
  });

  return {
    setMode(mode) {
      toolsEl.textContent = '';
      toolButtons.clear();
      for (const t of mode === 'libre' ? TOOLS_LIBRE : TOOLS_COLORIAGE) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'tool';
        b.innerHTML = `<span class="ico">${t.icone}</span><span class="lbl">${t.nom}</span>`;
        b.addEventListener('click', () => onTool(t.id));
        toolsEl.appendChild(b);
        toolButtons.set(t.id, b);
      }
    },
    setTool(id) { toolButtons.forEach((b, k) => b.classList.toggle('active', k === id)); },
    setColor(i) { colorButtons.forEach((b, k) => b.classList.toggle('active', k === i)); },
    setHistory({ canUndo, canRedo }) {
      const u = topbarEl.querySelector('[data-action="undo"]');
      const r = topbarEl.querySelector('[data-action="redo"]');
      if (u) u.disabled = !canUndo;
      if (r) r.disabled = !canRedo;
    },
  };
}
