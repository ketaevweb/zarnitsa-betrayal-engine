# -*- coding: utf-8 -*-
"""ЗАРНИЦА GDD — сборка тела документа (ReportLab, Report brief).

Chapter numbering plan (Step 3.5):
| Outline | Type    | Chapter | Title                       |
|---------|---------|---------|------------------------------|
| 1       | cover   | —       | Обложка (отдельный PDF)      |
| 2       | toc     | —       | Содержание (римская нумер.)  |
| 3..14   | content | 1..12   | Главы 1–12 (арабская с 1)    |
"""
import os, sys, hashlib

PDF_SKILL_DIR = "/home/z/my-project/skills/pdf"
sys.path.insert(0, os.path.join(PDF_SKILL_DIR, "scripts"))
sys.path.insert(0, "/home/z/my-project/scripts")

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.enums import TA_JUSTIFY, TA_LEFT, TA_CENTER
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    Image, KeepTogether, CondPageBreak, Flowable, HRFlowable,
)
from reportlab.platypus.tableofcontents import TableOfContents
from PIL import Image as PILImage

# ── Fonts ─────────────────────────────────────────────────────────────
FONT_DIR = "/usr/share/fonts"
pdfmetrics.registerFont(TTFont("FreeSerif", f"{FONT_DIR}/truetype/freefont/FreeSerif.ttf"))
pdfmetrics.registerFont(TTFont("FreeSerif-Bold", f"{FONT_DIR}/truetype/freefont/FreeSerifBold.ttf"))
pdfmetrics.registerFont(TTFont("FreeSerif-Italic", f"{FONT_DIR}/truetype/freefont/FreeSerifItalic.ttf"))
pdfmetrics.registerFont(TTFont("FreeSerif-BoldItalic", f"{FONT_DIR}/truetype/freefont/FreeSerifBoldItalic.ttf"))
pdfmetrics.registerFont(TTFont("NotoSerifSC", f"{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf"))
pdfmetrics.registerFont(TTFont("NotoSerifSC-Bold", f"{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf"))
pdfmetrics.registerFont(TTFont("DejaVuSans", f"{FONT_DIR}/truetype/dejavu/DejaVuSansMono.ttf"))
registerFontFamily("FreeSerif", normal="FreeSerif", bold="FreeSerif-Bold",
                   italic="FreeSerif-Italic", boldItalic="FreeSerif-BoldItalic")
registerFontFamily("NotoSerifSC", normal="NotoSerifSC", bold="NotoSerifSC-Bold")
registerFontFamily("DejaVuSans", normal="DejaVuSans", bold="DejaVuSans")

from pdf import install_font_fallback
install_font_fallback()

# ━━ Cascade Palette (design_engine.py palette-cascade, tension/complementary/seed7) ━━
PAGE_BG       = colors.HexColor('#f6f5f5')
SECTION_BG    = colors.HexColor('#eeeded')
CARD_BG       = colors.HexColor('#eae4e4')
TABLE_STRIPE  = colors.HexColor('#efeded')
HEADER_FILL   = colors.HexColor('#644545')
COVER_BLOCK   = colors.HexColor('#6e5555')
BORDER        = colors.HexColor('#d3b7b7')
ICON          = colors.HexColor('#7d3a3a')
ACCENT        = colors.HexColor('#a82727')
ACCENT_2      = colors.HexColor('#4fbbbb')
TEXT_PRIMARY  = colors.HexColor('#272323')
TEXT_MUTED    = colors.HexColor('#817777')
SEM_WARNING   = colors.HexColor('#a08348')   # antique gold

TABLE_HEADER_COLOR = HEADER_FILL
TABLE_ROW_EVEN     = colors.white
TABLE_ROW_ODD      = TABLE_STRIPE

# ── Geometry ──────────────────────────────────────────────────────────
MARGIN = 1.0 * inch
TOP_MARGIN = 0.95 * inch
BOTTOM_MARGIN = 0.9 * inch
PAGE_W, PAGE_H = A4
AVAIL_W = PAGE_W - 2 * MARGIN
AVAIL_H = PAGE_H - TOP_MARGIN - BOTTOM_MARGIN
H1_THRESHOLD = AVAIL_H * 0.25
MAX_KEEP_HEIGHT = PAGE_H * 0.4

