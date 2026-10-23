/* ============================================================
 * Симуляция 3D-сценария «Три ночи под Мглой» — баланс-тест.
 * Вопрос: достижим ли Разрыв (V / ночь ножей) БЕЗ пульта испытателя?
 * M1.4: развязка у Столпа — нож / отпуск / исповедь по надлому памяти.
 *
 *   bunx tsx scripts/zarnitsa-web/simulate3d.ts
 * ============================================================ */

import { COMPANION_BY_ID, COMPANIONS } from "../../src/lib/zarnitsa/data";
import {
  applyChoice,
  debugReset,
  levelFromTrust,
  resolveSpeech,
  withPhase,
  type SpeechOption,
} from "../../src/lib/zarnitsa/engine";
import {
  makeFinaleEvent,
  makeTalkEvent,
  NIGHT_COUNT,
  nightEvents,
  SCENE_EVENTS,
  talkAvailable,
  type TalkAction,
} from "../../src/lib/zarnitsa/scenario3d";
import { AMBIENT_EVENTS } from "../../src/lib/zarnitsa/ambient3d";
import type { Choice, GameState, TagId } from "../../src/lib/zarnitsa/types";

/* ---------- утилиты ---------- */

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function weightOf(cid: string, tag: TagId): number {
  return COMPANION_BY_ID[cid].tagWeights[tag] ?? 1;
}

function targetsOf(state: GameState, target: string | "all"): string[] {
  if (target !== "all") return [target];
  return Object.values(state.party)
    .filter((c) => !c.gone)
    .map((c) => c.id);
}

/** ожидаемый эффект выбора при текущем состоянии (для эвристики) */
function scoreChoice(state: GameState, choice: Choice): number {
  let score = 0;
  for (const eff of choice.memories ?? []) {
    for (const t of targetsOf(state, eff.target)) {
      const cs = state.party[t];
      if (!cs || cs.gone) continue;
      score += eff.valence * weightOf(t, eff.tag) * COMPANION_BY_ID[t].sensitivity;
    }
  }
  if (choice.orderCheck) {
    const cs = state.party[choice.orderCheck.companionId];
    const refuse =
      cs && !cs.gone && cs.level >= 2 && cs.trust < choice.orderCheck.refuseBelow;
    const effects = refuse ? choice.orderCheck.onRefuse : choice.orderCheck.onComply;
    for (const eff of effects) {
      for (const t of targetsOf(state, eff.target)) {
        const c2 = state.party[t];
        if (!c2 || c2.gone) continue;
        score += eff.valence * weightOf(t, eff.tag) * COMPANION_BY_ID[t].sensitivity;
      }
    }
  }
  for (const dt of choice.directTrust ?? []) {
    score += dt.delta * targetsOf(state, dt.target).length;
  }
  return score;
}

/* ---------- прогоны ---------- */

type Mode = "cruel" | "kind" | "mixed";

function resolveSpeechQueue(state: GameState, mode: Mode, rng: () => number): GameState {
  let s = state;
  let guard = 0;
  while (s.speechTarget && guard++ < 12) {
    const option: SpeechOption =
      mode === "cruel" ? "justify" : mode === "kind" ? "confess" : rng() < 0.5 ? "confess" : "justify";
    s = resolveSpeech(s, s.speechTarget, option);
  }
  if (s.speechTarget) throw new Error("очередь Права слова не рассосалась");
  return s;
}

