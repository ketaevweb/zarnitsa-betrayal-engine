'use client';

import { useState } from 'react';
import type { GameState, ContractDef, ShopItem } from '@/game/types';
import type { CompanionId, EncounterId } from '@/game/types';
import { COMPANIONS, CONTRACTS, type CampScene } from '@/game/data';
import {
  initState, addMemory, chroniclePush, applyStance, factionMovesForDay,
  computeVerdict, resolveOath, resolveBribe, computeFinale,
} from '@/game/engine';
import TitleScreen from './TitleScreen';
import DayScreen from './DayScreen';
import CampScreen from './CampScreen';
import NightBattle from './NightBattle';
import AftermathScreen from './AftermathScreen';
import FinaleScreen from './FinaleScreen';

const DAY_CONTRACTS: Record<1 | 2 | 3, [string, string]> = {
  1: ['c1_upyr', 'c1_train'],
  2: ['c2_boneyard', 'c2_sbor'],
  3: ['c3_heretics', 'c3_vault'],
};

const ENC_BY_CONTRACT: Record<string, EncounterId> = {
  c1_upyr: 'upyr',
  c1_train: 'train',
  c2_boneyard: 'boneyard',
  c2_sbor: 'ambush',
  c3_heretics: 'heretics',
  c3_vault: 'vault',
};