ASSETS = "/home/z/my-project/download/gdd_assets"
OUT_BODY = "/home/z/my-project/scripts/body.pdf"

DOC_TITLE = "ЗАРНИЦА — Дизайн-документ игры (GDD)"
HEADER_TEXT = "ЗАРНИЦА · ДИЗАЙН-ДОКУМЕНТ"
FOOTER_TEXT = "Концепт тёмного фэнтези action-RPG · портфолио геймдизайнера"

# ── Styles ────────────────────────────────────────────────────────────
S = {}
S["body"] = ParagraphStyle("Body", fontName="FreeSerif", fontSize=10.5, leading=17,
                           alignment=TA_JUSTIFY, textColor=TEXT_PRIMARY,
                           spaceBefore=0, spaceAfter=9)
S["h1"] = ParagraphStyle("H1", fontName="FreeSerif-Bold", fontSize=22, leading=28,
                         textColor=HEADER_FILL, spaceBefore=22, spaceAfter=4)
S["h2"] = ParagraphStyle("H2", fontName="FreeSerif-Bold", fontSize=15, leading=21,
                         textColor=TEXT_PRIMARY, spaceBefore=16, spaceAfter=8)
S["h3"] = ParagraphStyle("H3", fontName="FreeSerif-Bold", fontSize=11.5, leading=17,
                         textColor=TEXT_PRIMARY, spaceBefore=12, spaceAfter=6)
S["bullet"] = ParagraphStyle("Bullet", fontName="FreeSerif", fontSize=10.5, leading=16.5,
                             alignment=TA_LEFT, textColor=TEXT_PRIMARY,
                             leftIndent=16, firstLineIndent=-9, spaceAfter=5)
S["caption"] = ParagraphStyle("Caption", fontName="FreeSerif", fontSize=8.5, leading=12,
                              alignment=TA_CENTER, textColor=TEXT_MUTED,
                              spaceBefore=0, spaceAfter=0)
S["quote"] = ParagraphStyle("Quote", fontName="FreeSerif-Italic", fontSize=12, leading=18.5,
                            alignment=TA_LEFT, textColor=HEADER_FILL,
                            leftIndent=2, spaceBefore=0, spaceAfter=0)
S["cell"] = ParagraphStyle("Cell", fontName="FreeSerif", fontSize=9, leading=12.5,
                           alignment=TA_LEFT, textColor=TEXT_PRIMARY)
S["cellc"] = ParagraphStyle("CellC", parent=S["cell"], alignment=TA_CENTER)
S["cellh"] = ParagraphStyle("CellH", fontName="FreeSerif-Bold", fontSize=9.5, leading=13,
                            alignment=TA_CENTER, textColor=colors.white)
S["stat"] = ParagraphStyle("Stat", fontName="FreeSerif-Bold", fontSize=20, leading=24,
                           alignment=TA_CENTER, textColor=ACCENT)
S["statlabel"] = ParagraphStyle("StatLabel", fontName="FreeSerif", fontSize=8.5, leading=11.5,
                                alignment=TA_CENTER, textColor=TEXT_MUTED)
S["toc_title"] = ParagraphStyle("TocTitle", fontName="FreeSerif-Bold", fontSize=22, leading=28,
                                textColor=HEADER_FILL, spaceAfter=4)
S["toc0"] = ParagraphStyle("TOC0", fontName="FreeSerif-Bold", fontSize=11, leading=18,
                           leftIndent=0, textColor=TEXT_PRIMARY)
S["toc1"] = ParagraphStyle("TOC1", fontName="FreeSerif", fontSize=10, leading=15.5,
                           leftIndent=18, textColor=TEXT_PRIMARY)

# ── Doc template with TOC + page decorations ─────────────────────────
class BodyStart(Flowable):
    """Zero-size marker: records the first content page number on the canvas."""
    def __init__(self):
        super().__init__()
        self.width = 0; self.height = 0
    def draw(self):
        self.canv._body_start = self.canv.getPageNumber()

ROMAN = {1: "i", 2: "ii", 3: "iii", 4: "iv", 5: "v", 6: "vi"}

