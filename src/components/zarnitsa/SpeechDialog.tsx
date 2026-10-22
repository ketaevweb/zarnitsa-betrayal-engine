"use client";

/* ============================================================
 * ЗАРНИЦА — Право слова: принудительный диалог на ступени III–IV
 * ============================================================ */

import { COMPANION_BY_ID } from "@/lib/zarnitsa/data";
import { speechOptions, type SpeechOption } from "@/lib/zarnitsa/engine";
import type { GameState } from "@/lib/zarnitsa/types";

const FLAVOR: Record<string, string> = {
  gavrila:
    "«Я с тобой через три войны ходил, командир. Объясни мне это. Глядя в глаза».",
  khodata: "Ходата протягивает бересту. НА БЕРЕСТЕ: «Я ВИДЕЛ. Я ВСЁ ВИДЕЛ».",
  miluta:
    "«Тетрадь не лжёт, командир. Люди — могут. Вот и объясни тетради».",
  ratmir:
    "«Я верил тебе. Скажи, что я неправ. Скажи — и я снова пойду первым».",
};

const OPTIONS: {
  id: SpeechOption;
  title: string;
  desc: string;
}[] = [
  {
    id: "confess",
    title: "Признать вину",
    desc: "Исповедь у костра. Старые записи останутся — поверх них ляжет честная (+2). Доверие вырастет.",
  },
  {
    id: "justify",
    title: "Оправдаться ложью",
    desc: "Новая запись: «ложь −2». Память не тускнеет — и это он тоже запомнит.",
  },
  {
    id: "gift",
    title: "Дар: 10 проклятых монет",
    desc: "Золото в обмен на тишину. Реакция у каждого своя — и не всегда та, что ждёшь.",
  },
  {
    id: "silence",
    title: "Промолчать",
    desc: "Право слова потрачено впустую. Переход совершится немедленно.",
  },
];

export function SpeechDialog({
  state,
  companionId,
  onResolve,
}: {
  state: GameState;
  companionId: string;
  onResolve: (option: SpeechOption) => void;
}) {
  const def = COMPANION_BY_ID[companionId];
  const cs = state.party[companionId];
  const opts = speechOptions(state, companionId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Право слова: ${def.name}`}
    >
      <div className="z-panel z-fadein w-full max-w-lg border-[#c9a227]/60 p-5 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#c9a227]">
          Право слова
        </p>
        <h3 className="z-heading mt-1 text-2xl font-semibold">
          {def.name} остановился на пороге
        </h3>
        <p className="mt-3 text-sm italic leading-relaxed text-[#d6cfc2]">
          {FLAVOR[companionId]}
        </p>
        <p className="mt-2 text-[11px] text-[#9a8f96]">
          Ступень {cs.pendingSpeechLevel} · переход заморожен, пока не скажешь слово. Право
          слова — один раз на каждую ступень.
        </p>

        <div className="mt-5 space-y-2">
          {OPTIONS.map((o) => {
            const disabled = o.id === "gift" && !opts.giftAvailable;
            return (
              <button
                key={o.id}
                onClick={() => !disabled && onResolve(o.id)}
                disabled={disabled}
                className={`z-choice ${disabled ? "cursor-not-allowed opacity-40 hover:translate-x-0 hover:border-[#32233a]" : ""}`}
              >
                <span className="block text-sm font-semibold">{o.title}</span>
                <span className="mt-0.5 block text-xs leading-snug text-[#9a8f96]">
                  {o.desc}
                  {o.id === "gift" && !opts.giftAvailable
                    ? " — в кошеле нет 10 монет."
                    : ""}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
