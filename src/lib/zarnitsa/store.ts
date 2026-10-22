/* ============================================================
 * ЗАРНИЦА: КЛЯТВА 3D — zustand-стор: мост движка ↔ сцена ↔ HUD
 * M0.7 «Живая ночь»: всплывающие Δ, тряска камеры, автосохранение,
 * итоги ночи на рассвете, звуковые хуки
 * ============================================================ */

import { create } from "zustand";
import {
  applyChoice,
  buildEnding,
  debugDrainAll,
  debugReset,
  resolveSpeech,
  withPhase,
  type SpeechOption,
} from "./engine";
import {
  NIGHT_COUNT,
  NIGHT_TITLES,
  nightEvents,
  makeTalkEvent,
  SCENE_EVENTS,
  talkAvailable,
} from "./scenario3d";
import type { EventDef, GameState } from "./types";
import {
  CARRY_MAX,
  FUEL_DECAY,
  LOG_FUEL,
  LOGS_PER_PILE,
  PILLAR_FUEL,
  WOOD_PILES,
} from "./camp3d";
import {
  audioStart,
  sfxClick,
  sfxDeltaDown,
  sfxDeltaUp,
  sfxEnding,
  sfxFeed,
  sfxNeedle,
  sfxPickup,
  sfxReveal,
} from "./audio";

export type Screen = "title" | "play" | "event" | "speech" | "dawn" | "end";

export interface Nearest {
  kind: "event" | "companion" | "fire" | "wood";
  id: string;
}

/** состояние костра — живой ресурс M0.8 */
export interface FireState {
  fuel: number; // 0..100
  carried: number; // поленьев в руках
  piles: Record<string, number>; // остаток поленьев в поленницах
  died: boolean; // костёр пал этой ночью (штраф раз за ночь)
  fedAt: number; // performance.now() последней подкормки — вспышка пламени
}

export type Ending = ReturnType<typeof buildEnding>;

/** всплывающее число доверия над спутником */
export interface Floater {
  id: number;
  cid: string;
  delta: number;
}

/** итог прошедшей ночи для экрана рассвета */
export interface NightSummaryRow {
  cid: string;
  delta: number;
}

/** цвет ступени на лестнице предательства (3D + HUD) */
export const LEVEL_COLOR: Record<number, string> = {
  0: "#7da87b",
  1: "#c9a227",
  2: "#b3542f",
  3: "#d95f3b",
  4: "#8c1f28",
  5: "#5a1020",
};

/* ---------------- автосохранение ---------------- */

const SAVE_KEY = "zarnitsa3d_save_v1";

interface SaveShape {
  state: GameState;
  night: number;
  doneToday: string[];
  nightStart: Record<string, number>;
  fire?: FireState;
  at: number;
}

function persist(
  s: GameState,
  night: number,
  doneToday: string[],
  nightStart: Record<string, number>,
  fire?: FireState,
) {
  try {
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({ state: s, night, doneToday, nightStart, fire, at: Date.now() } satisfies SaveShape),
    );
  } catch {
    /* приватный режим — играем без сохранения */
  }
}

/** свежий костёр на новую ночь: дрова заготовлены, огонь раздут */
function freshFire(keepFuel = 0): FireState {
  const piles: Record<string, number> = {};
  for (const p of WOOD_PILES) piles[p.id] = LOGS_PER_PILE;
  return { fuel: Math.max(65, keepFuel), carried: 0, piles, died: false, fedAt: 0 };
}

function readSave(): SaveShape | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as SaveShape;
    if (
      p?.state?.party &&
      typeof p.night === "number" &&
      p.night >= 1 &&
      p.night <= NIGHT_COUNT &&
      Array.isArray(p.doneToday) &&
      !p.state.finished
    ) {
      return p;
    }
    return null;
  } catch {
    return null;
  }
}

function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* пусто */
  }
}

/* ---------------- утилиты доверия ---------------- */

