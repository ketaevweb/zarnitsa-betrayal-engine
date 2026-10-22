/* ============================================================
 * Симуляция 3D-сценария «Три ночи под Мглой» — баланс-тест.
 * Вопрос: достижим ли Разрыв (V / ночь ножей) БЕЗ пульта испытателя?
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
  makeTalkEvent,
  NIGHT_COUNT,
  nightEvents,
  SCENE_EVENTS,
  talkAvailable,
  type TalkAction,
} from "../../src/lib/zarnitsa/scenario3d";
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

function run(mode: Mode, seed = 1): GameState {
  const rng = mulberry32(seed);
  let state = debugReset();

  for (let night = 1; night <= NIGHT_COUNT; night++) {
    state = doTalks(state, night, mode, rng);

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
  return state;
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
  for (const cs of Object.values(state.party)) {
    assert(cs.trust >= 0 && cs.trust <= 100, `${label}: доверие ${cs.id} в 0..100 (${cs.trust.toFixed(1)})`);
    assert(cs.level === levelFromTrust(cs.trust) || cs.level === 5 || cs.frozen,
      `${label}: ступень ${cs.id} согласована с доверием`);
    if (cs.level === 5) {
      assert(cs.betrayedAtFinale === true, `${label}: V у ${cs.id} — только сюжетный force_break`);
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
const cruel = run("cruel");
printParty(cruel);
invariants(cruel, "жестокий");
const betrayed = Object.values(cruel.party).filter((c) => c.betrayedAtFinale);
assert(betrayed.length >= 1, "Ночь ножей достигнута БЕЗ пульта: есть Разрыв (V) в финале");
assert(cruel.finished, "прогон дошёл до финала (Клятва у Столпа)");

/* --- 2. ДОБРЫЙ прогон: цель — все верны --- */
console.log("\n2) ДОБРЫЙ: поддержка + лучшие решения + исповедь в Праве слова");
const kind = run("kind");
printParty(kind);
invariants(kind, "добрый");
assert(
  Object.values(kind.party).every((c) => c.level <= 1),
  "все спутники остались на ступенях Верный/I",
);
const minTrust = Math.min(...Object.values(kind.party).map((c) => c.trust));
assert(minTrust >= 55, `доверие не падало ниже 55 (минимум ${minTrust.toFixed(1)})`);

/* --- 3. СЛУЧАЙНЫЕ прогоны --- */
console.log("\n3) РАЗБРОС: 4 случайных прогона (сид 11, 22, 33, 44)");
let anyDoubt = false;
for (const seed of [11, 22, 33, 44]) {
  const s = run("mixed", seed);
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

console.log("\n================================");
if (failures.length === 0) {
  console.log("ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ ✓");
} else {
  console.log(`ПРОВАЛОВ: ${failures.length}`);
  for (const f of failures) console.log(`  ✗ ${f}`);
  process.exit(1);
}
