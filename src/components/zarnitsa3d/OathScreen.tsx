"use client";

/* ============================================================
 * ЗАРНИЦА: КЛЯТВА — M1.8 «Обет»
 *
 * Ритуал начала похода: между титулом и первой ночью игрок
 * произносит клятву у Столпа присяги — те слова, которые Мгла
 * будет проверять все три ночи. Обет можно и промолчать:
 * движок предательства заметит молчание и вернёт его в развязке
 * («клятва дрожала с первого слова»), а летопись походов
 * отметит такую запись знаком ⸸.
 *
 * M1.11 «Мгла помнит»: летопись завершённых походов читается
 * обратно — Столп узнаёт вернувшегося игрока и называет счёт
 * походов; Мгла помнит, чем кончился прошлый раз.
 * ============================================================ */

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useZarnitsa } from "@/lib/zarnitsa/store";
import {
  getChronicle,
  getChronicleServer,
  pastMemory,
  subscribeChronicle,
} from "@/lib/zarnitsa/chronicle";

const OATH_LINES = [
  "Стоять у огня, пока стоит ночь.",
  "Голосам Мглы не отвечать. Своих не отдавать.",
  "Ни за золото, ни за страх, ни за жалость.",
  "Столп помнит. Лес помнит. И я помню.",
];

/** порядковое слово для счётчика походов (летопись хранит максимум восемь) */
const RUN_ORDINALS = [
  "первый",
  "второй",
  "третий",
  "четвёртый",
  "пятый",
  "шестой",
  "седьмой",
  "восьмой",
];

export function OathScreen() {
  const oathSay = useZarnitsa((s) => s.oathSay);
  const entries = useSyncExternalStore(subscribeChronicle, getChronicle, getChronicleServer);
  const last = entries.length ? (entries[entries.length - 1] ?? null) : null;
  const [shown, setShown] = useState(false);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const swear = () => {
    if (mutedRef.current) return;
    oathSay(false);
  };

  const keepSilent = () => {
    if (mutedRef.current) return;
    mutedRef.current = true;
    setMuted(true);
    // тишина длится ровно столько, сколько нужно, чтобы её заметить
    window.setTimeout(() => oathSay(true), 1700);
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        swear();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  return (
    <div
      className="absolute inset-0 z-30 flex select-none flex-col items-center justify-center px-4"
      style={{ background: "radial-gradient(ellipse at 50% 38%, #120d18 0%, #07060b 70%)" }}
    >
      <p
        className="text-[11px] uppercase tracking-[0.55em] text-[#8a7f86]"
        style={{ opacity: shown ? 1 : 0, transition: "opacity 1.4s ease" }}
      >
        столп присяги · перед первой ночью
      </p>

      {/* M1.11 «Мгла помнит»: Столп узнаёт вернувшегося игрока по следу прошлой развязки */}
      {last && (
        <div
          className="mt-5 max-w-xl text-center"
          style={{ opacity: shown ? 1 : 0, transition: "opacity 1.5s ease 0.25s" }}
        >
          <p className="text-[13px] italic leading-relaxed text-[#7d7381]">
            Столп узнаёт тебя: это твой {RUN_ORDINALS[entries.length - 1] ?? `${entries.length}-й`} поход.
          </p>
          <p className="mt-1 text-[13px] italic leading-relaxed text-[#6f6470]">
            Мгла помнит: в прошлый раз {pastMemory(last.title)}.
            {last.oath && (
              <span className="block text-[#5f565c]">
                Тогда обет был молчанием — тишину хранят рядом с ножом.
              </span>
            )}
          </p>
        </div>
      )}

      <div className="mt-8 max-w-xl space-y-4 text-center">
        {OATH_LINES.map((line, i) => (
          <p
            key={line}
            className="z-heading text-lg leading-relaxed text-[#e8d48a] sm:text-xl"
            style={{
              opacity: shown ? 1 : 0,
              transform: shown ? "none" : "translateY(8px)",
              transition: `opacity 1.2s ease ${0.35 * i + 0.3}s, transform 1.2s ease ${0.35 * i + 0.3}s`,
              textShadow: "0 0 28px rgba(201,162,39,0.22)",
            }}
          >
            {line}
          </p>
        ))}
        <p
          className="pt-1 text-sm italic leading-relaxed text-[#9a8f96]"
          style={{ opacity: shown ? 1 : 0, transition: "opacity 1.4s ease 1.9s" }}
        >
          Это клятва. Пусть проверит её Мгла.
        </p>
      </div>

      <div
        className="mt-6"
        style={{
          width: shown ? 200 : 24,
          height: 1,
          background: "#7a6420",
          opacity: shown ? 0.85 : 0,
          transition: "width 2s ease 1.4s, opacity 1.6s ease 1.4s",
        }}
      />

      {/* выбор: произнести — или молчать. Мгла различает и то, и другое */}
      <div
        className="mt-9 flex flex-col items-center gap-3"
        style={{ opacity: shown ? 1 : 0, transition: "opacity 1.3s ease 2.3s" }}
      >
        {muted ? (
          <p className="z-fadein text-center text-base tracking-wide text-[#a9bccf]">
            Ты промолчал.
            <span className="mt-1 block text-sm text-[#7a8aa0]">Ночь заметила. Летопись тоже.</span>
          </p>
        ) : (
          <>
            <button
              onClick={swear}
              className="rounded-sm border border-[#c9a227] bg-[#7b2d35]/25 px-10 py-4 text-lg font-semibold tracking-wide text-[#c9a227] transition-all hover:bg-[#7b2d35]/45 hover:shadow-[0_0_24px_rgba(201,162,39,0.25)]"
            >
              Произнести обет
            </button>
            <button
              onClick={keepSilent}
              className="text-[11px] tracking-[0.2em] text-[#5f565c] underline decoration-[#2a2230] underline-offset-4 transition-colors hover:text-[#9a8f96]"
            >
              …молчать
            </button>
          </>
        )}
      </div>

      <p
        className="absolute bottom-8 max-w-md px-6 text-center text-[10px] leading-relaxed text-[#4f474d]"
        style={{ opacity: shown ? 1 : 0, transition: "opacity 1.6s ease 2.7s" }}
      >
        то, что прозвучало у Столпа, Столп помнит — и то, что прозвучало в тишине, тоже
      </p>
    </div>
  );
}
