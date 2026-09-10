#!/usr/bin/env node
/**
 * Génère un PowerPoint **éditable** à partir du deck HTML.
 *
 *   node build-pptx-editable.mjs [source.html] [sortie.pptx]
 *
 * Contrairement à build-pptx.mjs, qui pose une image par diapositive, ce
 * script reconstruit chaque slide en formes et zones de texte natives :
 * le texte est sélectionnable, modifiable et re-stylable dans PowerPoint.
 *
 * Principe
 * --------
 * La géométrie n'est pas ressaisie à la main : elle est mesurée sur le
 * rendu réel du document dans Chromium, puis convertie. La conversion est
 * exacte, le deck étant dessiné en 1920 × 1080 pour une diapositive 16:9 :
 *
 *     1920 px  =  13,333 pouces        donc  1 px = 13,333/1920 pouce
 *     1920 px  =  960 points           donc  1 px = 0,5 pt
 *
 * Substitutions typographiques
 * ----------------------------
 * DM Sans, DM Mono et Instrument Serif sont des polices Google : absentes
 * de la plupart des postes, PowerPoint les remplacerait par n'importe
 * quoi, avec des largeurs différentes et donc des débordements. On leur
 * substitue des polices livrées avec Office :
 *
 *     DM Sans, DM Mono   ->  Calibri
 *     Instrument Serif   ->  Cambria (italique)
 *
 * C'est la concession assumée de cette version : la lettre change, la
 * mise en page et la hiérarchie sont préservées.
 */
import { chromium } from "playwright";
import PptxGenJS from "pptxgenjs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { statSync } from "node:fs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(HERE, process.argv[2] ?? "index.html");
const OUT = resolve(HERE, process.argv[3] ?? "Portfolio-editable.pptx");

const DESIGN_W = 1920;
const DESIGN_H = 1080;
const IN_W = 13.333;
const IN_H = 7.5;

const IN = (px) => (px * IN_W) / DESIGN_W; // px de maquette -> pouces
const PT = (px) => px / 2;                 // px de maquette -> points

const SANS = "Calibri";
const SERIF = "Cambria";