def _decorate(canvas, doc):
    canvas.saveState()
    # header
    canvas.setFont("FreeSerif", 7.5)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawString(MARGIN, PAGE_H - 0.62 * inch, HEADER_TEXT)
    canvas.setStrokeColor(ACCENT)
    canvas.setLineWidth(1.2)
    canvas.line(MARGIN, PAGE_H - 0.70 * inch, PAGE_W - MARGIN, PAGE_H - 0.70 * inch)
    # footer rule
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.5)
    canvas.line(MARGIN, 0.66 * inch, PAGE_W - MARGIN, 0.66 * inch)
    canvas.setFont("FreeSerif", 7.5)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawString(MARGIN, 0.47 * inch, FOOTER_TEXT)
    # page number: roman for front matter, arabic reset from body start
    body_start = getattr(canvas, "_body_start", None)
    page = canvas.getPageNumber()
    if body_start is not None and page >= body_start:
        label = str(page - body_start + 1)
    else:
        label = ROMAN.get(page, str(page))
    canvas.drawRightString(PAGE_W - MARGIN, 0.47 * inch, label)
    canvas.restoreState()

class TocDocTemplate(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, "bookmark_name"):
            level = getattr(flowable, "bookmark_level", 0)
            text = getattr(flowable, "bookmark_text", "")
            key = getattr(flowable, "bookmark_key", "")
            # translate absolute page -> printed footer label (arabic reset from body start)
            body_start = getattr(self.canv, "_body_start", None)
            page = self.page
            if body_start is not None and page >= body_start:
                page = page - body_start + 1
            self.notify("TOCEntry", (level, text, page, key))
            self.canv.addOutlineEntry(text, key, level=level, closed=False)
    def afterPage(self):
        _decorate(self.canv, self)

# ── Helpers ───────────────────────────────────────────────────────────
def add_heading(text, style, level=0):
    key = "h_%s" % hashlib.md5(text.encode()).hexdigest()[:8]
    p = Paragraph('<a name="%s"/><b>%s</b>' % (key, text), style)
    p.bookmark_name = key
    p.bookmark_level = level
    p.bookmark_text = text
    p.bookmark_key = key
    return p

def safe_keep(elements):
    total = 0
    for el in elements:
        w, h = el.wrap(AVAIL_W, PAGE_H)
        total += h
    if total <= MAX_KEEP_HEIGHT:
        return [KeepTogether(elements)]
    elif len(elements) >= 2:
        return [KeepTogether(elements[:2])] + list(elements[2:])
    return list(elements)

def embed_image(path, max_width=None, max_height=None):
    if max_width is None:
        max_width = AVAIL_W
    if max_height is None:
        max_height = PAGE_H * 0.35
    pil = PILImage.open(path)
    ow, oh = pil.size
    rw = max_width / ow if ow > max_width else 1.0
    rh = max_height / oh if oh > max_height else 1.0
    r = min(rw, rh)
    return Image(path, width=ow * r, height=oh * r)

def make_table(spec):
    headers = spec["headers"]
    ratios = spec["ratios"]
    col_widths = [r * AVAIL_W for r in ratios]
    assert abs(sum(ratios) - 1.0) < 0.02, "ratios must sum to 1: %s" % spec["title"]
    assert sum(col_widths) <= AVAIL_W + 0.5, "table overflow: %s" % spec["title"]
    data = [[Paragraph("<b>%s</b>" % h, S["cellh"]) for h in headers]]
    for row in spec["rows"]:
        cells = []
        for j, val in enumerate(row):
            style = S["cell"] if j == 0 or len(str(val)) > 12 else S["cellc"]
            if spec["headers"][j] in ("", "Уровень", "Часы", "Вероятность", "Урон"):
                style = S["cellc"]
            cells.append(Paragraph(str(val), style))
        data.append(cells)
    t = Table(data, colWidths=col_widths, repeatRows=1, hAlign="CENTER")
    styles = [
        ("BACKGROUND", (0, 0), (-1, 0), TABLE_HEADER_COLOR),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
        ("BOX", (0, 0), (-1, -1), 0.75, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    for i in range(1, len(data)):
        styles.append(("BACKGROUND", (0, i), (-1, i),
                       TABLE_ROW_EVEN if i % 2 == 1 else TABLE_ROW_ODD))
    t.setStyle(TableStyle(styles))
    out = [Spacer(1, 14)]
    if len(spec["rows"]) <= 12:
        cap = Paragraph(spec["title"], S["caption"])
        out.extend(safe_keep([t, Spacer(1, 6), cap]))
    else:
        out.append(t)
        out.append(Spacer(1, 6))
        out.append(Paragraph(spec["title"], S["caption"]))
    out.append(Spacer(1, 14))
    return out

def make_stats(items):
    n = len(items)
    cell_w = (AVAIL_W * 0.92) / n
    row = []
    for big, label in items:
        row.append([Paragraph("<b>%s</b>" % big, S["stat"]),
                    Spacer(1, 3),
                    Paragraph(label, S["statlabel"])])
    t = Table([row], colWidths=[cell_w] * n, hAlign="CENTER")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), CARD_BG),
        ("BOX", (0, 0), (-1, -1), 1, ACCENT),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    return [Spacer(1, 10), KeepTogether(t), Spacer(1, 12)]

