"use client";

/* Игрок: WASD-движение, следящая камера, поиск ближайшего взаимодействия */

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { availableEvents, useZarnitsa } from "@/lib/zarnitsa/store";
import { CAMP_SPOTS, PILLAR_POS } from "@/lib/zarnitsa/scenario3d";
import { COMPANIONS } from "@/lib/zarnitsa/data";

/** глобальное состояние клавиш (обновляется в GameCanvas) */
export const keys = new Set<string>();

const POS = new THREE.Vector3(0, 0, 7);

/** текущая позиция игрока (для спутников) */
export function playerPos(): THREE.Vector3 {
  return POS;
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

  useFrame(({ camera }, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const store = useZarnitsa.getState();
    const canMove = store.screen === "play";

    let dx = 0;
    let dz = 0;
    if (canMove) {
      if (keys.has("KeyW") || keys.has("ArrowUp")) dz -= 1;
      if (keys.has("KeyS") || keys.has("ArrowDown")) dz += 1;
      if (keys.has("KeyA") || keys.has("ArrowLeft")) dx -= 1;
      if (keys.has("KeyD") || keys.has("ArrowRight")) dx += 1;
    }
    const len = Math.hypot(dx, dz);
    if (len > 0) {
      dx /= len;
      dz /= len;
      POS.x += dx * 8.2 * dt;
      POS.z += dz * 8.2 * dt;
      targetAngle.current = Math.atan2(dx, dz);
    }

    // режим экскурсии: авто-ход к ближайшему доступному маркеру
    if (canMove && store.tour && !store.activeEvent) {
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
    }

    // ближайшее взаимодействие
    if (canMove) {
      let best: { kind: "event" | "companion"; id: string; d: number } | null = null;
      for (const ev of availableEvents(store.state, store.night, store.doneToday)) {
        const d = Math.hypot(POS.x - ev.pos[0], POS.z - ev.pos[1]);
        if (d < 2.8 && (!best || d < best.d)) best = { kind: "event", id: ev.id, d };
      }
      for (const c of COMPANIONS) {
        const cs = store.state.party[c.id];
        if (!cs || cs.gone) continue;
        const p = CAMP_SPOTS[c.id];
        const d = Math.hypot(POS.x - p[0], POS.z - p[1]);
        if (d < 2.5 && (!best || d < best.d)) best = { kind: "companion", id: c.id, d };
      }
      store.setNearest(best ? { kind: best.kind, id: best.id } : null);
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
    </group>
  );
}
