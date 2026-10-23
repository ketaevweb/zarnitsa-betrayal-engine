/* ============================================================
 * ЗАРНИЦА: КЛЯТВА — ядро движка предательства (браузерный порт M0)
 *
 * Пайплайн выбора игрока:
 *   выбор → памяти (тег+валентность) → delta = валентность × вес × чувств.
 *         → доверие 0..100 → лестница I–V
 *         → право слова (III–IV, заморозка) / катализатор / приказы
 * ============================================================ */

import { COMPANIONS, COMPANION_BY_ID, LADDER } from "./data";
import type {
  Choice,
  CompanionState,
  GameState,
  MemoryEffect,
  MemoryEntry,
  Phase,
  TagId,
} from "./types";

let idCounter = 0;
function uid(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter}_${Math.random().toString(36).slice(2, 7)}`;
}

/** пороги доверия: I<60, II<40, III<25, IV<10; V — только сюжет */
export function levelFromTrust(trust: number): number {
  if (trust < 10) return 4;
  if (trust < 25) return 3;
  if (trust < 40) return 2;
  if (trust < 60) return 1;
  return 0;
}

export function trustForLevel(level: number): number {
  switch (level) {
    case 4:
      return 10;
    case 3:
      return 25;
    case 2:
      return 40;
    case 1:
      return 60;
    default:
      return 100;
  }
}

export function createInitialState(): GameState {
  const party: Record<string, CompanionState> = {};
  for (const c of COMPANIONS) {
    party[c.id] = {
      id: c.id,
      trust: c.initialTrust,
      level: levelFromTrust(c.initialTrust),
      memories: [],
      speechUsed: [],
      frozen: false,
      pendingSpeechLevel: null,
      status: "faithful",
      gone: false,
    };
  }
  return {
    day: 1,
    phase: "Вечер",
    gold: 0,
    party,
    flags: {},
    log: [
      {
        id: uid("log"),
        kind: "system",
        text: "Отряд вышел к Студёному лесу. Память отряда чиста — пока что.",
      },
    ],
    speechTarget: null,
    finished: false,
  };
}

/* ---------- форматирование ---------- */

export function fmtDelta(delta: number): string {
  const sign = delta >= 0 ? "+" : "−";
  return `${sign}${Math.abs(delta).toFixed(2).replace(".", ",")}`;
}

export function fmtTrust(trust: number): string {
  return trust.toFixed(1).replace(".", ",");
}

/* ---------- память ---------- */

function tagWeight(companionId: string, tag: TagId): number {
  return COMPANION_BY_ID[companionId].tagWeights[tag] ?? 1;
}

function statusForLevel(level: number): CompanionState["status"] {
  switch (level) {
    case 1:
      return "doubt";
    case 2:
      return "alienated";
    case 3:
      return "conspiracy";
    case 4:
      return "backstab";
    case 5:
      return "broken";
    default:
      return "faithful";
  }
}

interface ApplyResult {
  trustBefore: number;
  trustAfter: number;
  delta: number;
}

/**
 * Записывает память и пересчитывает доверие/лестницу.
 * Память НЕ затухает и не удаляется никогда.
 * При пересечении III/IV — заморозка перехода и Право слова (1 раз на ступень).
 */
function applyMemory(
  state: GameState,
  companionId: string,
  tag: TagId,
  valence: number,
  label: string,
): ApplyResult | null {
  const cs = state.party[companionId];
  const def = COMPANION_BY_ID[companionId];
  if (!cs || cs.gone) return null;

  const memory: MemoryEntry = {
    id: uid("mem"),
    tag,
    valence,
    label,
    day: state.day,
    phase: state.phase,
  };
  cs.memories.push(memory);

  const weight = tagWeight(companionId, tag);
  const delta = valence * weight * def.sensitivity;
  const before = cs.trust;
  cs.trust = Math.min(100, Math.max(0, cs.trust + delta));

  const log = state.log;
  log.push({
    id: uid("log"),
    kind: "memory",
    companionId,
    text: `«${label}» · ${TAG_NAME[tag]} ${valence > 0 ? "+" : "−"}${Math.abs(valence)}`,
    delta,
    trustAfter: cs.trust,
  });

  const newLevel = levelFromTrust(cs.trust);
  if (newLevel !== cs.level && !cs.frozen) {
    maybeTransition(state, companionId, newLevel);
  }

  return { trustBefore: before, trustAfter: cs.trust, delta };
}

const TAG_NAME: Record<TagId, string> = {
  honesty: "честность",
  lie: "ложь",
  greed: "жадность",
  generosity: "щедрость",
  courage: "храбрость",
  cowardice: "трусость",
  protection: "защита",
  cruelty: "жестокость",
  mercy: "милосердие",
  memory: "память",
  oath: "клятва",
};

/** Попытка смены ступени. III и IV замораживаются до Права слова (если есть расход). */
function maybeTransition(state: GameState, companionId: string, newLevel: number) {
  const cs = state.party[companionId];
  const def = COMPANION_BY_ID[companionId];
  const oldLevel = cs.level;

  if (newLevel > oldLevel && (newLevel === 3 || newLevel === 4)) {
    if (!cs.speechUsed.includes(newLevel)) {
      // заморозка перехода: ждём Права слова
      cs.frozen = true;
      cs.pendingSpeechLevel = newLevel;
      state.speechTarget = companionId;
      state.log.push({
        id: uid("log"),
        kind: "speech",
        companionId,
        text: `${def.name} ступил на грань ступени ${LADDER[newLevel].name}. Переход заморожен — у тебя Право слова.`,
      });
      return;
    }
    // Право слова на этой ступени уже потрачено — переход без остановки
  }

  cs.level = newLevel;
  cs.status = statusForLevel(newLevel);
  state.log.push({
    id: uid("log"),
    kind: "level",
    companionId,
    text:
      newLevel > oldLevel
        ? `${def.name} — новая ступень: ${LADDER[newLevel].name}. ${LADDER[newLevel].desc}.`
        : `${def.name} отступил к ступени: ${LADDER[newLevel].name}.`,
  });

  // V — только сюжетный force_break: движок никогда не ставит V сам
  if (newLevel === 4) {
    state.log.push({
      id: uid("log"),
      kind: "system",
      text: `${def.name} готовит удар в спину. Разрыв (V) случится только в сюжетной точке.`,
    });
  }
}

/* ---------- эффекты выбора ---------- */

function targets(state: GameState, target: string | "all"): string[] {
  if (target !== "all") return [target];
  return Object.values(state.party)
    .filter((c) => !c.gone)
    .map((c) => c.id);
}

function catalystDrain(state: GameState) {
  state.log.push({
    id: uid("log"),
    kind: "catalyst",
    text: "⸸ Катализатор: шёпот Мглы обращается к каждому, кто уже отошёл от клятвы.",
  });
  for (const cs of Object.values(state.party)) {
    if (cs.gone || cs.level < 2) continue;
    const def = COMPANION_BY_ID[cs.id];
    const before = cs.trust;
    cs.trust = Math.max(0, cs.trust - 10);
    state.log.push({
      id: uid("log"),
      kind: "trust",
      companionId: cs.id,
      text: `Мгла шепчет ${def.name} его худшее воспоминание: «${worstMemory(cs)}». Сомнение усилилось.`,
      delta: cs.trust - before,
    });
    const newLevel = levelFromTrust(cs.trust);
    if (newLevel !== cs.level && !cs.frozen) {
      maybeTransition(state, cs.id, newLevel);
    }
  }
}

function worstMemory(cs: CompanionState): string {
  let worst: MemoryEntry | null = null;
  for (const m of cs.memories) {
    if (!worst || m.valence < worst.valence) worst = m;
  }
  return worst ? worst.label : "тишина";
}

/** Проверка приказа в Паузе присяги: ступень ≥II и доверие ниже порога — отказ */
function resolveOrder(state: GameState, choice: Choice) {
  const oc = choice.orderCheck;
  if (!oc) return;
  const cs = state.party[oc.companionId];
  const def = COMPANION_BY_ID[oc.companionId];
  if (!cs || cs.gone) return;

  const willRefuse = cs.level >= 2 && cs.trust < oc.refuseBelow;
  if (willRefuse) {
    state.log.push({
      id: uid("log"),
      kind: "order",
      companionId: oc.companionId,
      text: `${def.name} не выполнил приказ (${oc.action}) — ${LADDER[cs.level].name}. Отряд видит это.`,
    });
    for (const eff of oc.onRefuse) {
      for (const t of targets(state, eff.target)) {
        applyMemory(state, t, eff.tag, eff.valence, eff.label);
      }
    }
  } else {
    state.log.push({
      id: uid("log"),
      kind: "order",
      companionId: oc.companionId,
      text: `${def.name} выполняет приказ: ${oc.action}.`,
    });
    for (const eff of oc.onComply) {
      for (const t of targets(state, eff.target)) {
        applyMemory(state, t, eff.tag, eff.valence, eff.label);
      }
    }
  }
}

/** Применяет выбор игрока к состоянию. Возвращает новое состояние. */
export function applyChoice(state: GameState, choice: Choice): GameState {
  const next: GameState = structuredClone(state);

  if (choice.goldDelta) {
    next.gold = Math.max(0, next.gold + choice.goldDelta);
    next.log.push({
      id: uid("log"),
      kind: "system",
      text: `Проклятое золото: ${choice.goldDelta > 0 ? "+" : "−"}${Math.abs(choice.goldDelta)} (в кошеле ${next.gold}).`,
    });
  }
  if (choice.setFlags) {
    for (const [k, v] of Object.entries(choice.setFlags)) next.flags[k] = v;
  }

  for (const eff of choice.memories ?? []) {
    for (const t of targets(next, eff.target)) {
      applyMemory(next, t, eff.tag, eff.valence, eff.label);
    }
  }

  if (choice.orderCheck) resolveOrder(next, choice);

  if (choice.directTrust) {
    for (const dt of choice.directTrust) {
      for (const t of targets(next, dt.target)) {
        const cs = next.party[t];
        const before = cs.trust;
        cs.trust = Math.min(100, Math.max(0, cs.trust + dt.delta));
        next.log.push({
          id: uid("log"),
          kind: "trust",
          companionId: t,
          text: `${COMPANION_BY_ID[t].name}: ${dt.reason}`,
          delta: cs.trust - before,
        });
        const newLevel = levelFromTrust(cs.trust);
        if (newLevel !== cs.level && !cs.frozen) {
          maybeTransition(next, t, newLevel);
        }
      }
    }
  }

  if (choice.catalyst) catalystDrain(next);

  // финальный выбор: развязка у Столпа (M1.4), затем сюжетный force_break
  if (choice.triggersFinale) {
    // судьба того, кому Мгла вложила нож, решается выбором игрока
    const tgt = choice.finaleTarget ? next.party[choice.finaleTarget] : null;
    if (tgt && !tgt.gone) {
      if (choice.finaleAct === "hold") {
        forceBreak(next, tgt.id);
      } else if (choice.finaleAct === "release") {
        releaseBreak(next, tgt.id);
      } else if (choice.finaleAct === "confess") {
        applyMemory(
          next,
          tgt.id,
          "honesty",
          3,
          `Признал свой шёпот против ${COMPANION_BY_ID[tgt.id].name} — вслух, у Столпа`,
        );
        // память не тускнеет: если горьких записей больше — клятва не удержит
        const after = next.party[tgt.id];
        if (levelFromTrust(after.trust) >= 4 && !after.frozen) forceBreak(next, tgt.id);
      }
    }
    // остальные на ступени IV — обычный сюжетный разрыв
    for (const cs of Object.values(next.party)) {
      if (cs.gone || cs.level !== 4 || cs.frozen) continue;
      forceBreak(next, cs.id);
    }
    next.finished = true;
  }

  return next;
}

/** Сюжетный разрыв: IV → V. Единственный способ получить V. */
export function forceBreak(state: GameState, companionId: string) {
  const cs = state.party[companionId];
  const def = COMPANION_BY_ID[companionId];
  if (!cs || cs.gone) return;
  cs.level = 5;
  cs.status = "broken";
  cs.gone = true;
  cs.frozen = false;
  cs.pendingSpeechLevel = null;
  cs.betrayedAtFinale = true;
  state.log.push({
    id: uid("log"),
    kind: "finale",
    companionId,
    text: `V · Разрыв. ${def.name} воткнул нож под клятвой и растворился в Мгле. Обратной памяти нет — только запись.`,
  });
}

/** Сюжетный уход: V без ножа — Мгла принимает своё живым (M1.4). */
export function releaseBreak(state: GameState, companionId: string) {
  const cs = state.party[companionId];
  const def = COMPANION_BY_ID[companionId];
  if (!cs || cs.gone) return;
  cs.level = 5;
  cs.status = "broken";
  cs.gone = true;
  cs.frozen = false;
  cs.pendingSpeechLevel = null;
  cs.betrayedAtFinale = false;
  state.log.push({
    id: uid("log"),
    kind: "finale",
    companionId,
    text: `V · Разрыв. ${def.name} опустил нож, посмотрел на огонь и ушёл в Мглу живым. Клятва пережила его — не он её.`,
  });
}

/** Рассветный уход (M1.5): V без ножа и без свидетелей — надлом не дождался клятвы.
 *  Отличие от releaseBreak: ни воли игрока, ни Столпа — просто тишина на утреннем снегу. */
export function walkAway(state: GameState, companionId: string) {
  const cs = state.party[companionId];
  const def = COMPANION_BY_ID[companionId];
  if (!cs || cs.gone) return;
  cs.level = 5;
  cs.status = "broken";
  cs.gone = true;
  cs.frozen = false;
  cs.pendingSpeechLevel = null;
  cs.betrayedAtFinale = false;
  cs.walkedAtDawn = true;
  state.log.push({
    id: uid("log"),
    kind: "finale",
    companionId,
    text: `V · Разрыв. ${def.name} ушёл в Мглу сам — на рассвете, до клятвы. Никто не окликнул: все видели, что он давно уже не с нами.`,
  });
}

/** M1.5: рассвет забирает всех, кто достиг ступени IV и не заморожен Правом слова.
 *  Возвращает id ушедших (пусто — никто). */
export function applyDawnWalkaways(state: GameState): string[] {
  const out: string[] = [];
  for (const cs of Object.values(state.party)) {
    if (cs.gone || cs.frozen || cs.level < 4) continue;
    walkAway(state, cs.id);
    out.push(cs.id);
  }
  return out;
}

/* ---------- право слова ---------- */

export type SpeechOption = "confess" | "justify" | "gift" | "silence";

export function speechOptions(state: GameState, companionId: string) {
  const cs = state.party[companionId];
  return {
    giftAvailable: state.gold >= 10 && !cs.gone,
    level: cs.pendingSpeechLevel ?? cs.level,
  };
}

export function resolveSpeech(
  state: GameState,
  companionId: string,
  option: SpeechOption,
): GameState {
  const next: GameState = structuredClone(state);
  const cs = next.party[companionId];
  const def = COMPANION_BY_ID[companionId];
  const speechLevel = cs.pendingSpeechLevel ?? cs.level;
  if (!cs.frozen) return next;

  const unfreeze = () => {
    cs.frozen = false;
    cs.pendingSpeechLevel = null;
    if (!cs.speechUsed.includes(speechLevel)) cs.speechUsed.push(speechLevel);
    next.speechTarget = null;
    const newLevel = levelFromTrust(cs.trust);
    if (newLevel !== cs.level) {
      // если ложь в Праве слова утянула ещё глубже — сработает новая заморозка (ступень IV не потрачена)
      maybeTransition(next, companionId, newLevel);
    } else {
      next.log.push({
        id: uid("log"),
        kind: "level",
        companionId,
        text: `${def.name} — ступень после Права слова: ${LADDER[newLevel].name}.`,
      });
    }
  };

  switch (option) {
    case "confess": {
      // память не тускнеет: исповедь — новая светлая запись поверх старых
      cs.memories.push({
        id: uid("mem"),
        tag: "honesty",
        valence: 2,
        label: `Признал вину перед ${def.name} — исповедь у костра`,
        day: next.day,
        phase: next.phase,
      });
      const w = tagWeight(companionId, "honesty");
      const delta = 2 * w * def.sensitivity;
      cs.trust = Math.min(100, cs.trust + delta);
      next.log.push({
        id: uid("log"),
        kind: "speech",
        companionId,
        text: `Право слова: ты признал вину перед ${def.name}. Старые записи остались — поверх них легла исповедь.`,
        delta,
        trustAfter: cs.trust,
      });
      unfreeze();
      break;
    }
    case "justify": {
      applyMemory(
        next,
        companionId,
        "lie",
        -2,
        `Оправдался перед ${def.name} ложью`,
      );
      next.log.push({
        id: uid("log"),
        kind: "speech",
        companionId,
        text: `Право слова потрачено на ложь. ${def.name} слушал молча.`,
      });
      unfreeze();
      break;
    }
    case "gift": {
      if (next.gold < 10) return next;
      next.gold -= 10;
      const g = def.giftReaction;
      applyMemory(next, companionId, g.tag, g.valence, g.label);
      next.log.push({
        id: uid("log"),
        kind: "speech",
        companionId,
        text: `Право слова: дар в 10 проклятых монет. ${def.name}: «${g.label}».`,
      });
      unfreeze();
      break;
    }
    case "silence": {
      next.log.push({
        id: uid("log"),
        kind: "speech",
        companionId,
        text: `Ты промолчал. Переход для ${def.name} больше не остановить.`,
      });
      unfreeze();
      break;
    }
  }

  // очередь Права слова: если заморожен ещё кто-то — передаём слово ему
  if (!next.speechTarget) {
    const nextFrozen = Object.values(next.party).find((c) => c.frozen);
    if (nextFrozen) next.speechTarget = nextFrozen.id;
  }
  return next;
}

/* ---------- финал ---------- */

export function buildEnding(state: GameState) {
  const rows = Object.values(state.party).map((cs) => {
    const bitter = cs.memories.filter((m) => m.valence < 0).length;
    const share = cs.memories.length ? bitter / cs.memories.length : 0;
    let verdict: string;
    switch (cs.level) {
      case 0:
        verdict = "Остался под клятвой. Память чиста — Мгле не за что зацепиться.";
        break;
      case 1:
        verdict = "Остался, но что-то между вами навсегда остыло.";
        break;
      case 2:
        verdict = "Остался из упрямства. Приказа твоего больше не ждёт.";
        break;
      case 3:
        verdict = "Стоял у Столпа и смотрел тебе прямо в глаза — слишком прямо.";
        break;
      case 5:
        verdict = cs.betrayedAtFinale
          ? "Воткнул нож под клятвой и растворился в Мгле."
          : cs.walkedAtDawn
            ? "Ушёл в Мглу сам — на рассвете, не дожидаясь ни Права слова, ни Столпа."
            : "Опустил нож и ушёл в Мглу живым. Клятва пережила его.";
        break;
      default:
        verdict = "Готовил удар в спину.";
    }
    return {
      companionId: cs.id,
      level: cs.level,
      status: cs.status,
      verdict,
      lastMemories: [...cs.memories].slice(-4).reverse(),
      memoryCount: cs.memories.length,
      bitterShare: share,
    };
  });

  const faithful = rows.filter((r) => r.level <= 1).length;
  const miluta = state.party["miluta"];
  let chronicle = "";
  if (miluta && !miluta.gone && miluta.level <= 2) {
    const bitterAll = rows.reduce((acc, r) => acc + Math.round(r.bitterShare * r.memoryCount), 0);
    const totalAll = rows.reduce((acc, r) => acc + r.memoryCount, 0);
    chronicle = `«Так я запишу этот поход: верных — ${faithful}, записей в летописи — ${totalAll}, из них горьких — ${bitterAll}. Проклятого золота в кошеле — ${state.gold}. Мгла была терпелива. Мы — не всегда.»`;
  } else if (miluta && miluta.gone) {
    chronicle = `«Летопись оборвалась на середине страницы. Почерк Милуты узнают по дрожи последней буквы.»`;
  }

  // титул похода (M1.5): каждая развязка называется своими словами
  const anyBetrayed = rows.some((r) => r.level === 5 && state.party[r.companionId]?.betrayedAtFinale);
  const anyGone = rows.some((r) => r.level === 5);
  const worstLevel = rows.reduce((m, r) => Math.max(m, r.level), 0);
  let title: string;
  let subtitle: string;
  if (anyBetrayed) {
    title = "НОЖ ПОД КЛЯТВОЙ";
    subtitle = "Отряд дошёл до Столпа — но не все дошли до клятвы.";
  } else if (anyGone) {
    title = "УШЛИ ЖИВЫМИ";
    subtitle = "Клятва пережила каждого, кто её покинул.";
  } else if (worstLevel >= 3) {
    title = "КЛЯТВА В ТРЕЩИНАХ";
    subtitle = "Никто не ушёл — но глаза у отряда стали слишком прямыми.";
  } else if (worstLevel >= 2) {
    title = "ТРИ НОЧИ ПОД МГЛОЙ";
    subtitle = "Дошли все. Не все — до сих пор твои.";
  } else {
    title = "КЛЯТВА ДЕРЖИТ";
    subtitle = "Мгле не за что зацепиться. Запомни этот рассвет.";
  }

  return { rows, chronicle, title, subtitle };
}

/* ---------- отладочный пульт ---------- */

export function debugDrainAll(state: GameState, delta: number): GameState {
  const next: GameState = structuredClone(state);
  for (const cs of Object.values(next.party)) {
    if (cs.gone) continue;
    const before = cs.trust;
    cs.trust = Math.min(100, Math.max(0, cs.trust + delta));
    const newLevel = levelFromTrust(cs.trust);
    if (newLevel !== cs.level && !cs.frozen) {
      maybeTransition(next, cs.id, newLevel);
    }
    next.log.push({
      id: uid("log"),
      kind: "trust",
      companionId: cs.id,
      text: `[Пульт] ${COMPANION_BY_ID[cs.id].name}: доверие изменено принудительно.`,
      delta: cs.trust - before,
    });
  }
  return next;
}

/**
 * Шёпот Мглы (M1.0): третья сила действует через память отряда —
 * клевета (lie), жестокость (cruelty), отступничество (oath).
 * Память вечна, лестница и Право слова работают как обычно.
 */
export function applyWhisper(
  state: GameState,
  targets: string[],
  tag: TagId,
  valence: number,
  label: string,
): GameState {
  const next = structuredClone(state);
  for (const cid of targets) applyMemory(next, cid, tag, valence, label);
  return next;
}

export function debugReset(): GameState {
  idCounter = 0;
  return createInitialState();
}

/** Синхронизирует день/фазу до применения выбора — память записывает верный день */
export function withPhase(state: GameState, day: number, phase: Phase): GameState {
  return { ...state, day, phase };
}
