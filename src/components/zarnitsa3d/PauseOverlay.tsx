"use client";

/* ============================================================
 * M1.10 «Пауза»: передышка у огня
 *
 *   Esc / P (или кнопка) — мир замирает: frameloop="never"
 *   останавливает все useFrame — огонь не тлеет, Мгла не дышит,
 *   отряд стоит. Последний кадр остаётся на холсте за панелью.
 *
 *   Из паузы можно: продолжить (Esc/P/кнопка), заглушить звук
 *   (общий тумблер аудио-движка) или выйти в титул — поход
 *   остаётся в сейве, с титула работает «Продолжить поход».
 * ============================================================ */

import { useState } from "react";
import { useZarnitsa } from "@/lib/zarnitsa/store";
import { audioEnabled, audioToggle } from "@/lib/zarnitsa/audio";

export function PauseOverlay() {
  const paused = useZarnitsa((s) => s.paused);
  const screen = useZarnitsa((s) => s.screen);
  const togglePause = useZarnitsa((s) => s.togglePause);
  const toTitle = useZarnitsa((s) => s.toTitle);
  const [sound, setSound] = useState(true);
  const [prevPaused, setPrevPaused] = useState(paused);

  // при открытии панели синхронизируем тумблер с аудио-движком
  // (подстройка состояния во время рендера — канон React вместо эффекта)
  if (paused !== prevPaused) {
    setPrevPaused(paused);
    if (paused) setSound(audioEnabled());
  }

  if (!paused || (screen !== "play" && screen !== "camp")) return null;
  const isDay = screen === "camp";

  return (
    <div className="pointer-events-auto absolute inset-0 z-[60] flex items-center justify-center bg-[#05030a]/78 p-4 backdrop-blur-[3px]">
      <section className="z-panel z-fadein w-full max-w-sm p-7 text-center" aria-label="пауза">
        <p className="text-[10px] uppercase tracking-[0.45em] text-[#c9a227]/80">
          передышка у огня
        </p>
        <h2 className="z-heading mt-2 text-4xl font-bold tracking-[0.12em] text-[#d6cfc2]">
          Пауза
        </h2>
        <p className="mt-3 text-xs leading-relaxed text-[#9a8f96]">
          {isDay
            ? "Утро подождёт: хворост не рассыпется, разговоры никуда не уйдут."
            : "Мгла замерла за кольцом света. Костёр держится — и ждёт твоего слова."}
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={togglePause}
            className="rounded-sm border border-[#c9a227] bg-[#7b2d35]/25 px-4 py-3 text-sm font-semibold tracking-wide text-[#c9a227] transition-all hover:bg-[#7b2d35]/45 hover:shadow-[0_0_20px_rgba(201,162,39,0.22)]"
            title="Мир снова задышит"
          >
            ▶ Продолжить <span className="ml-1 text-[10px] font-normal text-[#9a8f96]">Esc / P</span>
          </button>
          <button
            onClick={() => setSound(audioToggle())}
            className="rounded-sm border border-[#32233a] bg-black/30 px-4 py-2.5 text-sm text-[#d6cfc2] transition-colors hover:border-[#c9a227]/60"
            title="Общий тумблер звука — тот же, что в шапке"
          >
            {sound ? "звук: включён ✓" : "звук: заглушён ✕"}
          </button>
          <button
            onClick={toTitle}
            className="rounded-sm border border-[#32233a] bg-black/30 px-4 py-2.5 text-sm text-[#9a8f96] transition-colors hover:border-[#7b2d35] hover:text-[#d6cfc2]"
            title="Поход сохранён — с титула его можно продолжить"
          >
            ⌂ Выйти в титул
          </button>
        </div>
        <p className="mt-5 text-[10px] leading-relaxed text-[#6a5f66]">
          мир стоит, пока ты дышишь. Мгла умеет ждать — но не она выйдет первой.
        </p>
      </section>
    </div>
  );
}
