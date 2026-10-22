/* ============================================================
 * ЗАРНИЦА: КЛЯТВА — сценарий 3D-версии «Три ночи под Мглой»
 *
 * Отличия от текстового прототипа:
 *  - события привязаны к точкам местности (маркеры), игрок ходит сам;
 *  - 17 событий вместо 12: +5 новых (оберег, родник, петля, пастух, голос);
 *  - разговоры у костра: можно сознательно поддержать или УКОЛОТЬ
 *    спутника (прямая провокация тяжёлого воспоминания) — предательство
 *    достижимо без пульта испытателя;
 *  - финальный Столп открывается только после всех событий ночи III.
 * ============================================================ */

import type { EventDef, MemoryEffect, TagId } from "./types";
import { EVENTS } from "./scenario";
import { COMPANION_BY_ID } from "./data";
import { AMBIENT_EVENTS } from "./ambient3d";

export interface SceneEvent extends EventDef {
  night: number;
  /** x, z на местности (лагерь в 0,0; радиус игрового поля 38) */
  pos: [number, number];
  /** подпись на маркере */
  marker: string;
  /** открывается только после остальных событий ночи */
  gated?: boolean;
  /** бытовое событие дороги: необязательное, рассвет его не ждёт */
  ambient?: boolean;
}

/** привязка событий к ночам и точкам местности */
const LAYOUT: Record<
  string,
  { night: number; pos: [number, number]; marker: string; gated?: boolean }
> = {
  e1: { night: 1, pos: [10, -6], marker: "Первый дозор" },
  e13: { night: 1, pos: [-14, 8], marker: "Костяной оберег" },
  e2: { night: 1, pos: [16, 12], marker: "Кошель под камнем" },
  e3: { night: 1, pos: [-6, -16], marker: "Ночной набег" },

  e4: { night: 2, pos: [-20, -8], marker: "Дым над Студёной" },
  e14: { night: 2, pos: [22, -2], marker: "Родник" },
  e5: { night: 2, pos: [-10, 20], marker: "Пленный из Мглы" },
  e15: { night: 2, pos: [8, 22], marker: "Петля на тропе" },
  e6: { night: 2, pos: [-24, 10], marker: "Делёж жалованья" },
  e7: { night: 2, pos: [14, -20], marker: "Летопись у костра" },

  e8: { night: 3, pos: [26, 16], marker: "⸸ Развилка Клятвы" },
  e9: { night: 3, pos: [-18, -18], marker: "Пропавший кошель" },
  e17: { night: 3, pos: [0, 26], marker: "Голос из Мглы" },
  e10: { night: 3, pos: [-28, -4], marker: "Мост из брёвен" },
  e16: { night: 3, pos: [20, -14], marker: "Пастух огоньков" },
  e11: { night: 3, pos: [-4, 12], marker: "⸸ Тихий час" },
  e12: { night: 3, pos: [0, -16.5], marker: "СТОЛП ПРИСЯГИ", gated: true },
};

/* ---------------- новые события ---------------- */