function doTalks(state: GameState, night: number, mode: Mode, rng: () => number): GameState {
  let s = state;
  for (const c of COMPANIONS) {
    if (s.party[c.id].gone) continue;
    let action: TalkAction["id"] | null = null;
    if (mode === "cruel") action = "needle";
    else if (mode === "kind") action = s.gold >= 5 ? "share" : "ask";
    else {
      const pool = ["ask", "needle", ...(s.gold >= 5 ? ["share"] : [])].filter((a) =>
        talkAvailable(s, c.id, a, night),
      );
      action = pool.length ? (pool[Math.floor(rng() * pool.length)] as TalkAction["id"]) : null;
    }
    if (!action || !talkAvailable(s, c.id, action, night)) continue;
    const ev = makeTalkEvent(c.id, action, night);
    const pick = mode === "mixed" ? Math.floor(rng() * 2) : 0; // в mixed иногда «отойти»
    const choice = ev.choices[Math.min(pick, ev.choices.length - 1)];
    s = applyChoice(withPhase(s, ev.day, ev.phase), choice);
    s = resolveSpeechQueue(s, mode, rng);
  }
  return s;
}

function doAmbient(state: GameState, night: number, mode: Mode, rng: () => number): { state: GameState; visited: number } {
  let s = state;
  let visited = 0;
  for (const ev of AMBIENT_EVENTS.filter((e) => e.night === night)) {
    if (mode === "mixed" && rng() < 0.4) continue; // дорога необязательна
    const phased = withPhase(s, ev.day, ev.phase);
    const scores = ev.choices.map((ch) => scoreChoice(phased, ch));
    let pick = 0;
    if (mode === "cruel") pick = scores.indexOf(Math.min(...scores));
    else if (mode === "kind") pick = scores.indexOf(Math.max(...scores));
    else pick = Math.floor(rng() * ev.choices.length);
    s = applyChoice(phased, ev.choices[pick]);
    s = resolveSpeechQueue(s, mode, rng);
    visited += 1;
  }
  return { state: s, visited };
}

function run(mode: Mode, seed = 1): { state: GameState; ambientVisited: number } {
  const rng = mulberry32(seed);
  let state = debugReset();
  let ambientVisited = 0;

  for (let night = 1; night <= NIGHT_COUNT; night++) {
    state = doTalks(state, night, mode, rng);

    // дорога — до ключевых событий: в игре её можно проходить когда угодно,
    // но финал (Столп) закрывает ночь, поэтому симуляция ходит по ней раньше
    const amb = doAmbient(state, night, mode, rng);
    state = amb.state;
    ambientVisited += amb.visited;

    const list = nightEvents(night);
    const ordered = [...list, ...SCENE_EVENTS.filter((e) => e.night === night && e.gated)];
    for (const ev of ordered) {
      if (state.finished) break;
      const phased = withPhase(state, ev.day, ev.phase);
      const scores = ev.choices.map((ch) => scoreChoice(phased, ch));
      let pick = 0;
      if (mode === "cruel") pick = scores.indexOf(Math.min(...scores));
      else if (mode === "kind") pick = scores.indexOf(Math.max(...scores));
      else pick = Math.floor(rng() * ev.choices.length);
      state = applyChoice(phased, ev.choices[pick]);
      state = resolveSpeechQueue(state, mode, rng);
    }
    if (state.finished) break;
  }
  return { state, ambientVisited };
}

/* ---------- проверки ---------- */

const failures: string[] = [];
function assert(cond: boolean, msg: string) {
  if (cond) {
    console.log(`  ✓ ${msg}`);
  } else {
    failures.push(msg);
    console.log(`  ✗ ${msg}`);
  }
}

function invariants(state: GameState, label: string) {
  assert(state.gold >= 0, `${label}: золото не уходит в минус (${state.gold})`);
  for (const cs of Object.values(state.party)) {
    assert(cs.trust >= 0 && cs.trust <= 100, `${label}: доверие ${cs.id} в 0..100 (${cs.trust.toFixed(1)})`);
    assert(cs.level === levelFromTrust(cs.trust) || cs.level === 5 || cs.frozen,
      `${label}: ступень ${cs.id} согласована с доверием`);
    if (cs.level === 5) {
      assert(
        state.finished,
        `${label}: V у ${cs.id} возможен только в финальной развязке (нож или отпуск)`,
      );
    }
    for (const m of cs.memories) {
      assert(Number.isInteger(m.valence) && m.valence >= -3 && m.valence <= 3,
        `${label}: валентность ${cs.id} в −3..+3`);
    }
  }
  assert(!state.speechTarget, `${label}: очередь Права слова пуста`);
}

