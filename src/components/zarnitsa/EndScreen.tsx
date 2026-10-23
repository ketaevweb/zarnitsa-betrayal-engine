"use client";

/* ============================================================
 * ЗАРНИЦА — финальный экран: летопись похода, вердикты, журнал
 * ============================================================ */

import { COMPANION_BY_ID, TAGS } from "@/lib/zarnitsa/data";
import type { GameState } from "@/lib/zarnitsa/types";
import { LevelBadge } from "./CompanionCard";

interface EndingData {
  rows: {
    companionId: string;
    level: number;
    verdict: string;
    lastMemories: { id: string; tag: keyof typeof TAGS; valence: number; label: string }[];
    memoryCount: number;
    bitterShare: number;
  }[];
  chronicle: string;
  /** титул похода (M1.5): своя развязка — своё название */
  title?: string;
  subtitle?: string;
}

export function EndScreen({
  state,
  ending,
  onRestart,
}: {
  state: GameState;
  ending: EndingData;
  onRestart: () => void;
}) {
  const totalMemories = ending.rows.reduce((a, r) => a + r.memoryCount, 0);

  function downloadJournal() {
    const journal = {
      project: "ZARNITSA: The Oath — браузерный прототип движка предательства",
      version: "0.1.0-m0",
      exportedAt: new Date().toISOString(),
      rules: {
        memory: "тег + валентность −3..+3, без затухания",
        formula: "Δдоверия = валентность × вес_тега × чувствительность",
        ladder: "пороги доверия: I<60, II<40, III<25, IV<10; V — только сюжет",
        speechRight: "III–IV: заморозка перехода, 1 использование на ступень",
      },
      state: {
        day: state.day,
        gold: state.gold,
        flags: state.flags,
        party: Object.fromEntries(
          Object.values(state.party).map((cs) => [
            cs.id,
            {
              trust: Number(cs.trust.toFixed(2)),
              level: cs.level,
              gone: cs.gone,
              memories: cs.memories,
              speechUsed: cs.speechUsed,
            },
          ]),
        ),
      },
    };
    const blob = new Blob([JSON.stringify(journal, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "zarnitsa_betrayal_journal.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="z-root z-fadein flex min-h-screen flex-col">
      <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.35em] text-[#c9a227]">
          Летопись похода
        </p>
        <h1 className="z-heading mt-2 text-center text-4xl font-bold sm:text-5xl">
          {ending.title ?? "Три ночи прошли"}
        </h1>
        <p className="mt-2 text-center text-sm text-[#9a8f96]">
          {ending.subtitle ? `${ending.subtitle} · ` : ""}Записей в памяти отряда: {totalMemories} ·
          Проклятого золота: {state.gold}
        </p>

        {ending.chronicle && (
          <blockquote className="z-panel mt-6 border-l-4 border-l-[#c9a227] p-4 text-sm italic leading-relaxed text-[#d6cfc2] sm:p-5">
            {ending.chronicle}
            <footer className="mt-2 text-xs not-italic text-[#9a8f96]">
              — Милута, летописец отряда
            </footer>
          </blockquote>
        )}

        <div className="mt-6 space-y-3">
          {ending.rows.map((row) => {
            const def = COMPANION_BY_ID[row.companionId];
            const dim = row.level >= 5;
            return (
              <div
                key={row.companionId}
                className={`z-panel p-4 sm:p-5 ${dim ? "opacity-60" : ""}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="z-heading text-xl font-semibold">{def.name}</span>
                  <LevelBadge level={row.level} />
                  <span className="ml-auto text-[11px] text-[#9a8f96]">
                    {row.memoryCount} записей · горьких{" "}
                    {Math.round(row.bitterShare * 100)}%
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed">{row.verdict}</p>
                {row.lastMemories.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {row.lastMemories.map((m) => (
                      <span
                        key={m.id}
                        className={`rounded-sm px-2 py-0.5 text-[11px] ${
                          m.valence > 0
                            ? "bg-[#7da87b]/15 text-[#8fbc8d]"
                            : "bg-[#8c1f28]/20 text-[#e08a8a]"
                        }`}
                      >
                        {m.valence > 0 ? "+" : "−"}
                        {Math.abs(m.valence)} · «{m.label}»
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            onClick={onRestart}
            className="w-full rounded-sm border border-[#c9a227] bg-[#c9a227]/10 px-6 py-3 text-sm font-semibold text-[#c9a227] transition-colors hover:bg-[#c9a227]/20 sm:w-auto"
          >
            ⚔ Пройти поход снова
          </button>
          <button
            onClick={downloadJournal}
            className="w-full rounded-sm border border-[#32233a] px-6 py-3 text-sm text-[#d6cfc2] transition-colors hover:border-[#c9a227] sm:w-auto"
          >
            ⬇ Скачать журнал движка (JSON)
          </button>
        </div>
        <p className="mt-6 text-center text-[11px] leading-relaxed text-[#9a8f96]">
          Журнал совместим по смыслу с data-форматом Godot-каркаса M0 (memory_log +
          betrayal_engine). Это один и тот же движок — в двух оболочках.
        </p>
      </div>
    </div>
  );
}
