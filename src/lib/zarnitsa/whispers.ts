/* ============================================================
 * ЗАРНИЦА: КЛЯТВА 3D — M1.0 «Шёпоты Мглы»
 *
 * Мгла подступает не только к костру, но и к разуму: когда стужа
 * долго давит (топливо низкое, dread ≥ 0.45), она шепчет игроку.
 * Принять — память отряда отравлена ложью/жестокостью/отступничеством
 * (вечная запись, честный вес по чувствительности спутника).
 * Отвергнуть — стойкость, лёгкий плюс тому, кто был мишенью.
 * За ночь — не больше двух шёпотов; три ночи — разные соблазны.
 * ============================================================ */

import type { TagId } from "./types";
import type { GameState } from "./types";
import { getChronicle, pastMemory, prevRun, type ChronicleEntry } from "./chronicle";

export interface WhisperDef {
  id: string;
  /** с какой ночи доступен */
  night: number;
  /** текст шёпота (курсив, от Мглы) */
  text: string;
  /** кнопка принятия */
  accept: string;
  /** кнопка отвержения */
  reject: string;
  /** кому бьёт принятие: конкретные cid или все живые */
  targets: string[] | "all";
  /** память принятия: тег, валентность, метка в летописи */
  tag: TagId;
  valence: number;
  label: string;
  /** память отвержения (лёгкий плюс; может отсутствовать) */
  rejTargets?: string[];
  rejTag?: TagId;
  rejValence?: number;
  rejLabel?: string;
}

export const WHISPERS: WhisperDef[] = [
  {
    id: "w_gavrila",
    night: 1,
    text:
      "Я видел, как он дрожал в первом дозоре… Скажи Гавриле, что видел ты. Пусть мальчик знает — его страх уже замечен.",
    accept: "Сказать Гавриле, что видел его страх",
    reject: "Промолчать и кивнуть тьме",
    targets: ["gavrila"],
    tag: "cowardice",
    valence: -2,
    label: "Шёпот: «твой страх заметили»",
    rejTargets: ["gavrila"],
    rejTag: "courage",
    rejValence: 1,
    rejLabel: "Молчал о чужом страхе",
  },
  {
    id: "w_hodata",
    night: 1,
    text:
      "Присяга — верёвка на шее отряда… Скажи им: Столп молчит, потому что клятва пуста. Скажи — и верёвка ослабнет.",
    accept: "Сказать отряду, что клятва пуста",
    reject: "Стиснуть зубы — клятва держит",
    targets: "all",
    tag: "oath",
    valence: -1,
    label: "Шёпот: «клятва пуста»",
    rejTargets: ["hodata"],
    rejTag: "oath",
    rejValence: 1,
    rejLabel: "Отверг шёпот о пустой клятве",
  },
  {
    id: "w_miluta",
    night: 2,
    text:
      "Скупой прячет кошель за пазухой… Скажи отряду: пусть проверят мешки Милуты. Чужая стыдоба — твоя выгода.",
    accept: "Навести отряд на мешки Милуты",
    reject: "Отвести взгляд от чужих мешков",
    targets: ["miluta"],
    tag: "lie",
    valence: -2,
    label: "Шёпот: «проверьте его мешки»",
    rejTargets: ["miluta"],
    rejTag: "honesty",
    rejValence: 1,
    rejLabel: "Не стал клеветать на скупого",
  },
  {
    id: "w_ratmir",
    night: 2,
    text:
      "Крикни во тьму: пусть слабые подохнут в снегу… Крикни — и стужа признает тебя своим. Крикни, защитник.",
    accept: "Крикнуть во тьму",
    reject: "Прикрыть рот ладонью",
    targets: "all",
    tag: "cruelty",
    valence: -1,
    label: "Шёпот: «пусть слабые подохнут»",
    rejTargets: ["ratmir"],
    rejTag: "protection",
    rejValence: 1,
    rejLabel: "Не поддался зову жестокости",
  },
  {
    id: "w_fog",
    night: 3,
    text:
      "Уйди в туман один… Там не лгут, там присяги уже сожжены. Отряд уснёт — а ты вернёшься целым. Или не вернёшься.",
    accept: "Уйти в туман одному",
    reject: "Остаться у живого огня",
    targets: "all",
    tag: "oath",
    valence: -2,
    label: "Шёпот: «уйди в туман один»",
    rejTargets: ["hodata"],
    rejTag: "oath",
    rejValence: 1,
    rejLabel: "Остался с отрядом перед Мглой",
  },
];

