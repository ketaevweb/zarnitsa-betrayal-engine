// generate.js — сборка документа «ЗАРНИЦА: реалистичный план разработки»
"use strict";
const {
  Document, Packer, Paragraph, TextRun, Header, Footer, PageNumber,
  AlignmentType, SectionType, NumberFormat, TableOfContents, LevelFormat,
} = require("docx");
const fs = require("fs");
const { P, F_BODY, F_HEAD, buildCoverR1 } = require("./lib");
const sectionsA = require("./content_a");
const sectionsB = require("./content_b");
const sectionsC = require("./content_c");

const OUT = "/home/z/my-project/download/ZARNITSA_Realistic_Dev_Plan_v2.0.docx";

// ── Обложка (рецепт R1) ──
const coverConfig = {
  title: "ЗАРНИЦА: реалистичный план разработки",
  subtitle: "Тёмное славянское фэнтези-RTWP в масштабе одного человека: от демо «Три ночи» до Steam Early Access",
  englishLabel: "ZARNITSA · INDIE PRODUCTION PLAN",
  metaLines: [
    "Версия 2.0 — пересмотр концепции GDD 1.0 (AAA) под соло-разработку",
    "Модель: один разработчик + точечный аутсорс",
    "Платформа: Steam PC · Горизонт: 36 месяцев · Бюджет: до $30 тыс.",
    "Октябрь 2026",
  ],
  footerLeft: "Ватага Геймс (рабочее название студии)",
  footerRight: "Zarnitsa: The Oath · Indie Plan v2.0",
  palette: P,
};

// ── Колонтитулы ──
function pageFooter() {
  return new Footer({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "808080", font: F_BODY })],
    })],
  });
}
function bodyHeader() {
  return new Header({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 0 },
      children: [new TextRun({ text: "ЗАРНИЦА · Реалистичный план разработки · v2.0", size: 18, color: "888888", font: F_BODY })],
    })],
  });
}

// ── Секция содержания ──
const tocChildren = [
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 480, after: 360 },
    children: [new TextRun({ text: "Содержание", bold: true, size: 32, color: P.primary, font: F_HEAD })],
  }),
  new TableOfContents("Содержание", { hyperlink: true, headingStyleRange: "1-3" }),
  new Paragraph({
    spacing: { before: 200 },
    children: [new TextRun({
      text: "Примечание: содержание построено на кодах полей. После редактирования документа щёлкните по содержанию правой кнопкой мыши и выберите «Обновить поле», чтобы номера страниц стали точными.",
      italics: true, size: 18, color: "888888", font: F_BODY,
    })],
  }),
];

// ── Тело документа ──
// flat(2): tbl()/fig() возвращают массивы элементов, поэтому вложенность разворачивается
const bodyChildren = [...sectionsA(), ...sectionsB(), ...sectionsC()].flat(2);

const doc = new Document({
  creator: "Ватага Геймс",
  title: "ЗАРНИЦА: реалистичный план разработки (v2.0)",
  description: "Пересмотр концепции AAA-RPG под соло-разработку: демо, Early Access, полная версия",
  styles: {
    default: {
      document: {
        run: { font: F_BODY, size: 24, color: "000000" },
        paragraph: { spacing: { line: 312 } },
      },
      heading1: {
        run: { font: F_HEAD, size: 32, bold: true, color: P.primary },
        paragraph: { spacing: { before: 360, after: 160, line: 312 }, outlineLevel: 0 },
      },
      heading2: {
        run: { font: F_HEAD, size: 30, bold: true, color: P.primary },
        paragraph: { spacing: { before: 240, after: 120, line: 312 }, outlineLevel: 1 },
      },
      heading3: {
        run: { font: F_HEAD, size: 28, bold: true, color: P.primary },
        paragraph: { spacing: { before: 200, after: 100, line: 312 }, outlineLevel: 2 },
      },
    },
  },
  numbering: {
    config: [
      {
        reference: "pitch-list",
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }],
      },
    ],
  },
  sections: [
    // ── Секция 1: обложка (без колонтитулов, поля 0) ──
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 0, bottom: 0, left: 0, right: 0 },
        },
      },
      children: buildCoverR1(coverConfig),
    },
    // ── Секция 2: содержание (римская нумерация) ──
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
          pageNumbers: { start: 1, formatType: NumberFormat.UPPER_ROMAN },
        },
      },
      footers: { default: pageFooter() },
      children: tocChildren,
    },
    // ── Секция 3: тело (арабская нумерация с 1) ──
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
          pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL },
        },
      },
      headers: { default: bodyHeader() },
      footers: { default: pageFooter() },
      children: bodyChildren,
    },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(OUT, buf);
  console.log("OK:", OUT, (buf.length / 1024).toFixed(0) + " KB");
}).catch((e) => {
  console.error("FAIL:", e);
  process.exit(1);
});