function printParty(state: GameState) {
  for (const c of COMPANIONS) {
    const cs = state.party[c.id];
    console.log(
      `    ${c.name.padEnd(8)} доверие ${cs.trust.toFixed(1).padStart(5)} · ступень ${cs.level} · записей ${cs.memories.length}${cs.gone ? " · ВЫШЕЛ ИЗ ОТРЯДА" : ""}`,
    );
  }
}

console.log("=== ЗАРНИЦА 3D: баланс-симуляция (без пульта испытателя) ===\n");

/* --- 1. ЖЕСТОКИЙ прогон: цель — Ночь ножей --- */
console.log("1) ЖЕСТОКИЙ: уколы за живое + худшие решения + ложь в Праве слова");
const cruelRun = run("cruel");
const cruel = cruelRun.state;
printParty(cruel);
invariants(cruel, "жестокий");
console.log(`    бытовых событий пройдено: ${cruelRun.ambientVisited} из ${AMBIENT_EVENTS.length}`);
assert(cruelRun.ambientVisited === AMBIENT_EVENTS.length, "жестокий прогон проходит и дорогу (события дороги не ломают движок)");
const betrayed = Object.values(cruel.party).filter((c) => c.betrayedAtFinale);
assert(betrayed.length >= 1, "Ночь ножей достигнута БЕЗ пульта: есть Разрыв (V) в финале");
assert(cruel.finished, "прогон дошёл до финала (Клятва у Столпа)");

/* --- 2. ДОБРЫЙ прогон: цель — все верны --- */
console.log("\n2) ДОБРЫЙ: поддержка + лучшие решения + дорога целиком + исповедь");
const kindRun = run("kind");
const kind = kindRun.state;
printParty(kind);
invariants(kind, "добрый");
assert(
  Object.values(kind.party).every((c) => c.level <= 1),
  "все спутники остались на ступенях Верный/I",
);
const minTrust = Math.min(...Object.values(kind.party).map((c) => c.trust));
assert(minTrust >= 55, `доверие не падало ниже 55 (минимум ${minTrust.toFixed(1)})`);
assert(kindRun.ambientVisited === AMBIENT_EVENTS.length, "добрый прогон обошёл всю дорогу — рассвет не заблокирован бытовыми событиями");

/* --- 3. СЛУЧАЙНЫЕ прогоны --- */
console.log("\n3) РАЗБРОС: 4 случайных прогона (сид 11, 22, 33, 44) — дорога по настроению");
let anyDoubt = false;
for (const seed of [11, 22, 33, 44]) {
  const s = run("mixed", seed).state;
  invariants(s, `сид ${seed}`);
  const maxLevel = Math.max(...Object.values(s.party).map((c) => c.level));
  const minT = Math.min(...Object.values(s.party).map((c) => c.trust));
  console.log(
    `    сид ${seed}: худшая ступень ${maxLevel}, минимум доверия ${minT.toFixed(1)}, финиш ${s.finished ? "финал" : "НЕ дошёл"}`,
  );
  assert(s.finished, `сид ${seed}: дошёл до Клятвы у Столпа`);
  if (maxLevel >= 1) anyDoubt = true;
}
assert(anyDoubt, "в случайных прогонах сомнение (I+) возникает само");

/* --- 4. РАЗВЯЗКА (M1.4): Мгла вкладывает нож — три исхода у Столпа --- */
console.log("\n4) РАЗВЯЗКА: ступень IV у Столпа — нож / отпуск / исповедь");

// надломленный Гаврила — как его делает память за три ночи, но без заморозки
function finaleState(trust: number): GameState {
  const s = debugReset();
  s.party.gavrila.trust = trust;
  s.party.gavrila.level = trust < 10 ? 4 : 3;
  s.party.gavrila.memories.push({
    id: "mem_test",
    tag: "cowardice",
    valence: -2,
    label: "Шёпот: «твой страх заметили»",
    day: 2,
    phase: "Ночь",
  });
  return s;
}

