/* ============================================================
 * ЗАРНИЦА: КЛЯТВА — данные прототипа: теги, спутники, лестница
 * Профили спутников — то же распределение весов, что в M0-каркасе
 * ============================================================ */

import type { CompanionDef, TagDef, TagId } from "./types";

export const TAGS: Record<TagId, TagDef> = {
  honesty: { id: "honesty", name: "Честность" },
  lie: { id: "lie", name: "Ложь" },
  greed: { id: "greed", name: "Жадность" },
  generosity: { id: "generosity", name: "Щедрость" },
  courage: { id: "courage", name: "Храбрость" },
  cowardice: { id: "cowardice", name: "Трусость" },
  protection: { id: "protection", name: "Защита слабых" },
  cruelty: { id: "cruelty", name: "Жестокость" },
  mercy: { id: "mercy", name: "Милосердие" },
  memory: { id: "memory", name: "Правда памяти" },
  oath: { id: "oath", name: "Клятва" },
};

export const LADDER: { level: number; name: string; short: string; desc: string }[] = [
  { level: 0, name: "Верный", short: "✦", desc: "Держит клятву до конца" },
  { level: 1, name: "I · Сомнение", short: "I", desc: "Реплики холоднее, взгляды — дольше" },
  { level: 2, name: "II · Отчуждение", short: "II", desc: "Может не выполнить приказ в бою" },
  { level: 3, name: "III · Заговор", short: "III", desc: "Требует Права слова" },
  { level: 4, name: "IV · Удар в спину", short: "IV", desc: "Готовит предательство" },
  { level: 5, name: "V · Разрыв", short: "V", desc: "Ушёл или стал врагом — только сюжет" },
];

export const COMPANIONS: CompanionDef[] = [
  {
    id: "gavrila",
    name: "Гаврила",
    title: "ветеран порубежья",
    glyph: "ᚦ",
    bio: "Тридцать лет ходил за Мглой и вернулся. Говорит мало, бьёт точно. Держит отряд, когда отряд уже не держится.",
    value: "Чтит честь, порядок и слово, данное у костра.",
    sensitivity: 0.9,
    initialTrust: 74,
    tagWeights: {
      honesty: 2,
      lie: 2,
      oath: 1.5,
      cowardice: 2,
      greed: 1.5,
      cruelty: 1,
      mercy: 0.5,
      courage: 1,
      protection: 1,
      memory: 0.5,
      generosity: 1,
    },
    giftReaction: {
      tag: "greed",
      valence: -1,
      label: "Пытался откупиться подарком",
    },
  },
  {
    id: "khodata",
    name: "Ходата",
    title: "немой следопыт",
    glyph: "ᛉ",
    bio: "Не говорит ни слова — пишет на бересте. Чует Мглу за версту. Делит последнее по-честному: коли берёг — так берёг для всех.",
    value: "Справедливый делёж и тишина леса.",
    sensitivity: 1.0,
    initialTrust: 66,
    tagWeights: {
      greed: 2.5,
      generosity: 1.5,
      honesty: 1.5,
      lie: 1,
      cruelty: 1.5,
      mercy: 1,
      protection: 1,
      cowardice: 1,
      courage: 0.5,
      oath: 1,
      memory: 0.5,
    },
    giftReaction: {
      tag: "generosity",
      valence: 1,
      label: "Принял дар без слов, но с поклоном",
    },
  },
  {
    id: "miluta",
    name: "Милута",
    title: "летописец отряда",
    glyph: "ᛗ",
    bio: "Пишет хронику похода в кожаной тетради. Вера его держится на правде записи: ложь в летописи для него — трещина в мире.",
    value: "Правда и память. «Что записано — то было».",
    sensitivity: 1.25,
    initialTrust: 62,
    tagWeights: {
      lie: 2.5,
      memory: 2,
      cruelty: 1.5,
      mercy: 1.5,
      honesty: 1.5,
      greed: 1,
      oath: 1,
      protection: 1,
      cowardice: 1,
      courage: 0.5,
      generosity: 0.5,
    },
    giftReaction: {
      tag: "greed",
      valence: -1,
      label: "«Клятву не купишь золотом»",
    },
  },
  {
    id: "ratmir",
    name: "Ратмир",
    title: "молодой мечник",
    glyph: "ᚱ",
    bio: "Сын кузнеца, взял меч вместо молота. Горяч, прям, до сих пор считает, что героизм — это ремесло, которому учат.",
    value: "Смелость и защита слабых. Не выносит трусости.",
    sensitivity: 1.1,
    initialTrust: 68,
    tagWeights: {
      cowardice: 2.5,
      protection: 2,
      courage: 1.5,
      cruelty: 1.5,
      lie: 1.5,
      greed: 1,
      mercy: 1,
      honesty: 1,
      oath: 1,
      memory: 0.5,
      generosity: 1,
    },
    giftReaction: {
      tag: "generosity",
      valence: 1,
      label: "Принял дар смущённо, но с благодарностью",
    },
  },
];

export const COMPANION_BY_ID: Record<string, CompanionDef> = Object.fromEntries(
  COMPANIONS.map((c) => [c.id, c]),
);