// ---------------------------------------------------------------------------
// 1. Mesure du rendu
// ---------------------------------------------------------------------------
// --allow-file-access-from-files : sans ce drapeau, une page file:// qui
// dessine une image file:// dans un canvas le rend "tainted", et l'export
// du canvas est refusé. C'est ce mécanisme qui sert au rééchantillonnage.
const browser = await chromium.launch({ args: ["--allow-file-access-from-files"] });
const page = await browser.newPage({ viewport: { width: DESIGN_W, height: DESIGN_H } });
await page.goto(pathToFileURL(SRC).href, { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.waitForFunction(
  () => document.documentElement.dataset.assetsReady === "1",
  null, { timeout: 30_000 },
);
await page.evaluate(() => { document.querySelector("deck-stage").style.zoom = 1; });

const slides = await page.evaluate(() => {
  const hex = (c) => {
    const m = /rgba?\(([^)]+)\)/.exec(c || "");
    if (!m) return null;
    const [r, g, b, a = "1"] = m[1].split(",").map((s) => s.trim());
    if (parseFloat(a) < 0.06) return null;
    return [r, g, b].map((v) => (+v).toString(16).padStart(2, "0")).join("").toUpperCase();
  };
  const alpha = (c) => {
    const m = /rgba\(([^)]+)\)/.exec(c || "");
    return m ? parseFloat(m[1].split(",")[3] ?? "1") : 1;
  };

  const INLINE = new Set(["EM", "BR", "SPAN", "STRONG", "B", "I", "A", "SUP", "SUB"]);

  return [...document.querySelectorAll("deck-stage > section")].map((sec) => {
    const base = sec.getBoundingClientRect();
    const boxes = [], images = [], texts = [], lines = [];

    const rectOf = (el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height };
    };

    // Découpe le contenu d'un élément en segments : texte courant, sauts de
    // ligne, et emphases éditoriales (rendues en serif italique).
    const runs = (el) => {
      const out = [];
      const base = parseFloat(getComputedStyle(el).fontSize);
      const push = (t, em, size) => {
        if (t) out.push({ t, em, ...(Math.abs(size - base) > 0.5 ? { size } : {}) });
      };
      const walk = (n, em, size) => {
        for (const c of n.childNodes) {
          if (c.nodeType === 3) push(c.textContent.replace(/\s+/g, " "), em, size);
          else if (c.tagName === "BR") out.push({ br: true });
          else if (c.nodeType === 1) {
            const cs2 = getComputedStyle(c);
            walk(c, em || (c.tagName === "EM" && c.classList.contains("editorial")),
                 parseFloat(cs2.fontSize) || size);
          }
        }
      };
      walk(el, false, base);
      return out;
    };

    const visit = (el) => {
      for (const ch of el.children) {
        if (ch.classList?.contains("nav-strip")) continue;
        const cs = getComputedStyle(ch);
        if (cs.display === "none" || cs.visibility === "hidden") continue;
        const r = rectOf(ch);
        if (r.w < 1 || r.h < 1) continue;

        // Fond et bordure : un rectangle à dessiner sous le contenu.
        const fill = hex(cs.backgroundColor);
        const bw = parseFloat(cs.borderTopWidth) || 0;
        const bAll = ["Top", "Right", "Bottom", "Left"]
          .every((s) => parseFloat(cs[`border${s}Width`]) > 0);
        if (fill || (bw && bAll)) {
          boxes.push({
            ...r, fill,
            line: bAll && bw ? { color: hex(cs.borderTopColor), w: bw } : null,
            radius: parseFloat(cs.borderTopLeftRadius) || 0,
            alpha: 1 - alpha(cs.backgroundColor),
          });
        }
        // Filet : une seule bordure, très utilisée comme séparateur.
        if (!bAll) {
          for (const [side, dx, dy, dw, dh] of [
            ["Top", 0, 0, r.w, 0], ["Bottom", 0, r.h, r.w, 0],
            ["Left", 0, 0, 0, r.h], ["Right", r.w, 0, 0, r.h],
          ]) {
            const t = parseFloat(cs[`border${side}Width`]) || 0;
            if (t > 0) lines.push({ x: r.x + dx, y: r.y + dy, w: dw, h: dh,
                                    color: hex(cs[`border${side}Color`]) || "DDDDDD", t });
          }
        }

        if (ch.tagName === "IMG") {
          // object-fit: contain -> l'image dessinée est plus petite que sa boîte.
          const nw = ch.naturalWidth, nh = ch.naturalHeight;
          let box = { ...r };
          if (cs.objectFit === "contain" && nw && nh) {
            const s = Math.min(r.w / nw, r.h / nh);
            const w = nw * s, h = nh * s;
            let ox = (r.w - w) / 2, oy = (r.h - h) / 2;
            if (cs.objectPosition.includes("bottom")) oy = r.h - h;
            if (cs.objectPosition.includes("top")) oy = 0;
            box = { x: r.x + ox, y: r.y + oy, w, h };
          }
          images.push({ ...box, src: ch.getAttribute("src"),
                        cover: cs.objectFit === "cover", clip: r });
          continue;
        }

        const blockKids = [...ch.children].filter((k) => !INLINE.has(k.tagName));
        if (blockKids.length) { visit(ch); continue; }

        const segs = runs(ch);
        if (!segs.some((s) => s.t && s.t.trim())) continue;
        const fs = parseFloat(cs.fontSize);
        const lhRaw = cs.lineHeight;
        const lh = lhRaw === "normal" ? fs * 1.2 : parseFloat(lhRaw);
        texts.push({
          ...r, segs,
          size: fs,
          lh: lh / fs,
          bold: parseInt(cs.fontWeight, 10) >= 600,
          color: hex(cs.color) || "000000",
          align: cs.textAlign === "start" ? "left" : cs.textAlign,
          upper: cs.textTransform === "uppercase",
          spacing: parseFloat(cs.letterSpacing) || 0,
        });
      }
    };
    visit(sec);

    return {
      label: sec.getAttribute("data-label"),
      bg: hex(getComputedStyle(sec).backgroundColor) || "FFFFFF",
      boxes, lines, images, texts,
    };
  });
});

