"use client";

/* ============================================================
 * M1.3 «Ворон над лагерем» — птица-знамение дневной фазы.
 *
 * Ворон прилетает на «шум» ночи: чем больше шёпотов Мглы игрок
 * принял (echo со spared:false), тем ближе он к костру — от снежной
 * кромки леса до штабеля у самого огня. На последнем утре (день III)
 * он приходит минимум на средний штабель: Мгла уже рядом.
 *
 * Поведение: сидит, хопает, клюёт, поворачивается к игроку,
 * каркает (sfxCaw — тем чаще, чем ближе к костру).
 * ============================================================ */

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useZarnitsa } from "@/lib/zarnitsa/store";
import { FINALE_EVENT_ID, PILLAR_POS } from "@/lib/zarnitsa/scenario3d";
import { playerPos } from "./Player";
import { sfxCaw } from "@/lib/zarnitsa/audio";

/** живая позиция ворона (dev-хук __zarnitsa, будущей мини-карте) */
export const crowLive = { x: 0, y: 0, z: 0 };

/** якоря по нарастанию угрозы: лесная кромка → дальний штабель → штабель у костра */
const SPOTS: [number, number, number][] = [
  [21, 0.16, -15], // 0 принятых, день II — снежная кромка
  [8.5, 0.5, -12], // штабель w1 — средний круг
  [12.5, 0.5, 3.5], // штабель w3 — на виду у костра
];

/** развязка (M1.5): ворон на изголовье Столпа — южная кромка шляпки, у чаши огня */
const PILLAR_ANCHOR: [number, number, number] = [PILLAR_POS[0] + 0.38, 4.52, PILLAR_POS[1] + 0.5];
/** старт подлёта — из-за леса за Столпом */
const FLY_FROM = new THREE.Vector3(2, 24, -46);
const FLY_MID = new THREE.Vector3(3.5, 13, -31);

function crowSpot(accepted: number, day: number): [number, number, number] {
  const idx = Math.min(2, Math.max(0, accepted + (day >= 3 ? 1 : 0)));
  return SPOTS[idx]!;
}

interface Bot {
  hopT: number; // таймер до следующего хопа
  hopA: number; // прогресс хопа 0..1 (−1 = не хопает)
  from: THREE.Vector3;
  to: THREE.Vector3;
  peckT: number; // таймер до клевания
  peckA: number; // прогресс клевания 0..1 (−1 = не клюёт)
  cawT: number; // таймер до карканья
  cawA: number; // прогресс вскрика 0..1 (−1 = тихо)
  heading: number; // текущий угол взгляда
  fly: number; // подлёт к Столпу 0..1 (−1 = на земле / уже сидит)
}

