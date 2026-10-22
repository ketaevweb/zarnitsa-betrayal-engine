"use client";

/* ============================================================
 * ЗАРНИЦА — карточка спутника: лестница, доверие, журнал памяти
 * ============================================================ */

import { useState } from "react";
import { COMPANION_BY_ID, LADDER, TAGS } from "@/lib/zarnitsa/data";
import { fmtTrust, levelFromTrust } from "@/lib/zarnitsa/engine";
import type { CompanionState } from "@/lib/zarnitsa/types";

const LEVEL_COLORS = [
  "#7da87b", // 0 верный
  "#b08d3f", // I сомнение
  "#b3542f", // II отчуждение
  "#a03b2f", // III заговор
  "#8c1f28", // IV удар в спину
  "#4a1418", // V разрыв
];

export function LevelBadge({ level, small }: { level: number; small?: boolean }) {
  const l = LADDER[Math.min(level, 5)];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-sm border font-semibold tracking-wide ${
        small ? "px-1.5 py-0 text-[10px]" : "px-2 py-0.5 text-xs"
      }`}
      style={{
        color: LEVEL_COLORS[Math.min(level, 5)],
        borderColor: LEVEL_COLORS[Math.min(level, 5)],
        background: `${LEVEL_COLORS[Math.min(level, 5)]}1a`,
      }}
    >
      {l.short === "✦" ? "✦ Верный" : l.name}
    </span>
  );
}

function ValenceChip({ valence }: { valence: number }) {
  const positive = valence > 0;
  return (
    <span
      className="inline-block shrink-0 rounded-sm px-1.5 py-0 text-[11px] font-semibold tabular-nums"
      style={{
        color: positive ? "#8fbc8d" : "#e08a8a",
        background: positive ? "rgba(125,168,123,0.14)" : "rgba(140,31,40,0.2)",
      }}
    >
      {positive ? "+" : "−"}
      {Math.abs(valence)}
    </span>
  );
}

export function CompanionCard({ cs }: { cs: CompanionState }) {
  const [open, setOpen] = useState(false);
  const def = COMPANION_BY_ID[cs.id];
  const color = LEVEL_COLORS[Math.min(cs.level, 5)];
  const shownLevel = cs.frozen ? levelFromTrust(cs.trust) : cs.level;

  return (
    <div
      className={`z-panel p-3 sm:p-4 ${cs.frozen ? "z-frozen border-[#c9a227]" : ""} ${
        cs.gone ? "opacity-45" : ""
      }`}
    >
      {/* шапка */}
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-xl"
          style={{ borderColor: color, color, background: `${color}12` }}
          aria-hidden
        >
          {def.glyph}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="z-heading text-lg font-semibold leading-tight">{def.name}</span>
            <LevelBadge level={cs.level} />
          </div>
          <p className="text-xs text-[#9a8f96]">{def.title}</p>
        </div>
      </div>

      {/* полоса доверия */}
      <div className="mt-3">
        <div className="flex items-baseline justify-between text-[11px] text-[#9a8f96]">
          <span>доверие</span>
          <span className="tabular-nums text-[#d6cfc2]">
            {fmtTrust(cs.trust)} / 100
            {cs.frozen && (
              <span className="ml-2 font-semibold text-[#c9a227]">
                переход заморожен ({LADDER[Math.min(shownLevel, 5)].name})
              </span>
            )}
          </span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-black/50">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${cs.trust}%`, background: color }}
          />
        </div>
        {/* пороги */}
        <div className="relative mt-0.5 h-3">
          {[60, 40, 25, 10].map((t) => (
            <span
              key={t}
              className="absolute top-0 text-[9px] text-[#9a8f96]"
              style={{ left: `${t}%`, transform: "translateX(-50%)" }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* лестница I–V */}
      <div className="mt-1.5 flex gap-1" title={LADDER[cs.level].desc}>
        {LADDER.map((l) => (
          <div
            key={l.level}
            className="h-1.5 flex-1 rounded-full"
            style={{
              background:
                l.level === 0
                  ? cs.level === 0
                    ? LEVEL_COLORS[0]
                    : "#2b2130"
                  : l.level <= cs.level
                    ? LEVEL_COLORS[l.level]
                    : "#2b2130",
            }}
          />
        ))}
      </div>
      <p className="mt-1.5 text-[11px] leading-snug text-[#9a8f96]">
        <span style={{ color }}>{LADDER[cs.level].name}.</span> {LADDER[cs.level].desc}
      </p>

      {/* журнал памяти */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="mt-3 flex w-full items-center justify-between rounded-sm border border-[#32233a] px-2.5 py-1.5 text-xs text-[#d6cfc2] transition-colors hover:border-[#c9a227]"
        aria-expanded={open}
      >
        <span>
          Журнал памяти · {cs.memories.length}{" "}
          {cs.memories.length === 1 ? "запись" : "записей"}
        </span>
        <span className="text-[#c9a227]">{open ? "▴" : "▾"}</span>
      </button>

      {open && (
        <div className="z-scroll mt-2 max-h-52 space-y-1.5 overflow-y-auto pr-1">
          {cs.memories.length === 0 && (
            <p className="py-2 text-center text-[11px] text-[#9a8f96]">
              Память пуста. Пока.
            </p>
          )}
          {[...cs.memories].reverse().map((m) => (
            <div
              key={m.id}
              className="flex items-start gap-2 rounded-sm bg-black/25 px-2 py-1.5 text-[11px]"
            >
              <ValenceChip valence={m.valence} />
              <div className="min-w-0">
                <p className="leading-snug text-[#d6cfc2]">«{m.label}»</p>
                <p className="text-[10px] text-[#9a8f96]">
                  {TAGS[m.tag].name} · День {m.day}, {m.phase.toLowerCase()}
                  {m.forgiven ? " · прощена Правом слова" : ""}
                </p>
              </div>
            </div>
          ))}
          <p className="pt-1 text-[10px] leading-snug text-[#9a8f96]">
            Δдоверия = валентность × вес тега × чувствительность (×
            {def.sensitivity.toFixed(2).replace(".", ",")}). Записи не тускнеют.
          </p>
        </div>
      )}
    </div>
  );
}
