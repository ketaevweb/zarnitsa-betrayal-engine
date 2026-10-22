/* ============================================================
 * ЗАРНИЦА: КЛЯТВА — сценарий демо «Три ночи» (12 решений)
 * Катализаторы: e8 «Развилка Клятвы», e11 «Тихий час»
 * Пауза присяги: e3 «Ночной набег», e10 «Мост из чёрных брёвен»
 * ============================================================ */

import type { EventDef } from "./types";

export const EVENTS: EventDef[] = [
  /* ---------------- ДЕНЬ 1 ---------------- */
  {
    id: "e1",
    day: 1,
    phase: "Вечер",
    title: "Первый дозор",
    text: [
      "Костёр жуёт сырые дрова. Впереди — Студёный лес, за ним ночует Мгла. До Присяги у Столпа — три ночи.",
      "Ратмир перехватывает твой взгляд и кладёт ладонь на рукоять: «Разреши первый дозор. Я не засну. Честно».",
      "Гаврила поднимает бровь. Ходата молча подкладывает ветку в огонь.",
    ],
    choices: [
      {
        id: "a",
        label: "«Дозор твой, Ратмир. Крикни — если что»",
        memories: [
          {
            target: "ratmir",
            tag: "courage",
            valence: 1,
            label: "Доверил юнцу первый дозор",
          },
        ],
      },
      {
        id: "b",
        label: "«Пойду сам. Отдыхайте»",
        note: "Надёжно — но юнцу это запомнится",
        memories: [
          { target: "gavrila", tag: "protection", valence: 1, label: "Взял дозор на себя" },
          { target: "ratmir", tag: "protection", valence: -1, label: "Не доверил ему дозора" },
        ],
      },
      {
        id: "c",
        label: "«Мгла сегодня тиха. Дозора не будет»",
        note: "Ночь покажет",
        memories: [
          { target: "gavrila", tag: "oath", valence: -1, label: "Пренебрёг дозором" },
          { target: "ratmir", tag: "cowardice", valence: -1, label: "Решил отлежаться в ночи" },
        ],
      },
    ],
  },
  {
    id: "e2",
    day: 1,
    phase: "Ночь",
    title: "Кошель под камнем",
    text: [
      "Ходата будрует тебя жестом: под крайним камнем старой гати — кошель. Двадцать четыре монеты, и на каждой — след клейма, которое лучше не разглядывать.",
      "Проклятое золото не кусается. Оно просто запоминает руки.",
    ],
    choices: [
      {
        id: "a",
        label: "Разделить на четверых, у костра, открыто",
        goldDelta: 24,
        memories: [
          { target: "all", tag: "honesty", valence: 1, label: "Разделил кошель поровну" },
          { target: "khodata", tag: "honesty", valence: 1, label: "Делёж при свидетелях — как он любит" },
        ],
      },
      {
        id: "b",
        label: "Прибрать себе: «вожаку положено»",
        goldDelta: 24,
        memories: [
          { target: "all", tag: "greed", valence: -1, label: "Прибрал кошель себе" },
          { target: "khodata", tag: "greed", valence: -1, label: "Видел, как спрятали золото от своих" },
        ],
      },
      {
        id: "c",
        label: "«Золото проклято. Пусть лежит»",
        memories: [
          { target: "miluta", tag: "memory", valence: 1, label: "Оставил проклятое золото Мгле" },
          { target: "gavrila", tag: "oath", valence: 1, label: "Не повёлся на лёгкое золото" },
        ],
      },
    ],
  },
  {
    id: "e3",
    day: 1,
    phase: "Ночь",
    title: "Ночной набег",
    isOrder: true,
    text: [
      "Мгла сползает с деревьев раньше срока. Из чёрного кружатся очертания — твари идут к обозу, где спит Милута со своей тетрадью.",
      "ПАУЗА ПРИСЯГИ. Ты командир — приказывай. Но помни: тот, кто отошёл от клятвы, может не выполнить приказ.",
    ],
    choices: [
      {
        id: "a",
        label: "«Ратмир — прикрой Милуту!»",
        orderCheck: {
          companionId: "ratmir",
          action: "прикрыть Милуту",
          refuseBelow: 30,
          onComply: [
            { target: "ratmir", tag: "courage", valence: 1, label: "Прикрыл Милуту в Мгле" },
            { target: "miluta", tag: "protection", valence: 1, label: "Ратмир встал между мной и тварью" },
          ],
          onRefuse: [
            { target: "miluta", tag: "protection", valence: -2, label: "Остался без прикрытия под Мглой" },
            { target: "gavrila", tag: "cowardice", valence: -1, label: "Юнец не встал в строй — кто-то в отряде дрогнул" },
          ],
        },
      },
      {
        id: "b",
        label: "«Гаврила — на обоз! Остальные — за мной»",
        orderCheck: {
          companionId: "gavrila",
          action: "держать обоз",
          refuseBelow: 20,
          onComply: [
            { target: "gavrila", tag: "protection", valence: 1, label: "Держал обоз, пока отряд рубился" },
            { target: "miluta", tag: "protection", valence: 1, label: "Обоз устоял — тетрадь цела" },
          ],
          onRefuse: [
            { target: "miluta", tag: "protection", valence: -2, label: "Тварь добралась до тетради" },
          ],
        },
      },
      {
        id: "c",
        label: "«Назад все! Твари не стоят наших жизней»",
        memories: [
          { target: "all", tag: "cowardice", valence: -1, label: "Отступил перед Мглой без боя" },
          { target: "ratmir", tag: "cowardice", valence: -1, label: "Не дал ударить на тварей" },
        ],
        goldDelta: -8,
      },
    ],
  },

  /* ---------------- ДЕНЬ 2 ---------------- */
  {
    id: "e4",
    day: 2,
    phase: "Утро",
    title: "Дым над Студёной",
    text: [
      "Деревня Студёная: семь дворов, колодец, у колодца — старуха с чёрной водой в ведре. «Тварь в колодце, — говорит. — Дети воду пьют страх».",
      "У отряда день пути в запасе. Или нет.",
    ],
    choices: [
      {
        id: "a",
        label: "Чистить колодец. Бесплатно",
        memories: [
          { target: "all", tag: "mercy", valence: 1, label: "Очистил колодец Студёной даром" },
          { target: "ratmir", tag: "courage", valence: 1, label: "Первым спустился в колодец" },
        ],
      },
      {
        id: "b",
        label: "«Пятнадцать монет — и колодец ваш»",
        goldDelta: 15,
        memories: [
          { target: "khodata", tag: "greed", valence: -1, label: "Поторговался на чужой беде" },
          { target: "miluta", tag: "greed", valence: -1, label: "Записал цену в летопись: «колодец — 15»" },
          { target: "gavrila", tag: "honesty", valence: 1, label: "Честная плата за честную работу" },
        ],
      },
      {
        id: "c",
        label: "Пройти мимо. Не наше дело",
        memories: [
          { target: "all", tag: "protection", valence: -1, label: "Прошли мимо беды" },
          { target: "ratmir", tag: "protection", valence: -1, label: "Не дал заступиться за деревню" },
        ],
      },
    ],
  },
  {
    id: "e5",
    day: 2,
    phase: "День",
    title: "Пленный из Мглы",
    text: [
      "Ходата выводит из тумана человека: разбойник, водил тварей к обозам. Он на коленях, руки связаны лыком, глаза бегают.",
      "«Слово дам — больше не буду, — шепчет. — Клянусь чем хотите».",
    ],
    choices: [
      {
        id: "a",
        label: "Казнить по закону дороги",
        memories: [
          { target: "miluta", tag: "cruelty", valence: -2, label: "Казнь на его глазах" },
          { target: "ratmir", tag: "cruelty", valence: -1, label: "Смотрел, как казнят без суда" },
          { target: "khodata", tag: "cruelty", valence: -1, label: "Отвёл глаза, когда рубили" },
        ],
      },
      {
        id: "b",
        label: "Отпустить, забрав слово",
        memories: [
          { target: "miluta", tag: "mercy", valence: 1, label: "Отпустил пленного живым" },
          { target: "gavrila", tag: "cowardice", valence: -1, label: "Отпустил врага — вернётся с тварями" },
        ],
      },
      {
        id: "c",
        label: "Допросить — по-настоящему",
        note: "Узнаешь тропы Мглы. Ценой криков",
        memories: [
          { target: "miluta", tag: "cruelty", valence: -2, label: "Слышал крики в лесу и записал" },
          { target: "khodata", tag: "cruelty", valence: -2, label: "Ушёл в чащу, чтобы не слышать" },
          { target: "ratmir", tag: "cruelty", valence: -1, label: "Держал пленного за плечи" },
        ],
      },
    ],
  },
  {
    id: "e6",
    day: 2,
    phase: "Вечер",
    title: "Делёж жалованья",
    text: [
      "Тридцать монет за колодец и обод. Ходата выкладывает их на плащ и смотрит на тебя: делить — твоё право, командир.",
      "Все четверо у костра. Слова сейчас станут памятью.",
    ],
    choices: [
      {
        id: "a",
        label: "Поровну. На четверых",
        goldDelta: 30,
        memories: [
          { target: "all", tag: "honesty", valence: 1, label: "Разделил жалованье поровну" },
          { target: "khodata", tag: "honesty", valence: 1, label: "Делёж без обиды — редкое искусство" },
        ],
      },
      {
        id: "b",
        label: "Вожаку — двойная доля. Я веду — я и беру",
        goldDelta: 30,
        memories: [
          { target: "all", tag: "greed", valence: -1, label: "Взял двойную долю" },
          { target: "khodata", tag: "greed", valence: -1, label: "Двойная доля на глазах отряда" },
        ],
      },
      {
        id: "c",
        label: "Ратмиру — меньше. Он младший",
        goldDelta: 30,
        memories: [
          { target: "ratmir", tag: "greed", valence: -1, label: "Обделили при дележе — «младший»" },
          { target: "khodata", tag: "greed", valence: -2, label: "Несправедливый делёж на его плаще" },
          { target: "miluta", tag: "greed", valence: -1, label: "Записал: «вожак обделил юного»" },
        ],
      },
    ],
  },
  {
    id: "e7",
    day: 2,
    phase: "Ночь",
    title: "Летопись у костра",
    text: [
      "Милута читает вслух сегодняшнюю запись: про колодец, про пленного, про Мглу. Голос ровный, палец с чернильным пятном ведёт по строкам.",
      "«…а вожак наш…» — он поднимает глаза. — «Что писать про тебя, командир?»",
    ],
    choices: [
      {
        id: "a",
        label: "«Пиши правду. Как есть»",
        memories: [
          { target: "miluta", tag: "memory", valence: 2, label: "Разрешил правду в летописи" },
        ],
      },
      {
        id: "b",
        label: "«Приукрась. Героем ночи был я»",
        memories: [
          { target: "miluta", tag: "lie", valence: -2, label: "Заставил лгать летопись" },
          { target: "ratmir", tag: "lie", valence: -1, label: "Слышал, как вожак присвоил чужую храбрость" },
        ],
      },
      {
        id: "c",
        label: "«Дай сюда…» — вырвать страницу",
        note: "Ночь Мглы останется ненаписанной",
        memories: [
          { target: "miluta", tag: "memory", valence: -3, label: "Вырвал страницу летописи" },
          { target: "gavrila", tag: "lie", valence: -1, label: "Старая память не терпит вырванных листов" },
        ],
      },
    ],
  },

  /* ------ КАТАЛИЗАТОР 1 ------ */
  {
    id: "e8",
    day: 2,
    phase: "Ночь",
    title: "⸸ Развилка Клятвы — катализатор",
    text: [
      "У развилки стоит Столп — камень с выбитой присягой. Здесь отряды подтверждают клятву ладонью на камне.",
      "Мгла шепчет тебе отдельно: «Солги. Пройди мимо — и золото твоё, и жизнь твоя. Отряд не узнает».",
      "Камень ждёт. Отряд смотрит.",
    ],
    choices: [
      {
        id: "a",
        label: "Присягнуть со всеми. Ладонь на камне",
        memories: [
          { target: "all", tag: "oath", valence: 1, label: "Присягнул у Столпа вместе со всеми" },
        ],
      },
      {
        id: "b",
        label: "Тайно уклониться — ладонь в кармане",
        note: "Мгла запомнит. Отряд — потом",
        setFlags: { falseOath: true },
        memories: [],
      },
      {
        id: "c",
        label: "Отказаться открыто: «Клятвы мне не нужны»",
        memories: [
          { target: "all", tag: "oath", valence: -1, label: "Отказался от присяги у Столпа" },
          { target: "gavrila", tag: "oath", valence: -1, label: "Старая присяга оскорблена" },
        ],
      },
    ],
  },

  /* ---------------- ДЕНЬ 3 ---------------- */
  {
    id: "e9",
    day: 3,
    phase: "Утро",
    title: "Пропавший кошель",
    text: [
      "Утро серое. Часть общего золота пропала из мешка. Мешок хранил Ходата — он же и нашёл пропажу, и молчит, глядя в сторону.",
      "Ратмир сжимает кулаки. Гаврила ждёт твоего слова.",
    ],
    choices: [
      {
        id: "a",
        label: "«Ходата! Отвечай» — обвинить без улик",
        memories: [
          { target: "khodata", tag: "honesty", valence: -3, label: "Клеймо без вины — от своих же" },
          { target: "miluta", tag: "lie", valence: -1, label: "Свидетель клеветы без суда" },
          { target: "ratmir", tag: "lie", valence: -1, label: "Увидел, как топят своего" },
        ],
      },
      {
        id: "b",
        label: "Искать след настоящий. Все ищут",
        note: "Ходата выйдет из тумана с берестой: следы Мглы",
        memories: [
          { target: "khodata", tag: "protection", valence: 2, label: "Не поверил в его вину — искал правду" },
          { target: "all", tag: "honesty", valence: 1, label: "Нашёл след Мглы, а не вора" },
        ],
      },
      {
        id: "c",
        label: "«Золото проклято. Забудьте»",
        memories: [
          { target: "khodata", tag: "honesty", valence: -1, label: "Под клеймом так и остался" },
          { target: "ratmir", tag: "cowardice", valence: -1, label: "Струсил разобраться" },
        ],
      },
    ],
  },
  {
    id: "e10",
    day: 3,
    phase: "День",
    title: "Мост из чёрных брёвен",
    isOrder: true,
    text: [
      "Мост через чёрную воду. На том берегу — вожак тварей: выше человека, лицо как забытое имя.",
      "ПАУЗА ПРИСЯГИ. За мостом — Столп. До клятвы — один бой.",
    ],
    choices: [
      {
        id: "a",
        label: "«Ратмир — удержи мост! Мы — в лоб!»",
        orderCheck: {
          companionId: "ratmir",
          action: "удержать мост",
          refuseBelow: 35,
          onComply: [
            { target: "ratmir", tag: "courage", valence: 2, label: "Один держал мост против вожака" },
            { target: "all", tag: "courage", valence: 1, label: "Стояли как клялись" },
          ],
          onRefuse: [
            { target: "ratmir", tag: "cowardice", valence: -1, label: "Не двинулся на приказ — первый раз" },
            { target: "gavrila", tag: "cowardice", valence: -1, label: "Мост пал — вожак видел ваше замешательство" },
          ],
        },
      },
      {
        id: "b",
        label: "«Гаврила, веди строй. Я — с фланга»",
        orderCheck: {
          companionId: "gavrila",
          action: "вести строй",
          refuseBelow: 25,
          onComply: [
            { target: "gavrila", tag: "courage", valence: 1, label: "Вёл строй под Мглой" },
          ],
          onRefuse: [
            { target: "miluta", tag: "protection", valence: -1, label: "Строй рассыпался без команды" },
          ],
        },
      },
      {
        id: "c",
        label: "Отступить за мост. Пусть Столп подождёт",
        memories: [
          { target: "ratmir", tag: "cowardice", valence: -2, label: "Отступил перед самым Столпом" },
          { target: "gavrila", tag: "oath", valence: -1, label: "Клятва отложена из страха" },
        ],
        goldDelta: -10,
      },
    ],
  },

  /* ------ КАТАЛИЗАТОР 2 ------ */
  {
    id: "e11",
    day: 3,
    phase: "Вечер",
    title: "⸸ Тихий час перед Столпом — катализатор",
    text: [
      "Отряд стоит в мёртвой тишине. Мгла ходит между людьми и говорит с каждым — его собственным голосом памяти.",
      "Она читает им твои записи. Те самые, что не тускнеют.",
    ],
    choices: [
      {
        id: "a",
        label: "Разорвать тишину: сказать отряду слово",
        note: "Легче — но шёпот уже всё прочёл",
        directTrust: [
          {
            target: "all",
            delta: 2,
            reason: "услышал твоё слово против шёпота",
          },
        ],
        catalyst: true,
      },
      {
        id: "b",
        label: "Молчать. Пусть каждый смотрит в свою тьму",
        catalyst: true,
      },
    ],
  },
  {
    id: "e12",
    day: 3,
    phase: "Ночь",
    title: "КЛЯТВА У СТОЛПА",
    text: [
      "Столп. Камень помнит тысячи ладоней — и тысячи ножей.",
      "Это последняя ночь похода. Кто держал клятву — встанет справа. Кто нет — Мгла уже знает их имена.",
      "Подойди. Скажи клятву — или промолчи навсегда.",
    ],
    choices: [
      {
        id: "a",
        label: "Произнести клятву вслух",
        triggersFinale: true,
        memories: [
          { target: "all", tag: "oath", valence: 1, label: "Услышал твою клятву у Столпа" },
        ],
      },
      {
        id: "b",
        label: "Молча приложить ладонь к камню",
        triggersFinale: true,
        memories: [
          { target: "all", tag: "memory", valence: 1, label: "Молчаливая ладонь на камне — тоже запись" },
        ],
      },
    ],
  },
];
