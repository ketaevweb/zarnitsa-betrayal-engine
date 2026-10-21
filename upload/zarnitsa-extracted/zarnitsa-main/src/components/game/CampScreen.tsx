'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { GameState, ShopItem } from '@/game/types';
import { COMPANIONS, CAMP_SCENES, SHOP, type CampScene } from '@/game/data';
import { TopBar, CompanionCard } from './DayScreen';

export default function CampScreen({
  state,
  onSceneChoice,
  onBuy,
  onToggleSquad,
  onNight,
}: {
  state: GameState;
  onSceneChoice: (scene: CampScene, optIndex: number) => void;
  onBuy: (item: ShopItem) => void;
  onToggleSquad: (cid: keyof typeof COMPANIONS) => void;
  onNight: () => void;
}) {
  const [selectedWho, setSelectedWho] = useState<keyof typeof COMPANIONS | null>(null);
  const [tab, setTab] = useState<'camp' | 'chronicle'>('camp');

  const aliveIds = (Object.keys(COMPANIONS) as Array<keyof typeof COMPANIONS>).filter(
    (id) => !state.companions[id].broken,
  );
  const scene: CampScene | undefined =
    CAMP_SCENES.find((s) => s.day === state.day && !state.companions[s.who].broken) ?? undefined;
  const sceneShown = scene && state.talkedToday === scene.who;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5 zn-rise">
      <TopBar state={state} />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="zn-display text-3xl text-[#f3e7cf]">
            Сумерки · лагерь на Стоялах
          </h2>
          <p className="zn-muted text-sm mt-1">
            Огни разложены, гать натянута. До мгляного часа — один разговор,
            одна торговля и выбор тех, кто пойдёт в ночь.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className={`zn-btn ${tab === 'camp' ? 'zn-btn-primary' : ''}`}
            onClick={() => setTab('camp')}
          >
            Лагерь
          </button>
          <button
            className={`zn-btn ${tab === 'chronicle' ? 'zn-btn-primary' : ''}`}
            onClick={() => setTab('chronicle')}
          >
            Летопись ({state.chronicle.length})
          </button>
        </div>
      </div>

      {tab === 'chronicle' ? (
        <div className="zn-panel p-6 max-h-[65vh] overflow-y-auto zn-scroll space-y-4">
          {state.chronicle.map((e, i) => (
            <div key={i} className="border-b border-[#3a3028] pb-3 last:border-0">
              <span className="text-[11px] zn-muted">
                {e.day > 0 ? `Ночь ${e.day} · ` : ''}
                {e.phase === 'day' ? 'день' : e.phase === 'camp' ? 'сумерки' : e.phase === 'night' ? 'ночь' : 'приговор'}
              </span>
              <p
                className={`text-sm mt-1 leading-relaxed ${
                  e.tone === 'warm'
                    ? 'text-[#c9bfa0]'
                    : e.tone === 'cold'
                      ? 'text-[#a08a80] italic'
                      : 'text-[#cbbda3]'
                }`}
              >
                {e.text}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-5">
          {/* ЛЕВАЯ: ватага */}
          <section className="space-y-3">
            <h3 className="zn-display text-lg zn-gold">Ватага · отряд на ночь</h3>
            <p className="text-xs zn-muted -mt-2">
              Кликни брата — взять в ночную вылазку (до трёх).
            </p>
            {aliveIds.map((cid) => (
              <CompanionCard
                key={cid}
                state={state}
                cid={cid}
                compact
                selected={state.squad.includes(cid)}
                onClick={() => onToggleSquad(cid)}
                badge={state.squad.includes(cid) ? 'в отряде' : undefined}
              />
            ))}
            <div className="zn-panel2 p-3 text-xs zn-muted leading-relaxed">
              Отряд: {state.squad.length ? state.squad.map((s) => COMPANIONS[s].name).join(', ') : 'никого'}
            </div>
          </section>

          {/* ЦЕНТР: разговор */}
          <section className="space-y-3">
            <h3 className="zn-display text-lg zn-gold">Один разговор до ночи</h3>
            {scene && !sceneShown && (
              <div className="zn-panel p-5">
                <div className="flex gap-4 items-start">
                  <div className="relative w-20 h-[104px] shrink-0 rounded overflow-hidden border border-[#3a3028]">
                    <Image
                      src={COMPANIONS[scene.who].portrait}
                      alt={COMPANIONS[scene.who].name}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </div>
                  <div>
                    <p className="zn-display text-xl" style={{ color: COMPANIONS[scene.who].battleColor }}>
                      {COMPANIONS[scene.who].name}
                    </p>
                    <p className="text-sm mt-2 leading-relaxed text-[#cbbda3]">{scene.text}</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {scene.options.map((opt, i) => (
                    <button
                      key={i}
                      className="zn-btn w-full text-left justify-start text-sm"
                      onClick={() => onSceneChoice(scene, i)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {scene && sceneShown && (
              <div className="zn-panel p-5 text-sm leading-relaxed text-[#cbbda3]">
                <p className="zn-gold zn-display text-lg mb-2">
                  Разговор был: {COMPANIONS[scene.who].name}
                </p>
                <p className="italic">
                  «{state.companions[scene.who].memories.at(-1)?.text}» — запись в памяти брата.
                </p>
              </div>
            )}
            {!scene && (
              <div className="zn-panel p-5 text-sm zn-muted">
                Сегодня никто не подошёл к огню атамана. Братья заняты делом.
              </div>
            )}

            {/* ТОРГОВЛЯ */}
            <h3 className="zn-display text-lg zn-gold pt-2">Снаряжение и злато</h3>
            <div className="space-y-2">
              {SHOP.map((item) => {
                const bought = state.itemsBought.includes(item.id);
                const canPay = state.gold >= item.price;
                return (
                  <div key={item.id} className="zn-panel2 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="zn-display text-base text-[#f3e7cf]">
                        {item.name} {item.cursed && <span className="zn-accent text-xs">· проклятая трата</span>}
                      </span>
                      <button
                        className={`zn-btn text-xs py-1 px-3 ${item.cursed ? 'zn-accent' : ''}`}
                        disabled={bought || !canPay}
                        onClick={() => onBuy(item)}
                      >
                        {bought ? 'куплено' : `◈ ${item.price}`}
                      </button>
                    </div>
                    <p className="text-xs mt-1 text-[#a89a82] leading-relaxed">{item.desc}</p>
                    {item.cursed && (
                      <p className="text-xs mt-1 zn-accent">Мгла +{item.mgla} — крупная трата кормит ночь</p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* ПРАВАЯ: сводка памяти */}
          <section className="space-y-3">
            <h3 className="zn-display text-lg zn-gold">Память ватаги</h3>
            {aliveIds.map((cid) => (
              <CompanionCard key={cid} state={state} cid={cid} />
            ))}
            <div className="zn-panel2 p-4 text-xs zn-muted leading-relaxed">
              <p className="zn-gold mb-1 zn-display text-sm">Как читать</p>
              Память — не шкала кармы, а журнал эпизодов. Братья не забывают:
              обиды не тускнеют со временем. Ниже «II · Оговор» начинается
              лестница разрыва — после ночи брат может потребовать право слова.
            </div>
          </section>
        </div>
      )}

      <div className="flex justify-center pb-8">
        <button
          className="zn-btn zn-btn-primary text-xl px-10 py-3"
          disabled={state.squad.length === 0}
          onClick={onNight}
        >
          Выйти в ночь ({state.squad.length || '0'} в отряде)
        </button>
      </div>
    </div>
  );
}

export type { ShopItem };