/** Выбор шёпота: по ночи, без повторов; мишень не должна уйти из отряда. */
export function pickWhisper(night: number, done: string[], state: GameState): WhisperDef | null {
  const pool = whisperPool(night, done, state);
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}

/* ============================================================
 * M1.11 «Мгла помнит» — мета-шёпот летописи.
 * На третьей ночи, если летопись хранит хоть один завершённый
 * поход, Мгла узнаёт вернувшегося игрока и заговаривает его
 * собственной историей. Принятие — новая трещина в клятве;
 * отказ — стойкость перед повтором старой ночи.
 * ============================================================ */

export const PAST_WHISPER_ID = "w_past";

const PAST_TEXT: Record<string, string> = {
  "НОЖ ПОД КЛЯТВОЙ":
    "Прошлый раз ты тоже стоял у Столпа… и нож тоже вышел. Я лишь подала его. Давай повторим — тебе понравилось.",
  "УШЛИ ЖИВЫМИ":
    "Ты уже уходил от меня живым. Для тех, кто рядом, это плохо кончается. Спроси свой отряд… а, он уже другой.",
  "КЛЯТВА В ТРЕЩИНАХ":
    "Твоя прошлая клятва треснула на третьей ночи. Я слышала звук. Эта звучит точно так же.",
  "ТРИ НОЧИ ПОД МГЛОЙ":
    "Мы уже гуляли с тобой три ночи. Тогда ты отдал своё. Ты мало меняешься, вожак.",
  "КЛЯТВА ДЕРЖИТ":
    "В прошлый раз клятва держала. Я терпеливая. Я запомнила, где она держалась, — там и надавлю.",
};

/** личный шёпот Мглы о последнем завершённом походе игрока */
export function makePastWhisper(entry: ChronicleEntry): WhisperDef {
  const head = entry.oath
    ? "Тогда ты произнёс обет молчанием — я до сих пор храню эту тишину. "
    : "";
  const body = PAST_TEXT[entry.title] ??
    `Ты уже стоял у Столпа. Прошлый раз ${pastMemory(entry.title)}. Я всё помню — я всё записываю.`;
  return {
    id: PAST_WHISPER_ID,
    night: 3,
    text: `${head}${body}`,
    accept: "Ответить: «Да, я возвращался. И вернусь снова»",
    reject: "«Твоя память — не моя. Я здесь впервые за этот поход»",
    targets: "all",
    tag: "oath",
    valence: -2,
    label: "Принял шёпот о прошлых походах — Мгла узнана в ответ",
    rejTargets: ["gavrila"],
    rejTag: "oath",
    rejValence: 1,
    rejLabel: "Ветеран услышал: вожак отрезал Мгле дорогу в прошлое",
  };
}

/** общий пул шёпота на данную ночь: базовые + мета-шёпот летописи (ночь III) */
export function whisperPool(night: number, done: string[], state: GameState): WhisperDef[] {
  const pool: WhisperDef[] = [...WHISPERS];
  if (night >= 3 && !done.includes(PAST_WHISPER_ID)) {
    const last = prevRun();
    if (last) pool.push(makePastWhisper(last));
  }
  return pool.filter(
    (w) => w.night <= night && !done.includes(w.id) && (!w.targets[0] || !state.party[w.targets[0]]?.gone),
  );
}

/** единый поиск определения шёпота — общий пул + мета-шёпот летописи */
export function whisperById(id: string): WhisperDef | null {
  const base = WHISPERS.find((w) => w.id === id);
  if (base) return base;
  if (id === PAST_WHISPER_ID) {
    const last = getChronicle()[getChronicle().length - 1];
    return last ? makePastWhisper(last) : null;
  }
  return null;
}
