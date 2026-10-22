"use client";

/* Игрок: WASD/джойстик, следящая камера, поиск ближайшего взаимодействия,
 * тик топлива костра, следы на снегу, шёпот Мглы (M0.8) */

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { availableEvents, useZarnitsa } from "@/lib/zarnitsa/store";
import { CAMP_SPOTS, PILLAR_POS } from "@/lib/zarnitsa/scenario3d";
import { COMPANIONS } from "@/lib/zarnitsa/data";
import { WOOD_PILES, dreadLevel, mglLive, watcherTargetR } from "@/lib/zarnitsa/camp3d";
import { BRUSHWOOD_SPOTS } from "@/lib/zarnitsa/day";
import { pickWhisper } from "@/lib/zarnitsa/whispers";
import { setDread, setDayMode, sfxStep, sfxWhisper } from "@/lib/zarnitsa/audio";
import { addFootprint, companionLive, touchInput } from "./campLife";

/** глобальное состояние клавиш (обновляется в GameCanvas) */
export const keys = new Set<string>();

const POS = new THREE.Vector3(0, 0, 7);
let ANGLE = 0;

/** копилка стужи для шёпотов Мглы (M1.0): тик при dread ≥ 0.45, оттек при тепле */
let dreadAccum = 0;
let lastWhisperAt = 0;

/** текущая позиция игрока (для спутников) */
export function playerPos(): THREE.Vector3 {
  return POS;
}

/** текущий угол поворота игрока (для мини-карты) */
export function playerAngle(): number {
  return ANGLE;
}
const CAM_TARGET = new THREE.Vector3();
const LOOK = new THREE.Vector3();

const OBSTACLES: { x: number; z: number; r: number }[] = [
  { x: 0, z: 0, r: 1.9 }, // костёр
  { x: 6.8, z: 2.2, r: 2.0 }, // шатры
  { x: -6.9, z: 3.6, r: 2.0 },
  { x: 4.9, z: -6.2, r: 2.0 },
  { x: -7.6, z: -3.2, r: 1.9 }, // обоз
  { x: PILLAR_POS[0], z: PILLAR_POS[1], r: 2.1 }, // Столп
];

