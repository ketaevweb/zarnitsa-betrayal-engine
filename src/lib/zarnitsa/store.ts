/* ============================================================
 * ЗАРНИЦА: КЛЯТВА 3D — zustand-стор: мост движка ↔ сцена ↔ HUD
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

export type Screen = "title" | "play" | "event" | "speech" | "dawn" | "end";

export interface Nearest {
  kind: "event" | "companion";
  id: string;
}

export type Ending = ReturnType<typeof buildEnding>;

/** цвет ступени на лестнице предательства (3D + HUD) */
export const LEVEL_COLOR: Record<number, string> = {
  0: "#7da87b",
  1: "#c9a227",
  2: "#b3542f",
  3: "#d95f3b",
  4: "#8c1f28",
  5: "#5a1020",
};

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

  start: () => void;
  toTitle: () => void;
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

  start: () => {
    set({
      screen: "play",
      state: debugReset(),
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
      moves: get().moves + 1,
    });
  },

  toTitle: () => set({ screen: "title", ending: null, intro: null, drawer: null, pultOpen: false, mapOpen: false }),

  /** клавиша E: ближайший маркер или спутник */
  interact: () => {
    const { screen, nearest } = get();
    if (screen !== "play" || !nearest) return;
    if (nearest.kind === "event") get().openEvent(nearest.id);
    else set({ talkMenu: nearest.id });
  },

  openEvent: (id) => {
    const ev = SCENE_EVENTS.find((e) => e.id === id);
    if (!ev) return;
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
    const phased = withPhase(state, activeEvent.day, activeEvent.phase);
    const next = applyChoice(phased, choice);

    const done = isTalk ? doneToday : [...doneToday, activeEvent.id];

    if (next.finished) {
      set({
        state: next,
        screen: "end",
        activeEvent: null,
        ending: endingOf(next),
        talkMenu: null,
        intro: null,
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
    getAndApplyDawn(set, get, next, done);
  },

  chooseSpeech: (option) => {
    const { state, pendingDoneId, doneToday } = get();
    if (!state.speechTarget) return;
    const next = resolveSpeech(state, state.speechTarget, option);

    if (next.finished) {
      set({ state: next, screen: "end", ending: endingOf(next), pendingDoneId: null, intro: null });
      return;
    }
    if (next.speechTarget) {
      set({ state: next, screen: "speech" }); // очередь Права слова
      return;
    }
    const done = pendingDoneId ? [...doneToday, pendingDoneId] : doneToday;
    set({ state: next, screen: "play", pendingDoneId: null, doneToday: done });
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
    const next = debugDrainAll(get().state, delta);
    if (next.speechTarget) {
      set({ state: next, screen: "speech", talkMenu: null, activeEvent: null });
    } else {
      set({ state: next });
    }
  },

  dawnGo: () => {
    const { night } = get();
    const nextNight = Math.min(night + 1, NIGHT_COUNT);
    set({
      screen: "play",
      night: nextNight,
      doneToday: [],
      activeEvent: null,
      pendingDoneId: null,
      nearest: null,
      intro: NIGHT_TITLES[nextNight],
      moves: get().moves + 1,
    });
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
    if (night < NIGHT_COUNT) set({ screen: "dawn" });
    // на ночи III последним всегда остаётся гейт-Столп: finished придёт через него
  }
}

export function nightTitle(night: number): string {
  return NIGHT_TITLES[night] ?? "";
}
