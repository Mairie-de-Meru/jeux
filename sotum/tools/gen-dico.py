# Usage : python3 -I tools/gen-dico.py <dossier contenant fr.dic et fr.aff> src/dico.js
# Source : https://github.com/LibreOffice/dictionaries/tree/master/fr_FR/dictionaries (fr.dic, fr.aff)
import re, sys, unicodedata
D = sys.argv[1]
LENS = range(4, 11)
rules = {}
lines = open(f'{D}/fr.aff', encoding='utf-8').read().split('\n')
i = 0
while i < len(lines):
    p = lines[i].split()
    if len(p) >= 4 and p[0] in ('SFX', 'PFX') and p[2] in ('Y', 'N'):
        kind, flag, n = p[0], p[1], int(p[3]); lst = []
        for l in lines[i+1:i+1+n]:
            q = l.split()
            strip = '' if q[2] == '0' else q[2]
            add = q[3].split('/')[0]; add = '' if add == '0' else add
            cond = q[4] if len(q) > 4 else '.'
            lst.append((strip, add, re.compile((cond + '$') if kind == 'SFX' else ('^' + cond))))
        rules[flag] = (kind, lst); i += n + 1
    else: i += 1
def norm(w):
    w = unicodedata.normalize('NFD', w.lower()).replace('œ', 'oe').replace('æ', 'ae')
    return ''.join(c for c in w if not unicodedata.combining(c))
out = set()
for l in open(f'{D}/fr.dic', encoding='utf-8').read().split('\n')[1:]:
    e = l.split('\t')[0].split(' ')[0]
    if not e: continue
    w, _, fl = e.partition('/')
    if not w or w[0].isupper(): continue
    forms = {w}
    for k in range(0, len(fl), 2):
        r = rules.get(fl[k:k+2])
        if not r or r[0] != 'SFX': continue
        for strip, add, cond in r[1]:
            if cond.search(w) and w.endswith(strip):
                forms.add(w[:len(w)-len(strip)] + add)
    for f in forms:
        n = norm(f)
        if re.fullmatch(r'[a-z]{4,10}', n): out.add(n)

print(len(out), {n: sum(len(x) == n for x in out) for n in LENS})

# --- Filtre 5-8 ans puis écriture de src/dico.js ---
EXACT = set('''con cons conne connes connard merde merdes merder pute putes putain bite bites zob zobs teub cul culs chier chie chies chiez chiait pisse pisses pisser salope salaud salauds nique niques niquer baiser baise baises sexe sexes sexy porno pornos viol viols violer viole violee violes nazi nazis drogue drogues droguer vodka whisky biere bieres cidre cidres alcool tuer tueur tueurs tueuse mort morte morts mortes mourir meurt meurs crime crimes arme armes guerre fusil fusils bombe bombes obus duel duels poison cadavre cancer sida suicide pedale pede pedes gouine negre negres youpin garce garces pine pines nichon tapette enfoire diable prison bandit punir hache epee epees otage otages tirs crack heroine cocain penis vagin anus sperme orgie fion pubis cocu cocus catin pouffe poufs neuneu teton tetons bander negro bicot fiotte shit pipe pipes idiot idiote idiots'''.split())
PREFIX = ('merd', 'putai', 'couill', 'salop', 'enculer', 'encule', 'connar', 'foutr', 'branl', 'bordel', 'niqu', 'chiott', 'suicid', 'meurtr', 'cadavr', 'cocain', 'pedop', 'bougnoul', 'tarlou', 'bamboul', 'trouduc', 'enfoir', 'emmerd', 'nazi', 'drogu', 'zizi', 'debil', 'cretin', 'abrut', 'gogol', 'imbecil', 'pouffi', 'sperm', 'orgi', 'vagin', 'penis', 'connass', 'sodom', 'prostitu', 'assassin', 'massacr', 'torture', 'poignar', 'pistol', 'revolv', 'guillot', 'egorg', 'terroris', 'pedoph', 'pornogr', 'erotiq', 'masturb', 'ejacul', 'erecti', 'fellat', 'sadique', 'tortion', 'mutiler', 'violent', 'hurlant')
keep = sorted(w for w in out if w not in EXACT and not w.startswith(PREFIX) and not re.search(r'(.)\1\1', w))  # sans onomatopées (zzzz, brrr)
by = {n: [w for w in keep if len(w) == n] for n in LENS}
js = ('// Mots acceptés tirés du dictionnaire Grammalecte 7.7 (Olivier R., dicollecte), MPL 2.0 :\n'
      '// https://github.com/LibreOffice/dictionaries/tree/master/fr_FR — fichier généré par tools/gen-dico.py, ne pas éditer.\n'
      '// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.\n'
      '// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.\n'
      'export const DICO = `\n' + '\n'.join(' '.join(by[n]) for n in LENS) + '\n`;\n')
open(sys.argv[2], 'w', encoding='utf-8').write(js)
print('gardés', len(keep), {n: len(v) for n, v in by.items()})
