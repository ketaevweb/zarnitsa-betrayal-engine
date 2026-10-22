/* ============================================================
 * ЗАРНИЦА: КЛЯТВА 3D — M0.8 «Дыхание костра»
 *
 * Лагерь как живой организм:
 *  - костёр имеет топливо, гаснет, требует поленьев;
 *  - поленницы на поляне (3 полена в каждой, восстанавливаются
 *    к новой ночи — отряд заготовил дрова за день);
 *  - дозорные Мглы на опушке: каждая ночь — на шаг ближе;
 *  - палитра ночей: у каждой ночи свой свет, у рассвета — свой.
 * ============================================================ */

/** радиус поляны (синхронно с Player/Minimap) */
export const FIELD_R = 38;

/** сколько поленьев игрок может нести одновременно */
export const CARRY_MAX = 2;

/** топливо, добавляемое одним поленом */
export const LOG_FUEL = 38;

/** скорость убыли топлива (ед/сек) — ночь ~ 6 мин активной игры */
export const FUEL_DECAY = 0.85;

/** порог живого огня для обряда у Столпа */
export const PILLAR_FUEL = 40;

/** поленницы: 6 штук по поляне, в каждой 3 полена */
export const WOOD_PILES: { id: string; x: number; z: number }[] = [
  { id: "w1", x: 8.5, z: -12 },
  { id: "w2", x: -10.5, z: -8 },
  { id: "w3", x: 12.5, z: 3.5 },
  { id: "w4", x: -12.5, z: 13.5 },
  { id: "w5", x: 18, z: -3 },
  { id: "w6", x: -19, z: 2 },
];

export const LOGS_PER_PILE = 3;

/** дозорные Мглы: углы расстановки (7 фигур по кругу опушки) */
export const WATCHER_ANGLES: number[] = [0.2, 1.1, 1.95, 2.8, 3.7, 4.6, 5.5];

/** радиус дозорных по ночам — каждая ночь ближе */
export const WATCHER_R: Record<number, number> = { 1: 37, 2: 31.5, 3: 26.5 };

export interface Palette {
  bg: string;
  fogNear: number;
  fogFar: number;
  amb: { i: number; c: string };
  hemi: { i: number; c: string; ground: string };
  dir: { i: number; c: string };
}

/** палитры ночей — Мгла давит, свет гуще и краснее */
export const NIGHT_PALETTES: Record<number, Palette> = {
  1: {
    bg: "#0a0812",
    fogNear: 16,
    fogFar: 62,
    amb: { i: 0.62, c: "#46405e" },
    hemi: { i: 0.42, c: "#322c4a", ground: "#14111c" },
    dir: { i: 0.8, c: "#9db0d4" },
  },
  2: {
    bg: "#090611",
    fogNear: 14.5,
    fogFar: 54,
    amb: { i: 0.54, c: "#3e3654" },
    hemi: { i: 0.38, c: "#2e2846", ground: "#110e18" },
    dir: { i: 0.7, c: "#8b93b8" },
  },
  3: {
    bg: "#0b040b",
    fogNear: 13,
    fogFar: 45,
    amb: { i: 0.47, c: "#4a3040" },
    hemi: { i: 0.34, c: "#3a2434", ground: "#150c12" },
    dir: { i: 0.6, c: "#a489a0" },
  },
};

/** рассвет над Студёным лесом — тёплый палевый свет */
export const DAWN_PALETTE: Palette = {
  bg: "#2a1e1a",
  fogNear: 22,
  fogFar: 84,
  amb: { i: 1.35, c: "#c9a878" },
  hemi: { i: 0.9, c: "#b89068", ground: "#241a14" },
  dir: { i: 1.5, c: "#e8c890" },
};

/** утренний обход (M1.1) — бледное золотое утро, Мгла отступила до сумерек */
export const DAY_PALETTE: Palette = {
  bg: "#8a7a66",
  fogNear: 30,
  fogFar: 130,
  amb: { i: 2.5, c: "#e8d4b4" },
  hemi: { i: 1.6, c: "#d8c2a0", ground: "#6a5644" },
  dir: { i: 3.2, c: "#ffe8b8" },
};

/* ============================================================
 * M0.9 «Кольцо стужи» — Мгла отвечает на огонь:
 * костёр = щит. Пока топливо живо, дозорные кружат по ночному
 * радиусу; огонь слабеет — кольцо сжимается; огонь пал — рывок
 * к самым спинам, пока свет не вернут.
 * ============================================================ */

/** радиус, к которому Мгла рвётся, когда огонь пал */
export const WATCHER_SURGE_R = 15;

/** подступ при среднем огне (топливо 25–55) */
export const CREEP_MID = 4;

/** подступ при гаснущем огне (топливо < 25) */
export const CREEP_LOW = 8.5;

/** живой радиус дозорных: ночь + состояние костра */
export function watcherTargetR(night: number, fuel: number): number {
  const base = WATCHER_R[night] ?? 37;
  if (fuel <= 0) return Math.min(base, WATCHER_SURGE_R);
  if (fuel >= 55) return base;
  if (fuel >= 25) return base - ((55 - fuel) / 30) * CREEP_MID;
  return base - CREEP_MID - ((25 - fuel) / 25) * (CREEP_LOW - CREEP_MID);
}

/** напряжение 0..1 — питает глаза, ветер, сердцебиение и HUD */
export function dreadLevel(fuel: number): number {
  if (fuel <= 0) return 1;
  if (fuel >= 55) return 0;
  if (fuel >= 25) return ((55 - fuel) / 30) * 0.45;
  return 0.45 + ((25 - fuel) / 25) * 0.55;
}

/** насколько близко Мгла подходила к огню за ночь (для итогов рассвета) */
export const mglLive = { closest: 999 };
