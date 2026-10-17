#!/usr/bin/env python3
"""Génère assets/lexique.txt (validation des mots de l'enfant).

Usage : python3 -I outils/genere-lexique.py <index.json de an-array-of-french-words> [sortie]
Source : https://github.com/words/an-array-of-french-words (MIT, (c) 2016 Zeke Sikelianos).
Règles : lettres minuscules françaises seulement (ni tiret, ni apostrophe, ni majuscule initiale),
accents retirés (oe, ae, c cédille), majuscules, 2 à 7 lettres, + liste enfant src/mots.js,
- liste noire (insultes et gros mots évidents), triés, un mot par ligne.
"""
import json, re, subprocess, sys, unicodedata
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
NOIRE = {
    'PUTAIN', 'PUTE', 'PUTES', 'PUTAINS', 'MERDE', 'MERDES', 'SALOPE', 'SALOPES', 'SALOPARD', 'SALAUD',
    'ENCULE', 'ENCULER', 'CONNARD', 'CONNARDS', 'CONNASSE', 'BITE', 'BITES', 'COUILLE', 'COUILLES',
    'NIQUE', 'NIQUER', 'BAISER', 'BORDEL', 'BRANLER', 'FOUTRE', 'PEDE', 'TAPETTE', 'NEGRO', 'BOUGNOUL',
}

def normaliser(m):
    m = m.replace('œ', 'oe').replace('æ', 'ae').replace('ç', 'c')
    return unicodedata.normalize('NFD', m).encode('ascii', 'ignore').decode().upper()

def main():
    src = Path(sys.argv[1])
    sortie = Path(sys.argv[2]) if len(sys.argv) > 2 else RACINE / 'assets' / 'lexique.txt'
    mots = json.loads(src.read_text(encoding='utf-8'))
    ok = set()
    for m in mots:
        if not re.fullmatch(r"[a-zàâäçéèêëîïôöùûüÿœæ]+", m):
            continue
        n = normaliser(m)
        if re.fullmatch(r'[A-Z]{2,7}', n):
            ok.add(n)
    enfant = subprocess.run(
        ['node', '-e', "import('./src/mots.js').then(m=>console.log(m.WORDS.join('\\n')))"],
        cwd=RACINE, capture_output=True, text=True, check=True).stdout.split()
    ok.update(enfant)
    ok -= NOIRE
    sortie.parent.mkdir(parents=True, exist_ok=True)
    sortie.write_text('\n'.join(sorted(ok)) + '\n', encoding='utf-8')
    print(len(ok), 'mots ->', sortie, '| liste enfant:', len(enfant), '| enfant retiré par liste noire:', len(set(enfant) & NOIRE))

main()