export function Player() {
  const group = useRef<THREE.Group>(null);
  const targetAngle = useRef(0);
  const stepAccum = useRef(0.22);
  const whisperAcc = useRef(9);

  useFrame(({ camera }, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const store = useZarnitsa.getState();
    const isDay = store.screen === "camp";
    const canMove =
      (store.screen === "play" || isDay) && !store.journalOpen && !store.whisper;

    // костёр горит, пока идёт ночь
    store.tickFire(dt);

    let dx = 0;
    let dz = 0;
    if (canMove) {
      if (keys.has("KeyW") || keys.has("ArrowUp")) dz -= 1;
      if (keys.has("KeyS") || keys.has("ArrowDown")) dz += 1;
      if (keys.has("KeyA") || keys.has("ArrowLeft")) dx -= 1;
      if (keys.has("KeyD") || keys.has("ArrowRight")) dx += 1;
      // тач-джойстик
      if (touchInput.active && (touchInput.x !== 0 || touchInput.y !== 0)) {
        dx += touchInput.x;
        dz += -touchInput.y; // джойстик вверх = вперёд (−z)
      }
    }
    const len = Math.hypot(dx, dz);
    // бег: Shift или тач-кнопка (M0.9)
    const run = canMove && (keys.has("ShiftLeft") || keys.has("ShiftRight") || touchInput.run);
    const speed = run ? 13.4 : 8.2;
    if (len > 0) {
      dx /= len;
      dz /= len;
      POS.x += dx * speed * dt;
      POS.z += dz * speed * dt;
      targetAngle.current = Math.atan2(dx, dz);
      // шаги по снегу + след — чаще на бегу
      stepAccum.current += dt;
      if (stepAccum.current > (run ? 0.21 : 0.34)) {
        stepAccum.current = 0;
        sfxStep();
        addFootprint(POS.x, POS.z, targetAngle.current);
      }
    } else {
      stepAccum.current = Math.min(stepAccum.current, 0.2);
    }

    // режим экскурсии: авто-ход к ближайшему доступному маркеру (только ночью)
    if (canMove && store.tour && !isDay && !store.activeEvent) {
      const list = availableEvents(store.state, store.night, store.doneToday);
      if (list.length > 0) {
        const ev = list[0];
        const tx = ev.pos[0] - POS.x;
        const tz = ev.pos[1] - POS.z;
        const d = Math.hypot(tx, tz);
        if (d > 1.9 && d < 90) {
          POS.x += (tx / d) * 8.2 * dt;
          POS.z += (tz / d) * 8.2 * dt;
          targetAngle.current = Math.atan2(tx / d, tz / d);
        }
      }
    }

    // граница поляны
    const r = Math.hypot(POS.x, POS.z);
    if (r > 38) {
      POS.x *= 38 / r;
      POS.z *= 38 / r;
    }
    // выталкивание из препятствий
    for (const o of OBSTACLES) {
      const ox = POS.x - o.x;
      const oz = POS.z - o.z;
      const d2 = ox * ox + oz * oz;
      if (d2 < o.r * o.r && d2 > 1e-6) {
        const d = Math.sqrt(d2);
        POS.x = o.x + (ox / d) * o.r;
        POS.z = o.z + (oz / d) * o.r;
      }
    }

    if (group.current) {
      group.current.position.set(POS.x, len > 0 ? Math.abs(Math.sin(performance.now() / 130)) * 0.05 : 0, POS.z);
      const cur = group.current.rotation.y;
      let diff = targetAngle.current - cur;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      group.current.rotation.y = cur + diff * Math.min(1, dt * 11);
      ANGLE = group.current.rotation.y;
    }

    // камера: орбита на титуле, слежка в игре
    if (store.screen === "title") {
      const t = (performance.now() / 1000) * 0.1;
      CAM_TARGET.set(Math.sin(t) * 24, 11, Math.cos(t) * 24);
      camera.position.lerp(CAM_TARGET, 1 - Math.exp(-dt * 2));
      camera.lookAt(0, 1.6, 0);
    } else {
      CAM_TARGET.set(POS.x, 15.5, POS.z + 14.5);
      camera.position.lerp(CAM_TARGET, 1 - Math.exp(-dt * 3.2));
      LOOK.set(POS.x, 0.6, POS.z - 2);
      camera.lookAt(LOOK);

      // FOV-рывок на бегу (M0.9)
      const cam = camera as THREE.PerspectiveCamera;
      const wantFov = run && len > 0 ? 62 : 55;
      if (Math.abs(cam.fov - wantFov) > 0.05) {
        cam.fov += (wantFov - cam.fov) * Math.min(1, dt * 4.5);
        cam.updateProjectionMatrix();
      }

      // тряска камеры после «укола за живое» (M0.7)
      const shakeAge = performance.now() - store.shakeAt;
      if (shakeAge >= 0 && shakeAge < 450) {
        const k = (1 - shakeAge / 450) * 0.26;
        camera.position.x += (Math.random() - 0.5) * k;
        camera.position.y += (Math.random() - 0.5) * k * 0.6;
        camera.position.z += (Math.random() - 0.5) * k;
      }
    }

    // Мгла: живое кольцо — подступ по топливу, память о ближайшем круге (M0.9).
    // Днём (M1.1) Мгла отступила — стужа отпускает; смена дня меняет и звук (M1.2)
    if (isDay) {
      setDread(0);
      setDayMode(true);
    } else if (store.screen !== "title") {
      setDayMode(false);
      const tr = watcherTargetR(store.night, store.fire.fuel);
      if (tr < mglLive.closest) mglLive.closest = tr;
      setDread(dreadLevel(store.fire.fuel));
    }

    // Шёпоты Мглы (M1.0): долгая стужа туманит разум — до двух за ночь
    if (
      store.screen === "play" &&
      !store.journalOpen &&
      !store.whisper &&
      !store.activeEvent &&
      !store.talkMenu &&
      !store.intro &&
      !store.pendingDoneId
    ) {
      const dl = dreadLevel(store.fire.fuel);
      if (dl >= 0.45) {
        dreadAccum += dt;
        if (
          dreadAccum > 22 &&
          store.whisperDone.length < 2 &&
          performance.now() - lastWhisperAt > 90000
        ) {
          const w = pickWhisper(store.night, store.whisperDone, store.state);
          if (w) {
            lastWhisperAt = performance.now();
            dreadAccum = 0;
            store.openWhisper(w.id);
          }
        }
      } else {
        dreadAccum = Math.max(0, dreadAccum - dt * 0.6);
      }
    }

    // шёпот Мглы: при гаснущем костре часто, на III ночи — сам по себе (только ночью)
    whisperAcc.current -= dt;
    if (whisperAcc.current <= 0) {
      const fuel = store.fire.fuel;
      const dl = dreadLevel(fuel);
      const chance = fuel < 22 ? 0.55 : store.night >= 3 ? 0.25 : 0.07;
      if (store.screen === "play" && Math.random() < chance + dl * 0.3) sfxWhisper();
      whisperAcc.current = 7 + Math.random() * 7 - dl * 3.5;
    }

    // ближайшее взаимодействие: ночью — события/поленницы, днём — дела обхода (M1.1)
    if (canMove) {
      let best: { kind: "event" | "companion" | "fire" | "wood"; id: string; d: number } | null = null;
      if (isDay) {
        // утренние разговоры: с кем ещё не говорил
        for (const c of COMPANIONS) {
          const cs = store.state.party[c.id];
          if (!cs || cs.gone) continue;
          if (store.dayDone.includes(`dtalk_${c.id}_d${store.night + 1}`)) continue;
          const p = companionLive[c.id] ?? CAMP_SPOTS[c.id];
          const d = Math.hypot(POS.x - p.x, POS.z - p.z);
          if (d < 2.5 && (!best || d < best.d)) best = { kind: "companion", id: c.id, d };
        }
        // вязанки хвороста (M1.1)
        for (const b of BRUSHWOOD_SPOTS) {
          if (store.dayDone.includes(b.id)) continue;
          const d = Math.hypot(POS.x - b.x, POS.z - b.z);
          if (d < 2.1 && (!best || d < best.d)) best = { kind: "wood", id: b.id, d };
        }
        // костёр дремлет — можно подойти и погреться
        const dFireD = Math.hypot(POS.x, POS.z);
        if (dFireD < 2.75 && (!best || dFireD < best.d)) best = { kind: "fire", id: "fire", d: dFireD };
        store.setNearest(best ? { kind: best.kind, id: best.id } : null);
      } else {
        for (const ev of availableEvents(store.state, store.night, store.doneToday)) {
          const d = Math.hypot(POS.x - ev.pos[0], POS.z - ev.pos[1]);
          if (d < 2.8 && (!best || d < best.d)) best = { kind: "event", id: ev.id, d };
        }
        for (const c of COMPANIONS) {
          const cs = store.state.party[c.id];
          if (!cs || cs.gone) continue;
          const p = companionLive[c.id] ?? CAMP_SPOTS[c.id];
          const d = Math.hypot(POS.x - p.x, POS.z - p.z);
          if (d < 2.5 && (!best || d < best.d)) best = { kind: "companion", id: c.id, d };
        }
        // костёр — подкормить
        const dFire = Math.hypot(POS.x, POS.z);
        if (dFire < 2.75 && (!best || dFire < best.d)) best = { kind: "fire", id: "fire", d: dFire };
        // поленницы — взять полено
        for (const p of WOOD_PILES) {
          if ((store.fire.piles[p.id] ?? 0) <= 0) continue;
          const d = Math.hypot(POS.x - p.x, POS.z - p.z);
          if (d < 2.1 && (!best || d < best.d)) best = { kind: "wood", id: p.id, d };
        }
        store.setNearest(best ? { kind: best.kind, id: best.id } : null);
      }
    } else {
      store.setNearest(null);
    }
  });

  return (
    <group ref={group} position={[POS.x, 0, POS.z]}>
      {/* плащ */}
      <mesh position={[0, 0.62, 0]}>
        <coneGeometry args={[0.42, 1.24, 8]} />
        <meshStandardMaterial color="#43364a" roughness={1} />
      </mesh>
      {/* голова */}
      <mesh position={[0, 1.36, 0]}>
        <sphereGeometry args={[0.17, 12, 12]} />
        <meshStandardMaterial color="#c9a78a" roughness={0.9} />
      </mesh>
      {/* капюшон */}
      <mesh position={[0, 1.45, -0.05]}>
        <coneGeometry args={[0.23, 0.36, 8]} />
        <meshStandardMaterial color="#332a3a" roughness={1} />
      </mesh>
      {/* фонарь */}
      <mesh position={[0.36, 0.78, 0.16]}>
        <boxGeometry args={[0.13, 0.22, 0.13]} />
        <meshStandardMaterial color="#1c1a22" emissive="#ffb45e" emissiveIntensity={1.6} />
      </mesh>
      <pointLight position={[0.45, 1.0, 0.25]} color="#ffc879" intensity={9} distance={12} decay={1.7} />
      {/* тень-блоб */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.5, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.35} depthWrite={false} />
      </mesh>
      {/* полено в руках, когда несёт */}
      <CarriedLog />
    </group>
  );
}

/** полено в руках игрока — видно, когда несёт дрова */
function CarriedLog() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (!ref.current) return;
    const carried = useZarnitsa.getState().fire.carried;
    ref.current.visible = carried > 0;
    ref.current.position.y = 0.55 + (carried > 1 ? 0.16 : 0);
  });
  return (
    <mesh ref={ref} position={[0, 0.55, 0.34]} rotation={[0.3, 0, Math.PI / 2.2]} visible={false}>
      <cylinderGeometry args={[0.06, 0.07, 0.62, 6]} />
      <meshStandardMaterial color="#4a3524" roughness={1} />
    </mesh>
  );
}