const NEW_EVENTS: EventDef[] = [
  {
    id: "e13",
    day: 1,
    phase: "Ночь",
    title: "Костяной оберег",
    text: [
      "Под корнями поваленной ольхи — связка: кости, обмотанные берестой. Резьба на бересте стёрта пальцами — кто-то держал это долго, пока страх не стал длиннее жизни.",
      "Оберег отдан лесу. Лес не отдает подарки — но он и не запрещает брать.",
    ],
    choices: [
      {
        id: "a",
        label: "Взять с собой: лишняя защита не помешает",
        memories: [
          {
            target: "khodata",
            tag: "greed",
            valence: -1,
            label: "Подобрал чужой оберег, отданный мёртвыми",
          },
        ],
      },
      {
        id: "b",
        label: "Оставить, проведя ладонью над берестой: «иди с миром»",
        memories: [
          { target: "miluta", tag: "memory", valence: 1, label: "Не тронул чужую память" },
          { target: "gavrila", tag: "oath", valence: 1, label: "Уважил старый обычай дороги" },
        ],
      },
      {
        id: "c",
        label: "Сжечь: «Мгла не должна найти даже кости»",
        memories: [
          { target: "khodata", tag: "cruelty", valence: -1, label: "Отвёл глаза от огня над костями" },
          { target: "miluta", tag: "cruelty", valence: -1, label: "Записал: «оберег сожгли»" },
        ],
      },
    ],
  },
  {
    id: "e14",
    day: 2,
    phase: "Утро",
    title: "Родник с железным вкусом",
    text: [
      "Родник бьёт из-под каменной плиты, вода чистая, но пахнет железом — как будто под плитой ржавеет что-то большое.",
      "Фляги пустые. До вечера пути без воды.",
    ],
    choices: [
      {
        id: "a",
        label: "Набрать всем фляги. Первый глоток — твой",
        memories: [
          { target: "all", tag: "protection", valence: 1, label: "Напоил отряд из спорного родника" },
          { target: "ratmir", tag: "courage", valence: 1, label: "Вожак попробовал воду первым" },
        ],
      },
      {
        id: "b",
        label: "Набрать только свою флягу. Остальные — сами",
        memories: [
          { target: "all", tag: "greed", valence: -1, label: "Вода была на всех — фляга одна" },
        ],
      },
      {
        id: "c",
        label: "«Вода проклята. Вылейте» — без доказательств",
        memories: [
          {
            target: "khodata",
            tag: "honesty",
            valence: -1,
            label: "Запрет на воду без доказательств — Ходата видел чистую жилу",
          },
          { target: "miluta", tag: "memory", valence: -1, label: "Записал запрет, который не понят" },
        ],
      },
    ],
  },
  {
    id: "e15",
    day: 2,
    phase: "День",
    title: "Петля на тропе",
    text: [
      "Ходата висит в сгнивших силках — нога кровит, береста выпала из рук. Он нем: даже боли у него нет голоса.",
      "Петля держит. Мгла за деревьями делает вид, что не смотрит.",
    ],
    choices: [
      {
        id: "a",
        label: "Резать петлю, перевязать ногу. Без слов",
        memories: [
          {
            target: "khodata",
            tag: "protection",
            valence: 2,
            label: "Вытащил из петли и перевязал ногу",
          },
          { target: "all", tag: "mercy", valence: 1, label: "Своих из силков не бросают" },
        ],
      },
      {
        id: "b",
        label: "«Сам пошёл вперёд без зова» — идти дальше",
        memories: [
          { target: "khodata", tag: "protection", valence: -2, label: "Остался в петле — догонит сам" },
          { target: "ratmir", tag: "protection", valence: -1, label: "Видел, как вожак бросил своего" },
        ],
      },
      {
        id: "c",
        label: "Резать петлю — и забрать его пайок «за задержку»",
        goldDelta: 5,
        memories: [
          { target: "khodata", tag: "greed", valence: -2, label: "Пайок за спасение — цена названа вслух" },
          { target: "miluta", tag: "greed", valence: -1, label: "Записал: «спасение за пайок»" },
        ],
      },
    ],
  },
  {
    id: "e16",
    day: 3,
    phase: "Вечер",
    title: "Пастух огоньков",
    text: [
      "На прогалине тварь-пастух гонит огоньки — маленькие, ровные, как свечи за иконой. Это души тех, кто свернул с дороги и не дошёл.",
      "Пастух не нападает. Он просто пасёт — и ждёт, не добавится ли огонёк.",
    ],
    choices: [
      {
        id: "a",
        label: "Рубить пастуха, пока не ушло",
        memories: [
          { target: "ratmir", tag: "courage", valence: 1, label: "Первым встал против пастуха" },
          { target: "miluta", tag: "cruelty", valence: -1, label: "Огоньки разлетелись от удара — записал" },
          { target: "khodata", tag: "cruelty", valence: -1, label: "Души не трогали — а рубили" },
        ],
      },
      {
        id: "b",
        label: "Отойти молча. Не наше стадо",
        memories: [
          {
            target: "gavrila",
            tag: "oath",
            valence: -1,
            label: "Пропустили пастуха у самого Столпа",
          },
          { target: "ratmir", tag: "cowardice", valence: -1, label: "Не понял, почему не ударили" },
        ],
      },
      {
        id: "c",
        label: "Осенить путь факелом клятвы — отогнать без крови",
        memories: [
          { target: "all", tag: "mercy", valence: 1, label: "Огоньки ушли на свободу от факела" },
          { target: "miluta", tag: "memory", valence: 1, label: "«Отогнали свет светом» — записал слово в слово" },
        ],
      },
    ],
  },
  {
    id: "e17",
    day: 3,
    phase: "День",
    title: "Голос из Мглы",
    text: [
      "Из тумана зовёт голос Торопа — того самого, что сгинул зимой на протяжной охоте. Голос знает твоё имя. Голос помнит, как вы делили последний сухарь.",
      "Мгла говорит голосами того, что отряд потерял. Она не лжёт о прошлом — она лжёт о будущем.",
    ],
    choices: [
      {
        id: "a",
        label: "«Не слушать. Мгла говорит нашим прошлым»",
        memories: [
          { target: "all", tag: "oath", valence: 1, label: "Запретил слушать голоса Мглы" },
          { target: "miluta", tag: "memory", valence: 1, label: "«О прошлом — правда, о будущем — ложь» — записал" },
        ],
      },
      {
        id: "b",
        label: "Пойти на голос самому. Отряду — стоять",
        memories: [
          { target: "ratmir", tag: "courage", valence: 1, label: "Вожак пошёл в Мглу один — юнец запомнил" },
          { target: "miluta", tag: "protection", valence: -1, label: "Отряд остался без прикрытия и без командира" },
        ],
      },
      {
        id: "c",
        label: "«Пусть каждый решает сам» — и молчать",
        memories: [
          { target: "all", tag: "cowardice", valence: -1, label: "Отряд остался один на один с Мглой" },
          { target: "gavrila", tag: "oath", valence: -1, label: "Командир развёл руки — держать некому" },
        ],
      },
    ],
  },
];