function snapshotTrust(state: GameState): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [cid, cs] of Object.entries(state.party)) out[cid] = cs.trust;
  return out;
}

function trustDiff(before: Record<string, number>, after: GameState): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [cid, cs] of Object.entries(after.party)) {
    if (cs.gone) continue;
    const d = cs.trust - (before[cid] ?? cs.trust);
    if (Math.abs(d) > 0.001) out[cid] = d;
  }
  return out;
}

let floaterSeq = 1;

let hintTimer: ReturnType<typeof setTimeout> | null = null;

interface ZarnitsaStore {
  screen: Screen;
  state: GameState;
  night: number;
  doneToday: string[];
  activeEvent: EventDef | null;
  /** событие, дождавшееся Права слова — закроется в летопись после речи */
  pendingDoneId: string | null;
  /** меню разговора со спутником */
  talkMenu: string | null;
  nearest: Nearest | null;
  drawer: "party" | null;
  pultOpen: boolean;
  intro: string | null;
  ending: Ending | null;
  moves: number; // счётчик шагов — ключ для пересборки маркеров
  /** мини-карта (M или кнопка «карта») */
  mapOpen: boolean;
  /** режим экскурсии (?tour=1): игрок сам идёт к ближайшему маркеру */
  tour: boolean;
  /** всплывающие Δ доверия (M0.7) */
  floaters: Floater[];
  /** performance.now() последнего «укола» — тряска камеры */
  shakeAt: number;
  /** доверие отряда на старте ночи — для итогов рассвета */
  nightStart: Record<string, number>;
  /** итог прошедшей ночи (экран рассвета) */
  nightSummary: NightSummaryRow[] | null;
  /** есть сохранённый прогон (кнопка «Продолжить») */
  hasSave: boolean;
  /** костёр (M0.8) */
  fire: FireState;
  /** всплывающая подсказка сверху (костёр, Столп, поленья) */
  hint: string | null;
  /** летопись на весь экран (J) */
  journalOpen: boolean;

  start: () => void;
  toTitle: () => void;
  resumeRun: () => void;
  refreshHasSave: () => void;
  interact: () => void;
  openEvent: (id: string) => void;
  openCompanion: (cid: string) => void;
  openTalk: (cid: string, actionId: "ask" | "share" | "needle") => void;
  closeTalkMenu: () => void;
  choose: (choiceIndex: number) => void;
  chooseSpeech: (option: SpeechOption) => void;
  setNearest: (n: Nearest | null) => void;
  setDrawer: (d: "party" | null) => void;
  togglePult: () => void;
  toggleMap: () => void;
  drain: (delta: number) => void;
  dawnGo: () => void;
  pushFloaters: (diff: Record<string, number>) => void;
  /** убыль топлива; зовётся из useFrame, сама решает, идти ли */
  tickFire: (dt: number) => void;
  /** взять полено с поленницы */
  pickupWood: (pileId: string) => void;
  /** бросить полено в костёр */
  feedFire: () => void;
  setHint: (text: string | null) => void;
  toggleJournal: () => void;
}

function endingOf(state: GameState): Ending {
  return buildEnding(state);
}

/** какие маркеры сейчас активны */
export function availableEvents(state: GameState, night: number, doneToday: string[]): SceneEventLite[] {
  const list = nightEvents(night);
  const allDone = list.every((e) => doneToday.includes(e.id));
  const out: SceneEventLite[] = [];
  for (const ev of SCENE_EVENTS) {
    if (ev.night !== night) continue;
    if (doneToday.includes(ev.id)) continue;
    if (ev.gated && !allDone) continue;
    out.push(ev);
  }
  return out;
}

type SceneEventLite = (typeof SCENE_EVENTS)[number];

