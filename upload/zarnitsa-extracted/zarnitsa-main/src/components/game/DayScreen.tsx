'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import type { GameState, ContractDef } from '@/game/types';
import { COMPANIONS, FACTIONS } from '@/game/data';

// Общая шапка-статус: день, злато, Мгла, мини-фракции
export function TopBar({ state }: { state: GameState }) {
  const mglaColor =
    state.mgla >= 70 ? '#a82727' : state.mgla >= 45 ? '#a08348' : '#5e8c6a';
  return (
    <div className="zn-panel px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
      <span className="zn-display text-lg zn-gold">
        День {state.day} · Костяная пора
      </span>
      <span className="zn-gold">◈ {state.gold} златых</span>
      <span className="flex items-center gap-2">
        <span className="zn-muted">Мгла</span>
        <span className="inline-block w-24 h-2 rounded-full bg-black/60 border border-[#3a3028] overflow-hidden">
          <span
            className="block h-full transition-all duration-500"
            style={{ width: `${state.mgla}%`, background: mglaColor }}
          />
        </span>
        <span style={{ color: mglaColor }}>{Math.round(state.mgla)}</span>
      </span>
      <span className="hidden md:flex items-center gap-3 ml-auto">
        {(Object.keys(FACTIONS) as Array<keyof typeof FACTIONS>).map((fid) => (
          <span
            key={fid}
            title={`${FACTIONS[fid].name}: ${state.factions[fid].stance}`}
            className="flex items-center gap-1 text-xs"
          >
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ background: FACTIONS[fid].color }}
            />
            <span
              className={
                state.factions[fid].stance >= 15
                  ? 'zn-gold'
                  : state.factions[fid].stance <= -15
                    ? 'zn-accent'
                    : 'zn-muted'
              }
            >
              {state.factions[fid].stance > 0 ? `+${state.factions[fid].stance}` : state.factions[fid].stance}
            </span>
          </span>
        ))}
      </span>
    </div>
  );
}

