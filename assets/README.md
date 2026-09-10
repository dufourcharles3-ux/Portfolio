# Visuels du portfolio

Chaque fichier listé ci-dessous est référencé par `index.html`.
Tant qu'un fichier est absent, la slide affiche un cadre nommé à sa place :
la mise en page reste juste, et le PDF reste présentable.

Dépose les fichiers **aux chemins exacts** ci-dessous, puis relance :

```bash
npm run pdf
```

Le script liste en fin d'exécution les visuels encore manquants.

---

## Ce que tu m'as déjà envoyé en conversation

Les images collées dans le chat ne sont pas écrites sur le disque : il faut
les enregistrer toi-même sous ces noms. La colonne « correspondance » indique
quelle capture va où.

| Chemin | Correspondance |
|---|---|
| `portrait-charles.png` | Ton portrait noir et blanc sur aplat vert |
| `smartch/website.png` | Le site Smartch en pleine page (hero « Learning & Development », Philosophie, Méthodologie) |
| `smartch/presentations.png` | La mosaïque de slides Smartch (Proposition pédagogique, Onboarding, Upskilling) |
| `smartch/social-media.png` | La mosaïque de posts Smartch (« Nous recrutons », levée de 3 M€) |
| `envols/error-404.png` | La page 404 EnVols aux nuages |
| `envols/homepage.jpg` | L'article « New York, surfer la ville » |
| `envols/hero.png` | La section « À VISITER » avec le pavé 970 × 250 |
| `envols/social-covers.png` | La planche des 12 couvertures sociales EnVols |
| `envols/travel-guide-filters.jpg` | Le Travel Guide et ses filtres Quoi / Où / Quand / Combien |
| `autrice/hero.png` | La landing page Autrice en pleine hauteur |
| `autrice/presentations.jpg` | La planche « Soyez inspiré·e·s » |
| `autrice/bento-cards.png` | La planche « Scénarisez » (bibliothèque de composants) |
| `dior/01-registration-screens.png` | Les écrans d'inscription en perspective (POS selection, Learner infos) |
| `dior/02-confirmation-emails.png` | Les emails transactionnels au cadre toile de Jouy |
| `dior/03-registration-flow.png` | *(idem 01, ou un recadrage centré sur le tunnel)* |
| `dior/04-moderation-screens.png` | Les écrans « Learners waiting for moderation » |
| `dior/05-learner-mobile.png` | Les écrans Missions / Classement / Award points |
| `apm/dashboard.png` | L'accueil APM, desktop + mobile |
| `apm/club-responsive.png` | « Mon club », desktop + mobile |
| `pierrefabre/care-story-phone.png` | Le mockup téléphone #Care sur fond pêche |
| `pierrefabre/care-grid.png` | La série de 4 stories #Care |
| `pierrefabre/conscious-story-phone.png` | Le mockup téléphone #Conscious sur fond vert |
| `pierrefabre/conscious-grid.png` | La série de 4 stories #Conscious |

## Encore à produire

| Chemin | Attendu |
|---|---|
| `envols/immediate-boarding.png` | Le widget « Immediate Boarding » dans la grille éditoriale |
| `autrice/bento.png` | L'ancrage cognitif : abstractions UI et photos d'équipes |
| `autrice/social-content.jpg` | Les contenus réseaux sociaux Autrice |

---

## Recommandations techniques

- **Résolution** : vise ~2× la taille d'affichage. Les cadres les plus grands
  font environ 1000 × 800 px dans le deck, donc des exports autour de
  2000 px de large suffisent largement.
- **Format** : PNG pour les interfaces et les captures à aplats, JPG (qualité
  80–85) pour les photos. Les extensions des chemins ci-dessus doivent être
  respectées, ou bien modifiées dans `index.html`.
- **Cadrage** : la plupart des cadres sont en `object-fit: contain`, donc
  l'image est affichée entière, sans recadrage. Inutile de pré-rogner au
  format du cadre.
- **Portrait** : `portrait-charles.png` est posé sur un fond sombre
  (`--ink`) en couverture et sur la slide Contact. S'il a un fond blanc
  plein, il apparaîtra comme un rectangle blanc sur le navy. Un PNG
  détouré (fond transparent) est préférable — sinon, dis-le moi et je bascule
  ces deux colonnes sur un fond clair.
- **Poids** : le PDF final agrège toutes les images. Au-delà de ~15 Mo,
  certains webmails refusent la pièce jointe. Compresse en amont si besoin.
