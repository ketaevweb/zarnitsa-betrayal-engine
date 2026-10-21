# -*- coding: utf-8 -*-
"""Merge постраничных PDF в ZARNITSA_Pitch_Deck.pdf с метаданными."""
import json
from pypdf import PdfReader, PdfWriter

TMP = '/home/z/my-project/scripts/pdf_tmp'
OUT = '/home/z/my-project/download/ZARNITSA_Pitch_Deck.pdf'

parts = json.load(open(f'{TMP}/parts.json'))
w = PdfWriter()
for p in parts:
    r = PdfReader(p)
    w.add_page(r.pages[0])

w.add_metadata({
    '/Title': 'ЗАРНИЦА — питч-дек для издателя',
    '/Author': 'Ватага Геймс',
    '/Subject': 'Сюжетная action-RPG: сингл + кооп 2–4. Питч финансирования производства',
    '/Keywords': 'ZARNITSA, dark fantasy, action-RPG, co-op, pitch deck, Оковье, движок предательства',
})
with open(OUT, 'wb') as f:
    w.write(f)
print('pages:', len(w.pages), '->', OUT)
