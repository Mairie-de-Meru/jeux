// Interface DOM : accueil, HUD, fiche « pourquoi », fin de palier. Très peu de texte.
import { BINS, itemById } from '../logic/catalog.js';
import { ITEM_EMOJI } from './icons.js';
import * as assets from '../assets.js';

const $ = (id) => document.getElementById(id);
const show = (el, on) => el.classList.toggle('hidden', !on);

export function createUI(cb) {
  const home = $('home'), hud = $('hud'), hint = $('hint'), fiche = $('fiche'), end = $('end');
  let hintTimer = 0;

  if (assets.has('titre')) {
    home.style.backgroundImage = `url(${assets.url('titre')})`;
    home.classList.add('has-title');
  }

  $('btn-play').addEventListener('click', () => cb.onPlay());
  $('btn-ok').addEventListener('click', () => cb.onCloseFiche());
  $('btn-next').addEventListener('click', () => cb.onNext());
  for (const id of ['btn-voice', 'btn-voice-home']) $(id).addEventListener('click', () => cb.onToggleVoice());

  return {
    showHome(on) { show(home, on); },
    showHud(on) { show(hud, on); },
    setVoiceIcon(enabled) {
      for (const id of ['btn-voice', 'btn-voice-home']) $(id).textContent = enabled ? '🔊' : '🔇';
    },
    setProgress(sorted, total) {
      $('count').textContent = `${sorted} / ${total}`;
      $('gauge-fill').style.width = (total ? (100 * sorted) / total : 0) + '%';
    },
    showHint(text, ms = 5000) {
      hint.textContent = text;
      show(hint, true);
      clearTimeout(hintTimer);
      hintTimer = setTimeout(() => show(hint, false), ms);
    },
    hideHint() { clearTimeout(hintTimer); show(hint, false); },
    showFiche(itemId, binId, text) {
      const it = itemById(itemId);
      const thumb = $('fiche-thumb');
      thumb.textContent = '';
      const bin = BINS[binId];
      thumb.style.background = bin.color + '33';
      if (assets.has('obj-' + itemId)) {
        const im = new Image();
        im.alt = it.nom;
        im.src = assets.url('obj-' + itemId);
        thumb.appendChild(im);
      } else thumb.textContent = ITEM_EMOJI[itemId] || '♻️';
      const chip = $('fiche-bin');
      chip.style.background = bin.color;
      chip.textContent = bin.label;
      $('fiche-text').textContent = text;
      show(fiche, true);
    },
    hideFiche() { show(fiche, false); },
    isFicheOpen() { return !fiche.classList.contains('hidden'); },
    showEnd({ stars, final }) {
      $('end-title').textContent = 'Bravo !';
      $('end-planet').textContent = final ? '🌍😍🎉' : '🌍😊';
      const s = $('end-stars');
      s.innerHTML = '';
      {
        for (let i = 0; i < 3; i++) {
          const el = document.createElement('span');
          el.textContent = '⭐';
          if (i >= stars) el.className = 'off';
          s.appendChild(el);
        }
      }
      $('btn-next').textContent = final ? '↻ Rejouer' : 'Suivant ▶';
      show(end, true);
    },
    hideEnd() { show(end, false); },
  };
}
