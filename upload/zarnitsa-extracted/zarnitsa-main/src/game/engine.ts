// ЗАРНИЦА — движок метагейма: память, лестница разрыва, летопись, финал
import type {
  CompanionId,
  GameState,
  MemoryKind,
  BreakStage,
  ChronicleEntry,
  FactionId,
} from './types';
import { COMPANIONS, FACTIONS, FACTION_MOVES } from './data';

export function initState(): GameState {
  const companions = {} as GameState['companions'];
  (Object.keys(COMPANIONS) as CompanionId[]).forEach((id) => {
    companions[id] = {
      loyalty: 2,
      memories: [],
      stage: 0,
      broken: false,
      rightOfWordUsed: false,
      sceneKeys: [],
    };
  });
  const factions = {} as GameState['factions'];
  (Object.keys(FACTIONS) as FactionId[]).forEach((id) => {
    factions[id] = { stance: id === 'vatagi' ? 20 : id === 'zari' ? -10 : 0 };
  });
  return {
    phase: 'title',
    day: 1,
    gold: 30,
    mgla: 30,
    potions: 1,
    traps: 0,
    godIngot: false,
    companions,
    factions,
    chronicle: [
      {
        day: 0,
        phase: 'day',
        text:
          'Тридцать лет назад люди убили последнего бога — Златоглава. С той ночи каждую ночь из-под земли поднимается Мгла. Ватага Обетных держит границу дня и ночи. В летописи ватаги отныне пишется имя нового атамана.',
        tone: 'neutral',
      },
    ],
    contractsTaken: [],
    contractsOffered: ['c1_upyr', 'c1_train'],
    squad: ['ratmir', 'vasilisa', 'gavrila'],
    talkedToday: null,
    itemsBought: [],
    battleResult: null,
    verdict: null,
    finale: null,
  };
}

// ── Память ────────────────────────────────────────────────────────────
export function addMemory(
  state: GameState,
  who: CompanionId,
  kind: MemoryKind,
  val: number,
  text: string,
): void {
  const c = state.companions[who];
  if (c.broken) return;
  const v = Math.max(-3, Math.min(3, val)) as -3 | -2 | -1 | 1 | 2 | 3;
  c.memories.push({ day: state.day, kind, val: v, text });
  c.loyalty += v;
  c.stage = stageFor(c.loyalty, c.broken);
}

export function stageFor(loyalty: number, broken: boolean): BreakStage {
  if (broken) return 4;
  if (loyalty <= -4) return 4; // IV Предательство
  if (loyalty <= -1) return 3; // III Уход
  if (loyalty <= 0) return 2; // II Оговор
  if (loyalty <= 2) return 1; // I Сомнение
  return 0;
}

export const STAGE_NAMES: Record<BreakStage, string> = {
  0: 'Обет',
  1: 'I · Сомнение',
  2: 'II · Оговор',
  3: 'III · Уход',
  4: 'IV · Предательство',
  5: 'V · Ночь ножей',
};

export const STAGE_HINTS: Record<BreakStage, string> = {
  0: 'Брат держит слово.',
  1: 'Реплики холодеют: брат помнит.',
  2: 'Враги знают маршруты; снаряжение «случайно» бьёт.',
  3: 'Брат уходит ночью с долей казны.',
  4: 'Открытый переход к врагу.',
  5: 'Покушение в лагере.',
};

// ── Летопись ──────────────────────────────────────────────────────────
export function toneFor(state: GameState): ChronicleEntry['tone'] {
  const m = state.companions.miluta.loyalty;
  if (m >= 4) return 'warm';
  if (m <= -1) return 'cold';
  return 'neutral';
}

const OPEN_WARM = ['Летопись пишет гордой рукой: ', 'Перо не гнулось: ', 'Певчий рад был записать: '];
const OPEN_NEUTRAL = ['Летопись отмечает: ', 'В летописи строка: ', 'Записано как было: '];
const OPEN_COLD = ['Летопись пишет вполслова: ', 'Перо царапало: ', 'Милута записал, глядя в сторону: '];

export function chroniclePush(state: GameState, text: string, phase: ChronicleEntry['phase']): void {
  const tone = toneFor(state);
  const pool = tone === 'warm' ? OPEN_WARM : tone === 'cold' ? OPEN_COLD : OPEN_NEUTRAL;
  const open = pool[state.chronicle.length % pool.length];
  state.chronicle.push({ day: state.day, phase, tone, text: open + text });
}

// ── Фракции ───────────────────────────────────────────────────────────
export function applyStance(
  state: GameState,
  faction: FactionId,
  delta: number,
): void {
  const f = state.factions[faction];
  f.stance = Math.max(-100, Math.min(100, f.stance + delta));
}

export function factionMovesForDay(state: GameState): string[] {
  return FACTION_MOVES.filter((m) => m.day === state.day).map((m) => {
    applyStance(state, m.faction, m.delta);
    return m.text;
  });
}

// ── Право слова: фильтр гуманности перед разрывом III–V ──────────────
export interface VerdictVariant {
  who: CompanionId | null;
  scene: 'calm' | 'bribe' | 'oath' | 'break' | 'knives' | 'none';
  text: string;
}

