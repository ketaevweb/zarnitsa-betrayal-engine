"use client";

/* ============================================================
 * ЗАРНИЦА: КЛЯТВА — браузерный прототип движка предательства
 * Демо «Три ночи»: 12 решений, 4 спутника, лестница I–V
 * ============================================================ */

import { useMemo, useState } from "react";
import { COMPANIONS, LADDER } from "@/lib/zarnitsa/data";
import {
  applyChoice,
  buildEnding,
  debugDrainAll,
  debugReset,
  fmtDelta,
  fmtTrust,
  resolveSpeech,
  withPhase,
  type SpeechOption,
} from "@/lib/zarnitsa/engine";
import { EVENTS } from "@/lib/zarnitsa/scenario";
import type { GameState } from "@/lib/zarnitsa/types";
import { CompanionCard, LevelBadge } from "@/components/zarnitsa/CompanionCard";
import { SpeechDialog } from "@/components/zarnitsa/SpeechDialog";
import { EndScreen } from "@/components/zarnitsa/EndScreen";

type Screen = "title" | "play" | "end";

const LOG_CLASS: Record<string, string> = {
  memory: "z-log-memory",
  level: "z-log-level",
  speech: "z-log-speech",
  catalyst: "z-log-catalyst",
  order: "z-log-order",
  system: "z-log-system",
  finale: "z-log-finale",
  trust: "z-log-memory",
};

const PHASE_GLYPH: Record<string, string> = {
  Утро: "ᚱ",
  День: "☀",
  Вечер: "☾",
  Ночь: "ᛝ",
};