// ---------------------------------------------------------------------------
// 1 bis. Contrôle de débordement
// Calibri n'a pas les chasses de DM Sans : un texte qui tenait sur deux
// lignes peut en prendre trois et sortir de sa boîte. On remesure chaque
// bloc avec Carlito et Caladea, jumeaux métriques exacts de Calibri et
// Cambria, dans la largeur que la zone de texte aura réellement.
const overflows = await page.evaluate(async ({ slides, pad }) => {
  const css = `
    @font-face{font-family:QASans;src:url("assets/fonts/qa/calibri-400.woff2");font-weight:400}
    @font-face{font-family:QASans;src:url("assets/fonts/qa/calibri-700.woff2");font-weight:700}
    @font-face{font-family:QASerif;src:url("assets/fonts/qa/cambria-400i.woff2");font-style:italic}`;
  const st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);
  await document.fonts.load('400 20px QASans');
  await document.fonts.load('700 20px QASans');
  await document.fonts.load('italic 20px QASerif');

  const probe = document.createElement("div");
  Object.assign(probe.style, {
    position: "fixed", left: "-9999px", top: "0", visibility: "hidden",
    whiteSpace: "pre-wrap", wordWrap: "break-word", boxSizing: "border-box",
  });
  document.body.appendChild(probe);

  const out = [];
  slides.forEach((s, si) => {
    for (const t of s.texts) {
      probe.style.width = (t.w + pad) + "px";
      probe.style.fontSize = t.size + "px";
      // Interligne géant : scrollHeight / 1000 donne le nombre de lignes
      // sans être faussé par le débordement des glyphes hors de leur ligne.
      probe.style.lineHeight = "1000px";
      probe.style.fontWeight = t.bold ? "700" : "400";
      probe.style.letterSpacing = (t.spacing || 0) + "px";
      probe.innerHTML = "";
      for (const seg of t.segs) {
        if (seg.br) { probe.appendChild(document.createElement("br")); continue; }
        const sp = document.createElement("span");
        sp.textContent = t.upper ? seg.t.toUpperCase() : seg.t;
        sp.style.fontFamily = seg.em ? "QASerif" : "QASans";
        sp.style.fontStyle = seg.em ? "italic" : "normal";
        if (seg.size) sp.style.fontSize = seg.size + "px";
        probe.appendChild(sp);
      }
      const lines = Math.max(1, Math.round(probe.scrollHeight / 1000));
      // L'interligne sera imposé en points, donc identique quelle que soit
      // la police : la hauteur requise est exactement lignes x interligne.
      const need = lines * t.size * t.lh;
      t.need = need;
      t.lines = lines;
      const have = t.h + 6;
      if (need <= have + 2) continue;

      // PowerPoint ne rogne pas une zone de texte : un dépassement n'est
      // un vrai défaut que s'il vient recouvrir l'élément du dessous.
      const bottom = t.y + need;
      const hits = (o) => {
        const oy = o.y ?? o.y;
        if (oy < t.y + t.h + 2 || oy >= bottom) return false;      // pas dans la zone gagnée
        return !(o.x + o.w <= t.x + 2 || o.x >= t.x + t.w - 2);    // et à l'aplomb
      };
      const victim = [...s.texts.filter((o) => o !== t), ...s.images, ...s.boxes].find(hits);
      if (victim) {
        out.push({ slide: si + 1, label: s.label, need: Math.round(need),
                   have: Math.round(have), text: probe.textContent.slice(0, 46),
                   over: Math.round(bottom - (t.y + t.h)) });
      }
    }
  });
  probe.remove();
  return out;
}, { slides, pad: 8 });

// ---------------------------------------------------------------------------
// 1 ter. Rééchantillonnage des visuels
// Les sources font jusqu'à 2500 px de large pour un affichage de 700 px.
// Embarquées telles quelles, elles portaient le fichier à 38 Mo. On les
// réencode à deux fois leur taille d'affichage, ce qui reste au-delà de ce
// qu'un vidéoprojecteur ou une impression exploitent.
const encoded = await page.evaluate(async (jobs) => {
  const out = {};
  for (const j of jobs) {
    const img = new Image();
    img.src = j.src;
    try { await img.decode(); } catch { continue; }
    const scale = Math.min(1, (j.w * 2) / img.naturalWidth);
    const cw = Math.max(1, Math.round(img.naturalWidth * scale));
    const chh = Math.max(1, Math.round(img.naturalHeight * scale));
    const c = document.createElement("canvas");
    c.width = cw; c.height = chh;
    const ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0, cw, chh);

    // La transparence impose le PNG : en JPEG, le fond deviendrait noir.
    let alpha = false;
    try {
      const d = ctx.getImageData(0, 0, cw, chh).data;
      for (let i = 3; i < d.length; i += 4 * 97) { if (d[i] < 250) { alpha = true; break; } }
    } catch { alpha = true; }

    out[j.src] = alpha ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", 0.82);
  }
  return out;
}, [...new Map(slides.flatMap((s) => s.images).map((i) => [i.src, i])).values()]
     .map((i) => ({ src: i.src, w: Math.round(i.w) })));

const meta = await page.evaluate(() => ({
  title: document.title || "",
  author: document.querySelector('meta[name="author"]')?.content || "",
}));
await browser.close();

// ---------------------------------------------------------------------------
// 2. Génération du PowerPoint
// ---------------------------------------------------------------------------
// Trace de la géométrie mesurée, pour l'aperçu de contrôle (preview-pptx.mjs).
if (process.env.DUMP) {
  const { writeFileSync } = await import("node:fs");
  writeFileSync(resolve(HERE, "layout.json"), JSON.stringify(slides));
  console.log("  layout.json ecrit");
}

