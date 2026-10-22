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
  const pool = WHISPERS.filter(
    (w) => w.night <= night && !done.includes(w.id) && (!w.targets[0] || !state.party[w.targets[0]]?.gone),
  );
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}