export function Crow() {
  const group = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const wingL = useRef<THREE.Mesh>(null);
  const wingR = useRef<THREE.Mesh>(null);
  const bot = useRef<Bot>({
    hopT: 5,
    hopA: -1,
    from: new THREE.Vector3(),
    to: new THREE.Vector3(),
    peckT: 7,
    peckA: -1,
    cawT: 9,
    cawA: -1,
    heading: Math.PI,
    fly: -1,
  });

  const night = useZarnitsa((s) => s.night);
  const echo = useZarnitsa((s) => s.whisperEcho);
  const isDay = useZarnitsa((s) => s.screen) === "camp";
  // развязка (M1.5): ворон досиживает её на Столпе — падальщик приходит раньше ножей
  const finaleNow =
    useZarnitsa((s) => s.screen === "event" && s.activeEvent?.id === FINALE_EVENT_ID) ?? false;

  const accepted = useMemo(() => echo.filter((e) => !e.spared).length, [echo]);
  const day = night + 1;
  const anchor = useMemo(() => crowSpot(accepted, day), [accepted, day]);
  const anchorVec = useMemo(
    () => new THREE.Vector3(...(finaleNow ? PILLAR_ANCHOR : anchor)),
    [anchor, finaleNow],
  );

  useFrame(({ clock }, dtRaw) => {
    const g = group.current;
    if (!g || (!isDay && !finaleNow)) return;
    const dt = Math.min(dtRaw, 0.05);
    const t = clock.getElapsedTime();
    const b = bot.current;
    crowLive.x = g.position.x;
    crowLive.y = g.position.y;
    crowLive.z = g.position.z;

    // ── подлёт к Столпу (M1.5): дуга из-за леса, непрерывный взмах
    if (finaleNow && b.fly === -1) {
      b.fly = 0;
      g.position.copy(FLY_FROM);
    }
    if (b.fly >= 0) {
      b.fly = Math.min(1, b.fly + dt / 2.6);
      const k = b.fly;
      // квадратичный Безье: FLY_FROM → FLY_MID → якорь на Столпе
      const u = 1 - k;
      const ax = u * u * FLY_FROM.x + 2 * u * k * FLY_MID.x + k * k * anchorVec.x;
      const ay = u * u * FLY_FROM.y + 2 * u * k * FLY_MID.y + k * k * anchorVec.y;
      const az = u * u * FLY_FROM.z + 2 * u * k * FLY_MID.z + k * k * anchorVec.z;
      // клюв по ходу движения (модель смотрит в −z)
      const mdx = ax - g.position.x;
      const mdz = az - g.position.z;
      if (Math.abs(mdx) + Math.abs(mdz) > 1e-4) {
        const want = Math.atan2(-mdx, -mdz);
        let diff = want - b.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        b.heading += diff * Math.min(1, dt * 6);
      }
      g.rotation.y = b.heading;
      g.position.set(ax, ay, az);
      const flap = Math.sin(t * 16) * 1.05;
      if (wingL.current) wingL.current.rotation.z = 0.5 + flap;
      if (wingR.current) wingR.current.rotation.z = -0.5 - flap;
      if (head.current) head.current.rotation.x = 0;
      if (k >= 1) {
        b.fly = -2; // сел — выше не трогаем
        b.cawT = 0.45; // первое карканье сразу после посадки
        b.hopA = -1;
        b.peckA = -1;
      }
      return;
    }

    // ── на земле / на Столпе
    if (finaleNow) {
      // на Столпе сидит неподвижно — знамение замерло над развязкой
      b.hopA = -1;
      b.peckA = -1;
      const settle = Math.sin(t * 1.9) * 0.03;
      if (wingL.current) wingL.current.rotation.z += (0.34 - wingL.current.rotation.z) * dt * 5;
      if (wingR.current) wingR.current.rotation.z += (-0.34 - wingR.current.rotation.z) * dt * 5;
      g.position.y += (anchorVec.y + settle - g.position.y) * Math.min(1, dt * 6);
    } else {
      // таймер хопа: воробьиная суетливость, но с удержанием якоря
      if (b.hopA < 0) {
        b.hopT -= dt;
        if (b.hopT <= 0) {
          const a = Math.random() * Math.PI * 2;
          const r = 0.35 + Math.random() * 0.75;
          b.from.copy(g.position);
          b.to.set(anchorVec.x + Math.cos(a) * r, anchorVec.y, anchorVec.z + Math.sin(a) * r);
          b.hopA = 0;
        }
      } else {
        b.hopA += dt / 0.34;
        if (b.hopA >= 1) {
          b.hopA = -1;
          b.hopT = 2.8 + Math.random() * 5.5;
          g.position.copy(b.to);
        } else {
          const k = b.hopA;
          g.position.lerpVectors(b.from, b.to, k);
          g.position.y = b.from.y + Math.sin(k * Math.PI) * 0.34;
          // взмах крыльев в хопе
          const flap = Math.sin(k * Math.PI * 2) * 0.9;
          if (wingL.current) wingL.current.rotation.z = 0.5 + flap;
          if (wingR.current) wingR.current.rotation.z = -0.5 - flap;
        }
      }
      if (b.hopA < 0) {
        const settle = Math.sin(t * 1.7 + anchor[0]) * 0.045;
        if (wingL.current) wingL.current.rotation.z += (0.28 - wingL.current.rotation.z) * dt * 5;
        if (wingR.current) wingR.current.rotation.z += (-0.28 - wingR.current.rotation.z) * dt * 5;
        g.position.y += (anchorVec.y + settle - g.position.y) * Math.min(1, dt * 6);
      }

      // клевание: резкий наклон головы
      if (b.peckA < 0) {
        b.peckT -= dt;
        if (b.peckT <= 0) b.peckA = 0;
      } else {
        b.peckA += dt / 0.5;
        if (b.peckA >= 1) {
          b.peckA = -1;
          b.peckT = 4 + Math.random() * 7;
        }
      }
    }
    if (head.current) {
      const peck = b.peckA >= 0 ? Math.sin(Math.min(1, b.peckA) * Math.PI) * 0.85 : 0;
      // карканье: голова вскидывается
      const caw = b.cawA >= 0 ? Math.sin(Math.min(1, b.cawA) * Math.PI) * -0.5 : 0;
      head.current.rotation.x = peck + caw;
    }

    // взгляд на игрока (ворон примечает всё; модель смотрит в −z)
    const pp = playerPos();
    const want = Math.atan2(-(pp.x - g.position.x), -(pp.z - g.position.z));
    let diff = want - b.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    b.heading += diff * Math.min(1, dt * (finaleNow ? 4.5 : 3.2));
    g.rotation.y = b.heading;

    // карканье: на Столпе — часто; на земле — тем чаще, чем ближе к костру
    if (b.cawA < 0) {
      b.cawT -= dt;
      if (b.cawT <= 0) {
        b.cawA = 0;
        sfxCaw();
      }
    } else {
      b.cawA += dt / 0.6;
      if (b.cawA >= 1) {
        b.cawA = -1;
        const base = finaleNow
          ? 5.5 + Math.random() * 4
          : 11 + Math.random() * 12 - accepted * 3.2 - (day >= 3 ? 2.5 : 0);
        b.cawT = Math.max(finaleNow ? 3.4 : 4, base);
      }
    }
  });

  if (!isDay && !finaleNow) return null;

  return (
    <group
      ref={group}
      position={finaleNow ? [PILLAR_ANCHOR[0], PILLAR_ANCHOR[1], PILLAR_ANCHOR[2]] : [anchor[0], anchor[1], anchor[2]]}
    >
      {/* тело */}
      <mesh position={[0, 0.2, 0]} rotation={[0.12, 0, 0]}>
        <coneGeometry args={[0.16, 0.5, 7]} />
        <meshStandardMaterial color="#1a1723" roughness={0.85} />
      </mesh>
      {/* лохмы на груди — вороновская бородка */}
      <mesh position={[0, 0.3, -0.06]} rotation={[0.5, 0, 0]}>
        <coneGeometry args={[0.08, 0.16, 5]} />
        <meshStandardMaterial color="#2e2a38" roughness={1} />
      </mesh>
      {/* хвост */}
      <mesh position={[0, 0.18, 0.26]} rotation={[1.15, 0, 0]}>
        <boxGeometry args={[0.09, 0.02, 0.3]} />
        <meshStandardMaterial color="#100e16" roughness={0.9} />
      </mesh>
      {/* голова + клюв + глаза (группа для клевания) */}
      <group ref={head} position={[0, 0.36, -0.1]}>
        <mesh>
          <sphereGeometry args={[0.105, 10, 10]} />
          <meshStandardMaterial color="#14121a" roughness={0.85} />
        </mesh>
        <mesh position={[0, -0.01, -0.13]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.035, 0.14, 6]} />
          <meshStandardMaterial color="#3d3630" roughness={0.7} />
        </mesh>
        {/* глаза: на последнем утре — чуть живее блеск */}
        <mesh position={[0.055, 0.03, -0.06]}>
          <sphereGeometry args={[0.016, 6, 6]} />
          <meshStandardMaterial color="#d8d2c0" emissive="#c9b98a" emissiveIntensity={finaleNow ? 1.6 : day >= 3 ? 0.9 : 0.25} />
        </mesh>
        <mesh position={[-0.055, 0.03, -0.06]}>
          <sphereGeometry args={[0.016, 6, 6]} />
          <meshStandardMaterial color="#d8d2c0" emissive="#c9b98a" emissiveIntensity={finaleNow ? 1.6 : day >= 3 ? 0.9 : 0.25} />
        </mesh>
      </group>
      {/* крылья */}
      <mesh ref={wingL} position={[0.11, 0.24, 0.02]} rotation={[0, 0, 0.28]}>
        <boxGeometry args={[0.2, 0.02, 0.26]} />
        <meshStandardMaterial color="#100e16" roughness={0.9} />
      </mesh>
      <mesh ref={wingR} position={[-0.11, 0.24, 0.02]} rotation={[0, 0, -0.28]}>
        <boxGeometry args={[0.2, 0.02, 0.26]} />
        <meshStandardMaterial color="#100e16" roughness={0.9} />
      </mesh>
      {/* лапки */}
      <mesh position={[0.035, 0.03, 0]} rotation={[0, 0, 0.2]}>
        <cylinderGeometry args={[0.008, 0.008, 0.07, 4]} />
        <meshStandardMaterial color="#4a3b26" roughness={1} />
      </mesh>
      <mesh position={[-0.035, 0.03, 0]} rotation={[0, 0, 0.2]}>
        <cylinderGeometry args={[0.008, 0.008, 0.07, 4]} />
        <meshStandardMaterial color="#4a3b26" roughness={1} />
      </mesh>
      {/* тень: только днём, под лапками (в полёте и на тёмной шляпке Столпа — не нужна) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} visible={isDay}>
        <circleGeometry args={[0.16, 10]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.3} depthWrite={false} />
      </mesh>
    </group>
  );
}