export default function GameShell() {
  const [state, setState] = useState<GameState>(() => initState());
  const [nightEncounter, setNightEncounter] = useState<EncounterId>('upyr');

  const clone = (s: GameState): GameState => structuredClone(s);

  // ── титул → день ──
  const startGame = () => {
    setState((s) => {
      const n = clone(s);
      n.phase = 'day';
      n.day = 1;
      n.contractsOffered = [...DAY_CONTRACTS[1]];
      chroniclePush(n, 'Атаман дал обет у Каменного Столпа. Ватага собирает силы на первые дела.', 'day');
      return n;
    });
  };

  // ── выбор контракта ──
  const chooseContract = (c: ContractDef) => {
    setNightEncounter(ENC_BY_CONTRACT[c.id]);
    setState((s) => {
      const n = clone(s);
      n.phase = 'camp';
      n.contractsTaken.push(c.id);
      n.talkedToday = null;
      chroniclePush(n, `Дело принято: «${c.title}». Ватага готовит гать и сушит порох.`, 'day');
      return n;
    });
  };

  // ── лагерь ──
  const onSceneChoice = (scene: CampScene, optIndex: number) => {
    setState((s) => {
      const n = clone(s);
      const opt = scene.options[optIndex];
      addMemory(n, scene.who, opt.kind, opt.val, opt.text);
      n.talkedToday = scene.who;
      n.companions[scene.who].sceneKeys.push(scene.id);
      chroniclePush(n, opt.chronicle, 'camp');
      return n;
    });
  };

  const onBuy = (item: ShopItem) => {
    setState((s) => {
      const n = clone(s);
      if (n.gold < item.price || n.itemsBought.includes(item.id)) return n;
      n.gold -= item.price;
      n.itemsBought.push(item.id);
      if (item.id === 'potion') n.potions += 1;
      if (item.id === 'trap') n.traps += 3;
      if (item.id === 'strings') n.companions.miluta.loyalty += 1; // струны для певчего
      if (item.cursed && item.mgla) {
        n.mgla = Math.min(100, n.mgla + item.mgla);
        if (item.id === 'ingot') n.godIngot = true;
        chroniclePush(n, `Проклятая трата принята: Мгла над лагерем стала гуще.`, 'camp');
      } else {
        chroniclePush(n, `Сумка ватаги пополнилась: ${item.name.toLowerCase()}.`, 'camp');
      }
      return n;
    });
  };

  const onToggleSquad = (cid: CompanionId) => {
    setState((s) => {
      const n = clone(s);
      if (n.companions[cid].broken) return n;
      const i = n.squad.indexOf(cid);
      if (i >= 0) {
        if (n.squad.length <= 1) return n; // хотя бы один в ночи
        n.squad.splice(i, 1);
      } else if (n.squad.length < 3) {
        n.squad.push(cid);
      }
      return n;
    });
  };

  const goNight = () => {
    setState((s) => {
      const n = clone(s);
      n.phase = 'night';
      return n;
    });
  };

  // ── ночь → рассвет ──
  const onBattleFinish = (r: {
    win: boolean; kills: number; downed: string[]; overheat: boolean; potions: number; traps: number;
  }) => {
    setState((s) => {
      const n = clone(s);
      n.potions = r.potions;
      n.traps = r.traps;
      const contract = CONTRACTS.find((c) => c.id === n.contractsTaken[n.contractsTaken.length - 1]);
      n.battleResult = {
        win: r.win, kills: r.kills,
        downed: r.downed as CompanionId[],
        overheat: r.overheat,
      };
      if (r.win && contract) {
        n.gold += contract.reward.gold;
        n.mgla = Math.max(0, Math.min(100, n.mgla + contract.reward.mgla));
        contract.memory.forEach((m) => addMemory(n, m.who, m.kind, m.val, m.text));
        contract.stance.forEach((st) => applyStance(n, st.faction, st.delta));
        chroniclePush(n, `Дело сделано: «${contract.title}». В казну ${contract.reward.gold} златых.`, 'night');
      } else {
        n.mgla = Math.max(0, Math.min(100, n.mgla + 4));
        (n.squad as CompanionId[]).forEach((cid) => {
          if (!n.companions[cid].broken) {
            addMemory(n, cid, 'chest', -1, 'Ночь проиграна — братья видели');
          }
        });
        chroniclePush(n, 'Ночь проиграна: ватага вытащила атамана к огню без памяти.', 'night');
      }
      // сбитые с ног — лёгкая обида памяти
      r.downed.forEach((d) => {
        if (!n.companions[d].broken) {
          addMemory(n, d as CompanionId, 'blood', -1, 'Сбит с ног в ночном бою');
        }
      });
      if (r.overheat) {
        // перегрев видели все — лёгкий минус чести
        (Object.keys(COMPANIONS) as CompanionId[]).forEach((cid) => {
          if (!n.companions[cid].broken) {
            addMemory(n, cid, 'chest', -1, 'Атаман жёг своих: безумие огня');
          }
        });
      }
      // ход фракций за ночь
      factionMovesForDay(n).forEach((text) => {
        chroniclePush(n, text, 'night');
      });
      // право слова
      n.verdict = computeVerdict(n);
      if (n.verdict && (n.verdict.scene === 'break' || n.verdict.scene === 'knives')) {
        const who = n.verdict.who;
        if (who) {
          n.companions[who].broken = true;
          n.companions[who].stage = n.verdict.scene === 'knives' ? 5 : 4;
          n.squad = n.squad.filter((x) => x !== who);
          chroniclePush(n, `${COMPANIONS[who].name} порвал обет. Ватага молчит.`, 'verdict');
        }
      }
      n.phase = 'aftermath';
      return n;
    });
  };

  // ── рассвет → дальше ──
  const afterContinue = () => {
    setState((s) => {
      const n = clone(s);
      if (n.day < 3) {
        n.day = (n.day + 1) as 2 | 3;
        n.contractsOffered = [...DAY_CONTRACTS[n.day]];
        n.talkedToday = null;
        n.battleResult = null;
        n.verdict = null;
        n.phase = 'day';
        // лёгкое восстановление отряда после ночи
        chroniclePush(n, `День ${n.day}: ватага снимает лагерь и идёт по слухам.`, 'day');
        return n;
      }
      // финал
      n.finale = computeFinale(n);
      n.verdict = null;
      n.phase = 'finale';
      const ft = computeFinale(n) === 'oath'
        ? 'Третья ночь закрыта гордой строкой.'
        : computeFinale(n) === 'crack'
          ? 'Третья ночь закрыта строкой с зачёркиванием.'
          : 'Третья ночь закрыта списком имён через черту.';
      chroniclePush(n, ft, 'verdict');
      return n;
    });
  };

  const restart = () => {
    const n = initState();
    n.phase = 'title';
    setState(n);
  };

  // ── рендер ──
  if (state.phase === 'title') return <TitleScreen onStart={startGame} />;

  if (state.phase === 'day') {
    const contracts = state.contractsOffered
      .map((id) => CONTRACTS.find((c) => c.id === id))
      .filter(Boolean) as ContractDef[];
    return (
      <div className="zn-root">
        <DayScreen state={state} contracts={contracts} onChoose={chooseContract} />
      </div>
    );
  }

  if (state.phase === 'camp') {
    return (
      <div className="zn-root">
        <CampScreen
          state={state}
          onSceneChoice={onSceneChoice}
          onBuy={onBuy}
          onToggleSquad={onToggleSquad}
          onNight={goNight}
        />
      </div>
    );
  }

  if (state.phase === 'night') {
    return (
      <div className="zn-root">
        <NightBattle
          key={`night-${state.day}`}
          state={state}
          encounterId={nightEncounter}
          onFinish={onBattleFinish}
        />
      </div>
    );
  }

  if (state.phase === 'aftermath') {
    return (
      <div className="zn-root">
        <AftermathScreen
          state={state}
          onResolveOath={() => {
            setState((s) => {
              const n = clone(s);
              if (n.verdict?.who) {
                resolveOath(n, n.verdict.who);
                chroniclePush(n, 'Право слова исполнено: обидчик у огня принял покаяние.', 'verdict');
                n.verdict = { who: n.verdict.who, scene: 'calm', text: 'Обет исполнен делом при свидетелях. Брат молча кивает: слово вернулось.' };
              }
              return n;
            });
          }}
          onResolveBribe={(pay) => {
            setState((s) => {
              const n = clone(s);
              if (n.verdict?.who) {
                resolveBribe(n, n.verdict.who, pay);
                chroniclePush(
                  n,
                  pay
                    ? 'Обида выкуплена златом. Летопись не комментирует.'
                    : 'Атаман ответил словом, не златом. Дальше — как договорились.',
                  'verdict',
                );
                n.verdict = { who: n.verdict.who, scene: 'calm', text: pay ? 'Злато принято. Обида — наполовину.' : 'Слово сказано. Посмотрим, устоит ли оно против мглы.' };
              }
              return n;
            });
          }}
          onContinue={afterContinue}
        />
      </div>
    );
  }

  if (state.phase === 'finale') {
    return (
      <div className="zn-root">
        <FinaleScreen state={state} onRestart={restart} />
      </div>
    );
  }

  return null;
}
