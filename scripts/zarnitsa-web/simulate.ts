/* Симуляция движка предательства: прогоны сценария + инварианты */
import {
  applyChoice,
  buildEnding,
  createInitialState,
  debugDrainAll,
  resolveSpeech,
  withPhase,
} from "../../src/lib/zarnitsa/engine";
import { EVENTS } from "../../src/lib/zarnitsa/scenario";
import type { GameState } from "../../src/lib/zarnitsa/types";

let errors = 0;
function fail(msg: string) {
  errors += 1;
  console.log(`  ОШИБКА: ${msg}`);
}

function run(
  name: string,
  pick: (i: number) => number,
  pre?: (s: GameState, i: number) => GameState,
): GameState {
  let s = createInitialState();
  for (let i = 0; i < EVENTS.length; i++) {
    const ev = EVENTS[i];
    if (pre) s = pre(s, i);
    const phased = withPhase(s, ev.day, ev.phase);
    s = applyChoice(phased, ev.choices[pick(i)]);
    // очередь Права слова: разрешаем все заморозки подряд
    let rounds = 0;
    while (s.speechTarget) {
      rounds += 1;
      if (rounds > 10) fail("бесконечная очередь Права слова в прогоне");
      const t = s.speechTarget;
      s = resolveSpeech(s, t, "confess");
    }
  }
  const end = buildEnding(s);
  console.log(`\n=== ${name} ===`);
  for (const r of end.rows) {
    console.log(
      `  ${r.companionId.padEnd(8)} level=${r.level} memories=${r.memoryCount} горьких=${Math.round(r.bitterShare * 100)}%`,
    );
  }
  console.log(`  золото=${s.gold} хроника=${end.chronicle ? "есть" : "нет"}`);
  return s;
}

// Прогон 1: добрый вожак
run("ДОБРЫЙ", (i) => [0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0][i] ?? 0);

// Прогон 2: жестокий вожак + обвал перед катализатором
run("ЖЕСТОКИЙ", (i) => [2, 1, 2, 1, 0, 1, 2, 2, 0, 2, 1, 0][i] ?? 0, (s, i) =>
  i === 10 ? debugDrainAll(s, -20) : s,
);

// Прогон 3: пульт — заморозка и молчание, потом force_break
(() => {
  let s = createInitialState();
  s = withPhase(s, 2, "Вечер");
  s = debugDrainAll(s, -55); // обвал ниже порогов → заморозки
  console.log(`\n=== ПУЛЬТ: заморозка и молчание ===`);
  if (!s.speechTarget) fail("заморозка не сработала при −55");
  let speechRounds = 0;
  while (s.speechTarget) {
    speechRounds += 1;
    const target = s.speechTarget;
    console.log(
      `  слово #${speechRounds}: ${target} (ступень ${s.party[target].pendingSpeechLevel}) → молчание`,
    );
    s = resolveSpeech(s, target, "silence");
    if (speechRounds > 10) fail("бесконечная очередь Права слова");
  }
  console.log(
    `  очередь отработана за ${speechRounds} диалога(ов); уровни: ${Object.entries(s.party)
      .map(([k, v]) => `${k}:${v.level}(${v.trust.toFixed(1)})`)
      .join(", ")}`,
  );
  for (const cs of Object.values(s.party)) {
    if (cs.frozen) fail(`остался замороженным: ${cs.id}`);
  }
  // второй обвал: право слова уже потрачено на 3 — переходы дальше идут без остановки
  s = debugDrainAll(s, -60);
  const frozen2 = Object.values(s.party).filter((c) => c.frozen);
  console.log(
    `  после второго обвала заморожено: ${frozen2.map((c) => `${c.id}(ступень ${c.pendingSpeechLevel})`).join(", ") || "никого"}`,
  );
  // resolve очередь до конца — если право слова ещё есть на новых ступенях
  let rounds2 = 0;
  while (s.speechTarget) {
    rounds2 += 1;
    s = resolveSpeech(s, s.speechTarget, "confess");
    if (rounds2 > 10) fail("бесконечная очередь 2");
  }
  console.log(
    `  уровни финал: ${Object.entries(s.party)
      .map(([k, v]) => `${k}:${v.level}`)
      .join(", ")}`,
  );
  const e3 = buildEnding(s);
  console.log(`  вердикты: ${e3.rows.map((r) => `${r.companionId}=${r.level}`).join(", ")}`);
})();

// Инварианты на трёх прогонах
console.log("\n=== ИНВАРИАНТЫ ===");
const runs = [
  run("И1(a)", () => 0),
  run("И2(b)", () => 1),
  run("И3(c)", (i) => Math.min(2, EVENTS[i].choices.length - 1)),
];
for (const s of runs) {
  for (const cs of Object.values(s.party)) {
    if (cs.level === 5 && !cs.gone) fail("V без force_break");
    if (cs.trust < 0 || cs.trust > 100) fail("доверие вне 0..100");
    for (const m of cs.memories) {
      if (!Number.isInteger(m.valence) || m.valence < -3 || m.valence > 3)
        fail(`валентность ${m.valence} у «${m.label}»`);
    }
    if (cs.frozen && !s.speechTarget) fail("заморозка без speechTarget");
    if (cs.frozen && cs.gone) fail("заморозка у вышедшего");
  }
}
console.log(errors === 0 ? "\nВСЕ ПРОВЕРКИ ПРОЙДЕНЫ ✓" : `\nПРОВАЛЕНО: ${errors}`);
process.exit(errors === 0 ? 0 : 1);
