"use client";

/* Мини-карта поляны (M или кнопка «карта»): маркеры, спутники, Столп, игрок.
 * M0.8: поленницы, дозорные Мглы (каждую ночь ближе), костёр по топливу,
 * спутники по живым позициям (бродят по лагерю). */

import { useEffect, useRef } from "react";
import { availableEvents, useZarnitsa } from "@/lib/zarnitsa/store";
import { playerAngle, playerPos } from "./Player";
import { CAMP_SPOTS, PILLAR_POS } from "@/lib/zarnitsa/scenario3d";
import { COMPANIONS } from "@/lib/zarnitsa/data";
import { WATCHER_ANGLES, WATCHER_R, WOOD_PILES } from "@/lib/zarnitsa/camp3d";
import { companionLive } from "./campLife";

const FIELD = 38; // радиус поляны
const SIZE = 190; // px канваса

export function Minimap() {
  const open = useZarnitsa((s) => s.mapOpen);
  const screen = useZarnitsa((s) => s.screen);
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!open || screen !== "play") return;
    let raf = 0;
    const draw = () => {
      const canvas = ref.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      const { state, night, doneToday, fire } = useZarnitsa.getState();

      const c = SIZE / 2;
      const k = (c - 12) / FIELD;
      const px = (x: number) => c + x * k;
      const pz = (z: number) => c + z * k; // вниз канвы = юг (+z), как в камере

      ctx.clearRect(0, 0, SIZE, SIZE);

      // поле
      ctx.beginPath();
      ctx.arc(c, c, c - 6, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(10,8,18,0.82)";
      ctx.fill();
      ctx.strokeStyle = "rgba(201,162,39,0.5)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // лес-ободок
      ctx.beginPath();
      ctx.arc(c, c, (c - 6) * 0.94, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(90,120,95,0.35)";
      ctx.setLineDash([3, 5]);
      ctx.stroke();
      ctx.setLineDash([]);

      // дозорные Мглы: тёмные точки с красным глазком
      const wr = WATCHER_R[night] ?? 37;
      for (const a of WATCHER_ANGLES) {
        const wx = px(Math.cos(a) * wr);
        const wz = pz(Math.sin(a) * wr);
        ctx.beginPath();
        ctx.arc(wx, wz, 2.4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(14,10,20,0.9)";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(wx, wz, 0.9, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(194,42,58,0.95)";
        ctx.fill();
      }

      // костёр: размер по топливу
      const fr = 2 + (fire.fuel / 100) * 3;
      const grad = ctx.createRadialGradient(px(0), pz(0), 0, px(0), pz(0), fr * 2.4);
      grad.addColorStop(0, "rgba(255,154,60,0.95)");
      grad.addColorStop(1, "rgba(255,154,60,0)");
      ctx.beginPath();
      ctx.arc(px(0), pz(0), fr * 2.4, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Столп присяги
      ctx.fillStyle = "#c9a227";
      ctx.fillRect(px(PILLAR_POS[0]) - 2.5, pz(PILLAR_POS[1]) - 2.5, 5, 5);

      // поленницы (серые квадратики; пустые — контур)
      for (const p of WOOD_PILES) {
        const left = fire.piles[p.id] ?? 0;
        ctx.fillStyle = left > 0 ? "rgba(138,132,148,0.9)" : "rgba(138,132,148,0.25)";
        ctx.fillRect(px(p.x) - 2, pz(p.z) - 2, 4, 4);
      }

      // спутники (цвет ступени, живые позиции)
      for (const comp of COMPANIONS) {
        const cs = state.party[comp.id];
        if (!cs || cs.gone) continue;
        const spot = companionLive[comp.id] ?? CAMP_SPOTS[comp.id];
        ctx.beginPath();
        ctx.arc(px(spot.x), pz(spot.z), 2.6, 0, Math.PI * 2);
        ctx.fillStyle = cs.frozen
          ? "#c9a227"
          : ["#7da87b", "#c9a227", "#b3542f", "#d95f3b", "#8c1f28", "#5a1020"][cs.level];
        ctx.fill();
      }

      // доступные маркеры
      for (const ev of availableEvents(state, night, doneToday)) {
        ctx.beginPath();
        ctx.arc(px(ev.pos[0]), pz(ev.pos[1]), ev.ambient ? 2.2 : 3.2, 0, Math.PI * 2);
        if (ev.ambient) {
          ctx.fillStyle = "rgba(122,138,160,0.9)";
        } else {
          ctx.fillStyle = ev.title.startsWith("⸸") ? "#d95f3b" : ev.gated ? "#e8d48a" : "#c9a227";
        }
        ctx.fill();
        if (!ev.ambient) {
          ctx.strokeStyle = "rgba(232,224,208,0.6)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // игрок — стрелка по направлению взгляда
      const p = playerPos();
      const a = playerAngle();
      const x0 = px(p.x);
      const z0 = px(p.z);
      // угол в мире: atan2(dx,dz); на карте z вниз, поэтому поворот = a
      ctx.save();
      ctx.translate(x0, z0);
      ctx.rotate(Math.PI + a);
      ctx.beginPath();
      ctx.moveTo(0, -6.5);
      ctx.lineTo(4.2, 4.6);
      ctx.lineTo(0, 2.4);
      ctx.lineTo(-4.2, 4.6);
      ctx.closePath();
      ctx.fillStyle = "#e8e0d0";
      ctx.fill();
      ctx.restore();

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [open, screen]);

  if (!open || screen !== "play") return null;

  return (
    <div className="pointer-events-none absolute right-3 top-14 z-20 z-fadein">
      <canvas ref={ref} width={SIZE} height={SIZE} className="rounded-full shadow-[0_0_18px_rgba(0,0,0,0.7)]" />
      <p className="mt-1 text-center text-[10px] uppercase tracking-[0.25em] text-[#9a8f96]">
        M — закрыть
      </p>
    </div>
  );
}
