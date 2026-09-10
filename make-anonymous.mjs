#!/usr/bin/env node
/**
 * Produit une version anonymisée du portfolio.
 *
 *   node make-anonymous.mjs        ->  index-anonyme.html
 *
 * index.html reste la source nominative. Ce script en dérive une copie
 * expurgée : les modifications de contenu faites sur le master se
 * répercutent au prochain lancement, il n'y a pas deux documents à
 * maintenir en parallèle.
 *
 * Sont retirés : le nom, le site, l'email, le téléphone, le LinkedIn, le
 * monogramme, la slide de contact, et le portrait photographique. Les noms
 * de clients et d'employeurs sont conservés : ils font la valeur du dossier
 * et ne sont pas des données personnelles du candidat.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(HERE, process.argv[2] ?? "index.html");
const OUT = resolve(HERE, process.argv[3] ?? "index-anonyme.html");

let s = readFileSync(SRC, "utf8");
const done = [];

/** Remplace un motif unique, ou échoue bruyamment. */
function sub(label, old, next) {
  const n = s.split(old).length - 1;
  if (n !== 1) {
    console.error(`\n  ÉCHEC : "${label}" — motif trouvé ${n} fois, attendu 1.`);
    console.error("  Le master a changé ; ajuste make-anonymous.mjs.\n");
    process.exit(1);
  }
  s = s.replace(old, next);
  done.push(label);
}

// ---------------------------------------------------------------- Métadonnées
// Le titre du document devient le titre du PDF : sans cela, le nom
// réapparaît dans les propriétés du fichier et dans l'onglet du lecteur.
sub("titre du document",
  "<title>Portfolio Charles Dufour, Brand Designer / UI Designer</title>",
  "<title>Portfolio, Brand Designer / UI Designer</title>");

sub("métadonnée auteur",
  '<meta name="author" content="Charles Dufour" />\n',
  "");

sub("métadonnée description",
  '<meta name="description" content="Portfolio Charles Dufour, Brand Designer / UI Designer, 8 ans a la croisee de la marque et de l\'interface." />',
  '<meta name="description" content="Portfolio, Brand Designer / UI Designer, 8 ans a la croisee de la marque et de l\'interface." />');

// -------------------------------------------------------------- 01 Couverture
// Le portrait disparaissant, la couverture repasse en pleine largeur
// plutôt que de laisser une demi-page vide. Le nom cède la place au
// positionnement, qui reprend le titre de la slide "À propos".
sub("couverture",
`    <div class="cover">
      <div class="left">
        <div style="display: flex; flex-direction: column; gap: 36px;">
          <span class="eyebrow" style="color: rgba(255,255,255,0.65);">Brand Designer / UI Designer</span>
          <h1 class="name">Charles<br/>Dufour</h1>
          <p class="role">Direction Artistique <em class="editorial" style="color: rgba(255,255,255,0.85);">×</em> UI Design<br/>8 ans d'expérience, en groupe média et en environnement produit</p>
        </div>

        <span class="baseline">charlesdufour.fr</span>
      </div>

      <div class="right">
        <img src="assets/portrait-charles.png" alt="Charles Dufour"
             style="width: 100%; height: 100%; object-fit: contain; object-position: bottom center; display: block;"/>
      </div>
    </div>`,
`    <div class="cover" style="grid-template-columns: 1fr;">
      <div class="left">
        <div style="display: flex; flex-direction: column; gap: 36px;">
          <span class="eyebrow" style="color: rgba(255,255,255,0.65);">Portfolio, Brand Designer / UI Designer</span>
          <h1 class="name">Marque<br/>&amp; interface.</h1>
          <p class="role">Direction Artistique <em class="editorial" style="color: rgba(255,255,255,0.85);">×</em> UI Design<br/>8 ans d'expérience, en groupe média et en environnement produit</p>
        </div>

        <span class="baseline">Profil anonymisé · 2026</span>
      </div>
    </div>`);

// ----------------------------------------------------------------- 03 À propos
// La grille passe de deux colonnes à une seule, et le texte récupère la
// largeur libérée par le portrait.
sub("à propos, grille",
  '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 100px; flex: 1; min-height: 0;">',
  '<div style="display: grid; grid-template-columns: 1fr; gap: 100px; flex: 1; min-height: 0;">');

sub("à propos, colonne portrait",
`        <div style="position: relative; border-radius: 14px; overflow: hidden; background: var(--primary-soft); min-height: 0; height: 100%;">
          <img src="assets/portrait-charles.png" alt="Charles Dufour" style="width: 100%; height: 100%; object-fit: contain; display: block;"/>
        </div>
`, "");

// Le chapô était contraint à 700px pour tenir dans une demi-page.
s = s.split('<p class="body" style="max-width: 700px;">').join('<p class="body" style="max-width: 1320px;">');
done.push("à propos, largeur du texte");

// ------------------------------------------------------------------ 38 Contact
const contactStart = s.indexOf('  <!-- ════════════ 28 CONTACT ════════════ -->');
const contactEnd = s.indexOf("</deck-stage>");
if (contactStart === -1 || contactEnd === -1 || contactEnd < contactStart) {
  console.error("\n  ÉCHEC : slide de contact introuvable.\n");
  process.exit(1);
}
s = s.slice(0, contactStart) + s.slice(contactEnd);
done.push("slide de contact supprimée");

// -------------------------------------------------------- Contrôle final
const forbidden = [
  "Charles", "charles", "Dufour", "dufour",
  "06 89 95 14 81", "charles-dufour-17068653",
  "gmail.com", "charlesdufour.fr",
];
const leaks = forbidden
  .map((t) => [t, s.split(t).length - 1])
  .filter(([, n]) => n > 0);

if (leaks.length) {
  console.error("\n  ÉCHEC : mentions identifiantes encore présentes :");
  for (const [t, n] of leaks) console.error(`    "${t}" x${n}`);
  console.error();
  process.exit(1);
}

writeFileSync(OUT, s, "utf8");

const slides = s.split("<section ").length - 1;
console.log(`\n  ${done.length} transformation(s) :`);
for (const d of done) console.log(`    - ${d}`);
console.log(`\n  Source   ${SRC}`);
console.log(`  Écrit    ${OUT}`);
console.log(`  Slides   ${slides}`);
console.log(`  Contrôle aucune mention identifiante résiduelle.\n`);
