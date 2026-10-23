// Captures mobiles du jeu par Chrome headless (Node 22, sans dépendance : WebSocket et fetch globaux).
// Usage :
//   node outils/captures.mjs <dossier-sortie> [--zoom] [--extra] [--url http://localhost:8127/]
//     -> <taille>.png (+ <taille>-zoom.png avec --zoom ; -p1, -passe, -p2, -fin avec --extra) et mesures.json
//   node outils/captures.mjs --planche <dossier-avant> <dossier-apres> <sortie.png>
//     -> planche avant/après côte à côte par taille
import { spawn } from 'node:child_process';
import { mkdtemp, rm, mkdir, writeFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9347;
const SIZES = [
  { name: 'portrait-375x667', w: 375, h: 667 },
  { name: 'portrait-390x844', w: 390, h: 844 },
  { name: 'paysage-667x375', w: 667, h: 375 },
  { name: 'paysage-844x390', w: 844, h: 390 },
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function launch() {
  const profile = await mkdtemp(join(tmpdir(), 'scrabble-chrome-'));
  const proc = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--hide-scrollbars',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', 'about:blank',
  ], { stdio: 'ignore' });
  let target = null;
  for (let i = 0; i < 100 && !target; i++) {
    await sleep(100);
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      target = list.find((t) => t.type === 'page');
    } catch { /* pas encore prêt */ }
  }
  if (!target) { proc.kill('SIGKILL'); await rm(profile, { recursive: true, force: true }); throw new Error('Chrome ne répond pas'); }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0;
  const waiting = new Map();
  const listeners = [];
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && waiting.has(m.id)) {
      const { res, rej } = waiting.get(m.id);
      waiting.delete(m.id);
      m.error ? rej(new Error(m.error.message)) : res(m.result);
    } else if (m.method) for (const l of listeners) l(m);
  };
  const send = (method, params = {}) => new Promise((res, rej) => { const k = ++id; waiting.set(k, { res, rej }); ws.send(JSON.stringify({ id: k, method, params })); });
  const close = async () => {
    try { ws.close(); } catch { /* ok */ }
    proc.kill('SIGKILL');
    await sleep(300);
    await rm(profile, { recursive: true, force: true });
  };
  return { send, listeners, close };
}

