"use client";

/* HUD 3D-версии: титул, шапка, мини-карточки, модалки, летопись, рассвет */

import { useEffect, useMemo, useRef, useState } from "react";
import { COMPANIONS, LADDER, COMPANION_BY_ID } from "@/lib/zarnitsa/data";
import { fmtDelta, fmtTrust, type SpeechOption } from "@/lib/zarnitsa/engine";
import {
  FINALE_EVENT_ID,
  SCENE_EVENTS,
  TALK_ACTIONS,
  nightEvents,
  talkAvailable,
} from "@/lib/zarnitsa/scenario3d";
import { nightTitle, savedNight, useZarnitsa } from "@/lib/zarnitsa/store";
import { PILLAR_FUEL, mglLive } from "@/lib/zarnitsa/camp3d";
import { DAY_TASKS_TOTAL, dayTitle, echoLine } from "@/lib/zarnitsa/day";
import { WHISPERS } from "@/lib/zarnitsa/whispers";
import {
  audioEnabled,
  audioToggle,
  setHeartbeat,
  sfxBell,
  sfxClick,
  sfxDawn,
  sfxOpen,
} from "@/lib/zarnitsa/audio";
import { CompanionCard, LevelBadge } from "@/components/zarnitsa/CompanionCard";
import { SpeechDialog } from "@/components/zarnitsa/SpeechDialog";
import { EndScreen } from "@/components/zarnitsa/EndScreen";
import { Minimap } from "./Minimap";
import { touchInput } from "./campLife";

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

/* ---------------- мини-карточка спутника ---------------- */

function MiniCard({ cid }: { cid: string }) {
  const cs = useZarnitsa((s) => s.state.party[cid]);
  const setDrawer = useZarnitsa((s) => s.setDrawer);
  if (!cs || cs.gone) return null;
  const def = COMPANION_BY_ID[cid];
  const color = cs.frozen ? "#c9a227" : ["#7da87b", "#c9a227", "#b3542f", "#d95f3b", "#8c1f28", "#5a1020"][cs.level];
  return (
    <button
      onClick={() => setDrawer("party")}
      className={`pointer-events-auto z-panel w-44 px-2.5 py-1.5 text-left transition-transform hover:-translate-y-0.5 ${
        cs.frozen ? "z-frozen" : ""
      }`}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-sm text-[#c9a227]">{def.glyph}</span>
        <span className="z-heading text-[13px] font-semibold text-[#d6cfc2]">{def.name}</span>
        <span
          className="ml-auto rounded-sm px-1 text-[10px] font-bold"
          style={{ background: `${color}22`, border: `1px solid ${color}`, color }}
        >
          {cs.frozen ? "⸸" : LADDER[cs.level].short}
        </span>
      </div>
      <div className="relative mt-1 h-1.5 overflow-hidden rounded-full bg-black/45">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
          style={{ width: `${cs.trust}%`, background: color }}
        />
        {[10, 25, 40, 60].map((t) => (
          <div key={t} className="absolute inset-y-0 w-px bg-black/60" style={{ left: `${t}%` }} />
        ))}
      </div>
      <div className="mt-0.5 text-[10px] tabular-nums text-[#9a8f96]">
        доверие {fmtTrust(cs.trust)} · {cs.memories.length} записей
      </div>
    </button>
  );
}

/* ---------------- шапка ---------------- */

function SoundButton() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOn(audioEnabled()), 0);
    return () => clearTimeout(t);
  }, []);
  return (
    <button
      onClick={() => setOn(audioToggle())}
      className={`rounded-sm border px-2 py-1 text-[11px] transition-colors ${
        on
          ? "border-[#c9a227] text-[#c9a227]"
          : "border-[#32233a] text-[#9a8f96] hover:border-[#c9a227] hover:text-[#d6cfc2]"
      }`}
    >
      {on ? "звук ✓" : "звук ✕"}
    </button>
  );
}

/* счётчик событий текущей ночи */

function NightChip() {
  const night = useZarnitsa((s) => s.night);
  const doneToday = useZarnitsa((s) => s.doneToday);
  const dayDone = useZarnitsa((s) => s.dayDone);
  const dayMode = useZarnitsa((s) => s.dayMode);
  const state = useZarnitsa((s) => s.state);

  // дневной обход (M1.1): сколько утренних дел осталось
  if (dayMode) {
    const talksLeft = COMPANIONS.filter(
      (c) => !state.party[c.id]?.gone && !dayDone.includes(`dtalk_${c.id}_d${night + 1}`),
    ).length;
    const woodLeft = 3 - dayDone.filter((d) => d.startsWith("b")).length;
    const left = talksLeft + woodLeft;
    return (
      <span
        className="hidden rounded-sm border border-[#32233a] bg-black/30 px-2 py-0.5 text-[11px] tabular-nums text-[#9a8f96] md:inline"
        title="Утренние дела: разговоры с отрядом и вязанки хвороста для завтрашнего костра"
      >
        дела дня: осталось <b className="text-[#d6cfc2]">{left}</b>/{DAY_TASKS_TOTAL}
      </span>
    );
  }

  const list = nightEvents(night);
  const k = list.filter((e) => doneToday.includes(e.id)).length;
  return (
    <span
      className="hidden rounded-sm border border-[#32233a] bg-black/30 px-2 py-0.5 text-[11px] tabular-nums text-[#9a8f96] md:inline"
      title="Сколько событий ночи пройдено — золотые и серые маркеры на поляне"
    >
      события ночи <b className="text-[#d6cfc2]">{k}</b>/{list.length}
    </span>
  );
}

/* шкала костра (M0.8): топливо + поленья в руках */

