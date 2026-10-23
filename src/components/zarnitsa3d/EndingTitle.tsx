"use client";

/* ============================================================
 * ЗАРНИЦА: КЛЯТВА — M1.6 «Титул развязки»
 *
 * Полноэкранная заставка концовки перед летописью: титул похода
 * (M1.5) проявляется по центру — цвет и свечение по характеру
 * развязки. Клик / Enter / Space открывают летопись.
 * ============================================================ */

import { useEffect, useState } from "react";
import type { GameState } from "@/lib/zarnitsa/types";
import { EndScreen } from "@/components/zarnitsa/EndScreen";
import { sfxOpen } from "@/lib/zarnitsa/audio";

/** палитра титула по характеру концовки */
function titleTone(title: string): { main: string; glow: string; line: string } {
  if (title.includes("НОЖ")) return { main: "#d95f3b", glow: "rgba(140,31,40,0.55)", line: "#8c1f28" };
  if (title.includes("ЖИВЫМИ")) return { main: "#8fbc8d", glow: "rgba(125,168,123,0.4)", line: "#5a7a5c" };
  if (title.includes("ТРЕЩИНАХ")) return { main: "#c9a227", glow: "rgba(201,162,39,0.35)", line: "#7a6420" };
  if (title.includes("МГЛОЙ")) return { main: "#a9bccf", glow: "rgba(91,122,153,0.4)", line: "#5b7a99" };
  return { main: "#e8d48a", glow: "rgba(201,162,39,0.5)", line: "#c9a227" };
}

type EndingOfEndScreen = Parameters<typeof EndScreen>[0]["ending"];

export function EndingTitle({
  state,
  ending,
  onRestart,
}: {
  state: GameState;
  ending: EndingOfEndScreen;
  onRestart: () => void;
}) {
  const [opened, setOpened] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const open = () => {
    if (opened) return;
    sfxOpen();
    setOpened(true);
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [opened]);

  if (opened) {
    return (
      <div className="absolute inset-0 z-30 overflow-y-auto">
        <EndScreen state={state} ending={ending} onRestart={onRestart} />
      </div>
    );
  }

  const title = ending.title ?? "Три ночи прошли";
  const tone = titleTone(title);

  return (
    <div
      onClick={open}
      className="absolute inset-0 z-30 flex cursor-pointer select-none flex-col items-center justify-center"
      style={{ background: "radial-gradient(ellipse at 50% 42%, #14101f 0%, #07060b 68%)" }}
      role="button"
      aria-label="открыть летопись"
    >
      <p
        className="text-[11px] uppercase tracking-[0.55em] text-[#8a7f86]"
        style={{ opacity: shown ? 1 : 0, transition: "opacity 1.5s ease" }}
      >
        развязка
      </p>
      <h1
        className="z-heading mt-6 px-4 text-center text-4xl font-bold sm:text-6xl"
        style={{
          color: tone.main,
          textShadow: `0 0 44px ${tone.glow}`,
          opacity: shown ? 1 : 0,
          transform: shown ? "none" : "translateY(12px)",
          transition: "opacity 1.7s ease, transform 1.7s ease, letter-spacing 2.6s ease",
          letterSpacing: shown ? "0.06em" : "0.24em",
        }}
      >
        {title}
      </h1>
      <div
        className="mt-7"
        style={{
          width: shown ? 240 : 32,
          height: 1,
          background: tone.line,
          opacity: shown ? 0.9 : 0,
          transition: "width 2.1s ease, opacity 1.8s ease",
        }}
      />
      <p
        className="mt-6 max-w-md px-6 text-center text-sm leading-relaxed text-[#d6cfc2]"
        style={{ opacity: shown ? 1 : 0, transition: "opacity 1.9s ease 0.4s" }}
      >
        {ending.subtitle ?? ""}
      </p>
      <p className="absolute bottom-9 animate-pulse text-[11px] uppercase tracking-[0.32em] text-[#6a5f66]">
        нажмите — открыть летопись
      </p>
    </div>
  );
}
