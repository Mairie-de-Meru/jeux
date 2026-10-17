#!/usr/bin/env python3
"""Reconstruit assets/manifest.json depuis les fichiers présents dans assets/img/."""
import json, os
RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(RACINE, "assets", "img")
GROUPES = ["marron", "bleu-clair", "rose", "orange", "rouge", "jaune", "vert", "bleu-fonce"]
CLES = {"titre": ["titre.jpg"], "mascotte": ["mascotte.png"], "dosChance": ["dos-chance.png"], "dosCaisse": ["dos-caisse.png"]}
for g in GROUPES:
    CLES["quartier-" + g] = ["quartier-%s.jpg" % g, "quartier-%s.png" % g]
# images de référence (assets/img/ref/) : clé = nom du fichier sans extension ; fiche-vierge exclue
REF = os.path.join(IMG, "ref")
EXCLUES = {"fiche-vierge"}
refs = {}
if os.path.isdir(REF):
    for f in sorted(os.listdir(REF)):
        nom, ext = os.path.splitext(f)
        if ext.lower() in (".png", ".jpg") and nom not in EXCLUES:
            refs[nom] = "img/ref/" + f
images = {}
for cle, fichiers in CLES.items():
    for f in fichiers:
        if os.path.isfile(os.path.join(IMG, f)):
            images[cle] = "img/" + f
            break
images.update(refs)
with open(os.path.join(RACINE, "assets", "manifest.json"), "w") as fh:
    json.dump({"images": images}, fh, ensure_ascii=False)
print(len(images), "image(s) listée(s) :", ", ".join(images) or "aucune")