/** все события 3D-сценария, привязанные к ночам и точкам (17 ключевых + 9 дорожных) */
export const SCENE_EVENTS: SceneEvent[] = [
  ...[...EVENTS, ...NEW_EVENTS].map((ev) => {
    const lay = LAYOUT[ev.id];
    if (!lay) throw new Error(`нет привязки к местности для ${ev.id}`);
    return { ...ev, night: lay.night, pos: lay.pos, marker: lay.marker, gated: lay.gated };
  }),
  ...AMBIENT_EVENTS,
];

export const NIGHT_COUNT = 3;
export const NIGHT_TITLES: Record<number, string> = {
  1: "Ночь I — Дозор",
  2: "Ночь II — Трещины",
  3: "Ночь III — Развилка",
};

/** события ночи, которые нужно пройти до рассвета (без гейтов, без бытовых) */
export function nightEvents(night: number): SceneEvent[] {
  return SCENE_EVENTS.filter((e) => e.night === night && !e.gated && !e.ambient);
}

/** точки лагеря спутников (вокруг костра) */
export const CAMP_SPOTS: Record<string, [number, number]> = {
  gavrila: [2.4, 3.2],
  khodata: [-3.4, 2.6],
  miluta: [-2.8, -3.6],
  ratmir: [3.8, -2.4],
};

/** Столп присяги — север лагеря */
export const PILLAR_POS: [number, number] = [0, -20];

/* ============================================================
 * РАЗГОВОРЫ У КОСТРА
 * Три действия на спутника за ночь:
 *  - расспросить (+1, светлое);
 *  - поделиться припасами (−5 золота, +1..+2);
 *  - уколоть за живое (−2 по больному тегу — сознательная провокация).
 * ============================================================ */

export interface TalkAction {
  id: "ask" | "share" | "needle";
  label: string;
  note: string;
  goldDelta?: number;
}

export const TALK_ACTIONS: TalkAction[] = [
  {
    id: "ask",
    label: "Расспросить о дороге",
    note: "Выслушать до конца — лёгкое светлое воспоминание",
  },
  {
    id: "share",
    label: "Поделиться припасами (−5 золота)",
    note: "Щедрость у костра запоминается",
    goldDelta: -5,
  },
  {
    id: "needle",
    label: "Уколоть за живое",
    note: "Сознательно задеть больное — тяжёлое воспоминание",
  },
];

const ASK_FLAVOR: Record<string, string[]> = {
  gavrila: [
    "Ветеран чистит нож, когда ты присаживаешься. «Спрашивай, командир. Только не про зиму под Ольховцем».",
    "Про дороги он говорит ровно. Про дозоры — как про живых.",
  ],
  khodata: [
    "Ходата разворачивает бересту: схема троп вокруг лагеря, аккуратные чёрточки.",
    "Он показывает точки, где Мгла подходит ближе всего. Молчание у него содержательное.",
  ],
  miluta: [
    "Милута шуршит страницами: «Хочешь, прочту, как вас записал? Только честно — дослушай до конца».",
    "В летописи отряд выглядит упрямее, чем в жизни. Это, кажется, комплимент.",
  ],
  ratmir: [
    "Ратмир точит меч и болтает без умолку — про кузню, про сестру, про то, что страх «это ремесло, которому не научили».",
    "Слушать его легко. Отвечать — труднее.",
  ],
};

