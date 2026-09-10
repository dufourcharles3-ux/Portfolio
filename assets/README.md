# Visuels du portfolio

26 visuels sur les 43 présents sont référencés par `index.html`.
Le script d'export liste en fin d'exécution ceux qui manqueraient :

```bash
npm run pdf
```

## Correspondances non évidentes

Les fichiers ont été déposés sous des noms différents de ceux que le
document attendait. Plutôt que de renommer les fichiers, ce sont les
chemins dans `index.html` qui ont été alignés dessus :

| Slide | Fichier |
|---|---|
| 09, EnVols, contexte | `envols/hero.png` (page d'accueil, pavé 300 × 600) |
| 10, EnVols, architecture | `envols/sidebar-ads.png` (carrousel « À visiter », pavé 970 × 250) |
| 25, DIOR, tunnel d'inscription | `dior/flow-inscription.png` |
| 27, DIOR, apprenant mobile | `dior/06-missions-leaderboard.png` |
| 30, APM, contexte | `apm/home.png` |
| 31, APM, multi-écrans | `apm/club.png` |

## Visuels présents mais non utilisés

Ils ne sont référencés par aucune slide. À placer, ou à supprimer pour
alléger le dépôt.

**Un cas entier sans slides :** `safran/` (5 fichiers, 6,2 Mo). Safran
n'apparaît aujourd'hui que dans la timeline du parcours, comme client de
la période Smartch. Il y a là de quoi faire une étude de cas.

**Compléments possibles sur des cas existants :**

| Fichier | Piste |
|---|---|
| `apm/wireframes.png` | Une slide APM sur la phase de cadrage. Les wireframes sont une preuve de méthode que le deck ne montre nulle part. |
| `apm/actions.png` | Troisième écran responsive, en complément de `club.png`. |
| `dior/flow-moderation.png` | Le pendant du tunnel d'inscription, côté manager (slide 26). |
| `dior/flow-team-management.png`, `dior/flow-kpis.png` | Pilotage managérial, slide 26. |
| `dior/05-award-points.png` | Attribution de points, slide 27. |
| `envols/travel-guide-search.png` | Recherche directe du Travel Guide, slide 11. |
| `autrice/homepage.png` | Landing page complète, slide 19 ou 20. |
| `pierrefabre/care-instagram.png`, `care-story-sequence.png`, `care-testimonial.png`, `conscious-story-sequence.png` | Pierre Fabre n'a qu'une seule slide pour un cas assez riche. |

## Poids

Le PDF pèse actuellement **28 à 30 Mo**, ce qui dépasse la limite de pièce
jointe de Gmail (25 Mo). Trois options :

1. Passer par un lien (Drive, WeTransfer) plutôt qu'une pièce jointe.
2. Convertir en JPEG les PNG les plus lourds, qui sont des planches à
   dégradés mal servies par le PNG : `smartch/presentations.png` (5,8 Mo),
   `smartch/social-media.png` (4,6 Mo), `smartch/website.png` (3,5 Mo).
   À qualité 85, on gagne facilement un facteur 8.
3. Supprimer les 17 visuels non utilisés (17 Mo) : ils n'entrent pas dans
   le PDF, mais alourdissent le dépôt.

Les images sont affichées à 1760 px de large au maximum : au-delà de
2000 px de large, la résolution supplémentaire ne se voit pas et ne fait
que peser.

## Recommandations

- **Cadrage** : la plupart des cadres sont en `object-fit: contain`,
  l'image est donc affichée entière. Inutile de pré-rogner.
- **Portrait** : `portrait-charles.png` est posé sur un fond sombre en
  couverture et sur la slide Contact. S'il a un fond blanc plein, il
  apparaîtra comme un rectangle blanc sur le navy — un PNG détouré est
  préférable. Il est retiré de la version anonymisée.
