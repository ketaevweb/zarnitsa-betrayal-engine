// ЗАРНИЦА — боевой движок: real-time с обетной паузой.
// Логика мутирует BattleState; компонент дергает tick(dt) из RAF.
import type { BattleState, BattleUnit, CompanionId, EnemyKind, GameState } from './types';
import { COMPANIONS, ENEMIES, ENCOUNTER_WAVES } from './data';

export const ARENA_W = 960;
export const ARENA_H = 540;
export const FIRE_CX = ARENA_W / 2;
export const FIRE_CY = ARENA_H / 2;
export const FIRE_R = 92;

export const ZAR_FORMS = [
  { id: 0 as const, name: 'Белая', desc: 'Столп: усиленный удар ×3', color: '#f0ead8', cost: 0 },
  { id: 1 as const, name: 'Синяя', desc: 'Окованная земля: стужа вокруг', color: '#7d94b0', cost: 20 },
  { id: 2 as const, name: 'Золотая', desc: 'Обетный круг: щит и лечение', color: '#c0a774', cost: 25 },
  { id: 3 as const, name: 'Красная', desc: 'Вспышь: детонация всего жара', color: '#a82727', cost: 0 },
];

let uid = 0;
function mkId(prefix: string): string {
  uid += 1;
  return `${prefix}_${uid}`;
}

export function createBattle(state: GameState, encounter: keyof typeof ENCOUNTER_WAVES): BattleState {
  const enc = ENCOUNTER_WAVES[encounter];
  const units: BattleUnit[] = [];

  // Атаман
  const ataman: BattleUnit = {
    id: 'ataman',
    side: 'vataga',
    name: 'Атаман',
    color: '#a82727',
    x: FIRE_CX,
    y: FIRE_CY + 40,
    vx: 0, vy: 0,
    hp: 160, maxHp: 160,
    dmg: 18 + (state.godIngot ? 6 : 0),
    range: 44,
    speed: 130,
    radius: 14,
    cooldown: 0, attackCd: 0,
    slowT: 0, shieldT: 0,
    fireFear: false,
    order: 'auto',
    downed: false,
    flashT: 0,
  };
  units.push(ataman);

  // Отряд (макс 3)
  state.squad.slice(0, 3).forEach((cid, i) => {
    const def = COMPANIONS[cid];
    const angle = (Math.PI * 2 * i) / 3 - Math.PI / 2;
    units.push({
      id: mkId(cid),
      side: 'vataga',
      name: def.name,
      portrait: def.portrait,
      color: def.battleColor,
      x: FIRE_CX + Math.cos(angle) * 55,
      y: FIRE_CY + 40 + Math.sin(angle) * 55,
      vx: 0, vy: 0,
      hp: def.hp, maxHp: def.hp,
      dmg: def.dmg,
      range: def.range,
      speed: def.speed,
      radius: 12,
      cooldown: 0, attackCd: 0,
      slowT: 0, shieldT: 0,
      fireFear: false,
      companion: cid,
      order: 'auto',
      downed: false,
      flashT: 0,
    });
  });

  const bs: BattleState = {
    day: state.day,
    encounter,
    units,
    waves: enc.waves,
    waveIndex: 0,
    spawnQueue: [],
    time: 0,
    paused: false,
    over: 'none',
    form: 0,
    zar: 25,
    overheatT: 0,
    atamanId: 'ataman',
    potions: state.potions,
    traps: state.traps,
    trapSlots: [],
    log: [`Ночь ${state.day}. ${enc.title}`],
    kills: 0,
    events: [],
    screenShake: 0,
    fx: [],
    mglaRef: state.mgla,
  };
  queueWave(bs, true);
  return bs;
}

function queueWave(bs: BattleState, first: boolean): void {
  const wave = bs.waves[bs.waveIndex];
  if (!wave) return;
  bs.spawnQueue = [];
  let at = first ? 0.5 : bs.time + 3;
  wave.forEach((g) => {
    for (let i = 0; i < g.count; i++) {
      bs.spawnQueue.push({ kind: g.kind, at });
      at += 0.55;
    }
  });
  // Мгла присылает подкрепление: +1 мгленик за каждые 25 очков Мглы
  const bonus = Math.floor(bs.mglaRef / 25);
  for (let i = 0; i < bonus; i++) {
    bs.spawnQueue.push({ kind: 'mglenik', at: at + i * 0.8 });
  }
}

