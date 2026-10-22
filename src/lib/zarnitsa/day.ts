/* ============================================================
 * ЗАРНИЦА: КЛЯТВА 3D — M1.1 «Утренний обход»
 *
 * Дневная фаза между ночами: рассвет → обход лагеря → сумерки.
 * Мгла отступает, костёр дремлет, отряд дышит — но память не
 * тускнеет. Дневные дела:
 *  - разговор со спутником (утренняя реплика, лёгкая память);
 *  - вязанка хвороста (+8 топлива к завтрашнему костру, до +24).
 * ============================================================ */

import type { EventDef, MemoryEffect } from "./types";
import { COMPANION_BY_ID } from "./data";

/** заголовки дней (день после ночи N = N+1) */
export const DAY_TITLES: Record<number, string> = {
  2: "День II — Тревожное утро",
  3: "День III — Последний лагерь",
};

export function dayTitle(day: number): string {
  return DAY_TITLES[day] ?? "";
}

/** +топливо к завтрашнему костру за одну вязанку */
export const DAY_WOOD_FUEL = 8;

/** потолок дневной заготовки */
export const DAY_WOOD_CAP = 24;

/** вязанки хвороста по поляне (только днём) */
export const BRUSHWOOD_SPOTS: { id: string; x: number; z: number }[] = [
  { id: "b1", x: 14, z: -9 },
  { id: "b2", x: -16, z: 6.5 },
  { id: "b3", x: 4.5, z: 16 },
];

/* ---------------- утренние разговоры ---------------- */

interface DayChoice {
  label: string;
  note: string;
  memory: MemoryEffect;
}

interface DayTalk {
  /** утренняя сцена: что видит игрок */
  text: string[];
  warm: DayChoice;
  bold: DayChoice;
}

const DAY_TALKS: Record<string, DayTalk> = {
  gavrila: {
    text: [
      "Гаврила сидит у догорающих углей и шепчет утренний оберег — тот самый, что читал над прудом, где утонул его брат.",
      "Руки у него всё ещё дрожат с ночи, но голос ровный. Заметив тебя, он на мгновение умолкает.",
    ],
    warm: {
      label: "Слушать оберег до конца, не перебивая",
      note: "Тихое уважение — лёгкое светлое воспоминание",
      memory: { target: "gavrila", tag: "honesty", valence: 1, label: "Выслушал утренний оберег Гаврилы не перебивая" },
    },
    bold: {
      label: "Сказать вслух: ночью ты не дрогнул",
      note: "Хвалить труса за храбрость — рискованно, но он запомнит",
      memory: { target: "gavrila", tag: "courage", valence: 1, label: "Признал храбрость Гаврилы вслух при отряде" },
    },
  },
  khodata: {
    text: [
      "Ходата уже на ногах — пересчитывает содержимое дорожных ящиков, не поворачиваясь к тебе спиной.",
      "Знамя присяги у него за пазухой: утром он трогает его чаще, чем днём.",
    ],
    warm: {
      label: "Спросить, что он возит в ящиках",
      note: "Ходата увильнёт — но разговор о деле ему приятен",
      memory: { target: "khodata", tag: "memory", valence: 1, label: "Спросил Ходату о его дорожных ящиках" },
    },
    bold: {
      label: "Напомнить: клятва у Столпа ещё жива",
      note: "Прямое слово о присяге — Ходата уважает твёрдость",
      memory: { target: "khodata", tag: "oath", valence: 1, label: "Напомнил Ходате про клятву у Столпа" },
    },
  },
  miluta: {
    text: [
      "Милута развесила мокрые попоны и перевязывает сломанный обод колеса — одной рукой, вторая держит летопись дорог.",
      "Пальцы у неё в смоле, но страницы чистые.",
    ],
    warm: {
      label: "Молча подхватить второй край попоны",
      note: "Помощь без просьбы о плате — редкость, она запомнит",
      memory: { target: "miluta", tag: "generosity", valence: 1, label: "Помог Милуте с обозом, не взяв платы" },
    },
    bold: {
      label: "Расспросить про её летопись дорог",
      note: "Дать выговориться о том, что она любит",
      memory: { target: "miluta", tag: "memory", valence: 1, label: "Расспросил Милуту про её летопись дорог" },
    },
  },
  ratmir: {
    text: [
      "Ратмир стоит у точильного камня и водит клинком по кругу — ровно, без спешки, как дышит.",
      "На юге, откуда он ушёл, такие круги точат перед дорогой, из которой не все возвращаются.",
    ],
    warm: {
      label: "Молча точить свой клинок рядом",
      note: "Работа плечом к плечу — его язык доверия",
      memory: { target: "ratmir", tag: "honesty", valence: 1, label: "Разделил с Ратмиром утреннюю работу у камня" },
    },
    bold: {
      label: "Спросить про юг, откуда он ушёл",
      note: "Потревожить старую дорогу — но он отвечает тем, кто спрашивает в лицо",
      memory: { target: "ratmir", tag: "memory", valence: 1, label: "Спросил Ратмира про южные дороги" },
    },
  },
};

/** утренний разговор со спутником — событие на лету (фаза «Утро») */
export function makeDayTalk(cid: string, night: number): EventDef | null {
  const def = COMPANION_BY_ID[cid];
  const talk = DAY_TALKS[cid];
  if (!def || !talk) return null;
  const day = night + 1;
  return {
    id: `dtalk_${cid}_d${day}`,
    day,
    phase: "Утро",
    title: `${def.name}: утренний обход`,
    text: talk.text,
    choices: [
      {
        id: "warm",
        label: talk.warm.label,
        note: talk.warm.note,
        memories: [talk.warm.memory],
        setFlags: { [`d${day}_${cid}_warm`]: true },
      },
      {
        id: "bold",
        label: talk.bold.label,
        note: talk.bold.note,
        memories: [talk.bold.memory],
        setFlags: { [`d${day}_${cid}_bold`]: true },
      },
      { id: "leave", label: "Отойти, не мешая утру" },
    ],
  };
}

/** сколько всего утренних дел (для счётчика в HUD) */
export const DAY_TASKS_TOTAL = BRUSHWOOD_SPOTS.length + Object.keys(DAY_TALKS).length;
