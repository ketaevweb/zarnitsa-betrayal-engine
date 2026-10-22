/* ============================================================
 * ЗАРНИЦА: КЛЯТВА — браузерный прототип движка предательства
 * types.ts — типы ядра (зеркало правил Godot-каркаса M0)
 *
 * Правила плана v2.0, закреплённые здесь:
 *  - Память: тег + валентность −3..+3, НЕ затухает никогда
 *  - delta = валентность × вес_тега × чувствительность
 *  - Доверие 0..100; лестница I–V (пороги доверия 60/40/25/10)
 *  - Право слова: на III–IV переход замораживается, 1 раз на ступень
 *  - Катализаторы: узлы сюжета, усиливающие сомнение
 *  - V (Разрыв) — только сюжетный force_break
 * ============================================================ */

/** 11 тегов памяти — те же смысловые оси, что в Godot-версии */
export type TagId =
  | "honesty" // честность
  | "lie" // ложь
  | "greed" // жадность
  | "generosity" // щедрость
  | "courage" // храбрость
  | "cowardice" // трусость
  | "protection" // защита слабых
  | "cruelty" // жестокость
  | "mercy" // милосердие
  | "memory" // правда памяти
  | "oath"; // клятва

export interface TagDef {
  id: TagId;
  name: string;
}

/** эхо шёпота Мглы (M1.2): кого коснулся соблазн и устоял ли игрок */
export interface EchoEntry {
  cid: string;
  /** true — игрок отверг шёпот против этого спутника */
  spared: boolean;
  tag: TagId;
}

export type Phase = "Утро" | "День" | "Вечер" | "Ночь";

/** Запись памяти — никогда не удаляется и не тускнеет */
export interface MemoryEntry {
  id: string;
  tag: TagId;
  valence: number; // −3..+3
  label: string; // «Разделил кошель поровну»
  day: number;
  phase: Phase;
  forgiven?: boolean; // прощена Правом слова (видимая пометка, запись остаётся)
}

export interface CompanionDef {
  id: string;
  name: string;
  title: string;
  glyph: string; // символ-руна для карточки
  bio: string;
  value: string; // что для него свято
  sensitivity: number; // множитель чувствительности
  initialTrust: number;
  tagWeights: Partial<Record<TagId, number>>;
  /** реакция на «дар» в Праве слова */
  giftReaction: { tag: TagId; valence: number; label: string };
}

export type CompanionStatus =
  | "faithful"
  | "doubt"
  | "alienated"
  | "conspiracy"
  | "backstab"
  | "broken";

export interface CompanionState {
  id: string;
  trust: number; // 0..100
  level: number; // 0..5
  memories: MemoryEntry[];
  /** ступени, на которых Право слова уже использовано */
  speechUsed: number[];
  /** переход заморожен: ждёт Права слова */
  frozen: boolean;
  pendingSpeechLevel: number | null;
  status: CompanionStatus;
  /** вышел из отряда (V) */
  gone: boolean;
  /** предал в финале (сюжетный force_break IV→V) */
  betrayedAtFinale?: boolean;
}

export interface LogEntry {
  id: string;
  kind:
    | "memory"
    | "trust"
    | "level"
    | "speech"
    | "order"
    | "system"
    | "catalyst"
    | "finale";
  companionId?: string;
  text: string;
  delta?: number;
  trustAfter?: number;
}

export interface GameState {
  day: number;
  phase: Phase;
  gold: number;
  party: Record<string, CompanionState>;
  flags: Record<string, boolean>;
  log: LogEntry[];
  /** id спутника, ожидающего Право слова (модалка блокирует игру) */
  speechTarget: string | null;
  finished: boolean;
}

/* ---------- сценарий ---------- */

export interface MemoryEffect {
  /** id спутника | 'all' (все, кто в отряде) */
  target: string | "all";
  tag: TagId;
  valence: number;
  label: string;
}

export interface OrderCheck {
  /** кого проверяем на выполнение приказа */
  companionId: string;
  action: string; // «прикрыть Милуту»
  onComply: MemoryEffect[];
  onRefuse: MemoryEffect[];
  /** ниже этого доверия (и при ступени ≥II) приказ не выполняется */
  refuseBelow: number;
}

export interface Choice {
  id: string;
  label: string;
  note?: string;
  goldDelta?: number;
  memories?: MemoryEffect[];
  /** прямое изменение доверия (катализаторы, шёпот Мглы) */
  directTrust?: { target: string | "all"; delta: number; reason: string }[];
  setFlags?: Record<string, boolean>;
  /** катализатор: ступени ≥II получают усиление сомнения */
  catalyst?: boolean;
  /** приказ в бою — проверка лояльности */
  orderCheck?: OrderCheck;
  /** завершает пролог → финал */
  triggersFinale?: boolean;
}

export interface EventDef {
  id: string;
  day: number;
  phase: Phase;
  title: string;
  isOrder?: boolean; // сцена боя под Паузой присяги
  text: string[];
  choices: Choice[];
}

export interface EndingRow {
  companionId: string;
  level: number;
  status: CompanionStatus;
  verdict: string;
  lastMemories: MemoryEntry[];
  memoryCount: number;
  bitterShare: number; // доля горьких воспоминаний 0..1
}