const pptx = new PptxGenJS();
pptx.defineLayout({ name: "PORTFOLIO_16x9", width: IN_W, height: IN_H });
pptx.layout = "PORTFOLIO_16x9";
pptx.title = meta.title;
pptx.subject = meta.title;
pptx.author = meta.author;
pptx.company = meta.author;

let missing = 0, shapes = 0;

for (const s of slides) {
  const slide = pptx.addSlide();
  slide.background = { color: s.bg };
  if (s.label) slide.addNotes(s.label.replace(/&amp;/g, "&"));

  // Fonds et cartes.
  for (const b of s.boxes) {
    slide.addShape(b.radius > 6 ? pptx.ShapeType.roundRect : pptx.ShapeType.rect, {
      x: IN(b.x), y: IN(b.y), w: IN(b.w), h: IN(b.h),
      fill: b.fill ? { color: b.fill } : { type: "none" },
      line: b.line?.color ? { color: b.line.color, width: Math.max(0.5, PT(b.line.w)) }
                          : { type: "none" },
      ...(b.radius > 6 ? { rectRadius: Math.min(IN(b.radius), IN(b.h) / 2) } : {}),
    });
    shapes++;
  }

  // Filets de séparation.
  for (const l of s.lines) {
    slide.addShape(pptx.ShapeType.rect, {
      x: IN(l.x), y: IN(l.y),
      w: Math.max(IN(l.w), 0.005), h: Math.max(IN(l.h), IN(l.t)),
      fill: { color: l.color }, line: { type: "none" },
    });
    shapes++;
  }

  // Visuels.
  for (const im of s.images) {
    const dataUrl = encoded[im.src];
    if (!dataUrl) { missing++; continue; }
    slide.addImage({
      // pptxgenjs attend "<mime>;base64,..." sans le prefixe "data:".
      data: dataUrl.replace(/^data:/, ""),
      x: IN(im.x), y: IN(im.y), w: IN(im.w), h: IN(im.h),
      ...(im.cover ? { sizing: { type: "cover", w: IN(im.clip.w), h: IN(im.clip.h) } } : {}),
    });
    shapes++;
  }

  // Textes, en zones de texte natives.
  for (const t of s.texts) {
    const runsOut = [];
    for (const seg of t.segs) {
      if (seg.br) {
        if (runsOut.length) runsOut[runsOut.length - 1].options.breakLine = true;
        continue;
      }
      const text = t.upper ? seg.t.toUpperCase() : seg.t;
      runsOut.push({
        text,
        options: {
          fontFace: seg.em ? SERIF : SANS,
          fontSize: PT(seg.size ?? t.size),
          bold: seg.em ? false : t.bold,
          italic: !!seg.em,
          color: t.color,
          charSpacing: t.spacing ? PT(t.spacing) : undefined,
        },
      });
    }
    if (!runsOut.length) continue;

    slide.addText(runsOut, {
      x: IN(t.x), y: IN(t.y),
      // Un peu de marge : Calibri n'a pas exactement les chasses de DM Sans.
      w: Math.min(IN(t.w) + 0.06, IN_W - IN(t.x)),
      h: IN(Math.max(t.h, t.need ?? t.h)) + 0.04,
      align: t.align || "left",
      valign: "top",
      margin: 0,
      isTextBox: true,
      // lineSpacingMultiple serait recalculé par PowerPoint d'après les
      // métriques de la police : Calibri donnerait une ligne plus haute que
      // DM Sans. En points, l'interligne de la maquette est reproduit tel quel.
      lineSpacing: PT(t.size * t.lh),
      wrap: true,
    });
    shapes++;
  }
}

await pptx.writeFile({ fileName: OUT });

const mb = (statSync(OUT).size / 1024 / 1024).toFixed(1);
console.log(`\n  Source   ${SRC}`);
console.log(`  PPTX     ${OUT}  (${mb} Mo)`);
console.log(`  Slides   ${slides.length}`);
console.log(`  Objets   ${shapes} (formes, filets, images, zones de texte)`);
console.log(`  Polices  ${SANS} (texte), ${SERIF} italique (accents éditoriaux)`);
if (missing) console.log(`  Visuels manquants : ${missing}`);

if (overflows.length) {
  console.log(`\n  ${overflows.length} collision(s) de texte apres substitution :`);
  for (const o of overflows.slice(0, 25)) {
    console.log(`    p${String(o.slide).padStart(2, "0")} ${o.label}`);
    console.log(`        deborde de ${o.over}px sur l'element dessous  "${o.text}"`);
  }
} else {
  console.log(`  Collisions   aucune, mesure avec les metriques Calibri et Cambria`);
}
console.log();
