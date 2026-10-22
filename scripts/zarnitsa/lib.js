// lib.js — палитра, хелперы и обложка (R1) для документа «ЗАРНИЦА: реалистичный план»
"use strict";
const {
  Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
  AlignmentType, HeadingLevel, WidthType, BorderStyle, ShadingType,
  TableLayoutType, VerticalAlign,
} = require("docx");
const fs = require("fs");
const path = require("path");

// ── Палитра проекта (тёмная обложка + светлые таблицы) ──
const P = {
  bg: "1C1417",            // тёплый почти-чёрный («Мгла»)
  titleColor: "F5EFE6",
  subtitleColor: "C9BEB6",
  metaColor: "B3A79F",
  footerColor: "8A7E76",
  accent: "C05B4D",        // «обетный огонь» на тёмном фоне
  primary: "5E242C",       // заголовки на белых страницах (тёмное бордо)
  body: "000000",
  secondary: "6E6266",
  table: { headerBg: "7B2D35", headerText: "FFFFFF", accentLine: "7B2D35", innerLine: "D9CBCD", surface: "F7F2F2" },
};

const F_BODY = { ascii: "Times New Roman", hAnsi: "Times New Roman", eastAsia: "SimSun" };
const F_HEAD = { ascii: "Arial", hAnsi: "Arial", eastAsia: "SimHei" };

const NB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: NB, bottom: NB, left: NB, right: NB };
const allNoBorders = { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB };

function safeText(v, ph) {
  if (v === undefined || v === null || v === "" || String(v) === "NaN" || String(v) === "undefined") {
    return ph || "【уточнить】";
  }
  return String(v);
}

// ── Текстовые хелперы ──
function runsOf(text, base) {
  // text: string | Array<{t, b?, i?, c?, sz?}>
  if (Array.isArray(text)) {
    return text.map(seg => new TextRun({
      text: safeText(seg.t, " "),
      bold: !!seg.b, italics: !!seg.i,
      color: seg.c || base.color, size: seg.sz || base.size,
      font: base.font,
    }));
  }
  return [new TextRun({ text: safeText(text, " "), bold: !!base.bold, italics: !!base.italics, color: base.color, size: base.size, font: base.font })];
}

// Абзац основного текста: выравнивание по ширине, отступ первой строки 1,25 см
function para(text, opts = {}) {
  return new Paragraph({
    alignment: opts.align || AlignmentType.JUSTIFIED,
    indent: opts.noIndent ? undefined : { firstLine: 709 },
    spacing: { line: 312, after: opts.after !== undefined ? opts.after : 120, before: opts.before || 0 },
    keepNext: !!opts.keepNext,
    children: runsOf(text, { color: P.body, size: opts.size || 24, font: F_BODY, bold: opts.bold, italics: opts.italics }),
  });
}

// Маркированный пункт: без выключки, без отступа первой строки
function bullet(text, opts = {}) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    bullet: { level: opts.level || 0 },
    spacing: { line: 312, after: 60 },
    children: runsOf(text, { color: P.body, size: 24, font: F_BODY }),
  });
}

// Нумерованный пункт (уникальный reference на список)
function numItem(reference, text) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    numbering: { reference, level: 0 },
    spacing: { line: 312, after: 60 },
    children: runsOf(text, { color: P.body, size: 24, font: F_BODY }),
  });
}

// Цитата-акцент с левой бордовой линией
function quote(text) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    indent: { left: 480, right: 480 },
    spacing: { line: 312, before: 160, after: 200 },
    border: { left: { style: BorderStyle.SINGLE, size: 12, color: P.accent, space: 12 } },
    children: runsOf(text, { color: P.primary, size: 24, font: F_BODY, italics: true, bold: true }),
  });
}

// ── Заголовки ──
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
    keepNext: true,
    spacing: { before: 360, after: 160, line: 312 },
    children: [new TextRun({ text, bold: true, size: 32, color: P.primary, font: F_HEAD })],
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    alignment: AlignmentType.LEFT,
    keepNext: true,
    spacing: { before: 240, after: 120, line: 312 },
    children: [new TextRun({ text, bold: true, size: 30, color: P.primary, font: F_HEAD })],
  });
}
function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    alignment: AlignmentType.LEFT,
    keepNext: true,
    spacing: { before: 200, after: 100, line: 312 },
    children: [new TextRun({ text, bold: true, size: 28, color: P.primary, font: F_HEAD })],
  });
}

