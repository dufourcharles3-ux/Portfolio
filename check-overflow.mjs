#!/usr/bin/env node
/** Signale les slides dont le contenu deborde du cadre 1920x1080. */
import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await p.goto(pathToFileURL(resolve(HERE, process.argv[2] ?? "index.html")).href, { waitUntil: "load" });
await p.evaluate(() => document.fonts.ready);
await p.waitForFunction(() => document.documentElement.dataset.assetsReady === "1");
await p.evaluate(() => { document.querySelector("deck-stage").style.zoom = 1; });

const total = await p.evaluate(() => document.querySelectorAll("deck-stage > section").length);

const bad = await p.evaluate(() => {
  const out = [];
  document.querySelectorAll("deck-stage > section").forEach((sec, i) => {
    const secBox = sec.getBoundingClientRect();
    let maxB = 0, maxR = 0, culprit = null;
    sec.querySelectorAll("*").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (!r.width && !r.height) return;
      const bottom = r.bottom - secBox.top;
      const right = r.right - secBox.left;
      if (bottom > maxB) { maxB = bottom; culprit = el; }
      if (right > maxR) maxR = right;
    });
    if (maxB > 1081 || maxR > 1921) {
      out.push({
        n: i + 1,
        label: sec.getAttribute("data-label"),
        bottom: Math.round(maxB),
        right: Math.round(maxR),
        el: culprit ? (culprit.className || culprit.tagName).toString().slice(0, 48) : "",
        text: culprit ? (culprit.textContent || "").trim().slice(0, 50) : "",
      });
    }
  });
  return out;
});
await b.close();

if (!bad.length) { console.log(`\n  Aucun debordement. Les ${total} slides tiennent dans 1920x1080.\n`); }
else {
  console.log(`\n  ${bad.length} slide(s) en debordement :\n`);
  for (const s of bad) {
    console.log(`   p${String(s.n).padStart(2, "0")}  ${s.label}`);
    console.log(`         bas ${s.bottom}px / 1080   droite ${s.right}px / 1920`);
    console.log(`         -> ${s.el} "${s.text}"\n`);
  }
}
