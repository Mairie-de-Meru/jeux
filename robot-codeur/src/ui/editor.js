// Éditeur de séquence : tap et glisser-déposer (pointer events), souris et doigt.
import { countCards } from '../logic/engine.mjs';
import { sfx } from '../audio.js';

export const ICONS = { forward: '⬆️', left: '↩️', right: '↪️', repeat: '🔁' };
// Flèches de virage dessinées : les emojis ↩️/↪️ se lisent à l'envers (courbe du côté opposé).
const TURN_SVG = (flip) => `<svg class="turn-ico" viewBox="0 0 48 48" aria-hidden="true"${flip ? ' style="transform:scaleX(-1)"' : ''}><path d="M30 42V22a6 6 0 0 0-6-6H12" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 6 4 16l11 10" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const SVG_ICONS = { left: TURN_SVG(false), right: TURN_SVG(true) };
export function setIcon(el, type) {
  if (SVG_ICONS[type]) el.innerHTML = SVG_ICONS[type];
  else el.textContent = ICONS[type];
}
export const NAMES = { forward: 'Avancer', left: 'Tourner à gauche', right: 'Tourner à droite', repeat: 'Répéter' };
const MAX_BODY = 4;
const DRAG_THRESHOLD = 10;

export class Editor {
  constructor({ paletteEl, stripEl, counterEl, onChange, onReject }) {
    this.paletteEl = paletteEl;
    this.stripEl = stripEl;
    this.counterEl = counterEl;
    this.onChange = onChange || (() => {});
    this.onReject = onReject || (() => {});
    this.program = [];
    this.active = null; // bloc répéter ciblé (référence d'objet)
    this.cards = [];
    this.maxCards = null;
    this.locked = false;
    this.busy = false;
    this.press = null;
    this.containers = new Map();

    this.stripEl.addEventListener('pointerdown', (e) => this.onStripDown(e));
    this.paletteEl.addEventListener('pointerdown', (e) => this.onPaletteDown(e));
    window.addEventListener('pointermove', (e) => this.onMove(e));
    window.addEventListener('pointerup', (e) => this.onUp(e));
    window.addEventListener('pointercancel', (e) => this.onCancel(e));
    this.stripEl.addEventListener('contextmenu', (e) => e.preventDefault());
    this.paletteEl.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  configure({ cards, maxCards }) {
    this.cards = cards;
    this.maxCards = maxCards ?? null;
    this.program = [];
    this.active = null;
    this.renderPalette();
    this.render();
  }

  getProgram() { return JSON.parse(JSON.stringify(this.program)); }

  setProgram(p) {
    this.program = JSON.parse(JSON.stringify(p));
    this.active = null;
    this.render();
    this.onChange(this.program);
  }

  clear() {
    this.program = [];
    this.active = null;
    this.render();
    this.onChange(this.program);
  }

  setLocked(v) {
    this.locked = v;
    this.stripEl.classList.toggle('locked', v);
    this.paletteEl.classList.toggle('locked', v);
    if (v) this.cancelPress();
  }

  count() { return countCards(this.program); }

  // ---------- rendu ----------
  renderPalette() {
    this.paletteEl.innerHTML = '';
    for (const type of this.cards) {
      const el = document.createElement('div');
      el.className = `card pcard t-${type}`;
      el.dataset.type = type;
      el.title = NAMES[type];
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', NAMES[type]);
      setIcon(el, type);
      this.paletteEl.appendChild(el);
    }
  }

  render() {
    this.containers.clear();
    const strip = this.stripEl;
    strip.innerHTML = '';
    strip.dataset.container = 'main';
    this.containers.set(strip, { list: this.program, owner: null });
    this.program.forEach((it, i) => {
      if (it.type === 'repeat') strip.appendChild(this.renderBlock(it, i));
      else strip.appendChild(this.renderCard(it, String(i)));
    });
    if (!this.program.length) {
      const hint = document.createElement('div');
      hint.className = 'strip-hint';
      hint.textContent = '👆';
      strip.appendChild(hint);
    }
    this.updateCounter();
  }

  renderCard(it, path) {
    const el = document.createElement('div');
    el.className = `card item t-${it.type}`;
    el.dataset.path = path;
    el.title = NAMES[it.type];
    setIcon(el, it.type);
    return el;
  }

  renderBlock(it, i) {
    const el = document.createElement('div');
    el.className = `item block${this.active === it ? ' active' : ''}`;
    el.dataset.path = String(i);
    const head = document.createElement('div');
    head.className = 'block-head';
    const ic = document.createElement('span');
    ic.className = 'block-icon';
    ic.textContent = ICONS.repeat;
    const badge = document.createElement('div');
    badge.className = 'badge';
    badge.setAttribute('role', 'button');
    badge.textContent = `×${it.times}`;
    head.append(ic, badge);
    const body = document.createElement('div');
    body.className = 'block-body';
    body.dataset.container = 'body';
    it.body.forEach((b, j) => body.appendChild(this.renderCard(b, `${i}.${j}`)));
    if (!it.body.length) {
      const slot = document.createElement('div');
      slot.className = 'slot-empty';
      slot.textContent = '＋';
      body.appendChild(slot);
    }
    el.append(head, body);
    if (this.active === it) {
      // Bouton visible pour sortir de la boucle : sinon les cartes suivantes y entrent toutes.
      const done = document.createElement('div');
      done.className = 'block-done';
      done.setAttribute('role', 'button');
      done.setAttribute('aria-label', 'Fin de la boucle');
      done.title = 'Fin de la boucle';
      done.textContent = '✓';
      el.appendChild(done);
    }
    this.containers.set(body, { list: it.body, owner: it });
    return el;
  }

  updateCounter() {
    if (!this.counterEl) return;
    if (this.maxCards) {
      this.counterEl.hidden = false;
      this.counterEl.textContent = `${this.count()} / ${this.maxCards}`;
    } else {
      this.counterEl.hidden = true;
    }
  }

  // ---------- surbrillance pendant l'exécution ----------
  clearMarks() {
    this.stripEl.querySelectorAll('.current,.current-block,.error-blink').forEach((e) => e.classList.remove('current', 'current-block', 'error-blink'));
  }

  find(path) { return this.stripEl.querySelector(`[data-path="${path.join('.')}"]`); }

  highlight(path) {
    this.stripEl.querySelectorAll('.current,.current-block').forEach((e) => e.classList.remove('current', 'current-block'));
    if (!path) return;
    const el = this.find(path);
    if (!el) return;
    el.classList.add('current');
    if (path.length === 2) this.find([path[0]])?.classList.add('current-block');
    el.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }

  flash(path) {
    const el = path && this.find(path);
    if (el) el.classList.add('error-blink');
  }

  // ---------- règles ----------
  reject(reason) {
    sfx.nope();
    this.stripEl.classList.remove('shake');
    this.counterEl?.classList.remove('shake');
    void this.stripEl.offsetWidth;
    this.stripEl.classList.add('shake');
    this.counterEl?.classList.add('shake');
    setTimeout(() => { this.stripEl.classList.remove('shake'); this.counterEl?.classList.remove('shake'); }, 450);
    this.onReject(reason);
    return reason;
  }

  // Fait briller une carte de la palette (jusqu'à ce qu'on la touche).
  spotlight(type) {
    const el = this.paletteEl.querySelector(`[data-type="${type}"]`);
    if (el) el.classList.add('spotlight');
  }

  changed() {
    this.render();
    this.onChange(this.program);
  }

  closeLoop() {
    this.active = null;
    sfx.click();
    this.render();
  }

  addNew(type, target) {
    if (this.maxCards && this.count() + 1 > this.maxCards) return this.reject('max');
    let obj;
    if (type === 'repeat') {
      if (target.owner) return this.reject('nested');
      obj = { type: 'repeat', times: 2, body: [] };
    } else {
      obj = { type };
    }
    if (target.owner && target.list.length >= MAX_BODY) return this.reject('body-full');
    const idx = target.index ?? target.list.length;
    target.list.splice(idx, 0, obj);
    if (type === 'repeat') this.active = obj;
    else if (target.owner && target.list.length >= MAX_BODY) this.active = null;
    sfx.click();
    this.changed();
    return null;
  }

  resolve(pathStr) {
    const parts = pathStr.split('.').map(Number);
    if (parts.length === 1) return { list: this.program, index: parts[0], obj: this.program[parts[0]], owner: null };
    const owner = this.program[parts[0]];
    return { list: owner.body, index: parts[1], obj: owner.body[parts[1]], owner };
  }

  // ---------- pointeur ----------
  onPaletteDown(e) {
    if (this.locked || this.busy || e.button > 0) return;
    const el = e.target.closest('.pcard');
    if (!el) return;
    e.preventDefault();
    el.classList.remove('spotlight');
    this.beginPress(e, el, { kind: 'palette', type: el.dataset.type });
  }

  onStripDown(e) {
    if (this.locked || this.busy || e.button > 0) return;
    if (e.target.closest('.block-done')) {
      e.preventDefault();
      this.closeLoop();
      return;
    }
    const badge = e.target.closest('.badge');
    if (badge) {
      e.preventDefault();
      const block = badge.closest('.block');
      this.beginPress(e, badge, { kind: 'badge', path: block.dataset.path });
      return;
    }
    const el = e.target.closest('.item');
    if (!el) { if (this.active) this.closeLoop(); return; }
    e.preventDefault();
    this.beginPress(e, el, { kind: 'item', path: el.dataset.path });
  }

  beginPress(e, el, desc) {
    this.cancelPress();
    this.press = { id: e.pointerId, sx: e.clientX, sy: e.clientY, el, desc, dragging: false, ghost: null, target: null };
    el.classList.add('pressed');
  }

  cancelPress() {
    const p = this.press;
    if (!p) return;
    p.el.classList.remove('pressed', 'drag-src');
    p.ghost?.remove();
    this.clearIndicators();
    this.press = null;
  }

  onCancel(e) {
    if (this.press && e.pointerId === this.press.id) this.cancelPress();
  }

  onMove(e) {
    const p = this.press;
    if (!p || e.pointerId !== p.id) return;
    if (!p.dragging) {
      if (p.desc.kind === 'badge') return;
      if (Math.hypot(e.clientX - p.sx, e.clientY - p.sy) < DRAG_THRESHOLD) return;
      this.startDrag(p);
    }
    e.preventDefault();
    const r = p.ghost.getBoundingClientRect();
    p.ghost.style.left = `${e.clientX - r.width / 2}px`;
    p.ghost.style.top = `${e.clientY - r.height / 2}px`;
    p.target = this.computeTarget(e.clientX, e.clientY);
    this.showIndicator(p.target);
  }

  startDrag(p) {
    p.dragging = true;
    const ghost = p.el.cloneNode(true);
    ghost.classList.remove('pressed', 'current', 'current-block', 'active');
    ghost.classList.add('ghost');
    const r = p.el.getBoundingClientRect();
    ghost.style.width = `${r.width}px`;
    ghost.style.height = `${r.height}px`;
    document.body.appendChild(ghost);
    p.ghost = ghost;
    if (p.desc.kind === 'item') p.el.classList.add('drag-src');
    sfx.pop();
  }

  computeTarget(x, y) {
    const p = this.press;
    const els = document.elementsFromPoint(x, y);
    // toute la rangée du bas (palette et boutons) sert de corbeille
    const delZone = this.paletteEl.parentElement || this.paletteEl;
    if (els.some((el) => el === delZone || delZone.contains(el))) {
      return p.desc.kind === 'item' ? { zone: 'palette' } : { zone: 'none' };
    }
    let contEl = null;
    for (const el of els) {
      const c = el.closest?.('[data-container]');
      if (c && this.containers.has(c)) { contEl = c; break; }
    }
    if (!contEl) return { zone: 'none' };
    const info = this.containers.get(contEl);
    const items = [...contEl.children].filter((c) => c.classList.contains('item'));
    let index = items.length;
    for (let i = 0; i < items.length; i++) {
      const r = items[i].getBoundingClientRect();
      if (y < r.top || (y <= r.bottom && x < r.left + r.width / 2)) { index = i; break; }
    }
    return { zone: 'strip', contEl, list: info.list, owner: info.owner, index, items };
  }

  validate(t, d = this.press.desc) {
    if (t.zone === 'none') return { ok: false, silent: true };
    if (t.zone === 'palette') return { ok: true };
    const isRepeat = d.kind === 'palette' ? d.type === 'repeat' : this.resolve(d.path).obj.type === 'repeat';
    if (t.owner && isRepeat) return { ok: false, reason: 'nested' };
    if (d.kind === 'palette') {
      if (this.maxCards && this.count() + 1 > this.maxCards) return { ok: false, reason: 'max' };
      if (t.owner && t.list.length >= MAX_BODY) return { ok: false, reason: 'body-full' };
    } else {
      const src = this.resolve(d.path);
      if (t.owner && src.list !== t.list && t.list.length >= MAX_BODY) return { ok: false, reason: 'body-full' };
    }
    return { ok: true };
  }

  clearIndicators() {
    document.querySelectorAll('.ins-before,.ins-end,.drop-hover,.drop-bad,.palette-del').forEach((e) => e.classList.remove('ins-before', 'ins-end', 'drop-hover', 'drop-bad', 'palette-del'));
  }

  showIndicator(t) {
    this.clearIndicators();
    if (!t || t.zone === 'none') return;
    if (t.zone === 'palette') { (this.paletteEl.parentElement || this.paletteEl).classList.add('palette-del'); return; }
    const v = this.validate(t);
    t.contEl.classList.add(v.ok ? 'drop-hover' : 'drop-bad');
    if (!v.ok) return;
    if (t.index < t.items.length) t.items[t.index].classList.add('ins-before');
    else t.contEl.classList.add('ins-end');
  }

  onUp(e) {
    const p = this.press;
    if (!p || e.pointerId !== p.id) return;
    const { desc, dragging, target, el } = p;
    el.classList.remove('pressed', 'drag-src');
    p.ghost?.remove();
    this.clearIndicators();
    this.press = null;
    if (!dragging) { this.onTap(desc, el); return; }
    this.onDrop(desc, target);
  }

  // ---------- actions ----------
  onTap(desc, el) {
    if (this.locked) return;
    if (desc.kind === 'palette') {
      const target = this.active && desc.type !== 'repeat'
        ? { list: this.active.body, owner: this.active }
        : { list: this.program, owner: null };
      this.addNew(desc.type, target);
      return;
    }
    if (desc.kind === 'badge') {
      const { obj } = this.resolve(desc.path);
      obj.times = obj.times >= 5 ? 2 : obj.times + 1;
      sfx.click();
      this.changed();
      return;
    }
    const { obj, list, index } = this.resolve(desc.path);
    if (obj.type === 'repeat') {
      this.active = this.active === obj ? null : obj;
      sfx.click();
      this.render();
      return;
    }
    // retire la carte avec une petite animation
    this.busy = true;
    el.classList.add("removing");
    sfx.pop();
    setTimeout(() => {
      this.busy = false;
      const i = list.indexOf(obj);
      if (i >= 0) list.splice(i, 1);
      this.changed();
    }, 180);
  }

  onDrop(desc, t) {
    if (!t || t.zone === 'none') return;
    if (t.zone === 'palette') {
      const { list, obj } = this.resolve(desc.path);
      list.splice(list.indexOf(obj), 1);
      if (this.active === obj) this.active = null;
      sfx.pop();
      this.changed();
      return;
    }
    const v = this.validate(t, desc);
    if (!v.ok) { if (!v.silent) this.reject(v.reason); return; }
    if (desc.kind === 'palette') {
      this.addNew(desc.type, { list: t.list, owner: t.owner, index: t.index });
      return;
    }
    const src = this.resolve(desc.path);
    let idx = t.index;
    const srcIdx = src.list.indexOf(src.obj);
    if (src.list === t.list && srcIdx < idx) idx--;
    src.list.splice(srcIdx, 1);
    t.list.splice(idx, 0, src.obj);
    sfx.click();
    this.changed();
  }
}