// Карточка спутника с портретом, лояльностью и памятью
export function CompanionCard({
  state,
  cid,
  compact,
  selected,
  onClick,
  disabled,
  badge,
}: {
  state: GameState;
  cid: keyof typeof COMPANIONS;
  compact?: boolean;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  badge?: string;
}) {
  const def = COMPANIONS[cid];
  const c = state.companions[cid];
  const loyaltyColor =
    c.loyalty >= 3 ? '#5e8c6a' : c.loyalty >= 0 ? '#c0a774' : c.loyalty >= -2 ? '#a08348' : '#a82727';
  const stageNames = ['Обет', 'I · Сомнение', 'II · Оговор', 'III · Уход', 'IV · Предательство', 'V · Ночь ножей'];
  return (
    <div
      className={`zn-card p-3 flex gap-3 items-stretch ${selected ? 'selected' : ''} ${disabled ? 'opacity-40 pointer-events-none' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      <div className="relative w-16 h-20 shrink-0 rounded overflow-hidden border border-[#3a3028] bg-[#241f1b]">
        <Image src={def.portrait} alt={def.name} fill className="object-cover" sizes="64px" />
        {c.broken && (
          <div className="absolute inset-0 bg-[#131111]/70 flex items-center justify-center">
            <span className="zn-accent text-xs zn-display">ушёл</span>
          </div>
        )}
        {badge && (
          <div className="absolute bottom-0 inset-x-0 bg-black/70 text-center text-[10px] py-0.5 zn-gold">
            {badge}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="zn-display text-lg leading-none" style={{ color: def.battleColor }}>
            {def.name}
          </span>
          {!compact && (
            <span className="text-[11px] zn-muted truncate">{def.role}</span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs">
          <span style={{ color: loyaltyColor }}>
            память: {c.loyalty > 0 ? `+${c.loyalty}` : c.loyalty}
          </span>
          <span className="zn-muted">·</span>
          <span className={c.stage >= 3 ? 'zn-accent' : 'zn-muted'}>
            {c.broken ? 'разрыв' : stageNames[c.stage]}
          </span>
        </div>
        {!compact && c.memories.length > 0 && (
          <ul className="mt-1.5 space-y-0.5 text-[11px] leading-snug zn-muted max-h-16 overflow-y-auto zn-scroll pr-1">
            {c.memories.slice(-4).map((m, i) => (
              <li key={i} className={m.val < 0 ? 'text-[#b0736a]' : 'text-[#9fae8b]'}>
                {m.val > 0 ? '+' : ''}
                {m.val} · {m.text}
              </li>
            ))}
          </ul>
        )}
        {compact && c.memories.length > 0 && (
          <p className="mt-1 text-[11px] leading-snug text-[#b0736a] truncate">
            {c.memories[c.memories.length - 1].text}
          </p>
        )}
      </div>
    </div>
  );
}

export default function DayScreen({
  state,
  contracts,
  onChoose,
}: {
  state: GameState;
  contracts: ContractDef[];
  onChoose: (c: ContractDef) => void;
}) {
  const news = useMemo(
    () => [
      'Златоприказ открыл второй рудник у Стоячих Огней — ночь над урочищем стала на час длиннее.',
      'Навьи дворы закрыли три брода: переправы теперь только по договору.',
      'Князь Севир собирает съезд девяти: разговор пойдёт о налоге на обетные огни.',
      'Дети Зари жгли обетные огни на тракте: две станции встретили рассвет без сторожей.',
      'Вещий круг: звёзды показывают костяную пору длиннее прошлогодней на девять ночей.',
      'Златоприказ поднимает цену на слитки: тело бога кончается — Мгла нет.',
    ],
    [],
  );
  const newsOfDay = news.slice((state.day - 1) * 2, (state.day - 1) * 2 + 2);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6 zn-rise">
      <TopBar state={state} />

      <header>
        <h2 className="zn-display text-3xl text-[#f3e7cf]">День {state.day}: слухи и дела</h2>
        <p className="zn-muted text-sm mt-1">
          Ватага стоит на Стоялах. Слухи приносят двое: кто-то платит за работу,
          кто-то — за молчание. Одно дело на день.
        </p>
      </header>

      <section className="zn-panel p-4">
        <h3 className="zn-display text-lg zn-gold mb-2">Ход фракций за кадром</h3>
        <ul className="space-y-1.5 text-sm">
          {newsOfDay.map((n, i) => (
            <li key={i} className="flex gap-2">
              <span className="zn-accent">—</span>
              <span className="text-[#cbbda3]">{n}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        {contracts.map((c) => (
          <div key={c.id} className="zn-card p-5 flex flex-col" role="button" tabIndex={0}
            onClick={() => onChoose(c)}
            onKeyDown={(e) => e.key === 'Enter' && onChoose(c)}
          >
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="zn-display text-xl text-[#f3e7cf]">{c.title}</h3>
              <span className="text-xs zn-muted whitespace-nowrap">{c.region}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[#cbbda3] flex-1">{c.description}</p>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              <span className="zn-gold">◈ {c.reward.gold} златых</span>
              <span className={c.reward.mgla > 0 ? 'zn-accent' : 'text-[#5e8c6a]'}>
                Мгла {c.reward.mgla > 0 ? `+${c.reward.mgla}` : c.reward.mgla}
              </span>
              <span className="zn-muted">заказчик: {FACTIONS[c.patron].name}</span>
            </div>
            <div className="mt-3 text-xs zn-muted border-t border-[#3a3028] pt-2">
              {c.memory.map((m, i) => (
                <span key={i} className="mr-3 inline-block">
                  {COMPANIONS[m.who].name}: {m.text.toLowerCase()} ({m.val > 0 ? `+${m.val}` : m.val})
                </span>
              ))}
            </div>
            <button className="zn-btn mt-4 self-start">Взять дело</button>
          </div>
        ))}
      </section>
    </div>
  );
}
