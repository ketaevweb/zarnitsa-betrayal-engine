"""Валидация Godot-проекта ЗАРНИЦА: JSON-файлы + синтаксис GDScript (gdparse)."""
import json
import pathlib
import subprocess
import sys

ROOT = pathlib.Path("/home/z/my-project/download/zarnitsa-godot")
errors = []

# 1. JSON
json_files = sorted(ROOT.rglob("*.json"))
for p in json_files:
    try:
        json.loads(p.read_text(encoding="utf-8"))
    except Exception as e:  # noqa: BLE001
        errors.append(f"{p.relative_to(ROOT)}: JSON: {e}")

# 2. GDScript через gdparse (gdtoolkit), если доступен
gd_files = sorted(ROOT.rglob("*.gd"))
use_gdparse = True
try:
    subprocess.run(["gdparse", "--help"], capture_output=True, timeout=30)
except Exception:
    use_gdparse = False

if use_gdparse:
    for p in gd_files:
        r = subprocess.run(["gdparse", str(p)], capture_output=True, text=True, timeout=60)
        if r.returncode != 0:
            errors.append(f"{p.relative_to(ROOT)}: gdparse: {(r.stderr or r.stdout).strip()[:500]}")

print("=== Валидация zarnitsa-godot ===")
print(f"JSON-файлов: {len(json_files)}; GD-файлов: {len(gd_files)}; gdparse: {'использован' if use_gdparse else 'НЕДОСТУПЕН'}")
if errors:
    print(f"ОШИБОК: {len(errors)}")
    for e in errors:
        print(" -", e)
    sys.exit(1)
print("OK: все файлы валидны")
