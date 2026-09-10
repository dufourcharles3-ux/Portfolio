#!/usr/bin/env node
/**
 * Génère le PDF du portfolio à partir de index.html.
 *
 *   node build-pdf.mjs [source.html] [sortie.pdf]
 *
 * Le deck est dessiné en 1920x1080 : chaque <section> devient une page
 * du PDF, au format paysage, sans marge.
 */
import { chromium } from "playwright";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { statSync } from "node:fs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(HERE, process.argv[2] ?? "index.html");
const OUT = resolve(HERE, process.argv[3] ?? "Portfolio-Charles-Dufour.pdf");

const WIDTH = 1920;
const HEIGHT = 1080;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 2,
});

const problems = [];
page.on("pageerror", (e) => problems.push(`erreur JS : ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error") problems.push(`console : ${m.text()}`);
});

await page.goto(pathToFileURL(SRC).href, { waitUntil: "load" });

// Les polices sont locales : on attend leur résolution effective avant
// de rasteriser, sinon la première page peut partir en fonte de repli.
await page.evaluate(() => document.fonts.ready);

// Le script de page signale qu'il a statué sur chaque image (chargée,
// ou remplacée par un cadre nommé).
await page.waitForFunction(
  () => document.documentElement.dataset.assetsReady === "1",
  null,
  { timeout: 30_000 },
);

const { sections, missing } = await page.evaluate(() => ({
  sections: document.querySelectorAll("deck-stage > section").length,
  missing: window.__assetsMissing ?? [],
}));

await page.pdf({
  path: OUT,
  width: `${WIDTH}px`,
  height: `${HEIGHT}px`,
  printBackground: true,
  preferCSSPageSize: true,
});

await browser.close();

const mb = (statSync(OUT).size / 1024 / 1024).toFixed(1);
console.log(`\n  Source   ${SRC}`);
console.log(`  PDF      ${OUT}  (${mb} Mo)`);
console.log(`  Slides   ${sections}`);

if (missing.length) {
  console.log(`\n  ${missing.length} visuel(s) manquant(s), remplacés par un cadre nommé :`);
  for (const m of [...new Set(missing)].sort()) console.log(`    - ${m}`);
}
if (problems.length) {
  console.log(`\n  ${problems.length} avertissement(s) :`);
  for (const p of [...new Set(problems)]) console.log(`    - ${p}`);
}
console.log();