export default function Home() {
  const [screen, setScreen] = useState<Screen>("title");
  const [state, setState] = useState<GameState>(() => debugReset());
  const [eventIndex, setEventIndex] = useState(0);
  const [pulse, setPulse] = useState(0); // ключ для анимации новых записей
  const [pultOpen, setPultOpen] = useState(false);

  const ev = EVENTS[Math.min(eventIndex, EVENTS.length - 1)];

  const ending = useMemo(() => (screen === "end" ? buildEnding(state) : null), [screen, state]);

  function start() {
    const fresh = debugReset();
    setState(fresh);
    setEventIndex(0);
    setScreen("play");
  }

  function choose(choiceIndex: number) {
    const choice = ev.choices[choiceIndex];
    const phased = withPhase(state, ev.day, ev.phase);
    const next = applyChoice(phased, choice);
    setState(next);
    setPulse((p) => p + 1);
    if (next.finished) {
      setScreen("end");
      return;
    }
    setEventIndex((i) => Math.min(i + 1, EVENTS.length - 1));
  }

  function resolveSpeechOption(option: SpeechOption) {
    if (!state.speechTarget) return;
    setState(resolveSpeech(state, state.speechTarget, option));
    setPulse((p) => p + 1);
  }

  /* ---------------- титульный экран ---------------- */
  if (screen === "title") {
    return (
      <div className="z-root flex min-h-screen flex-col">
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-12 sm:px-6">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.4em] text-[#c9a227]">
            Браузерный прототип · M0
          </p>
          <h1 className="z-heading mt-3 text-center text-5xl font-bold leading-none sm:text-7xl">
            ЗАРНИЦА
            <span className="mt-1 block text-2xl font-semibold tracking-[0.35em] text-[#7b2d35] sm:text-3xl">
              КЛЯТВА
            </span>
          </h1>
          <p className="mt-5 text-center text-sm leading-relaxed text-[#9a8f96]">
            Демо «Три ночи»: 12 решений, 4 спутника, ≈10 минут. Отряд идёт к Столпу
            присяги. Мгла слушает. Память — не тускнеет.
          </p>

          <div className="z-panel mt-8 p-5">
            <p className="z-heading text-lg font-semibold text-[#c9a227]">
              Движок предательства — правила в коде
            </p>
            <ul className="mt-3 space-y-2.5 text-sm leading-snug">
              <li className="flex gap-2.5">
                <span className="text-[#c9a227]">❖</span>
                <span>
                  <b>Память отряда.</b> Каждый выбор — запись: тег + валентность
                  (−3…+3). Записи не удаляются и не тускнеют никогда.
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="text-[#c9a227]">❖</span>
                <span>
                  <b>Формула доверия.</b> Δ = валентность × вес тега (личный у каждого) ×
                  чувствительность. Всё видно в журнале.
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="text-[#c9a227]">❖</span>
                <span>
                  <b>Лестница I–V.</b> Пороги доверия 60/40/25/10. Разрыв (V) — только
                  сюжет.
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="text-[#c9a227]">❖</span>
                <span>
                  <b>Право слова.</b> На ступенях III–IV переход замораживается: у тебя
                  один шанс сказать слово — или промолчать.
                </span>
              </li>
            </ul>
          </div>

          <div className="mt-8 flex flex-col items-center gap-4">
            <button
              onClick={start}
              className="rounded-sm border border-[#c9a227] bg-[#7b2d35]/25 px-10 py-4 text-lg font-semibold tracking-wide text-[#c9a227] transition-all hover:bg-[#7b2d35]/45 hover:shadow-[0_0_24px_rgba(201,162,39,0.25)]"
            >
              ⚔ Начать поход
            </button>
            <p className="text-center text-[11px] text-[#9a8f96]">
              Прототип зеркалит ядро Godot-каркаса M0 (memory_log + betrayal_engine).
              <br />Тот же движок — другая оболочка.
            </p>
          </div>
        </main>
        <footer className="mt-auto border-t border-[#32233a] py-4 text-center text-[11px] text-[#9a8f96]">
          ЗАРНИЦА: The Oath · прототип движка предательства · один разработчик, план v2.0
        </footer>
      </div>
    );
  }

  /* ---------------- финал ---------------- */
  if (screen === "end" && ending) {
    return (
      <EndScreen state={state} ending={ending} onRestart={() => setScreen("title")} />
    );
  }

  /* ---------------- игра ---------------- */
  const logNewestFirst = [...state.log].reverse();
  const companions = COMPANIONS.map((c) => state.party[c.id]);

  return (
    <div className="z-root min-h-screen pb-16">
      {/* шапка */}
      <header className="sticky top-0 z-40 border-b border-[#32233a] bg-[#0d0a10]/92 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 sm:px-6">
          <span className="z-heading text-lg font-bold tracking-wide">
            ЗАРНИЦА<span className="text-[#7b2d35]">: КЛЯТВА</span>
          </span>
          <span className="hidden text-[11px] text-[#9a8f96] sm:inline">
            прототип движка предательства
          </span>
          <span className="ml-auto flex items-center gap-3 text-xs sm:gap-4 sm:text-sm">
            <span className="text-[#d6cfc2]">
              {PHASE_GLYPH[ev.phase]} День {ev.day} · {ev.phase}
            </span>
            <span className="text-[#c9a227]" title="Проклятое золото отряда">
              ⛃ {state.gold}
            </span>
            <button
              onClick={() => setScreen("title")}
              className="rounded-sm border border-[#32233a] px-2 py-1 text-[11px] text-[#9a8f96] transition-colors hover:border-[#7b2d35] hover:text-[#d6cfc2]"
            >
              меню
            </button>
          </span>
        </div>
        {/* прогресс */}
        <div className="mx-auto flex max-w-6xl gap-1 px-4 pb-2 sm:px-6">
          {EVENTS.map((e, i) => (
            <div
              key={e.id}
              className="h-1 flex-1 rounded-full transition-colors"
              style={{
                background:
                  i < eventIndex ? "#7b2d35" : i === eventIndex ? "#c9a227" : "#2b2130",
              }}
              title={`${e.title} (день ${e.day})`}
            />
          ))}
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-5 px-4 pt-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* левая колонка: событие + летопись движка */}
        <div className="min-w-0 space-y-5">
          <section key={ev.id} className="z-panel z-fadein p-5 sm:p-7" aria-label={ev.title}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-sm border border-[#32233a] px-2 py-0.5 text-[11px] text-[#9a8f96]">
                День {ev.day} · {ev.phase}
              </span>
              {ev.isOrder && (
                <span className="rounded-sm border border-[#b3542f] bg-[#b3542f]/10 px-2 py-0.5 text-[11px] font-semibold text-[#b3542f]">
                  ПАУЗА ПРИСЯГИ · приказ
                </span>
              )}
              {ev.title.startsWith("⸸") && (
                <span className="rounded-sm border border-[#c9a227] bg-[#c9a227]/10 px-2 py-0.5 text-[11px] font-semibold text-[#c9a227]">
                  катализатор
                </span>
              )}
            </div>
            <h2 className="z-heading mt-2 text-2xl font-semibold sm:text-3xl">
              {ev.title.replace("⸸ ", "")}
            </h2>
            <div className="mt-3 space-y-2.5">
              {ev.text.map((p, i) => (
                <p key={i} className="text-sm leading-relaxed text-[#d6cfc2] sm:text-[15px]">
                  {p}
                </p>
              ))}
            </div>

            <div className="mt-5 space-y-2">
              {ev.choices.map((c, i) => (
                <button key={c.id} onClick={() => choose(i)} className="z-choice">
                  <span className="block text-sm font-medium sm:text-[15px]">{c.label}</span>
                  {c.note && (
                    <span className="mt-0.5 block text-xs italic text-[#9a8f96]">
                      {c.note}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </section>

          {/* летопись движка */}
          <section className="z-panel p-4 sm:p-5" aria-label="Летопись движка">
            <div className="flex items-center justify-between">
              <h3 className="z-heading text-base font-semibold text-[#c9a227]">
                Летопись движка
              </h3>
              <span className="text-[10px] text-[#9a8f96]">
                Δ = валентность × вес × чувствительность
              </span>
            </div>
            <div
              key={pulse}
              className="z-scroll mt-3 max-h-72 space-y-1.5 overflow-y-auto pr-1"
            >
              {logNewestFirst.map((entry) => (
                <div
                  key={entry.id}
                  className={`rounded-sm bg-black/20 px-3 py-1.5 text-xs leading-snug ${
                    LOG_CLASS[entry.kind] ?? "z-log-system"
                  }`}
                >
                  <span className="text-[#d6cfc2]">{entry.text}</span>
                  {typeof entry.delta === "number" && Math.abs(entry.delta) > 0.001 && (
                    <span
                      className={`ml-2 font-semibold tabular-nums ${
                        entry.delta > 0 ? "text-[#8fbc8d]" : "text-[#e08a8a]"
                      }`}
                    >
                      Δ {fmtDelta(entry.delta)}
                    </span>
                  )}
                  {typeof entry.trustAfter === "number" && (
                    <span className="ml-2 text-[10px] tabular-nums text-[#9a8f96]">
                      доверие {fmtTrust(entry.trustAfter)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* пульт испытателя */}
          <section className="z-panel p-4">
            <button
              onClick={() => setPultOpen((v) => !v)}
              className="flex w-full items-center justify-between text-xs text-[#9a8f96] transition-colors hover:text-[#d6cfc2]"
              aria-expanded={pultOpen}
            >
              <span>⚙ Пульт испытателя — быстро показать работу движка</span>
              <span className="text-[#c9a227]">{pultOpen ? "▴" : "▾"}</span>
            </button>
            {pultOpen && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setState(debugDrainAll(state, -15));
                    setPulse((p) => p + 1);
                  }}
                  className="rounded-sm border border-[#7b2d35] px-3 py-1.5 text-xs text-[#d6cfc2] hover:bg-[#7b2d35]/30"
                >
                  −15 доверия всем
                </button>
                <button
                  onClick={() => {
                    setState(debugDrainAll(state, -45));
                    setPulse((p) => p + 1);
                  }}
                  className="rounded-sm border border-[#8c1f28] px-3 py-1.5 text-xs text-[#d6cfc2] hover:bg-[#8c1f28]/30"
                >
                  обрушить всех на −45 (право слова)
                </button>
                <button
                  onClick={() => {
                    setState(debugDrainAll(state, 25));
                    setPulse((p) => p + 1);
                  }}
                  className="rounded-sm border border-[#32233a] px-3 py-1.5 text-xs text-[#d6cfc2] hover:border-[#c9a227]"
                >
                  +25 доверия всем
                </button>
                <button
                  onClick={start}
                  className="rounded-sm border border-[#32233a] px-3 py-1.5 text-xs text-[#9a8f96] hover:border-[#c9a227]"
                >
                  ⟲ сброс прогона
                </button>
                <p className="mt-1 w-full text-[10px] leading-snug text-[#9a8f96]">
                  Пульт принудительно меняет доверие, чтобы на демонстрации сразу
                  увидеть заморозку перехода, Право слова и отказы в приказах (порог
                  60/40/25/10).
                </p>
              </div>
            )}
          </section>
        </div>

        {/* правая колонка: отряд */}
        <aside className="min-w-0 space-y-3" aria-label="Отряд">
          <h3 className="z-heading px-1 text-sm font-semibold uppercase tracking-[0.2em] text-[#9a8f96]">
            Отряд · лестница предательства
          </h3>
          {companions.map((cs) => (
            <CompanionCard key={cs.id} cs={cs} />
          ))}
          <div className="z-panel p-3 text-[11px] leading-snug text-[#9a8f96]">
            <p className="mb-1 font-semibold text-[#d6cfc2]">Ступени движения:</p>
            <div className="flex flex-wrap gap-1.5">
              {LADDER.map((l) => (
                <LevelBadge key={l.level} level={l.level} small />
              ))}
            </div>
            <p className="mt-2">
              Пороги доверия: I &lt; 60 · II &lt; 40 · III &lt; 25 · IV &lt; 10. V — только
              сюжет.
            </p>
          </div>
        </aside>
      </main>

      {/* право слова */}
      {state.speechTarget && (
        <SpeechDialog
          state={state}
          companionId={state.speechTarget}
          onResolve={resolveSpeechOption}
        />
      )}
    </div>
  );
}