const SHARE_FLAVOR: Record<string, string[]> = {
  gavrila: [
    "Кладёшь рядом с ветераном дорожный запас. Он смотрит долго.",
    "«Беру. По-честному, раз делишь».",
  ],
  khodata: [
    "Ходата принимает молча, кланяется — и тут же перекладывает половину в общий мешок.",
    "Делёж — его язык.",
  ],
  miluta: [
    "Милута отламывает край и записывает: «вожак делится».",
    "Две строчки — и в ночи теплее.",
  ],
  ratmir: [
    "Ратмир жуёт и обещает: «Отработаю. Первым встану в дозор».",
    "От щедрости у него делаются прямее плечи.",
  ],
};

const NEEDLE_FLAVOR: Record<string, string[]> = {
  gavrila: [
    "Ты бросаешь при всех: «Твоя присяга — сказка, которой ты греешься тридцать лет».",
    "Нож в руке ветерана замирает на середине движения.",
  ],
  khodata: [
    "Ты говоришь в лицо: «Ты прячешь чужое, потому что своё нажить не успел».",
    "Береста в руках Ходаты трещит.",
  ],
  miluta: [
    "Ты швыряешь: «Твоя летопись — бумажная правда для трусов».",
    "Перо Милуты оставляет кляксу на полуслове.",
  ],
  ratmir: [
    "Ты обрываешь его болтовню: «Кузнецов сын — а пахнет трусостью».",
    "Костёр трещит громче слов.",
  ],
};

const ASK_LABEL: Record<string, string> = {
  gavrila: "Выслушал Гаврилу до конца",
  khodata: "Изучил тропы вместе с Ходатой",
  miluta: "Дослушал себя в летописи Милуты",
  ratmir: "Дал Ратмиру выговориться",
};

const NEEDLE_SPEC: Record<string, { tag: TagId; label: string }> = {
  gavrila: { tag: "lie", label: "Уколол Гаврилу при отряде — про сказку присяги" },
  khodata: { tag: "greed", label: "Обвинил Ходату в жадности при всех" },
  miluta: { tag: "memory", label: "Оскорбил летопись при отряде" },
  ratmir: { tag: "cowardice", label: "Обозвал Ратмира трусом при отряде" },
};

export function talkAvailable(
  state: { gold: number; flags: Record<string, boolean> },
  cid: string,
  actionId: string,
  night: number,
): boolean {
  if (state.flags[`t${night}_${cid}_${actionId}`]) return false;
  if (actionId === "share" && state.gold < 5) return false;
  return true;
}

/** Собирает событие-разговор на лету. */
export function makeTalkEvent(
  cid: string,
  actionId: "ask" | "share" | "needle",
  night: number,
): EventDef {
  const def = COMPANION_BY_ID[cid];
  const action = TALK_ACTIONS.find((a) => a.id === actionId)!;
  const flavor =
    actionId === "ask"
      ? ASK_FLAVOR[cid]
      : actionId === "share"
        ? SHARE_FLAVOR[cid]
        : NEEDLE_FLAVOR[cid];

  let memory: MemoryEffect;
  if (actionId === "ask") {
    memory = { target: cid, tag: "honesty", valence: 1, label: ASK_LABEL[cid] };
  } else if (actionId === "share") {
    memory = {
      target: cid,
      tag: cid === "gavrila" ? "honesty" : "generosity",
      valence: cid === "gavrila" ? 1 : 2,
      label: `Разделил припасы у костра — ${def.name} запомнил`,
    };
  } else {
    const spec = NEEDLE_SPEC[cid];
    memory = { target: cid, tag: spec.tag, valence: -2, label: spec.label };
  }

  return {
    id: `talk_${cid}_${actionId}_n${night}`,
    day: night,
    phase: "Ночь",
    title: `${def.name}: разговор у костра`,
    text: flavor,
    choices: [
      {
        id: "do",
        label: action.label,
        note: action.note,
        goldDelta: action.goldDelta,
        memories: [memory],
        setFlags: { [`t${night}_${cid}_${actionId}`]: true },
      },
      { id: "leave", label: "Отойти, не сказав лишнего" },
    ],
  };
}
