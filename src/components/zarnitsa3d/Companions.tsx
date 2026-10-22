"use client";

/* Спутники у костра: живое поведение M0.8.
 *
 * Каждый спутник — маленький конечный автомат:
 *   idle (сидит/стоит у точки) → walk (бродит к точке) → idle → …
 * Точки брожения: ближе к костру, к своему шатру, вбок.
 * При ступени IV+ бродит ТОЛЬКО наружу, от огня, и отворачивается.
 * Пауза присяги (frozen) — стоит на месте, ждёт Права слова.
 * Живые позиции — в companionLive (Player/Minimap их читают).
 */

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { COMPANIONS } from "@/lib/zarnitsa/data";
import { CAMP_SPOTS } from "@/lib/zarnitsa/scenario3d";
import { LEVEL_COLOR, useZarnitsa } from "@/lib/zarnitsa/store";
import { labelSprite } from "@/lib/zarnitsa/sprites";
import { companionLive } from "./campLife";
import { playerPos } from "./Player";

const CLOAK: Record<string, string> = {
  gavrila: "#46586b", // сталь
  khodata: "#6b3a30", // бордовый
  miluta: "#3f5a41", // зелёный
  ratmir: "#7a5a2e", // охра
};

const WALK_SPEED = 1.15;

interface BotState {
  mode: "idle" | "walk";
  wait: number;
  tx: number;
  tz: number;
  seed: number;
}

/** точка брожения: к костру / к шатру / вбок; при враждебности — только наружу */
function pickWaypoint(spot: [number, number], hostile: boolean, seed: number): [number, number] {
  const rnd = Math.sin(seed * 127.3) * 43758.5453;
  const pick = rnd - Math.floor(rnd); // 0..1
  let x: number;
  let z: number;
  if (hostile) {
    // наружу от костра: 1.7–2.2 радиуса от точки
    const k = 1.7 + pick * 0.5;
    x = spot[0] * k;
    z = spot[1] * k;
  } else if (pick < 0.4) {
    // ближе к костру, но не в огонь
    const k = 0.55 + pick * 0.2;
    x = spot[0] * k;
    z = spot[1] * k;
  } else if (pick < 0.7) {
    // вбок по дуге
    const a = Math.atan2(spot[1], spot[0]) + (pick < 0.55 ? 0.45 : -0.45);
    const r = Math.hypot(spot[0], spot[1]);
    x = Math.cos(a) * r;
    z = Math.sin(a) * r;
  } else {
    // дальше от костра
    const k = 1.35 + pick * 0.3;
    x = spot[0] * k;
    z = spot[1] * k;
  }
  // не наступать на костёр
  const d = Math.hypot(x, z);
  if (d < 2.5) {
    x = (x / (d || 1)) * 2.5;
    z = (z / (d || 1)) * 2.5;
  }
  return [x, z];
}

