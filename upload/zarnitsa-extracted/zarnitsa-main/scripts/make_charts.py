#!/usr/bin/env python3
"""Charts for ZARNITSA GDD — cascade palette (tension/complementary/seed7)."""
import matplotlib
matplotlib.use("Agg")
import matplotlib.font_manager as fm
fm.fontManager.addfont('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')
import matplotlib.pyplot as plt

plt.rcParams['font.sans-serif'] = ['DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

OUT = "/home/z/my-project/download/gdd_assets"

# Cascade palette hexes
ACCENT = "#a82727"; ICON = "#7d3a3a"; HEADER = "#644545"; COVER = "#6e5555"
GOLD = "#a08348"; BORDER = "#d3b7b7"; MUTED = "#817777"; TEXTP = "#272323"

# ── Chart 1: budget donut ──────────────────────────────────────────────
labels = [
    "Производство контента — 97 млн $ · 46%",
    "Маркетинг и релиз — 44 млн $ · 21%",
    "Движок и технологии — 25 млн $ · 12%",
    "Поддержка и дополнения — 19 млн $ · 9%",
    "Аудио и локализация — 17 млн $ · 8%",
    "Резерв — 8 млн $ · 4%",
]
values = [97, 44, 25, 19, 17, 8]
colors = [ACCENT, GOLD, ICON, COVER, HEADER, BORDER]

fig, ax = plt.subplots(figsize=(10.5, 4.3), constrained_layout=True)
wedges, _ = ax.pie(
    values, colors=colors, startangle=90, counterclock=False,
    wedgeprops=dict(width=0.35, edgecolor="white", linewidth=2),
)
ax.text(0, 0.06, "210", ha="center", va="center", fontsize=30, fontweight="bold", color=TEXTP)
ax.text(0, -0.24, "млн $", ha="center", va="center", fontsize=13, color=MUTED)
ax.legend(
    wedges, labels, loc="center left", bbox_to_anchor=(1.02, 0.5),
    frameon=False, fontsize=10.5, labelspacing=1.1, handlelength=1.0,
    handleheight=1.0,
)
ax.set_aspect("equal")
fig.savefig(f"{OUT}/budget.png", dpi=200, facecolor="white")
plt.close(fig)

# ── Chart 2: content hours per region (stacked horizontal bars) ───────
regions = ["Стоячее море", "Костромора", "Оковск-град", "Столповье", "Верейское Полесье"]
main_h = [8, 14, 12, 10, 8]
side_h = [10, 12, 14, 10, 12]

fig, ax = plt.subplots(figsize=(8.6, 3.9), constrained_layout=True)
b1 = ax.barh(regions, main_h, color=ACCENT, height=0.58, label="Основной сюжет")
b2 = ax.barh(regions, side_h, left=main_h, color=BORDER, height=0.58, label="Побочные квесты и контракты")
for i, (m, s) in enumerate(zip(main_h, side_h)):
    ax.text(m / 2, i, str(m), va="center", ha="center", fontsize=10.5, color="white", fontweight="bold")
    ax.text(m + s / 2, i, str(s), va="center", ha="center", fontsize=10.5, color=TEXTP)
    ax.text(m + s + 0.5, i, f"{m + s} ч", va="center", ha="left", fontsize=10.5, color=MUTED, fontweight="bold")
ax.set_xlim(0, 32)
ax.spines["top"].set_visible(False)
ax.spines["right"].set_visible(False)
ax.spines["bottom"].set_visible(False)
ax.spines["left"].set_color(MUTED)
ax.tick_params(axis="y", length=0, labelsize=11, colors=TEXTP)
ax.tick_params(axis="x", bottom=False, labelbottom=False)
leg = ax.legend(loc="upper center", frameon=False, fontsize=10.5,
                bbox_to_anchor=(0.5, -0.04), ncol=2)
fig.savefig(f"{OUT}/content.png", dpi=200, facecolor="white")
plt.close(fig)

print("charts done")
