const COLORS = ['#ff5d5d', '#ff8a1f', '#ffc800', '#2fcf5f', '#3d9cff', '#7c4dff'];
const starsText = (n) => '⭐'.repeat(n) + '☆'.repeat(3 - n);

export function createUI(h) {
  const root = document.getElementById('ui');
  const letters = [...'Tour d\'équilibre'].map((c, i) =>
    c === ' ' ? ' ' : `<span style="color:${COLORS[i % COLORS.length]};transform:rotate(${(i % 3 - 1) * 3}deg)">${c}</span>`).join('');
  root.innerHTML = `
    <section id="title" class="hidden">
      <h1>${letters}</h1>
      <div class="levels"></div>
    </section>
    <section id="hud" class="hidden">
      <div class="hud-left">
        <button data-act="home" aria-label="Accueil">🏠</button>
        <button data-act="speak" aria-label="Lire la consigne">🔊</button>
        <div class="badge"><span class="ico"></span><span class="num"></span></div>
      </div>
      <div class="progress"><div class="goal">🚩</div><div class="fill"></div></div>
      <button class="drop" data-act="drop" aria-label="Lâcher">⬇</button>
    </section>
    <section id="modal" class="hidden"></section>`;
  const $ = (s) => root.querySelector(s);
  const title = $('#title'), hud = $('#hud'), modal = $('#modal'), levels = $('.levels');
  let toastEl = null, toastTimer = 0;

  root.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    b.blur();
    const act = b.dataset.act;
    if (b.dataset.level !== undefined) h.onStart(Number(b.dataset.level));
    else if (act === 'home') h.onHome();
    else if (act === 'speak') h.onSpeak();
    else if (act === 'retry') h.onRetry();
    else if (act === 'next') h.onNext();
  });
  $('.drop').addEventListener('pointerdown', (e) => { e.preventDefault(); h.onDrop(); });

  function hideModal() { modal.classList.add('hidden'); modal.innerHTML = ''; }

  return {
    showTitle(progress, isUnlocked, count) {
      hideModal();
      hud.classList.add('hidden');
      title.classList.remove('hidden');
      levels.innerHTML = '';
      for (let i = 0; i < count; i++) {
        const open = isUnlocked(progress, i);
        const b = document.createElement('button');
        b.className = 'lvl';
        b.dataset.level = i;
        b.disabled = !open;
        b.setAttribute('aria-label', `Niveau ${i + 1}`);
        b.innerHTML = open
          ? `<span class="num">${i + 1}</span><span class="ico">${h.icons[i]}</span><span class="stars">${starsText(progress.stars[i] || 0)}</span>`
          : `<span class="num">${i + 1}</span><span class="ico">🔒</span><span class="stars"></span>`;
        levels.appendChild(b);
      }
    },
    showGame(index, level) {
      hideModal();
      title.classList.add('hidden');
      hud.classList.remove('hidden');
      $('.badge .ico').textContent = level.icon;
      $('.badge .num').textContent = String(index + 1);
    },
    setProgress(height, target) {
      $('.progress .fill').style.height = `${Math.round(Math.min(1, height / target) * 100)}%`;
    },
    toast(text) {
      if (toastEl) toastEl.remove();
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.textContent = text;
      hud.appendChild(toastEl);
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { toastEl && toastEl.remove(); toastEl = null; }, 1600);
    },
    showFallen() {
      modal.innerHTML = `<div class="card"><h2>On recommence ?</h2>
        <div class="row"><button class="big" data-act="retry" aria-label="Recommencer">↻</button>
        <button class="big" data-act="home" aria-label="Accueil" style="background:#7c4dff;box-shadow:0 6px 0 #4b2bb3">🏠</button></div></div>`;
      modal.classList.remove('hidden');
    },
    showWin(stars, hasNext) {
      modal.innerHTML = `<div class="card"><h2>Bravo !</h2>
        <div class="stars-big">${[0, 1, 2].map((i) => `<span>${i < stars ? '⭐' : '☆'}</span>`).join('')}</div>
        <div class="row">${hasNext ? '<button class="big" data-act="next" aria-label="Niveau suivant">▶</button>' : ''}
        <button class="big" data-act="home" aria-label="Accueil" style="background:#7c4dff;box-shadow:0 6px 0 #4b2bb3">🏠</button></div></div>`;
      modal.classList.remove('hidden');
    },
    hideModal,
    isModalOpen: () => !modal.classList.contains('hidden'),
    hideAll() { hideModal(); title.classList.add('hidden'); hud.classList.add('hidden'); },
  };
}
