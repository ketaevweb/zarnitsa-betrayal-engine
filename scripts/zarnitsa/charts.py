# -*- coding: utf-8 -*-
"""Диаграммы для документа «ЗАРНИЦА: реалистичный план разработки»."""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

plt.rcParams["font.sans-serif"] = ["DejaVu Sans"]
plt.rcParams["axes.unicode_minus"] = False

OUT = "/home/z/my-project/scripts/zarnitsa/"
ACCENT = "#7B2D35"
GREY = "#B0B0B0"
TEXT = "#333333"
SERIES = ["#7B2D35", "#A8747A", "#C49B72", "#6B9DAD", "#7BA68A", "#9687A8"]


def style_ax(ax):
    ax.spines[["top", "right"]].set_visible(False)
    ax.grid(axis="y", alpha=0.3, color="#E0E0E0")
    ax.tick_params(colors=TEXT)


# ── Рис. 1. Бюджет соло-разработки (горизонтальный бар) ──
def chart_budget():
    cats = ["Резерв риска", "Арт-аутсорс", "Маркетинг", "Озвучка (ключевые реплики)",
            "Локализация EN (текст)", "Ассеты и ПО", "Железо и прочее"]
    vals = [10.0, 8.0, 5.0, 2.0, 2.0, 2.0, 1.0]
    fig, ax = plt.subplots(figsize=(10, 5.2), constrained_layout=True)
    y = range(len(cats))[::-1]
    bars = ax.barh(list(y), vals, color=[GREY] + [ACCENT] + ["#A8747A"] * 4 + ["#A8747A"],
                   height=0.62, edgecolor="white")
    for yi, v in zip(y, vals):
        ax.text(v + 0.15, yi, f"${v:.1f}k".replace(".0", ""), va="center",
                fontsize=10, color=TEXT)
    ax.set_yticks(list(y))
    ax.set_yticklabels(cats, fontsize=10)
    ax.set_xlabel("Тысяч долларов США", fontsize=11, color=TEXT)
    ax.set_xlim(0, 11.8)
    ax.set_title("Бюджет этапа 1–2: $30 000 верхней границей (план — $25k + резерв)",
                 fontsize=13, pad=14, color=TEXT)
    ax.spines[["top", "right"]].set_visible(False)
    ax.grid(axis="x", alpha=0.3, color="#E0E0E0")
    ax.tick_params(colors=TEXT)
    fig.savefig(OUT + "fig_budget.png", dpi=200, facecolor="white")
    plt.close(fig)


# ── Рис. 2. Дорожная карта 36 месяцев (Гант) ──
def chart_roadmap():
    phases = [
        ("Прототип ядра (перемещение, бой, пауза)", 1, 2, 0),
        ("Движок предательства v1 + данные спутников", 3, 6, 1),
        ("Хаб-карта и арт-пайплайн low-poly", 4, 8, 2),
        ("Контент демо «Три ночи» (бои, диалоги, ночи)", 7, 10, 1),
        ("Полировка демо, Steam-страница, трейлер", 11, 11, 3),
        ("Steam Next Fest: демо, вишлисты", 12, 12, 4),
        ("EA-контент: регион 2, спутники 5–6", 13, 18, 2),
        ("Релиз Early Access", 19, 20, 1),
        ("EA-поддержка: патчи, комьюнити, баланс", 21, 26, 3),
        ("Регион 3, финальный акт, все концовки", 25, 32, 2),
        ("Полировка, локализация, релиз 1.0", 33, 36, 4),
    ]
    fig, ax = plt.subplots(figsize=(11, 6.2), constrained_layout=True)
    for i, (name, start, end, ci) in enumerate(phases):
        y = len(phases) - 1 - i
        ax.barh(y, end - start + 1, left=start - 0.5, height=0.6,
                color=SERIES[ci % len(SERIES)], edgecolor="white")
    ax.set_yticks([len(phases) - 1 - i for i in range(len(phases))])
    ax.set_yticklabels([p[0] for p in phases], fontsize=9.5)
    ax.set_xlim(0.5, 36.5)
    ax.set_xticks([1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34, 36])
    ax.set_xlabel("Месяц от старта производства", fontsize=11, color=TEXT)
    ax.set_title("Дорожная карта соло-разработки: 36 месяцев от прототипа до версии 1.0",
                 fontsize=13, pad=14, color=TEXT)
    ax.spines[["top", "right"]].set_visible(False)
    ax.grid(axis="x", alpha=0.3, color="#E0E0E0")
    ax.tick_params(colors=TEXT)
    fig.savefig(OUT + "fig_roadmap.png", dpi=200, facecolor="white")
    plt.close(fig)


# ── Рис. 3. Сценарии первого года EA ──
def chart_revenue():
    scen = ["Консервативный\n(4 000 копий)", "Базовый\n(10 000 копий)", "Оптимистичный\n(18 000 копий)"]
    rev = [50, 126, 227]
    fig, ax = plt.subplots(figsize=(9.5, 5.4), constrained_layout=True)
    bars = ax.bar(scen, rev, color=["#A8747A", ACCENT, "#C49B72"], width=0.52,
                  edgecolor="white")
    for b, v in zip(bars, rev):
        ax.text(b.get_x() + b.get_width() / 2, b.get_height() + 5,
                f"≈ ${v}k", ha="center", va="bottom", fontsize=12,
                color=TEXT, fontweight="bold")
    ax.set_ylabel("Чистая выручка первого года, тыс. $", fontsize=11, color=TEXT)
    ax.set_ylim(0, 260)
    ax.set_title("Сценарии выручки первого года Early Access (цена $17.99, доля Steam 30%)",
                 fontsize=12.5, pad=14, color=TEXT)
    style_ax(ax)
    fig.savefig(OUT + "fig_revenue.png", dpi=200, facecolor="white")
    plt.close(fig)


if __name__ == "__main__":
    chart_budget()
    chart_roadmap()
    chart_revenue()
    print("OK: 3 charts generated")