function spawnEnemy(bs: BattleState, kind: EnemyKind): void {
  const def = ENEMIES[kind];
  const edge = Math.floor(Math.random() * 4);
  let x = 0, y = 0;
  const pad = 24;
  if (edge === 0) { x = Math.random() * ARENA_W; y = pad; }
  else if (edge === 1) { x = ARENA_W - pad; y = Math.random() * ARENA_H; }
  else if (edge === 2) { x = Math.random() * ARENA_W; y = ARENA_H - pad; }
  else { x = pad; y = Math.random() * ARENA_H; }
  const u: BattleUnit = {
    id: mkId(kind),
    side: 'nav',
    name: def.name,
    color: def.color,
    x, y, vx: 0, vy: 0,
    hp: def.hp, maxHp: def.hp,
    dmg: def.dmg,
    range: def.radius + 16,
    speed: def.speed,
    radius: def.radius,
    cooldown: 1.5 + Math.random(),
    attackCd: 0,
    slowT: 0, shieldT: 0,
    fireFear: def.fireFear,
    kind,
    order: 'auto',
    downed: false,
    flashT: 0,
  };
  bs.units.push(u);
}

function pushEvent(bs: BattleState, text: string, color?: string): void {
  bs.events.push({ t: bs.time, text, color });
  if (bs.events.length > 4) bs.events.shift();
}