export function computeVerdict(state: GameState): VerdictVariant {
  // кто на грани
  const candidates = (Object.keys(COMPANIONS) as CompanionId[])
    .filter((id) => !state.companions[id].broken)
    .map((id) => ({ id, c: state.companions[id] }))
    .filter(({ c }) => c.loyalty <= -1);
  if (candidates.length === 0) return { who: null, scene: 'none', text: '' };
  candidates.sort((a, b) => a.c.loyalty - b.c.loyalty);
  const { id, c } = candidates[0];
  const name = COMPANIONS[id].name;

  if (c.loyalty <= -4) {
    return {
      who: id,
      scene: 'knives',
      text: `Ночь ножей. ${name} не приходит к огню — приходит с ножом. Утром ватага находит свою кровь на снегу палатки. Обет разорван так, как рвут жилы: не словами.`,
    };
  }
  // право слова: сцена-разговор
  const witness = (Object.keys(COMPANIONS) as CompanionId[]).find(
    (o) => o !== id && !state.companions[o].broken && state.companions[o].loyalty >= 2,
  );
  if (c.loyalty <= -2) {
    return {
      who: id,
      scene: 'break',
      text: `${name} уходит ночью с долей казны и молча смотрит на атамана перед гатью. Право слова не спрашивают дважды: «Ты знал, атаман. Ты всё время знал».`,
    };
  }
  if (witness) {
    return {
      who: id,
      scene: 'oath',
      text: `${name} стоит у огня, когда ${COMPANIONS[witness].name} говорит за тебя: «Брат согрешил против тебя — но обет держит». ${name} молчит долго. Потом кладёт обиду на гать, как кладут нож: чтобы не поднимать снова.`,
    };
  }
  return {
    who: id,
    scene: 'bribe',
    text: `${name} ловит атамана у казны: «Злато вернёт моё доверие быстрее, чем слова. Что выберешь, атаман?»`,
  };
}

export function resolveOath(state: GameState, who: CompanionId): void {
  const c = state.companions[who];
  c.loyalty += 3;
  c.memories.push({ day: state.day, kind: 'chest', val: 3, text: 'Примирение при свидетелях: обет исполнен делом' });
  c.stage = stageFor(c.loyalty, c.broken);
  c.rightOfWordUsed = true;
}

export function resolveBribe(state: GameState, who: CompanionId, pay: boolean): void {
  const c = state.companions[who];
  if (pay && state.gold >= 20) {
    state.gold -= 20;
    c.loyalty += 2;
    c.memories.push({ day: state.day, kind: 'gold', val: 2, text: 'Обида выкуплена двадцатью златыми' });
    if (who === 'ratmir') {
      // Ратмир презирает откуп
      c.loyalty -= 3;
      c.memories.push({ day: state.day, kind: 'chest', val: -3, text: 'Атаман купил прощение — Ратмир видел это' });
    }
  } else {
    c.loyalty -= 2;
    c.memories.push({ day: state.day, kind: 'gold', val: -2, text: 'Атаман пожалел злато на примирение' });
  }
  c.stage = stageFor(c.loyalty, c.broken);
  c.rightOfWordUsed = true;
}

// ── Финал ─────────────────────────────────────────────────────────────
export function computeFinale(state: GameState): 'oath' | 'crack' | 'knives' {
  const brokenCount = (Object.keys(COMPANIONS) as CompanionId[]).filter(
    (id) => state.companions[id].broken,
  ).length;
  const stageV = (Object.keys(COMPANIONS) as CompanionId[]).some(
    (id) => state.companions[id].stage === 5,
  );
  if (brokenCount >= 2 || stageV || state.mgla >= 85) return 'knives';
  if (brokenCount === 1 || state.mgla >= 60) return 'crack';
  return 'oath';
}

const FINALE_TEXTS = {
  oath: {
    title: 'Обет держит ватагу',
    body:
      'Костяная ночь отпустила Оковье к рассвету. Ватага стоит у гати — израненная, живая, вся. Мгла отступает в топи до следующей зимы, и обетные огни горят по деревням, как гвозди в небе. Летопись Милуты заканчивает третью ночь словами: «Атаман держал слово — и слово держало нас». Кто-то из братьев перепишет эту строку на знамя ватаги.',
    tone: 'warm' as const,
  },
  crack: {
    title: 'Трещина в обете',
    body:
      'Ночь отбита, но ватага уже не та: одно место у огня стоит пустым, и его не занимает никто. Мгла отступает — до поры. Летопись Милуты пишет последнюю строку третьей ночи дважды и оба раза зачёркивает. В конце концов остаётся: «Мы выстояли. Спросите у того, кто ушёл, — выстояли ли мы».',
    tone: 'neutral' as const,
  },
  knives: {
    title: 'Ночь ножей',
    body:
      'Рассвет находит ватагу рассыпанной: кто-то ушёл к дворам, кто-то к Златоприказу, кто-то — в Мглу, откуда не возвращаются. Летопись Милуты, если она ещё при нём, заканчивается не песней, а списком имён через черту. Атаман остаётся у погасшего огня один. Мгла терпелива: она умеет ждать.',
    tone: 'cold' as const,
  },
};

export function finaleText(state: GameState): { title: string; body: string; tone: 'warm' | 'neutral' | 'cold' } {
  const f = computeFinale(state);
  return { title: FINALE_TEXTS[f].title, body: FINALE_TEXTS[f].body, tone: FINALE_TEXTS[f].tone };
}
