# -*- coding: utf-8 -*-
"""Merge cover.pdf + body.pdf -> final GDD with metadata."""
from pypdf import PdfReader, PdfWriter

COVER = "/home/z/my-project/scripts/cover.pdf"
BODY = "/home/z/my-project/scripts/body.pdf"
OUT = "/home/z/my-project/download/ZARNITSA_GDD.pdf"

w = PdfWriter()
w.append(COVER)
w.append(BODY)

# Normalize cover page size to the body's exact A4 dimensions
from pypdf import PdfReader as _R
_ref = _R(BODY).pages[0].mediabox
p0 = w.pages[0]
p0.scale_to(width=float(_ref.width), height=float(_ref.height))

w.add_metadata({
    "/Title": "ЗАРНИЦА — Дизайн-документ игры (GDD)",
    "/Author": "Z.ai",
    "/Creator": "Z.ai",
    "/Producer": "Z.ai",
    "/Subject": "Тёмное славянское фэнтези: action-RPG с движком предательства компаньонов и гибридным кооперативом",
    "/Keywords": "GDD, game design document, dark fantasy, action RPG, славянское фэнтези, кооператив, портфолио",
})

with open(OUT, "wb") as f:
    w.write(f)

r = PdfReader(OUT)
print("final:", OUT, "| pages:", len(r.pages))
print("title:", r.metadata.title)