function Figure({ cid }: { cid: string }) {
  const def = COMPANIONS.find((c) => c.id === cid)!;
  const group = useRef<THREE.Group>(null);
  const orb = useRef<THREE.Mesh>(null);
  const level = useZarnitsa((s) => s.state.party[cid]?.level ?? 0);
  const frozen = useZarnitsa((s) => s.state.party[cid]?.frozen ?? false);
  const gone = useZarnitsa((s) => s.state.party[cid]?.gone ?? false);
  const spot = CAMP_SPOTS[cid];
  const bot = useRef<BotState>({ mode: "idle", wait: 2.5, tx: spot[0], tz: spot[1], seed: spot[0] * 7 + 3 });

  const nameplate = useMemo(() => labelSprite(def.name, def.title, 1.05), [def]);

  useFrame(({ clock }, dtRaw) => {
    const g = group.current;
    if (!g) return;
    const dt = Math.min(dtRaw, 0.05);
    const t = clock.getElapsedTime();
    const b = bot.current;

    // живая позиция для Player/Minimap
    const live = (companionLive[cid] ??= { x: spot[0], z: spot[1] });
    live.x = spot[0] + g.position.x;
    live.z = spot[1] + g.position.z;

    // поведение: бродит, если не заморожен Правом слова
    let walking = false;
    if (!frozen) {
      if (b.mode === "idle") {
        b.wait -= dt;
        if (b.wait <= 0) {
          b.seed += 1;
          [b.tx, b.tz] = pickWaypoint(spot, level >= 4, b.seed);
          b.mode = "walk";
        }
      } else {
        const dx = b.tx - g.position.x;
        const dz = b.tz - g.position.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.14) {
          b.mode = "idle";
          b.wait = 3.5 + Math.random() * 6;
        } else {
          const step = Math.min(d, WALK_SPEED * dt);
          g.position.x += (dx / d) * step;
          g.position.z += (dz / d) * step;
          // смотрит по ходу движения
          const want = Math.atan2(dx, dz);
          g.rotation.y += shortAngle(want - g.rotation.y) * Math.min(1, dt * 6);
          walking = true;
        }
      }
    }

    // покачивание: дыхание стоя, лёгкий шаг на ходу
    g.position.y = walking
      ? Math.abs(Math.sin(t * 7)) * 0.05
      : Math.sin(t * 1.6 + spot[0] * 3) * 0.035;

    // поворот к игроку, когда тот рядом и бот стоит:
    // враждебный — спиной, обычный — лицом; иначе — по поведению выше
    if (!walking) {
      const pp = playerPos();
      const px = spot[0] + g.position.x;
      const pz = spot[1] + g.position.z;
      const near = Math.hypot(pp.x - px, pp.z - pz) < 6;
      if (near) {
        const want = level >= 4
          ? Math.atan2(px - pp.x, pz - pp.z) // отвернулся
          : Math.atan2(pp.x - px, pp.z - pz);
        g.rotation.y += shortAngle(want - g.rotation.y) * 0.06;
      } else if (b.mode === "idle" && !frozen) {
        const want = Math.atan2(-px, -pz); // к костру
        g.rotation.y += shortAngle(want - g.rotation.y) * 0.02;
      }
    }

    // сфера ступени
    if (orb.current) {
      const mat = orb.current.material as THREE.MeshStandardMaterial;
      mat.color.set(frozen ? "#c9a227" : LEVEL_COLOR[level] ?? "#7da87b");
      mat.emissive.set(frozen ? "#c9a227" : LEVEL_COLOR[level] ?? "#7da87b");
      const pulse = frozen ? 1 + Math.sin(t * 5) * 0.25 : 1 + Math.sin(t * 2 + spot[1]) * 0.08;
      orb.current.scale.setScalar(pulse);
      mat.emissiveIntensity = frozen ? 2.2 : 1.1;
    }
  });

  if (gone) return null;

  return (
    <group position={[spot[0], 0, spot[1]]}>
      <group ref={group}>
        {/* плащ */}
        <mesh position={[0, 0.6, 0]}>
          <coneGeometry args={[0.4, 1.2, 8]} />
          <meshStandardMaterial color={CLOAK[cid]} roughness={1} />
        </mesh>
        {/* голова */}
        <mesh position={[0, 1.32, 0]}>
          <sphereGeometry args={[0.16, 12, 12]} />
          <meshStandardMaterial color="#c2a184" roughness={0.9} />
        </mesh>
        {/* капюшон */}
        <mesh position={[0, 1.41, -0.04]}>
          <coneGeometry args={[0.21, 0.32, 8]} />
          <meshStandardMaterial color="#2b2430" roughness={1} />
        </mesh>
      </group>
      {/* тень */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.45, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.32} depthWrite={false} />
      </mesh>
      {/* сфера ступени над головой */}
      <mesh ref={orb} position={[0, 2.0, 0]}>
        <octahedronGeometry args={[0.09, 0]} />
        <meshStandardMaterial color="#7da87b" emissive="#7da87b" emissiveIntensity={1.1} />
      </mesh>
      {/* табличка имени */}
      <primitive object={nameplate} position={[0, 2.55, 0]} />
    </group>
  );
}

function shortAngle(a: number): number {
  let d = a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function Companions() {
  return (
    <group>
      {COMPANIONS.map((c) => (
        <Figure key={c.id} cid={c.id} />
      ))}
    </group>
  );
}