const finBase = finaleState(8);
const finEvent = makeFinaleEvent(finBase, []);
assert(finEvent !== null, "сцена развязки открывается при ступени IV");
if (finEvent) {
  assert(finEvent.id === "e12_finale", "id развязки отличен от обычного Столпа");
  assert(finEvent.choices.length === 3, "три развязки: держать / отпустить / исповедь");
  assert(
    finEvent.text.some((p) => p.includes("Шёпот: «твой страх заметили»")),
    "Мгла говорит самым больным воспоминанием кандидата",
  );

  // а. Держать клятву → нож (V, предательство)
  const sHold = applyChoice(withPhase(structuredClone(finBase), 3, "Ночь"), finEvent.choices[0]);
  assert(sHold.finished, "«Держать клятву» завершает поход");
  assert(
    sHold.party.gavrila.gone && sHold.party.gavrila.betrayedAtFinale === true,
    "нож выходит: V с предательством",
  );
  invariants(sHold, "нож");

  // б. Отпустить → уход живым (V без предательства)
  const sRel = applyChoice(withPhase(structuredClone(finBase), 3, "Ночь"), finEvent.choices[1]);
  assert(sRel.finished, "«Отпустить» завершает поход");
  assert(
    sRel.party.gavrila.gone && sRel.party.gavrila.level === 5 && !sRel.party.gavrila.betrayedAtFinale,
    "«Отпустить» — V без ножа (уход живым)",
  );
  invariants(sRel, "отпуск");

  // в. Исповедь: память не тускнеет — истина весит, но не стирает горькие записи
  const sConf = applyChoice(withPhase(structuredClone(finBase), 3, "Ночь"), finEvent.choices[2]);
  assert(sConf.finished, "«Взять вину на себя» завершает поход");
  assert(
    !sConf.party.gavrila.gone && sConf.party.gavrila.level === 3,
    `исповедь удержала нож (доверие ${sConf.party.gavrila.trust.toFixed(1)}, ступень 3)`,
  );
  invariants(sConf, "исповедь");

  // г. Глубокий надлом: исповедь не спасает — записи тяжелее истины
  const deep = finaleState(2);
  const deepEvent = makeFinaleEvent(deep, []);
  if (deepEvent) {
    const sDeep = applyChoice(withPhase(structuredClone(deep), 3, "Ночь"), deepEvent.choices[2]);
    assert(
      sDeep.party.gavrila.gone && sDeep.party.gavrila.betrayedAtFinale === true,
      `при доверии 2 исповедь не удержала — нож всё равно выходит (${sDeep.party.gavrila.trust.toFixed(1)})`,
    );
    invariants(sDeep, "глубокая исповедь");
  }

  // д. Эхо шёпотов против кандидата — Мгла возвращает долг вслух
  const echoEvent = makeFinaleEvent(finBase, [{ cid: "gavrila", spared: false, tag: "cowardice" }]);
  assert(
    echoEvent !== null && echoEvent.text.some((p) => p.includes("возвращает долг")),
    "принятый шёпот против кандидата звучит в развязке",
  );
  const sparedEvent = makeFinaleEvent(finBase, [{ cid: "gavrila", spared: true, tag: "courage" }]);
  assert(
    sparedEvent !== null && sparedEvent.text.some((p) => p.includes("Ты не ответил")),
    "отвергнутый шёпот тоже помнят — но в пользу игрока",
  );
} else {
  failures.push("makeFinaleEvent вернул null при ступени IV");
}

console.log("\n================================");
if (failures.length === 0) {
  console.log("ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ ✓");
} else {
  console.log(`ПРОВАЛОВ: ${failures.length}`);
  for (const f of failures) console.log(`  ✗ ${f}`);
  process.exit(1);
}
