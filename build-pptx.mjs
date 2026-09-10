#!/usr/bin/env node
/**
 * Génère le PowerPoint du portfolio à partir du deck HTML.
 *
 *   node build-pptx.mjs [source.html] [sortie.pptx]
 *
 * Chaque slide est rendue par Chromium en 1920 × 1080, puis posée en
 * pleine page sur une diapositive 16:9. Le rendu est donc identique au
 * PDF, au pixel près.
 *
 * Conséquence à connaître : le texte n'est pas éditable dans PowerPoint.
 * C'est le prix d'une mise en page sur mesure — la reconstruire en formes
 * et zones de texte natives dégraderait la composition (grilles, italiques
 * Instrument Serif, cadrages d'images) sans la rendre vraiment modifiable.
 */
import { chromium } from "playwright";
import PptxGenJS from "pptxgenjs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve, basename } from "node:path";
import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(HERE, process.argv[2] ?? "index.html");
const OUT = resolve(HERE, process.argv[3] ?? "Portfolio-Charles-Dufour.pptx");

const W = 1920;
const H = 1080;
// Format 16:9 de PowerPoint : 13,333 × 7,5 pouces.
// LAYOUT_WIDE vaut 13,3 × 7,5, soit un rapport de 1,7733 au lieu de
// 1,7778 : l'image serait très légèrement étirée. On déclare donc la
// taille exacte.
const IN_W = 13.333;
const IN_H = 7.5;

const work = mkdtempSync(join(tmpdir(), "deck-"));

try {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H } });

  await page.goto(pathToFileURL(SRC).href, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(
    () => document.documentElement.dataset.assetsReady === "1",
    null,
    { timeout: 30_000 },
  );
  // Le deck se met à l'échelle de la fenêtre pour la lecture écran ;
  // on rétablit l'échelle 1:1 avant de capturer.
  await page.evaluate(() => { document.querySelector("deck-stage").style.zoom = 1; });

  const sections = await page.$$("deck-stage > section");
  const labels = await page.evaluate(() =>
    [...document.querySelectorAll("deck-stage > section")]
      .map((s) => s.getAttribute("data-label") ?? ""),
  );

  // Les propriétés du fichier sont reprises du document : la version
  // anonymisée n'ayant pas de balise auteur, elle produit un PPTX sans
  // auteur, sans cas particulier à traiter ici.
  const meta = await page.evaluate(() => ({
    title: document.title || "",
    author: document.querySelector('meta[name="author"]')?.content || "",
  }));

  const shots = [];
  for (const [i, sec] of sections.entries()) {
    const file = join(work, `s${String(i + 1).padStart(2, "0")}.jpg`);
    await sec.screenshot({ path: file, type: "jpeg", quality: 90 });
    shots.push(file);
    process.stdout.write(`\r  rendu ${i + 1}/${sections.length}`);
  }
  process.stdout.write("\n");
  await browser.close();

  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "PORTFOLIO_16x9", width: IN_W, height: IN_H });
  pptx.layout = "PORTFOLIO_16x9";
  pptx.title = meta.title;
  pptx.subject = meta.title;
  // pptxgenjs inscrit "PptxGenJS" par défaut dans l'auteur et la société.
  pptx.author = meta.author;
  pptx.company = meta.author;

  shots.forEach((file, i) => {
    const slide = pptx.addSlide();
    slide.addImage({ path: file, x: 0, y: 0, w: IN_W, h: IN_H });
    // Le libellé de section sert de repère dans le mode Plan et dans
    // le volet commentaires ; il ne s'affiche pas sur la diapositive.
    const label = labels[i].replace(/&amp;/g, "&");
    if (label) slide.addNotes(label);
  });

  await pptx.writeFile({ fileName: OUT });

  const mb = (statSync(OUT).size / 1024 / 1024).toFixed(1);
  console.log(`\n  Source   ${SRC}`);
  console.log(`  PPTX     ${OUT}  (${mb} Mo)`);
  console.log(`  Slides   ${shots.length}, en 16:9 (${IN_W}" × ${IN_H}")`);
  console.log(`  Note     images pleine page, texte non éditable\n`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
