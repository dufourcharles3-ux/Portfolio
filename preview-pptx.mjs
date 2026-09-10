#!/usr/bin/env node
/**
 * Aperçu de contrôle du PowerPoint éditable.
 *
 *   DUMP=1 node build-pptx-editable.mjs <src.html> <out.pptx>
 *   node preview-pptx.mjs 1 3 14
 *
 * LibreOffice ne fonctionne pas dans tous les environnements ; cet aperçu
 * redessine la géométrie mesurée avec Carlito et Caladea, jumeaux métriques
 * exacts de Calibri et Cambria. Ce qu'il montre est donc ce que PowerPoint
 * affichera, aux particularités de son moteur de texte près.
 */
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const slides = JSON.parse(readFileSync(resolve(HERE, "layout.json"), "utf8"));
const want = process.argv.slice(2).map(Number).filter(Boolean);
const pick = want.length ? want : slides.map((_, i) => i + 1);

const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const html = `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:QASans;src:url("assets/fonts/qa/calibri-400.woff2");font-weight:400}
@font-face{font-family:QASans;src:url("assets/fonts/qa/calibri-700.woff2");font-weight:700}
@font-face{font-family:QASerif;src:url("assets/fonts/qa/cambria-400i.woff2");font-style:italic}
body{margin:0;background:#222}
.s{position:relative;width:1920px;height:1080px;overflow:hidden;margin:0 auto 30px}
.s > *{position:absolute;box-sizing:border-box;margin:0}
.t{font-family:QASans,sans-serif;white-space:pre-wrap;word-wrap:break-word}
.t em{font-family:QASerif,serif;font-style:italic;font-weight:400}
</style>
${pick.map((n) => {
  const s = slides[n - 1];
  const px = (v) => v.toFixed(2) + "px";
  const parts = [];
  for (const b of s.boxes)
    parts.push(`<div style="left:${px(b.x)};top:${px(b.y)};width:${px(b.w)};height:${px(b.h)};`
      + `background:${b.fill ? "#" + b.fill : "transparent"};`
      + `border-radius:${px(b.radius)};`
      + (b.line?.color ? `border:${b.line.w}px solid #${b.line.color};` : "") + `"></div>`);
  for (const l of s.lines)
    parts.push(`<div style="left:${px(l.x)};top:${px(l.y)};width:${px(Math.max(l.w, l.t))};`
      + `height:${px(Math.max(l.h, l.t))};background:#${l.color}"></div>`);
  for (const im of s.images)
    parts.push(`<img src="${im.src}" style="left:${px(im.x)};top:${px(im.y)};`
      + `width:${px(im.w)};height:${px(im.h)};object-fit:${im.cover ? "cover" : "fill"}">`);
  for (const t of s.texts) {
    const inner = t.segs.map((g) => g.br ? "<br>"
      : `<span style="${g.em ? "font-family:QASerif;font-style:italic;font-weight:400;" : ""}`
        + `${g.size ? `font-size:${px(g.size)};` : ""}">${esc(t.upper ? g.t.toUpperCase() : g.t)}</span>`).join("");
    parts.push(`<div class="t" style="left:${px(t.x)};top:${px(t.y)};width:${px(t.w + 8)};`
      + `font-size:${px(t.size)};line-height:${px(t.size * t.lh)};`
      + `font-weight:${t.bold ? 700 : 400};color:#${t.color};text-align:${t.align};`
      + `letter-spacing:${px(t.spacing || 0)}">${inner}</div>`);
  }
  return `<div class="s" style="background:#${s.bg}">${parts.join("")}</div>`;
}).join("\n")}`;

const out = resolve(HERE, "preview-pptx.html");
writeFileSync(out, html, "utf8");

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await p.goto(pathToFileURL(out).href, { waitUntil: "load" });
await p.evaluate(() => document.fonts.ready);
const els = await p.$$(".s");
for (const [i, el] of els.entries()) {
  const n = pick[i];
  await el.screenshot({ path: resolve(HERE, `preview-${String(n).padStart(2, "0")}.png`) });
}
await b.close();
console.log(`  ${els.length} apercu(s) ecrit(s) : preview-NN.png`);
