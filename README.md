# ❄️ Winter Arc

PWA mobile de suivi du Winter Arc (1er octobre → 31 décembre).

- **Jour** : séances du jour (selon le planning), eau, sommeil (objectif 7-8 h), règles nutrition + repas libres (resto, marge par semaine), anti-luxure (série clean + mode SOS), pas de scroll (série + idées pour remplacer l'envie), dépenses, note. Score du jour sur 100 %, une journée est validée à partir de 80 %.
- **Sport** : objectifs de la semaine par type, planning type modifiable.
- **Budget** : budget hebdo, dépenses nécessaires / superflues, répartition par catégorie.
- **Progrès** : stats globales (dont sommeil moyen), courbe de poids (objectif optionnel), score par semaine, calendrier coloré des 92 jours (🍽️ = repas libre).
- **Réglages** : objectifs, règles nutrition, « mes raisons », export / import de sauvegarde.

Les données restent **uniquement sur le téléphone** (localStorage). Pense à exporter une sauvegarde régulièrement.

## Mise en ligne (GitHub Pages)

1. Crée un dépôt vide sur github.com (ex : `winter-arc`), sans README.
2. Dans ce dossier :
   ```bash
   git remote add origin https://github.com/<ton-pseudo>/winter-arc.git
   git push -u origin main
   ```
3. Sur GitHub : **Settings → Pages → Source : Deploy from a branch → `main` / `(root)`** → Save.
4. Après 1 à 2 minutes, l'app est en ligne sur `https://<ton-pseudo>.github.io/winter-arc/`.

## Installer sur le téléphone

- **iPhone** : ouvre l'URL dans Safari → Partager → *Sur l'écran d'accueil*.
- **Android** : ouvre l'URL dans Chrome → menu ⋮ → *Installer l'application*.

## Mettre à jour l'app

Après une modification, change la version du cache dans `sw.js` (`winterarc-v1` → `winterarc-v2`), puis commit + push.

## Tester en local

```bash
python -m http.server 8765
```
puis ouvre http://localhost:8765.
