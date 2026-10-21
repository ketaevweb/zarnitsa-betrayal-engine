# -*- coding: utf-8 -*-
"""Render selected pages of the final GDD to PNG for visual QA."""
import sys, os
import pypdfium2 as pdfium

PDF = "/home/z/my-project/download/ZARNITSA_GDD.pdf"
OUT = "/home/z/my-project/scripts/qa_render"
os.makedirs(OUT, exist_ok=True)

pages = [int(x) for x in sys.argv[1:]] if len(sys.argv) > 1 else [1, 2, 4, 10, 12]

doc = pdfium.PdfDocument(PDF)
for n in pages:
    page = doc[n - 1]
    bmp = page.render(scale=1.6)
    img = bmp.to_pil()
    path = os.path.join(OUT, f"p{n:02d}.png")
    img.save(path)
    print("saved", path, img.size)
doc.close()
