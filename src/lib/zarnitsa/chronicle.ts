/* ============================================================
 * ЗАРНИЦА: КЛЯТВА — M1.7 «Летопись походов»
 *
 * Мета-память движка предательства: каждый завершённый поход
 * записывается в localStorage — титул развязки, отряд и его
 * ступени, принятые шёпоты, проклятое золото. Титульный экран
 * читает летопись: прошлые развязки остаются рядом с новой
 * ночью. Хранится не больше восьми записей — старые уходят
 * в Мглу первыми.
 * ============================================================ */

import type { GameState } from "./types";

export interface ChronicleRow {
  cid: string;
  level: number;
  gone: boolean;
  betrayed: boolean;
  walked: boolean;
}

export interface ChronicleEntry {
  at: number;
  title: string;
  subtitle: string;
  gold: number;
  memoryCount: number;
  /** принятых шёпотов за прогон (flags wh_*) */
  whispers: number;
  /** M1.8: обет был произнесён молчанием — «клятва дрожала» */
  oath: boolean;
  rows: ChronicleRow[];
}

const KEY = "zarnitsa3d_chronicle_v1";
const CAP = 8;

export function loadChronicle(): ChronicleEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as ChronicleEntry[]) : [];
  } catch {
    return [];
  }
}

/** записать завершённый поход; возвращает запись или null (SSR/сбой) */
export function recordRun(
  state: GameState,
  ending: { title?: string; subtitle?: string },
): ChronicleEntry | null {
  if (typeof window === "undefined") return null;
  const entry: ChronicleEntry = {
    at: Date.now(),
    title: ending.title ?? "ТРИ НОЧИ ПОД МГЛОЙ",
    subtitle: ending.subtitle ?? "",
    gold: state.gold,
    memoryCount: Object.values(state.party).reduce((a, cs) => a + cs.memories.length, 0),
    whispers: Object.keys(state.flags).filter((k) => k.startsWith("wh_")).length,
    oath: state.flags["oath_hesitated"] === true,
    rows: Object.values(state.party).map((cs) => ({
      cid: cs.id,
      level: cs.level,
      gone: cs.gone,
      betrayed: cs.betrayedAtFinale === true,
      walked: cs.walkedAtDawn === true,
    })),
  };
  const next = [...loadChronicle(), entry].slice(-CAP);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* хранилище переполнено — летопись терпит */
  }
  emitChronicle();
  return entry;
}

/** очистить летопись (dev/тесты) */
export function clearChronicle(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* пусто */
  }
  emitChronicle();
}

/* ---------- подписка (useSyncExternalStore) ---------- */

const EMPTY: ChronicleEntry[] = [];
let snap: ChronicleEntry[] = EMPTY;
let snapReady = false;

/** стабильный снапшот: ссылка меняется только при записи/очистке */
export function getChronicle(): ChronicleEntry[] {
  if (!snapReady && typeof window !== "undefined") {
    snapReady = true;
    snap = loadChronicle();
  }
  return snap;
}

/** серверный снапшот — пустая летопись */
export function getChronicleServer(): ChronicleEntry[] {
  return EMPTY;
}

export function subscribeChronicle(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("zarnitsa-chronicle", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("zarnitsa-chronicle", cb);
    window.removeEventListener("storage", cb);
  };
}

/** перечитать из хранилища и оповестить подписчиков */
function emitChronicle(): void {
  snap = loadChronicle();
  snapReady = true;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("zarnitsa-chronicle"));
  }
}