// ── Таблицы (стиль «только горизонтальные линии», тёмно-бордовая шапка) ──
let TABLE_NO = 0;
function tbl(caption, headers, rows, widths, opts = {}) {
  TABLE_NO += 1;
  const capt = new Paragraph({
    alignment: AlignmentType.LEFT,
    keepNext: true,
    spacing: { before: 200, after: 80, line: 312 },
    children: [new TextRun({ text: `Таблица ${TABLE_NO} — ${caption}`, italics: true, size: 20, color: P.secondary, font: F_BODY })],
  });
  const headerRow = new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: headers.map((text, i) => new TableCell({
      width: { size: widths[i], type: WidthType.PERCENTAGE },
      shading: { type: ShadingType.CLEAR, fill: P.table.headerBg },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      verticalAlign: VerticalAlign.CENTER,
      children: [new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { line: 276 },
        children: [new TextRun({ text, bold: true, size: 20, color: P.table.headerText, font: F_HEAD })],
      })],
    })),
  });
  const dataRows = rows.map((r, ri) => new TableRow({
    cantSplit: true,
    children: r.map((cell, i) => new TableCell({
      width: { size: widths[i], type: WidthType.PERCENTAGE },
      shading: (opts.zebra && ri % 2 === 1)
        ? { type: ShadingType.CLEAR, fill: P.table.surface }
        : { type: ShadingType.CLEAR, fill: "FFFFFF" },
      margins: { top: 70, bottom: 70, left: 120, right: 120 },
      children: [new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { line: 276 },
        children: runsOf(cell, { color: P.body, size: 20, font: F_BODY }),
      })],
    })),
  }));
  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: P.table.accentLine },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: P.table.accentLine },
      left: NB, right: NB,
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: P.table.innerLine },
      insideVertical: NB,
    },
    rows: [headerRow, ...dataRows],
  });
  return [capt, table];
}

// ── Рисунки ──
let FIG_NO = 0;
const sizeMod = require("image-size");
const sizeOf = sizeMod.imageSize || sizeMod.default || sizeMod;
function fig(file, caption, displayWidth) {
  FIG_NO += 1;
  const buf = fs.readFileSync(file);
  const dims = sizeOf(buf);
  const w = displayWidth || 540;
  const h = Math.round(w * (dims.height / dims.width));
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      keepNext: true,
      spacing: { before: 200, after: 60 },
      children: [new ImageRun({ data: buf, transformation: { width: w, height: h }, type: "png" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200, line: 312 },
      children: [new TextRun({ text: `Рисунок ${FIG_NO} — ${caption}`, italics: true, size: 20, color: P.secondary, font: F_BODY })],
    }),
  ];
}

module.exports = {
  P, F_BODY, F_HEAD, NB, noBorders, allNoBorders,
  safeText, para, bullet, numItem, quote, h1, h2, h3, tbl, fig,
};

// ── Обложка: рецепт R1 (Pure Paragraph Left), ширина символов адаптирована под кириллицу ──
function estimateTextWidthTw(text, pt) {
  let width = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0);
    const isCJK = (code >= 0x4E00 && code <= 0x9FFF) || (code >= 0x3400 && code <= 0x4DBF) ||
      (code >= 0x3000 && code <= 0x303F) || (code >= 0xFF00 && code <= 0xFFEF);
    width += isCJK ? pt * 20 : pt * 11; // кириллица/латиница ~55% ширины CJK
  }
  return width;
}

