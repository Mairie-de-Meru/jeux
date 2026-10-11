#!/bin/bash
# Régénère assets/manifest.json à partir des images présentes (le jeu ne demande que celles-ci)
cd "$(dirname "$0")/.."
printf '{ "images": [\n%s\n] }\n' "$(find assets/img \( -name '*.png' -o -name '*.jpg' \) | sort | sed 's/.*/  "&"/' | paste -sd, - | sed 's/,/,\n/g')" > assets/manifest.json
