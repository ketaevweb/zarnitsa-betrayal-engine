'use client';

import Image from 'next/image';
import type { GameState } from '@/game/types';
import { COMPANIONS } from '@/game/data';
import { finaleText, computeFinale } from '@/game/engine';

export default function FinaleScreen({
  state,
  onRestart,
}: {
  state: GameState;
  onRestart: () => void;
}) {
  const f = finaleText(state);
  const kind = computeFinale(state);
  const broken = (Object.keys(COMPANIONS) as Array<keyof typeof COMPANIONS>).filter(
    (id) => state.companions[id].broken,
  );
  const lastEntries = state.chronicle.slice(-5);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="max-w-3xl w-full space-y-8 zn-rise">
        <header className="text-center">
          <p className="zn-gold tracking-[0.5em] text-xs uppercase">Летопись ватаги · конец среза</p>
          <h1
            className="zn-display text-5xl md:text-6xl mt-4"
            style={{
              color: f.tone === 'warm' ? '#c0a774' : f.tone === 'cold' ? '#a82727' : '#e8dcc8',
            }}
          >
            {f.title}
          </h1>
          <hr className="zn-rule my-6" />
          <p className="text-[15px] md:text-base leading-relaxed text-[#cbbda3] text-left">
            {f.body}
          </p>
        </header>

        {/* ватага: кто остался */}
        <section className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {(Object.keys(COMPANIONS) as Array<keyof typeof COMPANIONS>).map((cid) => {
            const c = state.companions[cid];
            const def = COMPANIONS[cid];
            return (
              <div key={cid} className="zn-panel p-3 flex items-center gap-3">
                <div className="relative w-12 h-14 shrink-0 rounded overflow-hidden border border-[#3a3028]">
                  <Image src={def.portrait} alt={def.name} fill className="object-cover" sizes="48px" />
                  {c.broken && (
                    <div className="absolute inset-0 bg-[#131111]/70 flex items-center justify-center">
                      <span className="zn-accent text-[10px] zn-display">ушёл</span>
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="zn-display text-base truncate" style={{ color: def.battleColor }}>
                    {def.name}
                  </p>
                  <p className={`text-[11px] ${c.broken ? 'zn-accent' : 'zn-muted'}`}>
                    память: {c.loyalty > 0 ? `+${c.loyalty}` : c.loyalty}
                  </p>
                </div>
              </div>
            );
          })}
        </section>

        {/* последние строки летописи */}
        <section className="zn-panel p-5">
          <h3 className="zn-display text-lg zn-gold mb-3">Последние строки летописи</h3>
          <ul className="space-y-2 text-sm">
            {lastEntries.map((e, i) => (
              <li
                key={i}
                className={`leading-relaxed ${
                  e.tone === 'cold' ? 'text-[#a08a80] italic' : 'text-[#cbbda3]'
                }`}
              >
                {e.text}
              </li>
            ))}
          </ul>
        </section>

        {/* сводка */}
        <section className="zn-panel2 p-4 text-xs zn-muted grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div>
            <p className="zn-display text-xl zn-gold">{state.gold}</p>
            <p>златых в казне</p>
          </div>
          <div>
            <p className="zn-display text-xl" style={{ color: state.mgla >= 60 ? '#a82727' : '#5e8c6a' }}>
              {Math.round(state.mgla)}
            </p>
            <p>Мгла над Оковьем</p>
          </div>
          <div>
            <p className="zn-display text-xl zn-accent">{broken.length}</p>
            <p>разрывов обета</p>
          </div>
          <div>
            <p className="zn-display text-xl zn-gold">
              {kind === 'oath' ? 'I' : kind === 'crack' ? 'II' : 'V'}
            </p>
            <p>ступень финала</p>
          </div>
        </section>

        <div className="text-center pb-10">
          <button className="zn-btn zn-btn-primary text-lg px-10" onClick={onRestart}>
            Начать новую ватагу
          </button>
          <p className="mt-4 text-xs zn-muted">
            Прототип по GDD «ЗАРНИЦА» · полная версия документа — в приложении к проекту
          </p>
        </div>
      </div>
    </div>
  );
}
