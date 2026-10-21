# -*- coding: utf-8 -*-
"""Merge per-page EN PDFs into ZARNITSA_Pitch_Deck_EN.pdf with metadata."""
import json
from pypdf import PdfReader, PdfWriter

TMP = '/home/z/my-project/scripts/pdf_tmp_en'
OUT = '/home/z/my-project/download/ZARNITSA_Pitch_Deck_EN.pdf'

parts = json.load(open(f'{TMP}/parts.json'))
w = PdfWriter()
for p in parts:
    r = PdfReader(p)
    w.add_page(r.pages[0])

w.add_metadata({
    '/Title': 'ZARNITSA — Publisher Pitch Deck',
    '/Author': 'Vataga Games',
    '/Subject': 'Narrative action-RPG: single-player + co-op 2-4. Production financing pitch',
    '/Keywords': 'ZARNITSA, dark fantasy, action-RPG, co-op, pitch deck, Okovye, Betrayal Engine, Slavic fantasy',
})
with open(OUT, 'wb') as f:
    w.write(f)
print('pages:', len(w.pages), '->', OUT)
