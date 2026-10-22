# -*- coding: utf-8 -*-
"""Пост-обработка DOCX: патч instrText колонтитулов (ROMAN/arabic) и удаление пустых pgNumType."""
import re
import shutil
import sys
import zipfile
import os

DOCX = "/home/z/my-project/download/ZARNITSA_Realistic_Dev_Plan_v2.0.docx"
TMP = "/home/z/my-project/scripts/zarnitsa/_patch_tmp"

W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
R_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"

def main():
    if os.path.exists(TMP):
        shutil.rmtree(TMP)
    os.makedirs(TMP)
    with zipfile.ZipFile(DOCX) as zf:
        zf.extractall(TMP)

    doc_path = os.path.join(TMP, "word", "document.xml")
    with open(doc_path, encoding="utf-8") as f:
        doc = f.read()

    # 1. Удалить пустые <w:pgNumType/> (секция обложки)
    before = doc
    doc = doc.replace("<w:pgNumType/>", "")
    removed = before != doc

    # 1b. Дедупликация первой записи TOC: docx-js создаёт параграф с полем
    # (begin+instr+separate) и hyperlink-записью; скрипт плейсхолдеров добавляет
    # ту же запись повторно. Переносим runs поля в начало дублирующей записи.
    def dedup_toc(xml: str) -> str:
        m = re.search(
            r"<w:p>(?:(?!</w:p>).)*?fldCharType=\"begin\"(?:(?!</w:p>).)*?TOC(?:(?!</w:p>).)*?fldCharType=\"separate\"(?:(?!</w:p>).)*?</w:p>",
            xml, flags=re.S,
        )
        if not m:
            print("TOC field paragraph not found — dedup skipped")
            return xml
        first_p = m.group(0)
        # runs поля (begin/instr/separate) — три первых <w:r>
        field_runs = re.findall(r"<w:r>(?:(?!</w:r>).)*?</w:r>", first_p, flags=re.S)
        head_runs = [r for r in field_runs if ("fldChar" in r or "instrText" in r)]
        if len(head_runs) < 3:
            print("unexpected TOC field structure — dedup skipped")
            return xml
        field_head = "".join(head_runs)
        after = xml[m.end():]
        # следующая запись TOC
        m2 = re.match(r"\s*<w:p>(?:(?!</w:p>).)*?</w:p>", after, flags=re.S)
        if not m2 or "Резюме" not in m2.group(0):
            print("next TOC entry not found — dedup skipped")
            return xml
        next_p = m2.group(0)
        # вставить runs поля сразу после </w:pPr>
        new_next = next_p.replace("</w:pPr>", "</w:pPr>" + field_head, 1)
        return xml[:m.start()] + new_next + after[m2.end():]

    doc = dedup_toc(doc)

    # 2. Определить footerReference по секциям: порядок секций в document.xml
    # Секции: 1=обложка (без футера), 2=содержание (ROMAN), 3=тело (arabic)
    sect_prs = re.findall(r"<w:sectPr\b.*?</w:sectPr>", doc, flags=re.S)
    footer_ids = []  # (section_index, rId)
    for i, sp in enumerate(sect_prs):
        m = re.search(r'<w:footerReference[^>]*w:type="default"[^>]*r:id="([^"]+)"', sp)
        if not m:
            m = re.search(r'<w:footerReference[^>]*r:id="([^"]+)"[^>]*w:type="default"', sp)
        footer_ids.append((i, m.group(1) if m else None))
    print("sections:", footer_ids)

    # rels: rId -> footer file
    rels_path = os.path.join(TMP, "word", "_rels", "document.xml.rels")
    with open(rels_path, encoding="utf-8") as f:
        rels = f.read()
    rid2file = dict(re.findall(r'<Relationship[^>]*Id="([^"]+)"[^>]*Target="(footer\d+\.xml)"', rels))
    # иногда Target идёт до Id
    rid2file.update({i: t for t, i in re.findall(r'<Relationship[^>]*Target="(footer\d+\.xml)"[^>]*Id="([^"]+)"', rels)})
    print("rels:", rid2file)

    # карта секция -> формат
    # section 0 = cover (нет футера), 1 = TOC -> ROMAN, 2 = body -> arabic
    plan = {}
    for idx, rid in footer_ids:
        if rid is None:
            continue
        fname = rid2file.get(rid)
        if not fname:
            continue
        if idx == 1:
            plan[fname] = "ROMAN"
        elif idx >= 2:
            plan.setdefault(fname, "arabic")
    print("patch plan:", plan)

    for fname, fmt in plan.items():
        fpath = os.path.join(TMP, "word", fname)
        if not os.path.exists(fpath):
            continue
        with open(fpath, encoding="utf-8") as f:
            xml = f.read()
        new = re.sub(
            r"(<w:instrText[^>]*>)\s*PAGE\s*(</w:instrText>)",
            r"\g<1> PAGE \\* %s \\* MERGEFORMAT \g<2>" % fmt,
            xml,
        )
        if new != xml:
            with open(fpath, "w", encoding="utf-8") as f:
                f.write(new)
            print(f"patched {fname} -> {fmt}")

    if removed:
        print("removed empty <w:pgNumType/>")

    with open(doc_path, "w", encoding="utf-8") as f:
        f.write(doc)

    # Переупаковать
    out_tmp = DOCX + ".new"
    with zipfile.ZipFile(out_tmp, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, _, files in os.walk(TMP):
            for name in files:
                full = os.path.join(root, name)
                rel = os.path.relpath(full, TMP)
                zf.write(full, rel)
    shutil.move(out_tmp, DOCX)
    shutil.rmtree(TMP)
    print("OK repacked:", DOCX)

if __name__ == "__main__":
    main()
