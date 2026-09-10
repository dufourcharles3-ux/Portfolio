# Portfolio, Charles Dufour

Deck de portfolio en 1920 × 1080, conçu pour être lu à l'écran et exporté
en PDF. 38 slides, orientées candidature **Brand Designer / UI Designer,
Figma / Design System**.

## Générer le PDF

```bash
npm install                  # installe Playwright, la seule dépendance
npx playwright install chromium   # une seule fois, sur une machine neuve
npm run pdf                  # écrit Portfolio-Charles-Dufour.pdf
```

La version de Playwright est **figée** (`1.56.1`, sans accent circonflexe) :
chaque version est liée à un build de Chromium précis, et un intervalle
laisserait npm installer une version dont le navigateur n'est pas présent.
Le lancement échouerait alors sur `Executable doesn't exist`.

Le script ouvre `index.html` dans Chromium, attend le chargement effectif
des polices et des visuels, puis rasterise une page PDF par slide. En fin
d'exécution, il liste les visuels manquants.

```bash
node build-pdf.mjs index.html mon-export.pdf   # chemins personnalisés
```

## Version anonymisée

```bash
npm run pdf:anon     # écrit index-anonyme.html puis Portfolio-anonyme.pdf
npm run anon         # régénère seulement le HTML
```

`index.html` reste la source nominative ; `make-anonymous.mjs` en dérive une
copie expurgée à chaque lancement. Il n'y a donc **pas deux documents à
maintenir** : toute modification du master se répercute sur la version
anonymisée.

Sont retirés : le nom, le site, l'email, le téléphone, le LinkedIn, le
monogramme, la slide de contact (37 slides au lieu de 38) et le portrait
photographique. La couverture repasse en pleine largeur et affiche le
positionnement à la place du nom ; la slide « À propos » récupère la largeur
libérée par le portrait.

Sont conservés les noms de clients et d'employeurs : ils font la valeur du
dossier et ne sont pas des données personnelles du candidat.

Le script échoue s'il ne retrouve pas un motif attendu (le master a changé)
ou s'il subsiste la moindre mention identifiante. Le titre du document est
également neutralisé, faute de quoi le nom réapparaîtrait dans les
propriétés du PDF.

## Générer le PowerPoint

### Version fidèle, non éditable

```bash
npm run pptx         # écrit Portfolio-Charles-Dufour.pptx (38 slides)
npm run pptx:anon    # écrit Portfolio-anonyme.pptx (37 slides)
```

Chaque slide est rendue par Chromium en 1920 × 1080 puis posée en pleine
page sur une diapositive 16:9 exacte (13,333" × 7,5"). Le rendu est donc
identique au PDF.

**Le texte n'est pas éditable dans PowerPoint.** C'est le prix d'une mise
en page sur mesure : la reconstruire en zones de texte natives dégraderait
la composition — grilles, italiques Instrument Serif, cadrages d'images —
sans la rendre réellement modifiable. Le libellé de chaque section est
placé en commentaire de diapositive, ce qui donne un repère utilisable
dans le mode Plan.

Les fichiers pèsent environ 7 Mo, contre 28 à 30 Mo pour les PDF : le JPEG
compresse bien mieux que les images embarquées par Chromium dans un PDF.
C'est la version à privilégier pour un envoi par mail.

### Version éditable

```bash
npm run pptx:editable        # Portfolio-editable.pptx (38 slides)
npm run pptx:editable:anon   # Portfolio-anonyme-editable.pptx (37 slides)
```

Reconstruit chaque slide en **formes et zones de texte natives** : le texte
est sélectionnable et modifiable dans PowerPoint.

La géométrie n'est pas ressaisie, elle est mesurée sur le rendu réel du
document. La conversion est exacte, le deck étant dessiné en 1920 × 1080
pour du 16:9 : `1 px = 13,333/1920 pouce` et `1 px = 0,5 pt`.

**Substitutions typographiques.** DM Sans, DM Mono et Instrument Serif sont
des polices Google, absentes de la plupart des postes : PowerPoint les
remplacerait arbitrairement, avec des chasses différentes et donc des
débordements. Elles sont remplacées par des polices livrées avec Office —
Calibri pour le texte, Cambria italique pour les accents éditoriaux.

L'interligne est imposé **en points**, pas en multiple : PowerPoint calcule
un multiple d'après les métriques de la police, si bien que Calibri
produisait une ligne plus haute que DM Sans et faisait chevaucher les gros
chiffres avec leur légende.

Le script mesure chaque bloc avec Carlito et Caladea, jumeaux métriques
exacts de Calibri et Cambria, et signale tout texte qui viendrait recouvrir
l'élément situé en dessous.

Limite connue : les pseudo-éléments CSS ne sont pas des nœuds du DOM et ne
sont donc pas repris — le cercle décoratif de la couverture disparaît.

### Aperçu de contrôle

```bash
DUMP=1 node build-pptx-editable.mjs index-anonyme.html out.pptx
node preview-pptx.mjs 1 3 9      # écrit preview-NN.png
```

LibreOffice ne fonctionne pas dans tous les environnements. Cet aperçu
redessine la géométrie mesurée avec les jumeaux métriques : ce qu'il montre
est ce que PowerPoint affichera.

## Relire à l'écran

```bash
npm run serve        # http://localhost:8080
```

Ouvrir directement `index.html` dans un navigateur fonctionne aussi. Le deck
se met automatiquement à l'échelle de la fenêtre.

## Vérifier les mises en page

```bash
node check-overflow.mjs                      # le master
node check-overflow.mjs index-anonyme.html   # la version anonymisée
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
| `build-pptx.mjs` | Export PowerPoint, une image par diapositive. |
| `build-pptx-editable.mjs` | Export PowerPoint natif, texte éditable. |
| `preview-pptx.mjs` | Aperçu de contrôle de l'export natif. |
| `check-overflow.mjs` | Contrôle des débordements. |
| `make-anonymous.mjs` | Dérive la version anonymisée. |

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
