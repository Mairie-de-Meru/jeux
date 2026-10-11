// Outil de dev (macOS, non chargé par le jeu) : génère assets/voice/*.m4a et manifest.json avec `say` + `afconvert`.
// Relançable : saute les fichiers présents, supprime les orphelins. 4 processus en parallèle au plus.
// Usage : node tools/gen-voice.mjs [--count] [--no-wrong3] [--tmp <dossier>]
//   --no-wrong3 : n'enregistre pas les phrases d'erreur du palier 3 (repli synthèse).
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, mkdtempSync, writeFileSync, statSync, existsSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { allPhrases, phraseKey } from '../src/allphrases.js';

const run = promisify(execFile);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'assets', 'voice');
const phrases = allPhrases({ wrongLevel3: !process.argv.includes('--no-wrong3') });
console.log(`${phrases.length} phrases (en ${phrases.filter((p) => p.lang === 'en').length}, fr ${phrases.filter((p) => p.lang === 'fr').length})`);
if (process.argv.includes('--count')) process.exit(0);

const ti = process.argv.indexOf('--tmp');
const tmp = mkdtempSync(join(ti > 0 ? process.argv[ti + 1] : tmpdir(), 'voice-'));
mkdirSync(out, { recursive: true });
const VOICE = { en: ['-v', 'Daniel', '-r', '150'], fr: ['-v', 'Thomas', '-r', '170'] };
const manifest = {};
const jobs = phrases.map((p) => {
  const name = `${p.lang}-${createHash('sha1').update(p.text).digest('hex').slice(0, 10)}.m4a`;
  manifest[phraseKey(p)] = name;
  return { p, name };
});

// afconvert ajoute un atome « free » de ~3 Ko (remplissage) : on le retire et on décale les offsets stco/co64.
function stripFree(file) {
  const b = readFileSync(file);
  let free = null;
  let moov = null;
  for (let i = 0; i + 8 <= b.length; ) {
    const sz = b.readUInt32BE(i);
    const ty = b.toString('latin1', i + 4, i + 8);
    if (ty === 'free') free = { at: i, sz };
    if (ty === 'moov') moov = { at: i, sz };
    if (sz < 8) return;
    i += sz;
  }
  if (!free || !moov || free.at < moov.at) return; // rien à faire (ou déjà nettoyé)
  const patch = (from, to) => {
    for (let i = from; i + 8 <= to; ) {
      const sz = b.readUInt32BE(i);
      const ty = b.toString('latin1', i + 4, i + 8);
      if (ty === 'stco') {
        const n = b.readUInt32BE(i + 12);
        for (let k = 0; k < n; k++) b.writeUInt32BE(b.readUInt32BE(i + 16 + 4 * k) - free.sz, i + 16 + 4 * k);
      } else if (ty === 'trak' || ty === 'mdia' || ty === 'minf' || ty === 'stbl') patch(i + 8, i + sz);
      i += sz;
    }
  };
  patch(moov.at + 8, moov.at + moov.sz);
  writeFileSync(file, Buffer.concat([b.subarray(0, free.at), b.subarray(free.at + free.sz)]));
}

async function gen({ p, name }) {
  const file = join(out, name);
  if (existsSync(file)) return stripFree(file);
  const aiff = join(tmp, name + '.aiff');
  await run('say', [...VOICE[p.lang], '-o', aiff, '--', p.text]);
  await run('afconvert', ['-f', 'm4af', '-d', 'aac@22050', '-b', '16000', '-c', '1', aiff, file]);
  rmSync(aiff);
  stripFree(file);
}

let next = 0;
let done = 0;
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (next < jobs.length) {
      await gen(jobs[next++]);
      if (++done % 200 === 0) console.log(`${done}/${jobs.length}`);
    }
  }),
);

const wanted = new Set(Object.values(manifest));
for (const f of readdirSync(out)) if (f.endsWith('.m4a') && !wanted.has(f)) rmSync(join(out, f));
writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
rmSync(tmp, { recursive: true, force: true });
const total = [...wanted].reduce((s, f) => s + statSync(join(out, f)).size, 0);
console.log(`${wanted.size} fichiers, ${(total / 1e6).toFixed(2)} Mo`);
