// ЗАРНИЦА — типы вертикального среза «Три ночи»

export type CompanionId =
  | 'ratmir'
  | 'vasilisa'
  | 'gavrila'
  | 'khodata'
  | 'odinets'
  | 'miluta';

export type MemoryKind = 'chest' | 'blood' | 'gold' | 'faith';
// честь · кровь · злато · вера — четыре тега памяти из GDD

export interface MemoryTag {
  day: number;
  kind: MemoryKind;
  val: -3 | -2 | -1 | 1 | 2 | 3;
  text: string;
}

export type BreakStage = 0 | 1 | 2 | 3 | 4 | 5;
// 0 — обет; I Сомнение; II Оговор; III Уход; IV Предательство; V Ночь ножей

export interface CompanionState {
  loyalty: number; // сумма тегов + стартовое доверие
  memories: MemoryTag[];
  stage: BreakStage;
  broken: boolean; // разрыв свершился
  rightOfWordUsed: boolean;
  sceneKeys: string[]; // показанные сцены лагеря
}

export interface CompanionDef {
  id: CompanionId;
  name: string;
  role: string;
  faction: FactionId;
  portrait: string;
  battleColor: string;
  vow: string; // личная цель
  breakPath: string; // путь разрыва
  battleRole: 'guard' | 'healer' | 'archer' | 'control' | 'skirmish' | 'bard';
  hp: number;
  dmg: number;
  range: number;
  speed: number;
  abilityName: string;
  abilityDesc: string;
  sceneHook: MemoryKind;
}

export type FactionId =
  | 'vatagi'
  | 'goldorder'
  | 'vechie'
  | 'navdvor'
  | 'knyaz'
  | 'zari';

export interface FactionState {
  stance: number; // -100..100 отношение к ватаге атамана
}

export interface ContractDef {
  id: string;
  day: 1 | 2 | 3;
  region: string;
  title: string;
  patron: FactionId;
  description: string;
  reward: { gold: number; mgla: number };
  memory: Array<{ who: CompanionId; kind: MemoryKind; val: -3 | -2 | -1 | 1 | 2 | 3; text: string }>;
  stance: Array<{ faction: FactionId; delta: number; why: string }>;
  encounter: EncounterId;
  fight: boolean;
}

export type EncounterId = 'upyr' | 'train' | 'boneyard' | 'ambush' | 'heretics' | 'vault';

export interface EnemyWave {
  enemies: Array<{ kind: EnemyKind; count: number }>;
  note?: string;
}

export type EnemyKind = 'mglenik' | 'uporen' | 'kostyanitsa' | 'eretik' | 'vedmak';

export interface EnemyDef {
  kind: EnemyKind;
  name: string;
  hp: number;
  dmg: number;
  speed: number;
  radius: number;
  fireFear: boolean; // боится обетного огня
  color: string;
  hint: string;
}

export interface ShopItem {
  id: string;
  name: string;
  price: number;
  desc: string;
  cursed?: boolean; // проклятая трата — кормит Мглу
  mgla?: number;
  uses: number;
}

export interface ChronicleEntry {
  day: number;
  phase: 'day' | 'camp' | 'night' | 'verdict';
  text: string;
  tone: 'warm' | 'neutral' | 'cold';
}

export interface BattleOrder {
  kind: 'target' | 'hold' | 'ability';
}

export interface BattleUnit {
  id: string;
  side: 'vataga' | 'nav';
  name: string;
  portrait?: string;
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  dmg: number;
  range: number;
  speed: number;
  radius: number;
  cooldown: number;
  attackCd: number;
  slowT: number; // остаток замедления
  shieldT: number; // золотой щит
  fireFear: boolean;
  kind?: EnemyKind;
  companion?: CompanionId;
  order: 'auto' | 'hold';
  targetId?: string;
  downed: boolean;
  flashT: number;
}

export interface BattleState {
  day: 1 | 2 | 3;
  encounter: EncounterId;
  units: BattleUnit[];
  waves: EnemyWave[];
  waveIndex: number;
  spawnQueue: Array<{ kind: EnemyKind; at: number }>;
  time: number;
  paused: boolean;
  over: 'none' | 'win' | 'lose';
  // зарница атамана
  form: 0 | 1 | 2 | 3; // белая/синяя/золотая/красная
  zar: number; // жар 0..100
  overheatT: number; // безумие огня
  atamanId: string;
  // ресурсы
  potions: number;
  traps: number;
  trapSlots: Array<{ x: number; y: number; t: number }>;
  log: string[];
  kills: number;
  events: Array<{ t: number; text: string; color?: string }>;
  screenShake: number;
  fx: Array<{ x: number; y: number; r: number; maxR: number; color: string; t: number }>;
  mglaRef: number; // уровень Мглы на момент боя (для подкреплений)
}

export type FinaleKind = 'oath' | 'crack' | 'knives';

export interface GameState {
  phase: 'title' | 'day' | 'camp' | 'night' | 'aftermath' | 'finale';
  day: 1 | 2 | 3;
  gold: number;
  mgla: number; // 0..100
  potions: number;
  traps: number;
  godIngot: boolean; // проклятый слиток — +урон зарницы
  companions: Record<CompanionId, CompanionState>;
  factions: Record<FactionId, FactionState>;
  chronicle: ChronicleEntry[];
  contractsTaken: string[];
  contractsOffered: string[]; // два id на текущий день
  squad: CompanionId[]; // до 3 на ночь
  talkedToday: CompanionId | null;
  itemsBought: string[];
  battleResult: null | {
    win: boolean;
    kills: number;
    downed: CompanionId[];
    overheat: boolean;
  };
  verdict: null | {
    who: CompanionId | null;
    scene: 'calm' | 'bribe' | 'oath' | 'break' | 'knives' | 'none';
    text: string;
  };
  finale: null | FinaleKind;
}