function FireGauge() {
  const fuel = useZarnitsa((s) => s.fire.fuel);
  const carried = useZarnitsa((s) => s.fire.carried);
  const dayMode = useZarnitsa((s) => s.dayMode);
  const low = fuel < 25;
  const rite = fuel >= PILLAR_FUEL;
  const color = fuel <= 0 ? "#5a5560" : low ? "#d95f3b" : "#ff9a3c";
  // живой щит: что делает кольцо Мглы прямо сейчас (M0.9); днём костёр дремлет (M1.1)
  const shield = dayMode
    ? { text: "костёр дремлет", c: "#9a8f96" }
    : fuel <= 0
      ? { text: "Мгла в кольце!", c: "#e04a4a" }
      : low
        ? { text: "Мгла подступает", c: "#d95f3b" }
        : fuel < 55
          ? { text: "Мгла кружит", c: "#b08d5a" }
          : { text: "Костёр держит Мглу", c: "#c9a227" };
  return (
    <span
      className="flex items-center gap-1.5 rounded-sm border border-[#32233a] bg-black/30 px-2 py-0.5"
      title={`Костёр: топливо ${Math.round(fuel)}/100. Гаснет — Мгла подходит; у Столпа нужен живой огонь (≥ ${PILLAR_FUEL})`}
    >
      <span className="text-[13px] leading-none" style={{ color }}>
        ᛚ
      </span>
      <span className="relative h-1.5 w-14 overflow-hidden rounded-full bg-black/60 sm:w-20">
        <span
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-300 ${low ? "z-heartbeat" : ""}`}
          style={{ width: `${Math.max(2, fuel)}%`, background: color }}
        />
        <span
          className="absolute inset-y-0 w-px bg-[#c9a227]/60"
          style={{ left: `${PILLAR_FUEL}%` }}
          title={`порог обряда Столпа (${PILLAR_FUEL})`}
        />
      </span>
      <span
        className="hidden text-[10px] font-semibold leading-none sm:inline"
        style={{ color: shield.c }}
        title={dayMode ? "До сумерек огонь не нужен — хворост копится на завтра" : "Огонь — щит: слабеет костёр, ближе кольцо Мглы"}
      >
        {shield.text}
      </span>
      <span
        className="hidden text-[10px] tabular-nums text-[#9a8f96] md:inline"
        title="Поленьев в руках — принеси к костру и нажми E"
      >
        ×{carried}
      </span>
      {rite && (
        <span className="hidden text-[10px] text-[#c9a227] md:inline" title="Костёр достаточно жив для обряда Столпа">
          ⸸ обряд готов
        </span>
      )}
    </span>
  );
}

function TopBar() {
  const night = useZarnitsa((s) => s.night);
  const dayMode = useZarnitsa((s) => s.dayMode);
  const gold = useZarnitsa((s) => s.state.gold);
  const setDrawer = useZarnitsa((s) => s.setDrawer);
  const togglePult = useZarnitsa((s) => s.togglePult);
  const toggleMap = useZarnitsa((s) => s.toggleMap);
  const toggleJournal = useZarnitsa((s) => s.toggleJournal);
  const toTitle = useZarnitsa((s) => s.toTitle);

  return (
    <div className="pointer-events-auto flex items-center gap-3 bg-black/45 px-4 py-2 backdrop-blur-sm">
      <span className="z-heading text-base font-bold tracking-wide">
        ЗАРНИЦА<span className="text-[#7b2d35]">: КЛЯТВА</span>
      </span>
      <span className="hidden text-[11px] uppercase tracking-[0.25em] text-[#c9a227] sm:inline">
        {dayMode ? dayTitle(night + 1) || "Утренний обход" : nightTitle(night)}
      </span>
      <NightChip />
      <FireGauge />
      <span className="ml-auto flex items-center gap-2 text-xs">
        <span className="text-[#c9a227]" title="Проклятое золото отряда">
          ⛃ {gold}
        </span>
        <button
          onClick={toggleMap}
          className="rounded-sm border border-[#32233a] px-2 py-1 text-[11px] text-[#9a8f96] hover:border-[#c9a227] hover:text-[#d6cfc2]"
        >
          карта
        </button>
        <button
          onClick={toggleJournal}
          className="hidden rounded-sm border border-[#32233a] px-2 py-1 text-[11px] text-[#9a8f96] hover:border-[#c9a227] hover:text-[#d6cfc2] sm:inline"
        >
          летопись
        </button>
        <SoundButton />
        <button
          onClick={() => setDrawer("party")}
          className="rounded-sm border border-[#32233a] px-2 py-1 text-[11px] text-[#9a8f96] hover:border-[#c9a227] hover:text-[#d6cfc2]"
        >
          отряд
        </button>
        <button
          onClick={togglePult}
          className="rounded-sm border border-[#32233a] px-2 py-1 text-[11px] text-[#9a8f96] hover:border-[#c9a227] hover:text-[#d6cfc2]"
        >
          пульт
        </button>
        <a
          href="/?classic=1"
          className="rounded-sm border border-[#32233a] px-2 py-1 text-[11px] text-[#9a8f96] hover:border-[#c9a227] hover:text-[#d6cfc2]"
        >
          текст
        </a>
        <button
          onClick={toTitle}
          className="rounded-sm border border-[#32233a] px-2 py-1 text-[11px] text-[#9a8f96] hover:border-[#7b2d35] hover:text-[#d6cfc2]"
        >
          меню
        </button>
      </span>
    </div>
  );
}

/* ---------------- модалка события / разговора ---------------- */

/** печатающийся текст: ~0.9 с на полный текст, клик — показать сразу.
 *  Компонент монтируется с key={event.id} — сброс состояния бесплатен. */
function useTypedText(text: string[]) {
  const full = useMemo(() => text.join(""), [text]);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!full) return;
    const step = Math.max(4, Math.round(full.length / 55));
    const iv = setInterval(() => {
      setShown((s) => Math.min(full.length, s + step));
    }, 16);
    return () => clearInterval(iv);
  }, [full]);
  return { full, shown, done: shown >= full.length, complete: () => setShown(full.length) };
}

function EventModal() {
  const ev = useZarnitsa((s) => s.activeEvent);
  const choose = useZarnitsa((s) => s.choose);
  const typed = useTypedText(ev?.text ?? [""]);

  useEffect(() => {
    // разговоры открываются мягче, чем ключевые события (у тех — «удар» в openEvent)
    if (ev?.id.startsWith("talk_") || ev?.id.startsWith("dtalk_")) sfxOpen();
  }, [ev]);

  if (!ev) return null;
  const isTalk = ev.id.startsWith("talk_");
  const isDayTalk = ev.id.startsWith("dtalk_");
  // развязка (M1.4): финальная сцена предательства — красная кромка и свой бейдж
  const isFinale = ev.id === FINALE_EVENT_ID;

  // распределение напечатанных символов по абзацам (без мутаций и без хуков)
  const starts: number[] = [];
  let sum = 0;
  for (const p of ev.text) {
    starts.push(sum);
    sum += p.length;
  }
  const parts = ev.text.map((p, i) => {
    const start = starts[i];
    const take = typed.shown > start ? Math.min(p.length, typed.shown - start) : 0;
    return { p, take };
  });
  const typingIdx = parts.findIndex((x) => x.take < x.p.length);

  return (
    <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-black/55 p-4">
      <section
        className={`z-panel z-fadein max-h-[86vh] w-full max-w-2xl overflow-y-auto p-5 sm:p-7 ${
          isFinale ? "border-[#8c1f28]! shadow-[0_0_38px_rgba(140,31,40,0.35)]" : ""
        }`}
        aria-label={ev.title}
        onClick={typed.complete}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-sm border border-[#32233a] px-2 py-0.5 text-[11px] text-[#9a8f96]">
            {isDayTalk ? `День ${ev.day} · ${ev.phase}` : isTalk ? "разговор у костра" : `Ночь ${ev.day} · ${ev.phase}`}
          </span>
          {ev.isOrder && (
            <span className="rounded-sm border border-[#b3542f] bg-[#b3542f]/10 px-2 py-0.5 text-[11px] font-semibold text-[#b3542f]">
              ПАУЗА ПРИСЯГИ · приказ
            </span>
          )}
          {isFinale && (
            <span className="rounded-sm border border-[#8c1f28] bg-[#8c1f28]/15 px-2 py-0.5 text-[11px] font-semibold text-[#c96a5a]">
              ⸸ развязка
            </span>
          )}
          {ev.title.startsWith("⸸") && !isFinale && (
            <span className="rounded-sm border border-[#c9a227] bg-[#c9a227]/10 px-2 py-0.5 text-[11px] font-semibold text-[#c9a227]">
              катализатор
            </span>
          )}
        </div>
        <h2 className="z-heading mt-2 text-2xl font-semibold sm:text-3xl">
          {ev.title.replace("⸸ ", "")}
        </h2>
        <div className="mt-3 space-y-2.5">
          {parts.map(({ p, take }, i) => (
            <p key={i} className="text-sm leading-relaxed text-[#d6cfc2] sm:text-[15px]">
              {p.slice(0, take)}
              {i === typingIdx && (
                <span className="text-[#c9a227]">▍</span>
              )}
            </p>
          ))}
        </div>
        {!typed.done && (
          <p className="mt-1.5 text-right text-[10px] uppercase tracking-[0.2em] text-[#9a8f96]/70">
            клик — дальше
          </p>
        )}
        <div className="mt-5 space-y-2">
          {ev.choices.map((c, i) => (
            <button
              key={c.id}
              onClick={(e) => {
                e.stopPropagation();
                choose(i);
              }}
              className="z-choice"
            >
              <span className="block text-sm font-medium sm:text-[15px]">{c.label}</span>
              {c.note && (
                <span className="mt-0.5 block text-xs italic text-[#9a8f96]">{c.note}</span>
              )}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ---------------- меню разговора ---------------- */

function TalkMenu() {
  const cid = useZarnitsa((s) => s.talkMenu);
  const state = useZarnitsa((s) => s.state);
  const night = useZarnitsa((s) => s.night);
  const openTalk = useZarnitsa((s) => s.openTalk);
  const close = useZarnitsa((s) => s.closeTalkMenu);
  if (!cid) return null;
  const def = COMPANION_BY_ID[cid];
  const cs = state.party[cid];
  return (
    <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-black/55 p-4">
      <section className="z-panel z-fadein w-full max-w-md p-5" aria-label={`Разговор с ${def.name}`}>
        <div className="flex items-center gap-2">
          <span className="text-lg text-[#c9a227]">{def.glyph}</span>
          <h2 className="z-heading text-xl font-semibold">{def.name}</h2>
          <span className="text-[11px] text-[#9a8f96]">{def.title}</span>
        </div>
        <p className="mt-1.5 text-xs leading-snug text-[#9a8f96]">{def.value}</p>
        {cs && cs.frozen && (
          <p className="mt-2 rounded-sm border border-[#c9a227]/40 bg-[#c9a227]/10 px-2 py-1 text-[11px] text-[#c9a227]">
            ⸸ {def.name} ждёт Права слова — разговор не остановит ступень
          </p>
        )}
        <div className="mt-4 space-y-2">
          {TALK_ACTIONS.filter((a) => talkAvailable(state, cid, a.id, night)).map((a) => (
            <button key={a.id} onClick={() => openTalk(cid, a.id)} className="z-choice">
              <span className="block text-sm font-medium">{a.label}</span>
              <span className="mt-0.5 block text-xs italic text-[#9a8f96]">{a.note}</span>
            </button>
          ))}
          <button onClick={close} className="z-choice">
            <span className="block text-sm text-[#9a8f96]">Отойти молча</span>
          </button>
        </div>
        <p className="mt-3 text-[10px] leading-snug text-[#9a8f96]">
          Каждое действие — раз за ночь. «Уколоть за живое» бьёт по больному тегу:
          у каждого спутника своя трещина.
        </p>
      </section>
    </div>
  );
}

/* ---------------- ящик отряда ---------------- */

function PartyDrawer() {
  const drawer = useZarnitsa((s) => s.drawer);
  const state = useZarnitsa((s) => s.state);
  const setDrawer = useZarnitsa((s) => s.setDrawer);
  if (drawer !== "party") return null;
  return (
    <div className="pointer-events-auto absolute inset-y-0 right-0 z-40 w-full max-w-sm overflow-y-auto bg-[#0d0a10]/95 p-4 backdrop-blur">
      <div className="flex items-center justify-between">
        <h3 className="z-heading text-sm font-semibold uppercase tracking-[0.2em] text-[#9a8f96]">
          Отряд · лестница предательства
        </h3>
        <button
          onClick={() => setDrawer(null)}
          className="rounded-sm border border-[#32233a] px-2 py-1 text-[11px] text-[#9a8f96] hover:border-[#7b2d35] hover:text-[#d6cfc2]"
        >
          ✕
        </button>
      </div>
      <div className="mt-3 space-y-3">
        {COMPANIONS.map((c) => (
          <CompanionCard key={c.id} cs={state.party[c.id]} />
        ))}
        <div className="z-panel p-3 text-[11px] leading-snug text-[#9a8f96]">
          <div className="mb-1.5 flex flex-wrap gap-1.5">
            {LADDER.map((l) => (
              <LevelBadge key={l.level} level={l.level} small />
            ))}
          </div>
          Пороги доверия: I &lt; 60 · II &lt; 40 · III &lt; 25 · IV &lt; 10. V — только сюжет.
        </div>
      </div>
    </div>
  );
}

/* ---------------- пульт испытателя ---------------- */

function Pult() {
  const open = useZarnitsa((s) => s.pultOpen);
  const drain = useZarnitsa((s) => s.drain);
  const start = useZarnitsa((s) => s.start);
  if (!open) return null;
  return (
    <div className="pointer-events-auto z-panel z-fadein mx-4 mt-2 p-3">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => drain(-15)}
          className="rounded-sm border border-[#7b2d35] px-3 py-1.5 text-xs text-[#d6cfc2] hover:bg-[#7b2d35]/30"
        >
          −15 доверия всем
        </button>
        <button
          onClick={() => drain(-45)}
          className="rounded-sm border border-[#8c1f28] px-3 py-1.5 text-xs text-[#d6cfc2] hover:bg-[#8c1f28]/30"
        >
          обрушить всех на −45 (право слова)
        </button>
        <button
          onClick={() => drain(25)}
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
      </div>
      <p className="mt-1.5 text-[10px] leading-snug text-[#9a8f96]">
        Пульт для демонстрации механик. Довести спутника до Разрыва можно и без него —
        через «уколоть за живое» у костра и жёсткие решения.
      </p>
    </div>
  );
}

/* ---------------- титульный экран ---------------- */

function TitleScreen() {
  const start = useZarnitsa((s) => s.start);
  const resumeRun = useZarnitsa((s) => s.resumeRun);
  const hasSave = useZarnitsa((s) => s.hasSave);
  const refreshHasSave = useZarnitsa((s) => s.refreshHasSave);
  useEffect(() => {
    refreshHasSave();
  }, [refreshHasSave]);
  const saved = savedNight();
  return (
    <div className="pointer-events-auto absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#0d0a10]/72 p-4 backdrop-blur-[2px]">
      <p className="text-center text-xs font-semibold uppercase tracking-[0.4em] text-[#c9a227]">
        3D-прототип · M1.5 «Ворон на Столпе»
      </p>
      <h1 className="z-heading mt-3 text-center text-6xl font-bold leading-none sm:text-8xl">
        ЗАРНИЦА
        <span className="mt-1 block text-2xl font-semibold tracking-[0.35em] text-[#7b2d35] sm:text-3xl">
          КЛЯТВА
        </span>
      </h1>
      <p className="mt-4 max-w-xl text-center text-sm leading-relaxed text-[#9a8f96]">
        Три ночи под Мглой: ходи по поляне, находи события, говори с отрядом.
        Костёр живёт своим дыханием — носи поленья со штабелей, иначе Мгла
        подойдёт к самым спинам. Столп присяги принимает только живой огонь.
        Спутники бродят по лагерю, дозорные Мглы смотрят с опушки — и каждая
        ночь ближе.
      </p>
      <div className="z-panel mt-6 grid max-w-xl gap-2 p-4 text-xs text-[#9a8f96] sm:grid-cols-2">
        <span>
          <b className="text-[#d6cfc2]">WASD / стрелки</b> — движение
        </span>
        <span>
          <b className="text-[#d6cfc2]">E</b> — действие (маркер, спутник, костёр)
        </span>
        <span>
          <b className="text-[#d6cfc2]">M</b> — карта поляны · <b className="text-[#d6cfc2]">J</b> — летопись
        </span>
        <span>
          <b className="text-[#ff9a3c]">Костёр</b> — топливо тает, корми его
        </span>
        <span>
          <b className="text-[#7a8aa0]">Штабеля</b> — поленья (до двух в руках)
        </span>
        <span>
          <b className="text-[#c9a227]">Разговоры</b> — поддержка или «уколоть»
        </span>
      </div>
      {hasSave && (
        <button
          onClick={resumeRun}
          className="mt-7 rounded-sm border border-[#32233a] bg-black/35 px-8 py-3 text-base text-[#d6cfc2] transition-all hover:border-[#c9a227] hover:text-[#c9a227]"
        >
          ⟲ Продолжить поход{saved ? ` · Ночь ${saved}` : ""}
        </button>
      )}
      <button
        onClick={start}
        className="mt-4 rounded-sm border border-[#c9a227] bg-[#7b2d35]/25 px-10 py-4 text-lg font-semibold tracking-wide text-[#c9a227] transition-all hover:bg-[#7b2d35]/45 hover:shadow-[0_0_24px_rgba(201,162,39,0.25)]"
      >
        ⚔ Выйти в ночь
      </button>
      <a
        href="/?classic=1"
        className="mt-4 text-[11px] text-[#9a8f96] underline decoration-[#32233a] underline-offset-4 hover:text-[#d6cfc2]"
      >
        текстовая версия прототипа
      </a>
    </div>
  );
}

/* ---------------- оверлеи: интро ночи, рассвет ---------------- */

function IntroOverlay() {
  const intro = useZarnitsa((s) => s.intro);
  useEffect(() => {
    if (!intro) return;
    sfxBell();
    const t = setTimeout(() => useZarnitsa.setState({ intro: null }), 2600);
    return () => clearTimeout(t);
  }, [intro]);
  if (!intro) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
      <div className="z-fadein bg-black/40 px-10 py-6 text-center backdrop-blur-sm">
        <p className="z-heading text-3xl font-bold tracking-[0.2em] text-[#c9a227] sm:text-4xl">
          {intro}
        </p>
        <p className="mt-2 text-xs uppercase tracking-[0.3em] text-[#9a8f96]">
          Мгла слушает
        </p>
      </div>
    </div>
  );
}

/* ---------------- шёпот Мглы (M1.0) ---------------- */

function WhisperOverlay() {
  const w = useZarnitsa((s) => s.whisper);
  const resolve = useZarnitsa((s) => s.resolveWhisper);
  const def = WHISPERS.find((x) => x.id === w?.id);
  const typed = useTypedText(def ? [def.text] : [""]);
  if (!w || !def) return null;
  const typing = typed.shown < typed.full.length;
  return (
    <div className="pointer-events-auto absolute inset-0 z-[36] flex items-center justify-center bg-black/72 p-4 backdrop-blur-[3px]">
      <section
        className="z-panel z-fadein w-full max-w-md border-[#5a1020]/80 p-6 text-center"
        aria-label="шёпот мглы"
        onClick={typed.complete}
      >
        <p className="text-[10px] uppercase tracking-[0.45em] text-[#8c1f28]">
          шёпот мглы
        </p>
        <p className="mt-4 min-h-24 text-[15px] italic leading-relaxed text-[#d6cfc2] sm:text-base">
          «{typed.full.slice(0, typed.shown)}
          {typing && <span className="text-[#8c1f28]">▍</span>}»
        </p>
        {!typing && (
          <div className="z-fadein mt-5 flex flex-col gap-2">
            <button
              onClick={() => resolve(true)}
              className="rounded-sm border border-[#8c1f28] bg-[#5a1020]/25 px-3 py-2.5 text-left text-sm font-semibold text-[#e08a8a] transition-colors hover:bg-[#5a1020]/45"
              title="Мгла запомнит. Отряд запомнит."
            >
              ⸸ {def.accept}
            </button>
            <button
              onClick={() => resolve(false)}
              className="rounded-sm border border-[#32233a] bg-black/30 px-3 py-2.5 text-left text-sm text-[#d6cfc2] transition-colors hover:border-[#c9a227]/60"
              title="Стойкость — тихая память в пользу отряда"
            >
              ᛉ {def.reject}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function DawnOverlay() {
  const night = useZarnitsa((s) => s.night);
  const dawnGo = useZarnitsa((s) => s.dawnGo);
  const summary = useZarnitsa((s) => s.nightSummary);
  const echo = useZarnitsa((s) => s.whisperEcho);
  const walked = useZarnitsa((s) => s.dawnWalked);
  useEffect(() => {
    sfxDawn();
  }, []);
  const next = Math.min(night + 1, 3);
  // ворон (M1.3): прилетел на «шум» принятых шёпотов
  const accepted = echo.filter((e) => !e.spared).length;
  const crowLine =
    accepted >= 2
      ? "Ворон уже сидит у костра — падальщик чует, кто говорил с тьмой."
      : accepted === 1
        ? "Над лагерем кружит ворон — он приметил эту ночь."
        : null;
  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-[#0d0a10]/78 p-4 backdrop-blur-sm">
      {/* потоп рассвета: золотая волна по краям (M0.8) */}
      <div className="z-dawnflood pointer-events-none absolute inset-0 z-[42]" />
      <div className="z-panel z-fadein max-w-lg p-7 text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-[#9a8f96]">
          Ночь {night} пережита
        </p>
        <h2 className="z-heading mt-2 text-3xl font-bold text-[#c9a227]">
          Рассвет над Студёным лесом
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[#d6cfc2]">
          Мгла отступает до сумерек — но записи в памяти отряда не тускнеют.
          Обойди лагерь: поговори с отрядом, собери хворост — к ночи он
          разгорится ярче. Впереди: {nightTitle(next)}.
        </p>
        {mglLive.closest < 900 && (
          <p className="mt-2 text-xs leading-relaxed text-[#9a8f96]">
            Этой ночью дозорные подходили на{" "}
            <b className="text-[#c9a227]">{Math.round(mglLive.closest)}</b> шагов к огню
            {mglLive.closest <= 17 ? " — у самых спин. Отряд не забудет этот холод." : "."}
          </p>
        )}
        {crowLine && (
          <p className="mt-2 text-xs leading-relaxed italic text-[#8f8694]">{crowLine}</p>
        )}
        {walked.length > 0 && (
          <div className="z-fadein mt-3 border border-[#5a1020]/70 bg-[#5a1020]/15 p-3 text-left">
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#c96a5a]">
              рассвет забрал своё
            </p>
            <p className="mt-1 text-sm leading-relaxed text-[#d6cfc2]">
              {walked.map((cid) => COMPANION_BY_ID[cid]?.name ?? cid).join(" и ")}{" "}
              {walked.length === 1 ? "ушёл" : "ушли"} в Мглу прямо на рассвете — ступень IV не
              дождалась ни Права слова, ни Столпа. Нож остался у костра.
            </p>
          </div>
        )}
        {summary && summary.length > 0 && (
          <div className="z-panel mt-4 p-3 text-left">
            <p className="mb-1.5 text-[10px] uppercase tracking-[0.25em] text-[#9a8f96]">
              За эту ночь память изменилась
            </p>
            <ul className="space-y-1">
              {summary.map((r) => (
                <li key={r.cid} className="flex items-center gap-2 text-sm">
                  <span className="text-[#c9a227]">{COMPANION_BY_ID[r.cid]?.glyph}</span>
                  <span className="text-[#d6cfc2]">{COMPANION_BY_ID[r.cid]?.name ?? r.cid}</span>
                  <span
                    className={`ml-auto font-semibold tabular-nums ${
                      r.delta > 0 ? "text-[#8fbc8d]" : "text-[#e08a8a]"
                    }`}
                  >
                    Δ {fmtDelta(r.delta)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <button
          onClick={dawnGo}
          className="mt-5 rounded-sm border border-[#c9a227] bg-[#7b2d35]/25 px-8 py-3 font-semibold text-[#c9a227] transition-all hover:bg-[#7b2d35]/45"
        >
          Обойти лагерь (до сумерек) →
        </button>
      </div>
    </div>
  );
}

/* ---------------- дневная фаза (M1.1): дождаться сумерек ---------------- */

function DayBar() {
  const screen = useZarnitsa((s) => s.screen);
  const night = useZarnitsa((s) => s.night);
  const dayDone = useZarnitsa((s) => s.dayDone);
  const dayWood = useZarnitsa((s) => s.dayWood);
  const state = useZarnitsa((s) => s.state);
  const startNight = useZarnitsa((s) => s.startNight);
  if (screen !== "camp") return null;

  const talksLeft = COMPANIONS.filter(
    (c) => !state.party[c.id]?.gone && !dayDone.includes(`dtalk_${c.id}_d${night + 1}`),
  ).length;
  const woodLeft = 3 - dayDone.filter((d) => d.startsWith("b")).length;
  const left = talksLeft + woodLeft;
  const next = Math.min(night + 1, 3);

  return (
    <div className="pointer-events-auto absolute bottom-16 right-3 z-20 flex flex-col items-end gap-2 sm:bottom-20">
      <div className="z-panel px-3 py-1.5 text-right text-[11px] leading-relaxed text-[#9a8f96]">
        {left > 0 ? (
          <>
            остались дела:
            {talksLeft > 0 && <b className="text-[#d6cfc2]"> разговоры ×{talksLeft}</b>}
            {talksLeft > 0 && woodLeft > 0 && " ·"}
            {woodLeft > 0 && <b className="text-[#d6cfc2]"> хворост ×{woodLeft}</b>}
          </>
        ) : (
          <b className="text-[#c9a227]">Все дела сделаны — лагерь готов к сумеркам</b>
        )}
        <br />
        хвороста на завтра: <b className="text-[#c98a3a]">+{dayWood} жара</b>
      </div>
      <button
        onClick={startNight}
        className="rounded-sm border border-[#c9a227] bg-[#0d0a10]/70 px-5 py-2.5 text-sm font-semibold text-[#c9a227] backdrop-blur-sm transition-all hover:bg-[#7b2d35]/45"
      >
        Дождаться сумерек → Ночь {next}
      </button>
    </div>
  );
}

/* ---------------- подсказка взаимодействия + летопись ---------------- */

function Prompt() {
  const nearest = useZarnitsa((s) => s.nearest);
  const screen = useZarnitsa((s) => s.screen);
  const carried = useZarnitsa((s) => s.fire.carried);
  const fuel = useZarnitsa((s) => s.fire.fuel);
  const whisperEcho = useZarnitsa((s) => s.whisperEcho);
  const night = useZarnitsa((s) => s.night);
  if ((screen !== "play" && screen !== "camp") || !nearest) return null;
  let text: string;
  if (screen === "camp") {
    // дневной обход (M1.1)
    if (nearest.kind === "companion") {
      text = `Поговорить на утренней зоне: ${COMPANION_BY_ID[nearest.id]?.name ?? "…"}`;
    } else if (nearest.kind === "wood") {
      text = "Собрать вязанку хвороста (+8 жара завтрашнему костру)";
    } else {
      text = "Костёр дремлет — греться бессмысленно, хворост копится на завтра";
    }
  } else if (nearest.kind === "event") {
    text = `Осмотреть: ${SCENE_EVENTS.find((e) => e.id === nearest.id)?.marker ?? "…"}`;
  } else if (nearest.kind === "companion") {
    text = `Говорить: ${COMPANION_BY_ID[nearest.id]?.name ?? "…"}`;
  } else if (nearest.kind === "fire") {
    text =
      carried > 0
        ? `Бросить полено в костёр (+жар) · в руках ещё ${carried}`
        : fuel < 25
          ? "Костёр гаснет — нужны поленья со штабелей на поляне"
          : "Костёр жив. Поленья можно принести со штабелей";
  } else {
    text = `Взять полено со штабеля (в руках ${carried}/2)`;
  }
  // эхо ночи (M1.2): утренняя реплика-память над подсказкой
  const echo =
    screen === "camp" && nearest.kind === "companion"
      ? echoLine(nearest.id, whisperEcho, night + 1)
      : null;
  return (
    <div className="pointer-events-none absolute bottom-36 left-1/2 z-20 flex w-max max-w-[92vw] -translate-x-1/2 flex-col items-center gap-1.5">
      {echo?.text ? (
        <div
          className={`z-fadein max-w-[520px] rounded-sm border-l-2 bg-black/60 px-3 py-1.5 text-[12px] italic leading-snug backdrop-blur-sm ${
            echo.tone === "scorned"
              ? "border-[#5b7a99] text-[#a9bccf]" // холод принятия
              : echo.tone === "spared"
                ? "border-[#c9a227] text-[#d9c48f]" // тихое тепло отвержения
                : "border-[#4a4152] text-[#8f8694]" // обычное утро
          }`}
        >
          {echo.text}
        </div>
      ) : null}
      <div className="z-panel z-fadein px-4 py-2 text-sm text-[#d6cfc2]">
        <span className="mr-2 inline-block rounded-sm border border-[#c9a227] px-1.5 text-[11px] font-bold text-[#c9a227]">
          E
        </span>
        {text}
      </div>
    </div>
  );
}

function LogTicker() {
  const log = useZarnitsa((s) => s.state.log);
  const entries = log.slice(-3).reverse();
  return (
    <div className="pointer-events-none absolute bottom-24 left-3 z-20 w-[min(92vw,430px)] space-y-1">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className={`z-fadein rounded-sm bg-black/55 px-2.5 py-1 text-[11px] leading-snug backdrop-blur-sm ${
            LOG_CLASS[entry.kind] ?? "z-log-system"
          }`}
        >
          <span className="text-[#d6cfc2]">{entry.text}</span>
          {typeof entry.delta === "number" && Math.abs(entry.delta) > 0.001 && (
            <span
              className={`ml-1.5 font-semibold tabular-nums ${
                entry.delta > 0 ? "text-[#8fbc8d]" : "text-[#e08a8a]"
              }`}
            >
              Δ {fmtDelta(entry.delta)}
            </span>
          )}
          {typeof entry.trustAfter === "number" && (
            <span className="ml-1.5 text-[10px] tabular-nums text-[#9a8f96]">
              {fmtTrust(entry.trustAfter)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function ControlsHint() {
  const screen = useZarnitsa((s) => s.screen);
  if (screen !== "play") return null;
  return (
    <div className="pointer-events-none absolute bottom-3 right-3 z-20 text-right text-[10px] leading-relaxed text-[#9a8f96]/85">
      WASD — движение · E — действие · M — карта · J — летопись
      <br />
      корми костёр — Столп принимает только живой огонь
    </div>
  );
}

/* ---------------- летопись на весь экран (J, M0.8) ---------------- */

/** кривая доверия по записям летописи (последние точки) */
function TrustSpark({ cid }: { cid: string }) {
  const state = useZarnitsa((s) => s.state);
  const pts = useMemo(() => {
    const hist = state.log
      .filter((e) => e.companionId === cid && typeof e.trustAfter === "number")
      .slice(-26);
    const vals = [...hist.map((e) => e.trustAfter as number), state.party[cid]?.trust ?? 50];
    if (vals.length < 2) return null;
    return vals
      .map((v, i) => `${(i / (vals.length - 1)) * 88},${24 - (Math.max(0, Math.min(100, v)) / 100) * 22}`)
      .join(" ");
  }, [state.log, state.party, cid]);
  const cs = state.party[cid];
  const color =
    cs?.frozen ? "#c9a227" : ["#7da87b", "#c9a227", "#b3542f", "#d95f3b", "#8c1f28", "#5a1020"][cs?.level ?? 0];
  return (
    <svg width="92" height="28" className="shrink-0" aria-hidden>
      {pts ? (
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      ) : (
        <line x1="2" y1="24" x2="90" y2="24" stroke="#32233a" strokeWidth="1.5" strokeDasharray="3 3" />
      )}
    </svg>
  );
}

function JournalOverlay() {
  const open = useZarnitsa((s) => s.journalOpen);
  const state = useZarnitsa((s) => s.state);
  const night = useZarnitsa((s) => s.night);
  const toggle = useZarnitsa((s) => s.toggleJournal);
  const scrollRef = useRef<HTMLDivElement>(null);
  const logLen = state.log.length;

  useEffect(() => {
    // свежие записи внизу — автопрокрутка при открытии и дополнении
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [open, logLen]);

  if (!open) return null;
  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-[#0d0a10]/92 p-3 backdrop-blur-sm sm:p-6">
      <div className="z-panel flex h-[88vh] w-full max-w-3xl flex-col p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <h2 className="z-heading text-lg font-bold tracking-wide text-[#c9a227]">
            Летопись похода
          </h2>
          <span className="text-[11px] uppercase tracking-[0.25em] text-[#9a8f96]">
            Ночь {night} · ⛃ {state.gold}
          </span>
          <button
            onClick={toggle}
            className="ml-auto rounded-sm border border-[#32233a] px-2 py-1 text-[11px] text-[#9a8f96] hover:border-[#7b2d35] hover:text-[#d6cfc2]"
          >
            ✕ J
          </button>
        </div>

        {/* память каждого спутника */}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {COMPANIONS.map((c) => {
            const cs = state.party[c.id];
            if (!cs) return null;
            const color = cs.frozen
              ? "#c9a227"
              : ["#7da87b", "#c9a227", "#b3542f", "#d95f3b", "#8c1f28", "#5a1020"][cs.level];
            return (
              <div
                key={c.id}
                className={`rounded-sm border px-2 py-1.5 ${cs.gone ? "opacity-40" : ""}`}
                style={{ borderColor: `${color}55` }}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-[#c9a227]">{c.glyph}</span>
                  <span className="z-heading text-[12px] font-semibold text-[#d6cfc2]">{c.name}</span>
                  <span className="ml-auto text-[10px] font-bold tabular-nums" style={{ color }}>
                    {cs.gone ? "ушёл" : fmtTrust(cs.trust)}
                  </span>
                </div>
                <div className="mt-1 flex items-end justify-between gap-1">
                  <span className="text-[10px] leading-tight text-[#9a8f96]">
                    {cs.memories.length} записей
                    <br />
                    {LADDER[cs.level].short}
                  </span>
                  <TrustSpark cid={c.id} />
                </div>
              </div>
            );
          })}
        </div>

        {/* полная летопись */}
        <div
          ref={scrollRef}
          className="mt-3 max-h-96 flex-1 space-y-1 overflow-y-auto rounded-sm bg-black/30 p-2"
        >
          {state.log.map((entry) => (
            <div
              key={entry.id}
              className={`rounded-sm px-2 py-1 text-[12px] leading-snug ${
                LOG_CLASS[entry.kind] ?? "z-log-system"
              }`}
            >
              <span className="text-[#d6cfc2]">{entry.text}</span>
              {typeof entry.delta === "number" && Math.abs(entry.delta) > 0.001 && (
                <span
                  className={`ml-1.5 font-semibold tabular-nums ${
                    entry.delta > 0 ? "text-[#8fbc8d]" : "text-[#e08a8a]"
                  }`}
                >
                  Δ {fmtDelta(entry.delta)}
                </span>
              )}
              {typeof entry.trustAfter === "number" && (
                <span className="ml-1.5 text-[10px] tabular-nums text-[#9a8f96]">
                  → {fmtTrust(entry.trustAfter)}
                </span>
              )}
            </div>
          ))}
        </div>
        <p className="mt-2 text-[10px] leading-snug text-[#9a8f96]">
          Память отряда не тускнеет: каждая запись — тег + валентность, и ни одна не забывается.
        </p>
      </div>
    </div>
  );
}

/* ---------------- виньетка напряжения (M0.7) ---------------- */

function Vignette() {
  const party = useZarnitsa((s) => s.state.party);
  const screen = useZarnitsa((s) => s.screen);

  let maxLevel = 0;
  let frozen = 0;
  for (const cs of Object.values(party)) {
    if (cs.gone) continue;
    if (cs.level > maxLevel) maxLevel = cs.level;
    if (cs.frozen) frozen++;
  }
  const intensity = Math.min(1, (maxLevel + frozen * 0.5) / 5.5);
  const hot = maxLevel >= 4 || frozen > 0;
  const level = Math.round(intensity * 10) / 10;

  useEffect(() => {
    setHeartbeat(hot && screen === "play" ? 0.3 + level * 0.6 : 0);
    return () => setHeartbeat(0);
  }, [hot, screen, level]);

  // днём (M1.1) виньетка отпускает — утро даёт передышку
  if (screen === "title" || screen === "end" || screen === "camp" || intensity < 0.02) return null;
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 z-[15]"
        style={{
          background: `radial-gradient(ellipse at center, transparent 40%, rgba(90,16,32,${(
            0.55 * intensity
          ).toFixed(3)}) 100%)`,
        }}
      />
      {hot && screen === "play" && (
        <div
          className="z-heartbeat pointer-events-none absolute inset-0 z-[15]"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 52%, rgba(140,31,40,0.42) 100%)",
          }}
        />
      )}
    </>
  );
}

/* ---------------- подсказка сверху (костёр/Столп/поленья) ---------------- */

function HintToast() {
  const hint = useZarnitsa((s) => s.hint);
  const screen = useZarnitsa((s) => s.screen);
  if (!hint || (screen !== "play" && screen !== "camp")) return null;
  return (
    <div className="pointer-events-none absolute left-1/2 top-14 z-30 -translate-x-1/2 px-3">
      <div className="z-panel z-fadein border-[#c9a227]/45 px-4 py-2 text-center text-[13px] text-[#e8d48a]">
        {hint}
      </div>
    </div>
  );
}

/* ---------------- тач-управление (M0.8): джойстик + кнопки ---------------- */

function TouchControls() {
  const [coarse, setCoarse] = useState(false);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [runOn, setRunOn] = useState(false);
  const dragRef = useRef(false);
  const baseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setCoarse(window.matchMedia("(pointer: coarse)").matches), 0);
    return () => clearTimeout(t);
  }, []);
  if (!coarse) return null;

  const R = 48;
  const move = (e: React.PointerEvent) => {
    const base = baseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    let dx = e.clientX - (rect.left + rect.width / 2);
    let dy = e.clientY - (rect.top + rect.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > R) {
      dx = (dx / d) * R;
      dy = (dy / d) * R;
    }
    setKnob({ x: dx, y: dy });
    touchInput.x = dx / R;
    touchInput.y = -dy / R;
    touchInput.active = true;
  };
  const end = () => {
    dragRef.current = false;
    setKnob({ x: 0, y: 0 });
    touchInput.x = 0;
    touchInput.y = 0;
    touchInput.active = false;
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-[25]">
      {/* джойстик */}
      <div
        ref={baseRef}
        onPointerDown={(e) => {
          dragRef.current = true;
          (e.target as Element).setPointerCapture(e.pointerId);
          move(e);
        }}
        onPointerMove={(e) => {
          if (dragRef.current) move(e);
        }}
        onPointerUp={end}
        onPointerCancel={end}
        className="pointer-events-auto absolute bottom-7 left-5 h-32 w-32 touch-none rounded-full border border-[#c9a227]/25 bg-black/35 backdrop-blur-sm"
        aria-label="джойстик движения"
      >
        <div
          className="absolute left-1/2 top-1/2 h-12 w-12 rounded-full border border-[#c9a227]/50 bg-[#c9a227]/15"
          style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
        />
      </div>
      {/* кнопки действий */}
      <div className="absolute bottom-7 right-5 flex flex-col items-end gap-2">
        <button
          onClick={() => {
            sfxClick();
            useZarnitsa.getState().interact();
          }}
          className="pointer-events-auto h-16 w-16 touch-none rounded-full border border-[#c9a227]/60 bg-[#7b2d35]/40 text-sm font-bold text-[#c9a227] backdrop-blur-sm active:bg-[#7b2d35]/70"
          aria-label="действие"
        >
          E
        </button>
        <div className="flex gap-2">
          {/* бег (M0.9): тумблер — держит темп, пока не выключат */}
          <button
            onClick={() => {
              touchInput.run = !touchInput.run;
              setRunOn(touchInput.run);
              sfxClick();
            }}
            className={`pointer-events-auto h-11 w-11 touch-none rounded-full border text-[11px] backdrop-blur-sm ${
              runOn
                ? "border-[#c9a227] bg-[#c9a227]/20 text-[#c9a227]"
                : "border-[#32233a] bg-black/45 text-[#9a8f96]"
            }`}
            aria-label="бег"
          >
            ᚱ
          </button>
          <button
            onClick={() => useZarnitsa.getState().toggleMap()}
            className="pointer-events-auto h-11 w-11 touch-none rounded-full border border-[#32233a] bg-black/45 text-[11px] text-[#9a8f96] backdrop-blur-sm active:border-[#c9a227]"
            aria-label="карта"
          >
            M
          </button>
          <button
            onClick={() => useZarnitsa.getState().toggleJournal()}
            className="pointer-events-auto h-11 w-11 touch-none rounded-full border border-[#32233a] bg-black/45 text-[11px] text-[#9a8f96] backdrop-blur-sm active:border-[#c9a227]"
            aria-label="летопись"
          >
            J
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- корневой HUD ---------------- */

export function Hud() {
  const screen = useZarnitsa((s) => s.screen);
  const state = useZarnitsa((s) => s.state);
  const ending = useZarnitsa((s) => s.ending);
  const chooseSpeech = useZarnitsa((s) => s.chooseSpeech);
  const toTitle = useZarnitsa((s) => s.toTitle);
  const activeEventId = useZarnitsa((s) => s.activeEvent?.id);

  if (screen === "end" && ending) {
    return (
      <div className="absolute inset-0 z-30 overflow-y-auto">
        <EndScreen state={state} ending={ending} onRestart={toTitle} />
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col">
      {screen !== "title" && <TopBar />}
      {screen !== "title" && <Pult />}
      {screen === "play" || screen === "camp" ? (
        <div className="mt-auto flex gap-2 px-3 pb-16">
          {COMPANIONS.map((c) => (
            <MiniCard key={c.id} cid={c.id} />
          ))}
        </div>
      ) : null}
      <Prompt />
      <LogTicker />
      <ControlsHint />
      <Minimap />
      <Vignette />
      <HintToast />
      <DayBar />
      <TouchControls />
      <JournalOverlay />
      <WhisperOverlay />
      {screen === "title" && <TitleScreen />}
      {screen === "event" && activeEventId && <EventModal key={activeEventId} />}
      <TalkMenu />
      {screen === "speech" && state.speechTarget && (
        <SpeechDialog state={state} companionId={state.speechTarget} onResolve={(o: SpeechOption) => chooseSpeech(o)} />
      )}
      {screen === "dawn" && <DawnOverlay />}
      <IntroOverlay />
      <PartyDrawer />
    </div>
  );
}
