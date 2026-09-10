# Portfolio, Charles Dufour

Deck de portfolio en 1920 × 1080, conçu pour être lu à l'écran et exporté
en PDF. 38 slides, orientées candidature **Brand Designer / UI Designer,
Figma / Design System**.

## Générer le PDF

```bash
npm install          # installe Playwright, la seule dépendance
npm run pdf          # écrit Portfolio-Charles-Dufour.pdf
```

Le script ouvre `index.html` dans Chromium, attend le chargement effectif
des polices et des visuels, puis rasterise une page PDF par slide. En fin
d'exécution, il liste les visuels manquants.

```bash
node build-pdf.mjs index.html mon-export.pdf   # chemins personnalisés
```

## Relire à l'écran

```bash
npm run serve        # http://localhost:8080
```

Ouvrir directement `index.html` dans un navigateur fonctionne aussi. Le deck
se met automatiquement à l'échelle de la fenêtre.

## Vérifier les mises en page

```bash
node check-overflow.mjs
```

Signale toute slide dont le contenu dépasse le cadre 1920 × 1080. À lancer
après chaque modification de contenu : un texte rallongé de deux lignes
sort du cadre sans prévenir, et le débordement est invisible à l'écran
mais coupé dans le PDF.

## Structure

| Fichier | Rôle |
|---|---|
| `index.html` | Le document. Source unique : contenu, styles et scripts. |
| `assets/` | Visuels des études de cas. Voir `assets/README.md`. |
| `assets/fonts/` | DM Sans, DM Mono, Instrument Serif en local. |
| `build-pdf.mjs` | Export PDF. |
| `check-overflow.mjs` | Contrôle des débordements. |

## Notes d'implémentation

**Polices embarquées.** Les fichiers `.woff2` sont servis localement plutôt
que depuis Google Fonts. Chromium en mode headless ne résolvait pas les
polices distantes au moment de l'export, et le PDF partait en fonte de
repli. Les polices locales suppriment aussi toute dépendance réseau.

**Direction visuelle figée.** Le document d'origine embarquait un panneau
« Tweaks » en React qui appliquait la palette et la densité à chaud, au
chargement. Ces valeurs (palette bleu marine, densité compacte, footers de
section masqués) sont désormais écrites en dur dans le CSS : le rendu ne
dépend plus de l'exécution d'un script, condition nécessaire à un export
PDF fiable. Le panneau et ses dépendances React ont été retirés.

**Mise en page sans JavaScript.** `<deck-stage>` était un *custom element*
piloté par `deck-stage.js`, absent du document. Il est remplacé par du CSS :
chaque `<section>` est une page de 1920 × 1080, avec un saut de page à la
suite.

**Visuels manquants.** Un fichier absent est remplacé à l'affichage par un
cadre portant son nom et sa description, au lieu d'une icône d'image cassée.
La mise en page conserve ses proportions et le fichier attendu reste
identifiable, y compris dans le PDF.