export const useZarnitsa = create<ZarnitsaStore>((set, get) => ({
  screen: "title",
  state: debugReset(),
  night: 1,
  doneToday: [],
  activeEvent: null,
  pendingDoneId: null,
  talkMenu: null,
  nearest: null,
  drawer: null,
  pultOpen: false,
  intro: null,
  ending: null,
  moves: 0,
  mapOpen: false,
  tour: false,
  floaters: [],
  shakeAt: 0,
  nightStart: snapshotTrust(debugReset()),
  nightSummary: null,
  hasSave: false,
  fire: freshFire(85),
  hint: null,
  journalOpen: false,

  start: () => {
    audioStart();
    const fresh = debugReset();
    const nightStart = snapshotTrust(fresh);
    const fire = freshFire(85);
    set({
      screen: "play",
      state: fresh,
      night: 1,
      doneToday: [],
      activeEvent: null,
      pendingDoneId: null,
      talkMenu: null,
      nearest: null,
      drawer: null,
      pultOpen: false,
      ending: null,
      intro: NIGHT_TITLES[1],
      nightSummary: null,
      nightStart,
      moves: get().moves + 1,
      fire,
      hint: null,
      journalOpen: false,
    });
    persist(fresh, 1, [], nightStart, fire);
    set({ hasSave: true });
  },

  toTitle: () =>
    set({
      screen: "title",
      ending: null,
      intro: null,
      drawer: null,
      pultOpen: false,
      mapOpen: false,
      talkMenu: null,
      journalOpen: false,
      hint: null,
    }),

  /** продолжить сохранённый прогон */
  resumeRun: () => {
    const save = readSave();
    if (!save) return;
    audioStart();
    set({
      screen: save.state.speechTarget ? "speech" : "play",
      state: save.state,
      night: save.night,
      doneToday: save.doneToday,
      nightStart: save.nightStart ?? snapshotTrust(save.state),
      activeEvent: null,
      pendingDoneId: null,
      talkMenu: null,
      nearest: null,
      drawer: null,
      pultOpen: false,
      ending: null,
      intro: NIGHT_TITLES[save.night],
      nightSummary: null,
      moves: get().moves + 1,
      hasSave: true,
      fire: save.fire ?? freshFire(),
      hint: null,
      journalOpen: false,
    });
  },

  refreshHasSave: () => set({ hasSave: !!readSave() }),

  /** клавиша E: маркер, спутник, костёр или поленница */
  interact: () => {
    const { screen, nearest } = get();
    if (screen !== "play" || !nearest) return;
    if (nearest.kind === "event") get().openEvent(nearest.id);
    else if (nearest.kind === "fire") get().feedFire();
    else if (nearest.kind === "wood") get().pickupWood(nearest.id);
    else set({ talkMenu: nearest.id });
  },

  openEvent: (id) => {
    const ev = SCENE_EVENTS.find((e) => e.id === id);
    if (!ev) return;
    // Столп принимает только живой огонь — обряд разжигается от костра
    if (id === "e12" && get().fire.fuel < PILLAR_FUEL) {
      get().setHint(
        `Столп требует живого огня — подкорми костёр (топливо ${Math.round(get().fire.fuel)}/${PILLAR_FUEL})`,
      );
      return;
    }
    sfxReveal();
    set({ screen: "event", activeEvent: ev });
  },

  openCompanion: (cid) => set({ talkMenu: cid }),

  openTalk: (cid, actionId) => {
    const { state, night } = get();
    if (!talkAvailable(state, cid, actionId, night)) return;
    set({ screen: "event", activeEvent: makeTalkEvent(cid, actionId, night), talkMenu: null });
  },

  closeTalkMenu: () => set({ talkMenu: null }),

  choose: (choiceIndex) => {
    const { activeEvent, state, doneToday } = get();
    if (!activeEvent) return;
    const choice = activeEvent.choices[Math.min(choiceIndex, activeEvent.choices.length - 1)];
    const isTalk = activeEvent.id.startsWith("talk_");
    const isNeedle = activeEvent.id.includes("_needle_");

    // звук: укол — диссонанс + тряска, обычный выбор — клик
    if (isNeedle) {
      sfxNeedle();
      set({ shakeAt: performance.now() });
    } else {
      sfxClick();
    }

    const before = snapshotTrust(state);
    const phased = withPhase(state, activeEvent.day, activeEvent.phase);
    const next = applyChoice(phased, choice);
    const diff = trustDiff(before, next);
    get().pushFloaters(diff);
    if (Object.values(diff).some((d) => d > 0)) sfxDeltaUp();
    if (Object.values(diff).some((d) => d < 0)) sfxDeltaDown();

    const done = isTalk ? doneToday : [...doneToday, activeEvent.id];

    if (next.finished) {
      clearSave();
      sfxEnding();
      set({
        state: next,
        screen: "end",
        activeEvent: null,
        ending: endingOf(next),
        talkMenu: null,
        intro: null,
        hasSave: false,
      });
      return;
    }
    if (next.speechTarget) {
      set({
        state: next,
        screen: "speech",
        activeEvent: null,
        pendingDoneId: isTalk ? null : activeEvent.id,
        doneToday: done,
        talkMenu: null,
      });
      return;
    }
    set({ state: next, screen: "play", activeEvent: null, doneToday: done, talkMenu: null });
    persist(next, get().night, done, get().nightStart, get().fire);
    getAndApplyDawn(set, get, next, done);
  },

  chooseSpeech: (option) => {
    const { state, pendingDoneId, doneToday } = get();
    if (!state.speechTarget) return;
    const before = snapshotTrust(state);
    const next = resolveSpeech(state, state.speechTarget, option);
    const diff = trustDiff(before, next);
    get().pushFloaters(diff);
    if (Object.values(diff).some((d) => d > 0)) sfxDeltaUp();
    if (Object.values(diff).some((d) => d < 0)) sfxDeltaDown();

    if (next.finished) {
      clearSave();
      sfxEnding();
      set({ state: next, screen: "end", ending: endingOf(next), pendingDoneId: null, intro: null, hasSave: false });
      return;
    }
    if (next.speechTarget) {
      set({ state: next, screen: "speech" }); // очередь Права слова
      return;
    }
    const done = pendingDoneId ? [...doneToday, pendingDoneId] : doneToday;
    set({ state: next, screen: "play", pendingDoneId: null, doneToday: done });
    persist(next, get().night, done, get().nightStart, get().fire);
    getAndApplyDawn(set, get, next, done);
  },

  setNearest: (n) => {
    const cur = get().nearest;
    if (cur?.kind === n?.kind && cur?.id === n?.id) return;
    set({ nearest: n });
  },

  setDrawer: (d) => set({ drawer: d }),
  togglePult: () => set({ pultOpen: !get().pultOpen }),

  toggleMap: () => {
    if (get().screen !== "play") return;
    set({ mapOpen: !get().mapOpen });
  },

  drain: (delta) => {
    const before = snapshotTrust(get().state);
    const next = debugDrainAll(get().state, delta);
    const diff = trustDiff(before, next);
    get().pushFloaters(diff);
    if (Object.values(diff).some((d) => d < 0)) sfxDeltaDown();
    if (Object.values(diff).some((d) => d > 0)) sfxDeltaUp();
    if (next.speechTarget) {
      set({ state: next, screen: "speech", talkMenu: null, activeEvent: null });
    } else {
      set({ state: next });
    }
    if (next.finished) {
      clearSave();
      set({ screen: "end", ending: endingOf(next), hasSave: false });
    }
  },

  dawnGo: () => {
    const { night, state, fire } = get();
    const nextNight = Math.min(night + 1, NIGHT_COUNT);
    const nightStart = snapshotTrust(state);
    // за день отряд заготовил дрова и разжёг костёр к сумеркам
    const nextFire = freshFire(fire.fuel);
    set({
      screen: "play",
      night: nextNight,
      doneToday: [],
      activeEvent: null,
      pendingDoneId: null,
      nearest: null,
      intro: NIGHT_TITLES[nextNight],
      nightSummary: null,
      nightStart,
      moves: get().moves + 1,
      fire: nextFire,
      hint: null,
      journalOpen: false,
    });
    persist(state, nextNight, [], nightStart, nextFire);
  },

  tickFire: (dt) => {
    const s = get();
    if (s.screen !== "play" || s.journalOpen) return;
    const f = s.fire;
    if (f.fuel <= 0) return;
    const fuel = Math.max(0, f.fuel - dt * FUEL_DECAY);
    const died = fuel <= 0 && !f.died;
    set({ fire: { ...f, fuel, died: f.died || died } });
    if (died) {
      // костёр пал — Мгла подошла к самым спинам, память запомнит
      s.drain(-3);
      s.setHint("Костёр пал — Мгла у самых спин. Отряд запомнил этот холод (−3)");
    }
  },

  pickupWood: (pileId) => {
    const f = get().fire;
    if (f.carried >= CARRY_MAX) {
      get().setHint(`Руки заняты — больше ${CARRY_MAX} поленьев не унести`);
      return;
    }
    if ((f.piles[pileId] ?? 0) <= 0) {
      get().setHint("Штабель пуст — дрова кончились");
      return;
    }
    sfxPickup();
    set({
      fire: { ...f, carried: f.carried + 1, piles: { ...f.piles, [pileId]: (f.piles[pileId] ?? 0) - 1 } },
    });
  },

  feedFire: () => {
    const f = get().fire;
    if (f.carried <= 0) {
      get().setHint("Поленьев нет — поищи штабеля на поляне (серые стопки)");
      return;
    }
    sfxFeed();
    set({ fire: { ...f, carried: f.carried - 1, fuel: Math.min(100, f.fuel + LOG_FUEL), fedAt: performance.now() } });
  },

  setHint: (text) => {
    set({ hint: text });
    if (hintTimer) clearTimeout(hintTimer);
    if (text) hintTimer = setTimeout(() => set({ hint: null }), 3600);
  },

  toggleJournal: () => {
    if (get().screen !== "play") return;
    set({ journalOpen: !get().journalOpen });
  },

  pushFloaters: (diff) => {
    const items: Floater[] = Object.entries(diff).map(([cid, delta]) => ({
      id: floaterSeq++,
      cid,
      delta,
    }));
    if (!items.length) return;
    set({ floaters: [...get().floaters, ...items] });
    const ids = new Set(items.map((i) => i.id));
    setTimeout(() => {
      set({ floaters: get().floaters.filter((f) => !ids.has(f.id)) });
    }, 2100);
  },
}));

/** все события ночи пройдены → рассвет (или финал на III ночи) */
function getAndApplyDawn(
  set: (partial: Partial<ZarnitsaStore>) => void,
  get: () => ZarnitsaStore,
  next: GameState,
  doneToday: string[],
) {
  if (next.finished) return;
  const night = get().night;
  const list = nightEvents(night);
  const allDone = list.every((e) => doneToday.includes(e.id));
  if (allDone) {
    if (night < NIGHT_COUNT) {
      // итог ночи: изменение доверия каждого спутника
      const before = get().nightStart;
      const summary: NightSummaryRow[] = Object.entries(next.party)
        .map(([cid, cs]) => ({ cid, delta: cs.trust - (before[cid] ?? cs.trust) }))
        .filter((r) => Math.abs(r.delta) > 0.001)
        .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
      set({ screen: "dawn", nightSummary: summary });
    }
    // на ночи III последним всегда остаётся гейт-Столп: finished придёт через него
  }
}

export function nightTitle(night: number): string {
  return NIGHT_TITLES[night] ?? "";
}

/** ночь сохранённого прогона (для титула) или null */
export function savedNight(): number | null {
  const s = readSave();
  return s ? s.night : null;
}