def make_quote(text):
    t = Table([[Paragraph(text, S["quote"])]], colWidths=[AVAIL_W * 0.88], hAlign="CENTER")
    t.setStyle(TableStyle([
        ("LINEBEFORE", (0, 0), (0, -1), 2.2, ACCENT),
        ("LEFTPADDING", (0, 0), (-1, -1), 16),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return [Spacer(1, 8), KeepTogether(t), Spacer(1, 12)]

def make_img(spec):
    path = os.path.join(ASSETS, spec["path"])
    img = embed_image(path, max_width=AVAIL_W, max_height=spec.get("max_h", 300))
    cap = Paragraph(spec["caption"], S["caption"])
    return [Spacer(1, 16)] + safe_keep([img, Spacer(1, 7), cap]) + [Spacer(1, 16)]

# ── Story assembly ────────────────────────────────────────────────────
from gdd_content_1 import C1, C2, C3, C4
from gdd_content_2 import C5, C6, C7, C8
from gdd_content_3 import C9, C10, C11
from gdd_content_4 import C12

CHAPTERS = [C1, C2, C3, C4, C5, C6, C7, C8, C9, C10, C11, C12]

story = []

# TOC page (front matter)
story.append(Paragraph("<b>Содержание</b>", S["toc_title"]))
story.append(HRFlowable(width="100%", color=ACCENT, thickness=1.2, spaceBefore=2, spaceAfter=14))
toc = TableOfContents()
toc.levelStyles = [S["toc0"], S["toc1"]]
toc.dotsMinLevel = 0
story.append(toc)
story.append(PageBreak())
story.append(BodyStart())

for chapter in CHAPTERS:
    pending_h = None
    for kind, payload in chapter:
        if kind == "h1":
            story.append(CondPageBreak(H1_THRESHOLD))
            h = add_heading(payload, S["h1"], level=0)
            rule = HRFlowable(width="100%", color=ACCENT, thickness=1.2,
                              spaceBefore=0, spaceAfter=12)
            pending_h = [h, rule]
        elif kind == "h2":
            h = add_heading(payload, S["h2"], level=1)
            pending_h = [h] if pending_h is None else pending_h + [h]
        elif kind == "h3":
            h = Paragraph("<b>%s</b>" % payload, S["h3"])
            pending_h = [h] if pending_h is None else pending_h + [h]
        else:
            if kind == "body":
                block = [Paragraph(payload, S["body"])]
            elif kind == "bullet":
                block = [Paragraph("•  " + item, S["bullet"]) for item in payload]
            elif kind == "quote":
                block = make_quote(payload)
            elif kind == "stats":
                block = make_stats(payload)
            elif kind == "table":
                block = make_table(payload)
            elif kind == "img":
                block = make_img(payload)
            elif kind == "spacer":
                block = [Spacer(1, payload)]
            else:
                block = []
            if pending_h is not None:
                story.extend(safe_keep(pending_h + block[:1]))
                story.extend(block[1:])
                pending_h = None
            else:
                story.extend(block)
    if pending_h is not None:
        story.extend(pending_h)

# ── Build ─────────────────────────────────────────────────────────────
doc = TocDocTemplate(
    OUT_BODY, pagesize=A4,
    leftMargin=MARGIN, rightMargin=MARGIN,
    topMargin=TOP_MARGIN, bottomMargin=BOTTOM_MARGIN,
    title=DOC_TITLE, author="Z.ai", creator="Z.ai",
    subject="Полный гейм-дизайн документ: тёмное славянское фэнтези, движок предательства компаньонов, гибридный кооператив",
)
doc.multiBuild(story)
print("body built:", OUT_BODY)