function addFx(bs: BattleState, x: number, y: number, maxR: number, color: string): void {
  bs.fx.push({ x, y, r: 4, maxR, color, t: 0 });
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function aliveEnemies(bs: BattleState): BattleUnit[] {
  return bs.units.filter((u) => u.side === 'nav' && !u.downed);
}

export function aliveAllies(bs: BattleState): BattleUnit[] {
  return bs.units.filter((u) => u.side === 'vataga' && !u.downed);
}

export function ataman(bs: BattleState): BattleUnit {
  return bs.units.find((u) => u.id === bs.atamanId)!;
}

// ── Приказы игрока ───────────────────────────────────────────────────
export function orderMove(bs: BattleState, x: number, y: number): void {
  const a = ataman(bs);
  if (!a.downed) {
    (a as BattleUnit & { destX?: number; destY?: number }).destX = x;
    (a as BattleUnit & { destX?: number; destY?: number }).destY = y;
  }
}

export function companionTarget(bs: BattleState): BattleUnit | null {
  const a = ataman(bs);
  let best: BattleUnit | null = null;
  let bestD = Infinity;
  for (const e of aliveEnemies(bs)) {
    const d = dist(a, e);
    if (d < bestD) { bestD = d; best = e; }
  }
  return best;
}

export function orderTarget(bs: BattleState, cid: CompanionId): void {
  const target = companionTarget(bs);
  bs.units.forEach((u) => {
    if (u.companion === cid && !u.downed) {
      u.order = 'auto';
      u.targetId = target ? target.id : undefined;
    }
  });
  pushEvent(bs, `Приказ: «Атаковать мою цель» — ${COMPANIONS[cid].name}`, '#c0a774');
}

export function orderHold(bs: BattleState, cid: CompanionId): void {
  bs.units.forEach((u) => {
    if (u.companion === cid && !u.downed) {
      u.order = 'hold';
      u.targetId = undefined;
      (u as BattleUnit & { destX?: number; destY?: number }).destX = FIRE_CX + (Math.random() - 0.5) * 70;
      (u as BattleUnit & { destY?: number; destY?: number }).destY = FIRE_CY + (Math.random() - 0.5) * 70;
    }
  });
  pushEvent(bs, `Приказ: «Держать огни» — ${COMPANIONS[cid].name}`, '#c0a774');
}

export function setForm(bs: BattleState, form: 0 | 1 | 2 | 3): void {
  bs.form = form;
}

export function setPaused(bs: BattleState, v: boolean): void {
  bs.paused = v;
}

export function togglePause(bs: BattleState): boolean {
  bs.paused = !bs.paused;
  return bs.paused;
}

export function castZar(bs: BattleState): void {
  const a = ataman(bs);
  if (a.downed || bs.over !== 'none') return;
  if (bs.overheatT > 0) {
    pushEvent(bs, 'Зарница перегрета — безумие огня!', '#a82727');
    return;
  }
  const form = bs.form;
  if (form === 0) {
    // Белая: столп — усиленный удар
    bs.zar = Math.min(100, bs.zar + 12);
    (a as BattleUnit & { empT?: number }).empT = 5;
    pushEvent(bs, 'Белая зарница: столп наготове', '#f0ead8');
    addFx(bs, a.x, a.y, 60, '#f0ead8');
  } else if (form === 1) {
    if (bs.zar < 20) { pushEvent(bs, 'Жара не хватает (нужно 20)', '#817777'); return; }
    bs.zar -= 20;
    for (const e of aliveEnemies(bs)) {
      if (dist(e, a) < 190) { e.slowT = Math.max(e.slowT, 3); e.flashT = 0.2; }
    }
    pushEvent(bs, 'Синяя зарница: окованная земля', '#7d94b0');
    addFx(bs, a.x, a.y, 190, '#7d94b0');
  } else if (form === 2) {
    if (bs.zar < 25) { pushEvent(bs, 'Жара не хватает (нужно 25)', '#817777'); return; }
    bs.zar -= 25;
    for (const al of aliveAllies(bs)) {
      if (dist(al, a) < 220) {
        al.shieldT = 5;
        al.hp = Math.min(al.maxHp, al.hp + 12);
        al.flashT = 0.2;
      }
    }
    pushEvent(bs, 'Золотая зарница: обетный круг', '#c0a774');
    addFx(bs, a.x, a.y, 220, '#c0a774');
  } else {
    // Красная: детонация всего жара
    const power = 10 + bs.zar * 0.9;
    bs.zar = 0;
    for (const e of aliveEnemies(bs)) {
      const d = dist(e, a);
      if (d < 210) {
        e.hp -= power * (1 - d / 260);
        e.flashT = 0.25;
      }
    }
    bs.screenShake = 0.5;
    pushEvent(bs, 'Красная зарница: вспышь!', '#a82727');
    addFx(bs, a.x, a.y, 210, '#a82727');
  }
}

export function drinkPotion(bs: BattleState): boolean {
  if (bs.potions <= 0) return false;
  const a = ataman(bs);
  if (a.downed) return false;
  bs.potions -= 1;
  a.hp = Math.min(a.maxHp, a.hp + a.maxHp / 3);
  pushEvent(bs, 'Обетное масло: жизнь возвращается', '#7d9464');
  addFx(bs, a.x, a.y, 50, '#7d9464');
  return true;
}

export function placeTrap(bs: BattleState, x: number, y: number): boolean {
  if (bs.traps <= 0) return false;
  bs.traps -= 1;
  bs.trapSlots.push({ x, y, t: 0 });
  pushEvent(bs, 'Смоляная ловушка поставлена', '#c9925e');
  return true;
}

// ── Тик симуляции ─────────────────────────────────────────────────────
export function tick(bs: BattleState, dt: number): void {
  if (bs.paused || bs.over !== 'none') return;
  bs.time += dt;
  if (bs.screenShake > 0) bs.screenShake = Math.max(0, bs.screenShake - dt);
  if (bs.overheatT > 0) bs.overheatT -= dt;

  // спавн
  while (bs.spawnQueue.length && bs.spawnQueue[0].at <= bs.time) {
    const s = bs.spawnQueue.shift()!;
    spawnEnemy(bs, s.kind);
  }

  // жар: затухание
  bs.zar = Math.max(0, bs.zar - 2 * dt);

  // ловушки
  bs.trapSlots = bs.trapSlots.filter((tr) => tr.t < 8);

  const allies = aliveAllies(bs);
  const enemies = aliveEnemies(bs);
  const a = ataman(bs);

  for (const u of bs.units) {
    if (u.downed) continue;
    if (u.flashT > 0) u.flashT -= dt;
    if (u.slowT > 0) u.slowT -= dt;
    if (u.shieldT > 0) u.shieldT -= dt;

    const speedMul = (u.slowT > 0 ? 0.45 : 1) * (u.shieldT > 0 ? 1.08 : 1);

    if (u.side === 'vataga') {
      // реген у огня
      if (dist(u, { x: FIRE_CX, y: FIRE_CY }) < FIRE_R) {
        u.hp = Math.min(u.maxHp, u.hp + 5 * dt);
      }
      // цель
      let target: BattleUnit | null = null;
      const dest = u as BattleUnit & { destX?: number; destY?: number };

      if (u.id === 'ataman') {
        if (dest.destX !== undefined) {
          const d = Math.hypot(dest.destX - u.x, dest.destY - u.y);
          if (d > 6) {
            u.vx = ((dest.destX - u.x) / d) * u.speed * speedMul;
            u.vy = ((dest.destY - u.y) / d) * u.speed * speedMul;
          } else {
            dest.destX = undefined;
            u.vx = 0; u.vy = 0;
          }
        } else { u.vx = 0; u.vy = 0; }
        target = nearestEnemy(u, enemies);
      } else {
        // спутник: AI по роли
        const role = u.companion ? COMPANIONS[u.companion].battleRole : 'guard';
        if (u.order === 'hold' && dest.destX !== undefined) {
          const d = Math.hypot(dest.destX - u.x, dest.destY - u.y);
          if (d > 8) {
            u.vx = ((dest.destX - u.x) / d) * u.speed * speedMul;
            u.vy = ((dest.destY - u.y) / d) * u.speed * speedMul;
          } else {
            dest.destX = undefined;
            u.vx = 0; u.vy = 0;
          }
        } else {
          companionAi(bs, u, role, enemies, allies, dt);
        }
        if (u.targetId) {
          target = enemies.find((e) => e.id === u.targetId) ?? null;
          if (!target) u.targetId = undefined;
        }
        if (!target && role !== 'healer' && role !== 'bard') {
          target = nearestEnemy(u, enemies);
        }
      }

      // атака
      if (target && u.attackCd <= 0 && dist(u, target) <= u.range + target.radius) {
        let dmg = u.dmg;
        const emp = (u as BattleUnit & { empT?: number }).empT;
        if (u.id === 'ataman' && emp && emp > 0) {
          dmg *= 3;
          (u as BattleUnit & { empT?: number }).empT = emp - 1;
          addFx(bs, target.x, target.y, 46, '#f0ead8');
        }
        // бафф Милуты
        const miluta = allies.find((al) => al.companion === 'miluta' && !al.downed);
        if (miluta && dist(u, miluta) < 150 && miluta.cooldown > 0) dmg *= 1.25;
        if (u.id === 'ataman' && bs.overheatT > 0) {
          // безумие огня: удар обжигает своих
          const near = allies.filter((al) => al.id !== u.id && dist(al, u) < 80);
          near.forEach((al) => { al.hp -= 6; al.flashT = 0.2; });
          if (near.length) pushEvent(bs, 'Безумие огня: зарница жжёт своих!', '#a82727');
        }
        target.hp -= dmg;
        target.flashT = 0.15;
        u.attackCd = 0.85;
        if (u.id === 'ataman') bs.zar = Math.min(100, bs.zar + 6);
      }
    } else {
      // навь
      const inFire = dist(u, { x: FIRE_CX, y: FIRE_CY }) < FIRE_R - 6;
      let victim = nearestAlly(u, allies);
      if (!victim) { u.vx = 0; u.vy = 0; continue; }
      const d = dist(u, victim);
      const holds = u.fireFear && dist(u, { x: FIRE_CX, y: FIRE_CY }) < FIRE_R + 26;
      if (u.fireFear && (inFire || holds)) {
        // пятиться от огня, но тянуться к жертве на границе
        const fx = FIRE_CX - u.x, fy = FIRE_CY - u.y;
        const fd = Math.hypot(fx, fy) || 1;
        if (dist(u, victim) > u.range + 30) {
          // кружит по границе огня к жертве
          const tangent = u.x < FIRE_CX ? 1 : -1;
          u.vx = ((fy / fd) * tangent * u.speed * speedMul) + ((victim.x - u.x) / (d || 1)) * u.speed * 0.35;
          u.vy = ((-fx / fd) * tangent * u.speed * speedMul) + ((victim.y - u.y) / (d || 1)) * u.speed * 0.35;
        } else {
          u.vx = (fx / fd) * u.speed * 0.6;
          u.vy = (fy / fd) * u.speed * 0.6;
        }
      } else if (d > u.range + victim.radius * 0.5) {
        u.vx = ((victim.x - u.x) / d) * u.speed * speedMul;
        u.vy = ((victim.y - u.y) / d) * u.speed * speedMul;
      } else {
        u.vx = 0; u.vy = 0;
        if (u.attackCd <= 0) {
          victim.hp -= u.dmg;
          victim.flashT = 0.15;
          u.attackCd = 1.4;
          if (victim.id === 'ataman') bs.zar = Math.min(100, bs.zar + 4);
        }
      }
    }

    // движение
    const nx = u.x + u.vx * dt;
    const ny = u.y + u.vy * dt;
    u.x = Math.max(18, Math.min(ARENA_W - 18, nx));
    u.y = Math.max(18, Math.min(ARENA_H - 18, ny));
    if (u.attackCd > 0) u.attackCd -= dt;
    if (u.cooldown > 0) u.cooldown -= dt;
  }

  // ловушки: детонация
  for (const tr of bs.trapSlots) {
    tr.t += dt;
    if (tr.t > 0.4) {
      for (const e of enemies) {
        if (dist(e, tr) < 46 && !e.trapHit) {
          e.hp -= 18;
          e.slowT = Math.max(e.slowT, 2);
          e.flashT = 0.2;
          (e as BattleUnit & { trapHit?: boolean }).trapHit = true;
          addFx(bs, tr.x, tr.y, 46, '#c9925e');
        }
      }
    }
  }

  // смерть/падение
  for (const u of bs.units) {
    if (u.downed) continue;
    if (u.side === 'nav' && u.hp <= 0) {
      u.downed = true;
      bs.kills += 1;
      addFx(bs, u.x, u.y, 30, u.color);
    }
    if (u.side === 'vataga' && u.hp <= 0) {
      u.hp = 0;
      if (u.id === 'ataman') {
        bs.over = 'lose';
        pushEvent(bs, 'Атаман пал... ватага вытаскивает его к огню', '#a82727');
      } else {
        u.downed = true;
        pushEvent(bs, `${u.name} сбит с ног — братья вытаскивают его из схватки`, '#817777');
      }
    }
  }

  // фазы волн
  if (aliveEnemies(bs).length === 0 && bs.spawnQueue.length === 0) {
    if (bs.waveIndex < bs.waves.length - 1) {
      bs.waveIndex += 1;
      pushEvent(bs, `Волна ${bs.waveIndex + 1} идёт из мглы...`, '#4a4258');
      queueWave(bs, false);
    } else {
      bs.over = 'win';
      pushEvent(bs, 'Мгла отхлынула. Ночь выдержана', '#c0a774');
    }
  }

  // fx
  bs.fx = bs.fx.filter((f) => {
    f.t += dt;
    f.r = f.maxR * Math.min(1, f.t / 0.45);
    return f.t < 0.45;
  });
}

function nearestEnemy(from: BattleUnit, enemies: BattleUnit[]): BattleUnit | null {
  let best: BattleUnit | null = null;
  let bestD = Infinity;
  for (const e of enemies) {
    const d = dist(from, e);
    if (d < bestD) { bestD = d; best = e; }
  }
  return best;
}

function nearestAlly(from: BattleUnit, allies: BattleUnit[]): BattleUnit | null {
  let best: BattleUnit | null = null;
  let bestD = Infinity;
  for (const al of allies) {
    const d = dist(from, al);
    if (d < bestD) { bestD = d; best = al; }
  }
  return best;
}

function companionAi(
  bs: BattleState,
  u: BattleUnit,
  role: string,
  enemies: BattleUnit[],
  allies: BattleUnit[],
  dt: number,
): void {
  void dt;
  const fire = { x: FIRE_CX, y: FIRE_CY };
  switch (role) {
    case 'guard': {
      // держит линию между мглой и огнём
      let closest: BattleUnit | null = null;
      let bestD = Infinity;
      for (const e of enemies) {
        const d = dist(e, fire);
        if (d < bestD) { bestD = d; closest = e; }
      }
      if (closest) {
        const d = dist(u, closest);
        if (d > u.range * 0.9) {
          u.vx = ((closest.x - u.x) / d) * u.speed;
          u.vy = ((closest.y - u.y) / d) * u.speed;
        } else { u.vx = 0; u.vy = 0; }
      }
      break;
    }
    case 'healer': {
      // лечит самого раненого, держится у огня
      const wounded = allies
        .filter((al) => al.hp < al.maxHp * 0.75)
        .sort((a1, a2) => a1.hp / a1.maxHp - a2.hp / a2.maxHp)[0];
      if (u.cooldown <= 0 && wounded) {
        wounded.hp = Math.min(wounded.maxHp, wounded.hp + 16);
        wounded.flashT = 0.2;
        u.cooldown = 3.2;
        addFx(bs, wounded.x, wounded.y, 40, '#c9925e');
        pushEvent(bs, `Василиса: светлый жар лечит ${wounded.name}`, '#c9925e');
      }
      const dd = dist(u, fire);
      if (dd > FIRE_R * 0.7) {
        u.vx = ((fire.x - u.x) / dd) * u.speed;
        u.vy = ((fire.y - u.y) / dd) * u.speed;
      } else { u.vx = 0; u.vy = 0; }
      break;
    }
    case 'archer': {
      // стреляет с дистанции, держит 150+
      const t = nearestEnemy(u, enemies);
      if (t) {
        const d = dist(u, t);
        if (d > u.range * 0.85) {
          u.vx = ((t.x - u.x) / d) * u.speed;
          u.vy = ((t.y - u.y) / d) * u.speed;
        } else if (d < 100) {
          u.vx = ((u.x - t.x) / d) * u.speed * 0.6;
          u.vy = ((u.y - t.y) / d) * u.speed * 0.6;
        } else { u.vx = 0; u.vy = 0; }
      }
      break;
    }
    case 'control': {
      // сковать ближайшего корнями
      const t = nearestEnemy(u, enemies);
      if (u.cooldown <= 0 && t && dist(u, t) < u.range) {
        t.slowT = Math.max(t.slowT, 2.6);
        t.hp -= 6;
        t.flashT = 0.2;
        u.cooldown = 4.5;
        addFx(bs, t.x, t.y, 40, '#5e8c6a');
        pushEvent(bs, 'Ходата: старый договор сковал навь', '#5e8c6a');
      }
      const df = dist(u, fire);
      if (df > FIRE_R + 60) {
        u.vx = ((fire.x - u.x) / df) * u.speed;
        u.vy = ((fire.y - u.y) / df) * u.speed;
      } else { u.vx = 0; u.vy = 0; }
      break;
    }
    case 'skirmish': {
      // фланг: цель — самая слабая
      const weak = [...enemies].sort((a1, a2) => a1.hp - a2.hp)[0];
      if (weak) {
        const d = dist(u, weak);
        if (d > u.range * 0.8) {
          u.vx = ((weak.x - u.x) / d) * u.speed;
          u.vy = ((weak.y - u.y) / d) * u.speed;
        } else { u.vx = 0; u.vy = 0; }
        u.targetId = weak.id;
      }
      break;
    }
    case 'bard': {
      // песня-аура
      if (u.cooldown <= 0) {
        u.cooldown = 7; // активен 3.5с (половина)
        pushEvent(bs, 'Милута: обетный стих поднимает ватагу', '#a08348');
        addFx(bs, u.x, u.y, 150, '#a08348');
      }
      const df2 = dist(u, fire);
      if (df2 > FIRE_R * 0.8) {
        u.vx = ((fire.x - u.x) / df2) * u.speed;
        u.vy = ((fire.y - u.y) / df2) * u.speed;
      } else { u.vx = 0; u.vy = 0; }
      break;
    }
  }
}