// Перенос по словам (пробелам) — семантические границы для русского заголовка
function wrapWords(title, maxWidthTw, pt) {
  const words = title.split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    const probe = cur ? cur + " " + w : w;
    if (estimateTextWidthTw(probe, pt) <= maxWidthTw || !cur) {
      cur = probe;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  // защита от «висячего» короткого хвоста
  if (lines.length > 1 && lines[lines.length - 1].length <= 3) {
    const last = lines.pop();
    lines[lines.length - 1] += " " + last;
  }
  return lines;
}

function calcTitleLayout(title, maxWidthTwips, preferredPt = 40, minPt = 24) {
  let titlePt = preferredPt;
  let lines = wrapWords(title, maxWidthTwips, titlePt);
  while (titlePt > minPt && lines.length > 3) {
    titlePt -= 2;
    lines = wrapWords(title, maxWidthTwips, titlePt);
  }
  return { titlePt, titleLines: lines };
}

// calcCoverSpacing — из design-system.md (без изменений логики)
function calcCoverSpacing(params) {
  const {
    titleLineCount = 1, titlePt = 36, hasSubtitle = false,
    hasEnglishLabel = false, metaLineCount = 0,
    fixedHeight = 800, pageHeight = 16838,
    marginTop = 0, marginBottom = 0,
  } = params;
  const SAFETY = 1200;
  const usableHeight = pageHeight - marginTop - marginBottom - SAFETY;
  const titleHeight = titleLineCount * (titlePt * 23 + 200);
  const subtitleHeight = hasSubtitle ? (12 * 23 + 600) : 0;
  const englishLabelHeight = hasEnglishLabel ? (9 * 23 + 600) : 0;
  const metaHeight = metaLineCount * (10 * 23 + 100);
  const implicitParaHeight = 3 * 300;
  const contentHeight = titleHeight + subtitleHeight + englishLabelHeight +
    metaHeight + fixedHeight + implicitParaHeight;
  const remainingSpace = usableHeight - contentHeight;
  const safeRemaining = Math.max(remainingSpace, 400);
  const FOOTER_MIN = 800;
  const rawTop = Math.floor(safeRemaining * 0.45);
  const rawBottom = Math.floor(safeRemaining * 0.45);
  const bottomSpacing = Math.max(rawBottom, FOOTER_MIN);
  const topSpacing = Math.max(rawTop - Math.max(0, FOOTER_MIN - rawBottom), 400);
  const midSpacing = Math.max(safeRemaining - topSpacing - bottomSpacing, 0);
  return { topSpacing, midSpacing, bottomSpacing };
}

function buildCoverR1(config) {
  const p = config.palette;
  const padL = 1200, padR = 800;
  const availableWidth = 11906 - padL - padR - 300;
  const { titlePt, titleLines } = calcTitleLayout(config.title, availableWidth, 40, 24);
  const titleSize = titlePt * 2;
  const spacing = calcCoverSpacing({
    titleLineCount: titleLines.length, titlePt,
    hasSubtitle: !!config.subtitle, hasEnglishLabel: !!config.englishLabel,
    metaLineCount: (config.metaLines || []).length,
    fixedHeight: 400,
  });
  const accentLeft = { style: BorderStyle.SINGLE, size: 8, color: p.accent, space: 12 };
  const children = [];

  children.push(new Paragraph({ spacing: { before: spacing.topSpacing } }));

  if (config.englishLabel) {
    children.push(new Paragraph({
      indent: { left: padL, right: padR }, spacing: { after: 500 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: p.accent, space: 8 } },
      children: [new TextRun({
        text: config.englishLabel.split("").join("  "),
        size: 18, color: p.accent, font: { ascii: "Calibri", hAnsi: "Calibri", eastAsia: "SimHei" }, characterSpacing: 40,
      })],
    }));
  }

  for (let i = 0; i < titleLines.length; i++) {
    children.push(new Paragraph({
      indent: { left: padL },
      spacing: { after: i < titleLines.length - 1 ? 100 : 300, line: Math.ceil(titlePt * 23), lineRule: "atLeast" },
      children: [new TextRun({
        text: titleLines[i], size: titleSize, bold: true,
        color: p.titleColor, font: { ascii: "Arial", hAnsi: "Arial", eastAsia: "SimHei" },
      })],
    }));
  }

  if (config.subtitle) {
    children.push(new Paragraph({
      indent: { left: padL, right: padR }, spacing: { after: 800, line: 320, lineRule: "atLeast" },
      children: [new TextRun({
        text: config.subtitle, size: 24, color: p.subtitleColor,
        font: { ascii: "Arial", hAnsi: "Arial", eastAsia: "Microsoft YaHei" },
      })],
    }));
  }

  for (const line of (config.metaLines || [])) {
    children.push(new Paragraph({
      indent: { left: padL + 200, right: padR }, spacing: { after: 80, line: 300, lineRule: "atLeast" },
      border: { left: accentLeft },
      children: [new TextRun({
        text: line, size: 24, color: p.metaColor,
        font: { ascii: "Arial", hAnsi: "Arial", eastAsia: "Microsoft YaHei" },
      })],
    }));
  }

  children.push(new Paragraph({ spacing: { before: spacing.bottomSpacing } }));

  children.push(new Paragraph({
    indent: { left: padL, right: padR },
    border: { top: { style: BorderStyle.SINGLE, size: 2, color: p.accent, space: 8 } },
    spacing: { before: 200 },
    children: [
      new TextRun({ text: config.footerLeft || "", size: 16, color: p.footerColor, font: { ascii: "Arial", hAnsi: "Arial" } }),
      new TextRun({ text: "                                        ", size: 16, font: { ascii: "Arial", hAnsi: "Arial" } }),
      new TextRun({ text: config.footerRight || "", size: 16, color: p.footerColor, font: { ascii: "Arial", hAnsi: "Arial" } }),
    ],
  }));

  return [new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: allNoBorders,
    rows: [new TableRow({
      height: { value: 16838, rule: "exact" },
      children: [new TableCell({
        shading: { type: ShadingType.CLEAR, fill: p.bg },
        borders: noBorders,
        verticalAlign: VerticalAlign.TOP,
        children,
      })],
    })],
  })];
}

module.exports.buildCoverR1 = buildCoverR1;
module.exports.calcTitleLayout = calcTitleLayout;
