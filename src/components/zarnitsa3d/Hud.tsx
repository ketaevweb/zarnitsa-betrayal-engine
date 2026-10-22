"use client";

/* HUD 3D-версии: титул, шапка, мини-карточки, модалки, летопись, рассвет */

import { useEffect } from "react";
import { COMPANIONS, LADDER, COMPANION_BY_ID } from "@/lib/zarnitsa/data";
import { fmtDelta, fmtTrust, type SpeechOption } from "@/lib/zarnitsa/engine";
import { SCENE_EVENTS, TALK_ACTIONS, talkAvailable } from "@/lib/zarnitsa/scenario3d";
import { nightTitle, useZarnitsa } from "@/lib/zarnitsa/store";
import { CompanionCard, LevelBadge } from "@/components/zarnitsa/CompanionCard";
import { SpeechDialog } from "@/components/zarnitsa/SpeechDialog";
import { EndScreen } from "@/components/zarnitsa/EndScreen";

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

function TopBar() {
  const night = useZarnitsa((s) => s.night);
  const gold = useZarnitsa((s) => s.state.gold);
  const setDrawer = useZarnitsa((s) => s.setDrawer);
  const togglePult = useZarnitsa((s) => s.togglePult);
  const toTitle = useZarnitsa((s) => s.toTitle);

  return (
    <div className="pointer-events-auto flex items-center gap-3 bg-black/45 px-4 py-2 backdrop-blur-sm">
      <span className="z-heading text-base font-bold tracking-wide">
        ЗАРНИЦА<span className="text-[#7b2d35]">: КЛЯТВА</span>
      </span>
      <span className="hidden text-[11px] uppercase tracking-[0.25em] text-[#c9a227] sm:inline">
        {nightTitle(night)}
      </span>
      <span className="ml-auto flex items-center gap-2 text-xs">
        <span className="text-[#c9a227]" title="Проклятое золото отряда">
          ⛃ {gold}
        </span>
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

function EventModal() {
  const ev = useZarnitsa((s) => s.activeEvent);
  const choose = useZarnitsa((s) => s.choose);
  if (!ev) return null;
  const isTalk = ev.id.startsWith("talk_");
  return (
    <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-black/55 p-4">
      <section className="z-panel z-fadein max-h-[86vh] w-full max-w-2xl overflow-y-auto p-5 sm:p-7" aria-label={ev.title}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-sm border border-[#32233a] px-2 py-0.5 text-[11px] text-[#9a8f96]">
            {isTalk ? "разговор у костра" : `Ночь ${ev.day} · ${ev.phase}`}
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
  return (
    <div className="pointer-events-auto absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#0d0a10]/72 p-4 backdrop-blur-[2px]">
      <p className="text-center text-xs font-semibold uppercase tracking-[0.4em] text-[#c9a227]">
        3D-прототип · M0.5
      </p>
      <h1 className="z-heading mt-3 text-center text-6xl font-bold leading-none sm:text-8xl">
        ЗАРНИЦА
        <span className="mt-1 block text-2xl font-semibold tracking-[0.35em] text-[#7b2d35] sm:text-3xl">
          КЛЯТВА
        </span>
      </h1>
      <p className="mt-4 max-w-xl text-center text-sm leading-relaxed text-[#9a8f96]">
        Три ночи под Мглой: ходи по поляне, находи события, говори с отрядом.
        17 решений, 4 спутника, движок предательства — тот же, что в текстовом
        прототипе и Godot-каркасе.
      </p>
      <div className="z-panel mt-6 grid max-w-xl gap-2 p-4 text-xs text-[#9a8f96] sm:grid-cols-2">
        <span>
          <b className="text-[#d6cfc2]">WASD / стрелки</b> — движение
        </span>
        <span>
          <b className="text-[#d6cfc2]">E</b> — действие (маркер, спутник)
        </span>
        <span>
          <b className="text-[#d6cfc2]">Маркеры</b> — события ночи
        </span>
        <span>
          <b className="text-[#d6cfc2]">Разговоры</b> — поддержка или «уколоть»
        </span>
      </div>
      <button
        onClick={start}
        className="mt-7 rounded-sm border border-[#c9a227] bg-[#7b2d35]/25 px-10 py-4 text-lg font-semibold tracking-wide text-[#c9a227] transition-all hover:bg-[#7b2d35]/45 hover:shadow-[0_0_24px_rgba(201,162,39,0.25)]"
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

function DawnOverlay() {
  const night = useZarnitsa((s) => s.night);
  const dawnGo = useZarnitsa((s) => s.dawnGo);
  const next = Math.min(night + 1, 3);
  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-[#0d0a10]/78 p-4 backdrop-blur-sm">
      <div className="z-panel z-fadein max-w-lg p-7 text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-[#9a8f96]">
          Ночь {night} пережита
        </p>
        <h2 className="z-heading mt-2 text-3xl font-bold text-[#c9a227]">
          Рассвет над Студёным лесом
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[#d6cfc2]">
          Мгла отступает до сумерек — но записи в памяти отряда не тускнеют.
          Впереди: {nightTitle(next)}.
        </p>
        <button
          onClick={dawnGo}
          className="mt-5 rounded-sm border border-[#c9a227] bg-[#7b2d35]/25 px-8 py-3 font-semibold text-[#c9a227] transition-all hover:bg-[#7b2d35]/45"
        >
          Идти дальше →
        </button>
      </div>
    </div>
  );
}

/* ---------------- подсказка взаимодействия + летопись ---------------- */

function Prompt() {
  const nearest = useZarnitsa((s) => s.nearest);
  const screen = useZarnitsa((s) => s.screen);
  if (screen !== "play" || !nearest) return null;
  const text =
    nearest.kind === "event"
      ? `Осмотреть: ${SCENE_EVENTS.find((e) => e.id === nearest.id)?.marker ?? "…"}`
      : `Говорить: ${COMPANION_BY_ID[nearest.id]?.name ?? "…"}`;
  return (
    <div className="pointer-events-none absolute bottom-36 left-1/2 z-20 -translate-x-1/2">
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
      WASD — движение · E — действие
      <br />
      отряд — верхняя панель
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
      {screen === "play" && (
        <div className="mt-auto flex gap-2 px-3 pb-16">
          {COMPANIONS.map((c) => (
            <MiniCard key={c.id} cid={c.id} />
          ))}
        </div>
      )}
      <Prompt />
      <LogTicker />
      <ControlsHint />
      {screen === "title" && <TitleScreen />}
      {screen === "event" && <EventModal />}
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
