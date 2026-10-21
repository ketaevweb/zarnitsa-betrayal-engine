'use client';

import type { GameState } from '@/game/types';
import { COMPANIONS } from '@/game/data';
import { TopBar, CompanionCard } from './DayScreen';

export default function AftermathScreen({
  state,
  onResolveOath,
  onResolveBribe,
  onContinue,
}: {
  state: GameState;
  onResolveOath: () => void;
  onResolveBribe: (pay: boolean) => void;
  onContinue: () => void;
}) {
  const v = state.verdict;
  const br = state.battleResult;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 zn-rise">
      <TopBar state={state} />

      <header className="text-center">
        <p className="zn-gold tracking-[0.4em] text-xs uppercase">Рассвет · день {state.day}</p>
        <h2 className="zn-display text-4xl text-[#f3e7cf] mt-2">
          {br?.win ? 'Мгла отхлынула' : 'Ночь взяла своё'}
        </h2>
      </header>

      {/* итоги ночи */}
      <section className="zn-panel p-5">
        <h3 className="zn-display text-lg zn-gold mb-2">Что увидел рассвет</h3>
        <ul className="space-y-1.5 text-sm text-[#cbbda3]">
          {br?.win ? (
            <>
              <li>— Контракт исполнен: ватага держала гать до серого часа.</li>
              <li>— Убито навьев: {br.kills}.</li>
              <li>
                — Сбиты с ног:{' '}
                {br.downed.length
                  ? br.downed.map((d) => COMPANIONS[d as keyof typeof COMPANIONS].name).join(', ')
                  : 'никто — братья держались'}
                .
              </li>
              {br.overheat && (
                <li className="zn-accent">— Безумие огня посещало атамана: братья видели.</li>
              )}
            </>
          ) : (
            <>
              <li>— Атамана вытащили к огню без памяти. Контракт сорван.</li>
              <li>— Золото не заплачено, слово ватаги помято.</li>
            </>
          )}
        </ul>
      </section>

      {/* право слова */}
      {v && v.who && v.scene !== 'none' && (
        <section className="zn-panel p-6 border-l-4 border-[#a82727]">
          <p className="zn-accent tracking-[0.3em] text-xs uppercase mb-3">
            Право слова · лестница разрыва
          </p>
          <p className="text-[15px] leading-relaxed text-[#e0d4bc]">{v.text}</p>

          {v.scene === 'oath' && (
            <div className="mt-4 flex gap-3">
              <button className="zn-btn zn-btn-primary" onClick={onResolveOath}>
                Покаяться делом при свидетелях
              </button>
            </div>
          )}
          {v.scene === 'bribe' && (
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                className="zn-btn zn-btn-primary"
                disabled={state.gold < 20}
                onClick={() => onResolveBribe(true)}
              >
                Откупить обиду (◈ 20)
              </button>
              <button className="zn-btn" onClick={() => onResolveBribe(false)}>
                Ответить словом, не златом
              </button>
            </div>
          )}
          {(v.scene === 'break' || v.scene === 'knives') && (
            <p className="mt-4 text-sm zn-muted italic">
              Разрыв свершился. Летопись ватаги делает пометку на полях.
            </p>
          )}
        </section>
      )}
      {v && v.scene === 'none' && (
        <section className="zn-panel p-5 text-sm text-[#cbbda3]">
          — Братья молчат у огня. Пока — молчат. Память каждого полна.
        </section>
      )}

      {/* память ватаги */}
      <section className="grid md:grid-cols-2 gap-3">
        {(Object.keys(COMPANIONS) as Array<keyof typeof COMPANIONS>).map((cid) => (
          <CompanionCard key={cid} state={state} cid={cid} />
        ))}
      </section>

      <div className="flex justify-center pb-8">
        <button className="zn-btn zn-btn-primary text-lg px-8" onClick={onContinue}>
          {state.day >= 3 ? 'К финалу летописи' : 'Дальше — день ' + (state.day + 1)}
        </button>
      </div>
    </div>
  );
}
