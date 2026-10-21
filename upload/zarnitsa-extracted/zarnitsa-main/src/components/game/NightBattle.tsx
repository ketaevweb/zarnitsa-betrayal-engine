'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { GameState, BattleState, BattleUnit } from '@/game/types';
import {
  ARENA_W, ARENA_H, FIRE_CX, FIRE_CY, FIRE_R, ZAR_FORMS,
  createBattle, tick, orderMove, orderTarget, orderHold, setForm,
  castZar, drinkPotion, placeTrap, ataman, aliveEnemies, aliveAllies,
  setPaused, togglePause,
} from '@/game/battle';
import { COMPANIONS, ENEMIES, ENCOUNTER_WAVES } from '@/game/data';

type Result = { win: boolean; kills: number; downed: string[]; overheat: boolean; potions: number; traps: number };

export default function NightBattle({
  state,
  encounterId,
  onFinish,
}: {
  state: GameState;
  encounterId: keyof typeof ENCOUNTER_WAVES;
  onFinish: (r: Result) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const portraitsRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const [uiTick, setUiTick] = useState(0);
  const [pausedUi, setPausedUi] = useState(false);
  const [over, setOver] = useState<Result | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const finishedRef = useRef(false);
  // боевое состояние живёт в useState: мутируется движком, идентичность стабильна
  const [bs] = useState<BattleState>(() => createBattle(state, encounterId));
  void uiTick;

  // ── portrait cache ──
  useEffect(() => {
    Object.values(COMPANIONS).forEach((c) => {
      if (!portraitsRef.current.has(c.portrait)) {
        const img = new window.Image();
        img.src = c.portrait;
        portraitsRef.current.set(c.portrait, img);
      }
    });
  }, []);

  const resultSnapshot = useCallback((bs: BattleState): Result => {
    const downed = bs.units
      .filter((u) => u.side === 'vataga' && u.companion && u.downed)
      .map((u) => u.companion as string);
    return {
      win: bs.over === 'win',
      kills: bs.kills,
      downed,
      overheat: bs.overheatT > 0 || bs.events.some((e) => e.text.includes('Безумие')),
      potions: bs.potions,
      traps: bs.traps,
    };
  }, []);

  // ── RAF loop ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;
    let last = performance.now();
    let uiAcc = 0;

    const loop = (now: number) => {
      let dt = (now - last) / 1000;
      last = now;
      dt = Math.min(dt, 0.05);

      const step = Math.min(dt, 1 / 60);
      tick(bs, step);

      draw(ctx, bs, portraitsRef.current);

      uiAcc += dt;
      if (uiAcc > 0.1) {
        uiAcc = 0;
        setUiTick((t) => t + 1);
      }

      if (bs.over !== 'none' && !finishedRef.current) {
        finishedRef.current = true;
        setPausedUi(true);
        setOver(resultSnapshot(bs));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [bs, resultSnapshot]);

  // ── клавиши ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (bs.over !== 'none') return;
      if (e.code === 'Space') {
        e.preventDefault();
        setPausedUi(togglePause(bs));
      } else if (e.key >= '1' && e.key <= '4') {
        setForm(bs, (Number(e.key) - 1) as 0 | 1 | 2 | 3);
      } else if (e.code === 'KeyE') {
        castZar(bs);
      } else if (e.code === 'KeyQ') {
        drinkPotion(bs);
      } else if (e.code === 'KeyT') {
        const a = ataman(bs);
        placeTrap(bs, a.x + 24, a.y + 18);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [bs]);

  const canvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * ARENA_W;
    const y = ((e.clientY - rect.top) / rect.height) * ARENA_H;
    orderMove(bs, x, y);
  };

  const a = ataman(bs);
  const allies = aliveAllies(bs).filter((u) => u.companion);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-4 zn-rise">
      {/* шапка ночи */}
      <div className="zn-panel px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span className="zn-display text-lg zn-gold">
          Ночь {state.day} · {ENCOUNTER_WAVES[encounterId].title}
        </span>
        <span className="zn-muted">
          волна {bs.waveIndex + 1}/{bs.waves.length}
        </span>
        <span className="zn-muted">убито: {bs.kills}</span>
        <span className="ml-auto text-xs zn-muted">
          Пробел — обетная пауза · клик — идти · 1–4 — облик · E — сила · Q — масло · T — ловушка
        </span>
      </div>

      <div className="grid lg:grid-cols-[1fr_280px] gap-4">
        {/* АРЕНА */}
        <div className="relative zn-panel overflow-hidden self-start">
          <canvas
            ref={canvasRef}
            width={ARENA_W}
            height={ARENA_H}
            className="w-full h-auto block cursor-crosshair"
            style={{ imageRendering: 'auto' }}
            onClick={canvasClick}
          />
          {pausedUi && !over && (
            <div className="absolute inset-0 bg-[#131111]/75 flex items-center justify-center">
              <div className="text-center">
                <p className="zn-display text-4xl text-[#f3e7cf] zn-flicker">Обетная пауза</p>
                <p className="zn-muted mt-2 text-sm">
                  Раздавай приказы: выбери брата справа, затем «атаковать цель» или «держать огни»
                </p>
                <button
                  className="zn-btn zn-btn-primary mt-5"
                  onClick={() => {
                    setPaused(bs, false);
                    setPausedUi(false);
                  }}
                >
                  Продолжить (пробел)
                </button>
              </div>
            </div>
          )}
          {over && (
            <div className="absolute inset-0 bg-[#131111]/85 flex items-center justify-center">
              <div className="text-center max-w-md px-6">
                <p
                  className="zn-display text-4xl"
                  style={{ color: over.win ? '#c0a774' : '#a82727' }}
                >
                  {over.win ? 'Ночь выдержана' : 'Ночь проиграна'}
                </p>
                <p className="zn-muted mt-3 text-sm leading-relaxed">
                  {over.win
                    ? 'Мгла отхлынула от гати. Ватага считает раны и снимает скарб со сторожевых кольев.'
                    : 'Атамана вытащили к огню без памяти. Контракт сорван, и братья видели это.'}
                </p>
                <p className="text-xs zn-muted mt-2">
                  убито навьев: {over.kills} · сбиты с ног: {over.downed.length ? over.downed.map((d) => COMPANIONS[d as keyof typeof COMPANIONS].name).join(', ') : 'никто'}
                </p>
                <button
                  className="zn-btn zn-btn-primary mt-6"
                  onClick={() => onFinish(over)}
                >
                  К рассвету
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ПАНЕЛЬ УПРАВЛЕНИЯ */}
        <div className="space-y-3">
          {/* зарница */}
          <div className="zn-panel p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="zn-display text-base zn-gold">Зарница</span>
              <span className="text-xs zn-muted">жар: {Math.round(bs.zar)}</span>
            </div>
            <div className="h-2 rounded-full bg-black/60 border border-[#3a3028] overflow-hidden mb-3">
              <div
                className="h-full transition-all duration-200"
                style={{
                  width: `${bs.zar}%`,
                  background: bs.zar >= 85 ? '#a82727' : 'linear-gradient(90deg,#c0a774,#a82727)',
                }}
              />
            </div>
            {bs.overheatT > 0 && (
              <p className="text-xs zn-accent mb-2 zn-flicker">БЕЗУМИЕ ОГНЯ: бьёшь своих!</p>
            )}
            <div className="grid grid-cols-2 gap-2">
              {ZAR_FORMS.map((f, i) => (
                <button
                  key={f.id}
                  className={`zn-btn text-xs py-1.5 px-2 ${bs.form === f.id ? 'zn-btn-primary' : ''}`}
                  onClick={() => setForm(bs, f.id)}
                  title={f.desc}
                >
                  <span
                    className="inline-block w-2 h-2 rounded-full mr-1"
                    style={{ background: f.color }}
                  />
                  {i + 1} · {f.name}
                </button>
              ))}
            </div>
            <button className="zn-btn zn-btn-primary w-full mt-2 text-sm" onClick={() => castZar(bs)}>
              Сила зарницы (E)
            </button>
          </div>

          {/* отряд */}
          <div className="zn-panel p-3">
            <span className="zn-display text-base zn-gold">Братья в бою</span>
            <div className="mt-2 space-y-2">
              {allies.map((u) => (
                <div
                  key={u.id}
                  className={`p-2 rounded border cursor-pointer transition-colors ${
                    selected === u.companion
                      ? 'border-[#a82727] bg-[#a82727]/10'
                      : 'border-[#3a3028] hover:border-[#c0a774]'
                  }`}
                  onClick={() => setSelected(u.companion!)}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: u.color }}
                    />
                    <span className="text-sm flex-1">{u.name}</span>
                    <span className="text-[11px] zn-muted">
                      {Math.max(0, Math.round(u.hp))}/{u.maxHp}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 rounded bg-black/60 overflow-hidden">
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${(u.hp / u.maxHp) * 100}%`,
                        background: u.hp / u.maxHp > 0.4 ? '#5e8c6a' : '#a82727',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            {selected && (
              <div className="mt-3 space-y-2">
                <p className="text-xs zn-muted">
                  Приказ для {COMPANIONS[selected as keyof typeof COMPANIONS].name}:
                </p>
                <div className="flex gap-2">
                  <button
                    className="zn-btn text-xs flex-1 py-1"
                    onClick={() => {
                      orderTarget(bs, selected as never);
                      setUiTick((t) => t + 1);
                    }}
                  >
                    Атаковать цель
                  </button>
                  <button
                    className="zn-btn text-xs flex-1 py-1"
                    onClick={() => {
                      orderHold(bs, selected as never);
                      setUiTick((t) => t + 1);
                    }}
                  >
                    Держать огни
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ресурсы */}
          <div className="zn-panel p-3 space-y-2">
            <span className="zn-display text-base zn-gold">Сумка атамана</span>
            <div className="flex gap-2">
              <button
                className="zn-btn text-xs flex-1 py-1"
                disabled={bs.potions <= 0}
                onClick={() => drinkPotion(bs)}
              >
                Масло ×{bs.potions} (Q)
              </button>
              <button
                className="zn-btn text-xs flex-1 py-1"
                disabled={bs.traps <= 0}
                onClick={() => {
                  const at = ataman(bs);
                  placeTrap(bs, at.x + 24, at.y + 18);
                }}
              >
                Ловушка ×{bs.traps} (T)
              </button>
            </div>
            <button
              className="zn-btn text-xs w-full py-1"
              onClick={() => setPausedUi(togglePause(bs))}
            >
              {pausedUi ? 'Продолжить бой' : 'Обетная пауза (пробел)'}
            </button>
          </div>

          {/* события */}
          <div className="zn-panel p-3">
            <span className="zn-display text-base zn-gold">У огня говорят</span>
            <ul className="mt-2 space-y-1 text-xs leading-snug">
              {bs.events.slice().reverse().map((e, i) => (
                <li key={`${e.t}-${i}`} style={{ color: e.color ?? '#9a8c78' }}>
                  {e.text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Рендер арены ─────────────────────────────────────────────────────
function draw(
  ctx: CanvasRenderingContext2D,
  bs: BattleState,
  portraits: Map<string, HTMLImageElement>,
) {
  ctx.save();
  if (bs.screenShake > 0) {
    ctx.translate(
      (Math.random() - 0.5) * bs.screenShake * 14,
      (Math.random() - 0.5) * bs.screenShake * 14,
    );
  }

  // земля
  const grd = ctx.createRadialGradient(FIRE_CX, FIRE_CY, 40, FIRE_CX, FIRE_CY, 620);
  grd.addColorStop(0, '#2a2420');
  grd.addColorStop(0.45, '#1d1917');
  grd.addColorStop(1, '#131111');
  ctx.fillStyle = grd;
  ctx.fillRect(-20, -20, ARENA_W + 40, ARENA_H + 40);

  // гать — доски
  ctx.strokeStyle = 'rgba(90, 76, 60, 0.25)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 12; i++) {
    const y = 60 + i * 40;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(ARENA_W, y + (i % 2 ? 8 : -8));
    ctx.stroke();
  }

  // мгла по краям
  const mist = ctx.createLinearGradient(0, 0, 0, ARENA_H);
  mist.addColorStop(0, 'rgba(74,66,88,0.28)');
  mist.addColorStop(0.2, 'rgba(74,66,88,0.06)');
  mist.addColorStop(0.8, 'rgba(74,66,88,0.06)');
  mist.addColorStop(1, 'rgba(74,66,88,0.3)');
  ctx.fillStyle = mist;
  ctx.fillRect(0, 0, ARENA_W, ARENA_H);

  // обетный огонь
  const flick = 0.85 + Math.sin(bs.time * 9) * 0.08 + Math.random() * 0.05;
  const fireGrd = ctx.createRadialGradient(FIRE_CX, FIRE_CY, 8, FIRE_CX, FIRE_CY, FIRE_R * flick);
  fireGrd.addColorStop(0, 'rgba(240, 200, 120, 0.5)');
  fireGrd.addColorStop(0.5, 'rgba(192, 130, 60, 0.22)');
  fireGrd.addColorStop(1, 'rgba(192, 130, 60, 0)');
  ctx.fillStyle = fireGrd;
  ctx.beginPath();
  ctx.arc(FIRE_CX, FIRE_CY, FIRE_R * flick, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(192, 167, 116, 0.5)';
  ctx.setLineDash([6, 5]);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(FIRE_CX, FIRE_CY, FIRE_R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // языки костра
  for (let i = 0; i < 5; i++) {
    const fx = FIRE_CX + Math.sin(bs.time * 3 + i * 2) * 18;
    const fh = 26 + Math.sin(bs.time * 7 + i * 1.7) * 8;
    ctx.fillStyle = `rgba(240, 180, 90, ${0.5 - i * 0.07})`;
    ctx.beginPath();
    ctx.ellipse(fx + (i - 2) * 8, FIRE_CY - fh / 2, 5 - i * 0.6, fh / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // ловушки
  bs.trapSlots.forEach((tr) => {
    ctx.fillStyle = tr.t < 0.4 ? 'rgba(201, 146, 94, 0.7)' : 'rgba(201, 146, 94, 0.35)';
    ctx.beginPath();
    ctx.arc(tr.x, tr.y, 8, 0, Math.PI * 2);
    ctx.fill();
  });

  // fx-кольца
  bs.fx.forEach((f) => {
    ctx.strokeStyle = f.color;
    ctx.globalAlpha = 1 - f.t / 0.45;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  });

  // юниты
  bs.units.forEach((u) => {
    if (u.downed) {
      ctx.fillStyle = 'rgba(60, 50, 45, 0.5)';
      ctx.beginPath();
      ctx.arc(u.x, u.y, u.radius * 0.8, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    // цель атамана
    if (u.side === 'nav') {
      const at = ataman(bs);
      const nearest = nearestOf(bs);
      if (nearest && u.id === nearest.id) {
        ctx.strokeStyle = 'rgba(168, 39, 39, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(u.x, u.y, u.radius + 6, 0, Math.PI * 2);
        ctx.stroke();
      }
      void at;
    }

    // тело
    ctx.save();
    // щит
    if (u.shieldT > 0) {
      ctx.strokeStyle = 'rgba(192, 167, 116, 0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(u.x, u.y, u.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (u.id === 'ataman') {
      // атаман: багровый диск + золотая звезда зарницы
      const glow = ctx.createRadialGradient(u.x, u.y, 2, u.x, u.y, u.radius + 8);
      glow.addColorStop(0, 'rgba(240, 200, 120, 0.55)');
      glow.addColorStop(1, 'rgba(168, 39, 39, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(u.x, u.y, u.radius + 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = u.flashT > 0 ? '#e8dcc8' : '#7a1f1f';
      ctx.beginPath();
      ctx.arc(u.x, u.y, u.radius + 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#c0a774';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(u.x, u.y, u.radius + 2, 0, Math.PI * 2);
      ctx.stroke();
      // звезда обета
      ctx.fillStyle = '#f0d9a0';
      for (let k = 0; k < 8; k++) {
        const ang = (Math.PI * 2 * k) / 8 + bs.time * 0.8;
        const r1 = 3, r2 = u.radius * 0.85;
        ctx.beginPath();
        ctx.moveTo(u.x + Math.cos(ang) * r1, u.y + Math.sin(ang) * r1);
        ctx.lineTo(u.x + Math.cos(ang) * r2, u.y + Math.sin(ang) * r2);
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = 'rgba(240, 217, 160, 0.9)';
        ctx.stroke();
      }
    } else if (u.side === 'vataga' && u.portrait && portraits.get(u.portrait)?.complete) {
      const img = portraits.get(u.portrait)!;
      ctx.beginPath();
      ctx.arc(u.x, u.y, u.radius + 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, u.x - u.radius - 4, u.y - u.radius - 7, (u.radius + 4) * 2, (u.radius + 7) * 2);
      ctx.restore();
      ctx.strokeStyle = u.flashT > 0 ? '#ffffff' : u.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(u.x, u.y, u.radius + 2, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // навь — тень с глазами
      const wob = Math.sin(bs.time * 6 + u.x) * 1.5;
      ctx.fillStyle = u.flashT > 0 ? '#c8b8b8' : u.color;
      ctx.beginPath();
      ctx.ellipse(u.x, u.y + wob * 0.3, u.radius, u.radius * 1.25 + wob, 0, 0, Math.PI * 2);
      ctx.fill();
      // глаза
      ctx.fillStyle = u.kind === 'eretik' ? '#d4b26a' : u.kind === 'vedmak' ? '#b26ad4' : '#d46a5a';
      ctx.beginPath();
      ctx.arc(u.x - 4, u.y - 3 + wob * 0.3, 1.8, 0, Math.PI * 2);
      ctx.arc(u.x + 4, u.y - 3 + wob * 0.3, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // замедление
    if (u.slowT > 0) {
      ctx.strokeStyle = 'rgba(125, 148, 176, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(u.x, u.y, u.radius + 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    // полоса здоровья
    if (u.side === 'nav' || u.hp < u.maxHp) {
      const w = u.radius * 2.4;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(u.x - w / 2, u.y - u.radius - 12, w, 4);
      ctx.fillStyle = u.side === 'vataga' ? '#7d9464' : '#a82727';
      ctx.fillRect(u.x - w / 2, u.y - u.radius - 12, (w * Math.max(0, u.hp)) / u.maxHp, 4);
    }
  });

  // вспышка зарницы при перегреве
  if (bs.overheatT > 0) {
    ctx.fillStyle = `rgba(168, 39, 39, ${0.12 + Math.random() * 0.08})`;
    ctx.fillRect(-20, -20, ARENA_W + 40, ARENA_H + 40);
  }

  ctx.restore();
}

function nearestOf(bs: BattleState): BattleUnit | null {
  const a = ataman(bs);
  let best: BattleUnit | null = null;
  let bestD = Infinity;
  for (const e of aliveEnemies(bs)) {
    const d = Math.hypot(a.x - e.x, a.y - e.y);
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}