async function evaluate(send, expr) {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error('JS : ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
  return r.result.value;
}

async function shot(send, file) {
  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile(file, Buffer.from(data, 'base64'));
}

// Mesures dans la page : px par case, polices du chevalet, canvas, boutons hors écran ou recouverts.
const MEASURE = `(() => {
  const h = window.__scrabble;
  const cs = (el) => el ? parseFloat(getComputedStyle(el).fontSize) : null;
  const tile = document.querySelector('#rack .tile');
  const r = document.getElementById('c').getBoundingClientRect();
  const rk = document.getElementById('rack').getBoundingClientRect();
  const tiles = [...document.querySelectorAll('#rack .tile')].map((t) => t.getBoundingClientRect());
  const rows = new Set([...document.querySelectorAll('#rack .tile')].map((t) => t.offsetTop)).size;
  const bad = [];
  for (const b of document.querySelectorAll('#app button')) {
    if (b.offsetParent === null || b.closest('.hidden')) continue;
    const q = b.getBoundingClientRect();
    if (q.width === 0) continue;
    const off = q.left < -0.5 || q.top < -0.5 || q.right > innerWidth + 0.5 || q.bottom > innerHeight + 0.5;
    const top = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2);
    // bouton désactivé : pointer-events none, elementFromPoint rend son parent
    const covered = !top || !(top === b || b.contains(top) || (b.disabled && top.contains(b)));
    if (off || covered) bad.push((b.id || b.className || b.textContent.trim()) + (off ? ' hors-écran' : ' recouvert:' + (top ? (top.id || top.className || top.tagName) : 'rien')));
  }
  const fc = h.frameCheck && !h.view.focus ? h.frameCheck() : null;
  return {
    frame: fc ? (fc.ok ? 'OK' : 'KO ' + JSON.stringify(fc)) : 'n/a (zoom)',
    cellPx: h.cellPx ? +h.cellPx().toFixed(1) : null,
    focus: !!h.view.focus,
    letterFont: cs(tile), valueFont: cs(tile && tile.querySelector('small')),
    tilePx: tile ? Math.round(tile.getBoundingClientRect().width) : null,
    rackRows: rows, rackOverflow: rk.right > innerWidth + 0.5 || rk.left < -0.5,
    canvas: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
    badButtons: bad,
  };
})()`;

async function captures(outDir, { zoom, extra, url }) {
  await mkdir(outDir, { recursive: true });
  const { send, close } = await launch();
  const out = {};
  try {
    await send('Page.enable');
    await send('Runtime.enable');
    for (const s of SIZES) {
      const landscape = s.w > s.h;
      await send('Emulation.setDeviceMetricsOverride', {
        width: s.w, height: s.h, deviceScaleFactor: 2, mobile: true,
        screenOrientation: { type: landscape ? 'landscapePrimary' : 'portraitPrimary', angle: landscape ? 90 : 0 },
      });
      await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
      await send('Page.navigate', { url });
      let ok = false;
      for (let i = 0; i < 150 && !ok; i++) { await sleep(100); ok = await evaluate(send, '!!(window.__scrabble && window.__scrabble.view)').catch(() => false); }
      if (!ok) throw new Error('crochet __scrabble absent pour ' + s.name);
      // partie palier 3, seed fixe : l'enfant et le robot jouent un tour chacun
      await evaluate(send, `(async () => {
        const h = window.__scrabble;
        Math.random = (() => { let x = 12345; return () => ((x = (x * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff); })();
        await h.newGame({ palier: 3, seed: 4242, seats: [{ kind: 'human', name: 'Toi' }, { kind: 'robot' }] });
        if (h.ui.passScreen && h.ready) h.ready();
        await h.auto();
        await h.waitIdle();
        if (h.ui.passScreen && h.ready) h.ready();
        await new Promise((r) => setTimeout(r, 1500));
        return true;
      })()`);
      await sleep(400);
      const m = await evaluate(send, MEASURE);
      // px par case en vue zoom (si le mode zoom existe), sans toucher à l'affichage capturé
      m.zoomCellPx = await evaluate(send, `(() => { const h = window.__scrabble, v = h.view; const was = v.focus; v.setFocus(true, []); const px = v.cellPx(); v.setFocus(was, []); return +px.toFixed(1); })()`);
      await shot(send, join(outDir, s.name + '.png'));
      if (zoom) {
        await evaluate(send, `(() => { const h = window.__scrabble; const i = h.ui.view[0]; h.tapRack(i); return true; })()`);
        await sleep(700);
        m.auto = await evaluate(send, MEASURE);
        await shot(send, join(outDir, s.name + '-zoom.png'));
      }
      if (extra) {
        // palier 1 (robot, Idée affichée) ; palier 2 à deux humains (écran « Passe l'appareil » puis plateau) ; fin de partie
        await evaluate(send, `(async () => { const h = window.__scrabble; h.overview && h.overview();
          await h.newGame({ palier: 1, seed: 7, seats: [{ kind: 'human', name: 'Toi' }, { kind: 'robot' }] });
          await h.auto(); await h.waitIdle(); h.hint(); await new Promise((r) => setTimeout(r, 900)); return true; })()`);
        m.p1 = await evaluate(send, MEASURE);
        await shot(send, join(outDir, s.name + '-p1.png'));
        await evaluate(send, `(async () => { const h = window.__scrabble;
          await h.newGame({ palier: 2, seed: 9, seats: [{ kind: 'human', name: 'Léa' }, { kind: 'human', name: 'Tom' }] });
          h.ready(); await h.auto(); await new Promise((r) => setTimeout(r, 900)); return h.ui.passScreen; })()`);
        await shot(send, join(outDir, s.name + '-passe.png'));
        await evaluate(send, `(async () => { window.__scrabble.ready(); await new Promise((r) => setTimeout(r, 600)); return true; })()`);
        m.p2 = await evaluate(send, MEASURE);
        await shot(send, join(outDir, s.name + '-p2.png'));
        await evaluate(send, `(async () => { window.__scrabble.endGame(); await new Promise((r) => setTimeout(r, 1500)); return true; })()`);
        await shot(send, join(outDir, s.name + '-fin.png'));
      }
      out[s.name] = m;
      console.log(s.name, JSON.stringify(m));
    }
  } finally {
    await close();
  }
  await writeFile(join(outDir, 'mesures.json'), JSON.stringify(out, null, 2));
}

async function planche(avant, apres, file) {
  const names = (await readdir(apres)).filter((f) => f.endsWith('.png')).sort();
  const cell = (dir, f) => `<figure><img src="${pathToFileURL(join(dir, f)).href}"><figcaption>${dir === avant ? 'avant' : 'après'} · ${f}</figcaption></figure>`;
  const rows = SIZES.map((s) => {
    const extra = names.filter((f) => f === s.name + '-zoom.png');
    return `<section><h2>${s.name}</h2><div class="r">${cell(avant, s.name + '.png')}${cell(apres, s.name + '.png')}${extra.map((f) => cell(apres, f)).join('')}</div></section>`;
  }).join('');
  const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:12px;background:#222;color:#fff;font:14px system-ui}
  h2{margin:8px 0 4px;font-size:16px}.r{display:flex;gap:12px;align-items:flex-start}figure{margin:0}figcaption{font-size:12px;opacity:.8}
  img{height:420px;border:1px solid #555}</style>${rows}`;
  const page = join(resolve(file, '..'), 'planche.html');
  await writeFile(page, html);
  const { send, close } = await launch();
  try {
    await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 2200, height: 2400, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: pathToFileURL(page).href });
    await sleep(1500);
    const hgt = await evaluate(send, 'document.documentElement.scrollHeight');
    const wid = await evaluate(send, 'document.documentElement.scrollWidth');
    const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: wid, height: hgt, scale: 1 } });
    await writeFile(file, Buffer.from(data, 'base64'));
  } finally {
    await close();
  }
}

const args = process.argv.slice(2);
if (args[0] === '--planche') {
  await planche(resolve(args[1]), resolve(args[2]), resolve(args[3]));
} else {
  const ui = args.indexOf('--url');
  const url = ui >= 0 ? args[ui + 1] : 'http://localhost:8127/';
  const dir = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--url');
  if (!dir) { console.error('usage : node outils/captures.mjs <dossier> [--zoom]'); process.exit(1); }
  await captures(resolve(dir), { zoom: args.includes('--zoom'), extra: args.includes('--extra'), url });
}
