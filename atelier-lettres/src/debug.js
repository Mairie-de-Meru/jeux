// Crochet de débogage window.__lettres et compteur d'images par seconde (?debug).
import { debug } from './fx.js';

export function installDebug(app) {
  const hook = {
    state: () => app.state(),
    goto: (atelier, level = 1, index = 0, seed) => app.goto(atelier, level, index, seed),
    boardToScreen: (x, y) => app.tracer().boardToScreen(x, y),
    traceStroke: (points, opts) => app.tracer().traceStroke(points, opts),
    traceLetter: (opts) => app.tracer().traceLetter(opts),
    solve: () => app.solve(),
    get skipAnim() { return debug.skipAnim; },
    set skipAnim(v) { debug.skipAnim = !!v; },
  };
  window.__lettres = hook;
  if (new URLSearchParams(location.search).has('debug')) {
    const out = document.getElementById('fps');
    out.style.display = 'block';
    let frames = 0;
    let last = performance.now();
    const tick = (now) => {
      frames++;
      if (now - last >= 500) {
        out.textContent = `${Math.round((frames * 1000) / (now - last))} fps`;
        frames = 0;
        last = now;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  return hook;
}
