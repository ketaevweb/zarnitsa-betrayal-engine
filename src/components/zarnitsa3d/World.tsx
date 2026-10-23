"use client";

/* Статичный мир: поляна, лагерь, костёр, Столп присяги, лес, луна
 * M0.8: костёр живёт от топлива (пламя/свет/дым), поленницы,
 * дозорные Мглы на опушке — каждая ночь ближе. Свет вынесен в
 * SkyLight (GameCanvas) для палитры ночей. */

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Sparks } from "./Particles";
import { CAMP_SPOTS, FINALE_EVENT_ID, PILLAR_POS, SCENE_EVENTS } from "@/lib/zarnitsa/scenario3d";
import { WOOD_PILES, WATCHER_ANGLES, dreadLevel, watcherTargetR } from "@/lib/zarnitsa/camp3d";
import { Crow } from "./Crow";
import { useZarnitsa } from "@/lib/zarnitsa/store";

/* детерминированный рандом — лес одинаков между перезагрузками */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------------- костёр (живой) ---------------- */

function Fire() {
  const light = useRef<THREE.PointLight>(null);
  const flameA = useRef<THREE.Mesh>(null);
  const flameB = useRef<THREE.Mesh>(null);
  const smokeRefs = useRef<(THREE.Mesh | null)[]>([]);
  const smokeSeeds = useMemo(() => [0, 1, 2, 3], []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const { fire } = useZarnitsa.getState();
    const k = fire.fuel / 100; // 0..1
    const feedFlash = performance.now() - fire.fedAt < 450 ? 1.4 : 1;

    if (light.current) {
      // мёртвый костёр — только угли
      const base = 4 + 26 * k;
      light.current.intensity = base * feedFlash + Math.sin(t * 9.3) * 2.4 * (0.3 + k) + Math.sin(t * 23.7) * 1.6 * (0.3 + k);
      light.current.distance = 8 + 20 * k;
    }
    if (flameA.current) {
      const s = (0.42 + 0.62 * k) * feedFlash;
      flameA.current.scale.set(s, s * (1 + Math.sin(t * 7.7) * 0.2), s);
      flameA.current.rotation.y = t * 1.4;
      (flameA.current.material as THREE.MeshBasicMaterial).opacity = 0.25 + 0.6 * k;
    }
    if (flameB.current) {
      const s = (0.4 + 0.66 * k) * feedFlash;
      flameB.current.scale.set(s, s * (1 + Math.sin(t * 9.9) * 0.25), s);
      flameB.current.rotation.y = -t * 1.1;
      (flameB.current.material as THREE.MeshBasicMaterial).opacity = 0.2 + 0.65 * k;
    }
    // дым: слабый огонь — мало дыма
    smokeRefs.current.forEach((m, i) => {
      if (!m) return;
      const seed = smokeSeeds[i];
      const cycle = (t * 0.55 + seed * 0.31) % 1;
      const y = 1.2 + cycle * 6.2;
      m.position.set(Math.sin(cycle * 5 + seed * 2) * 0.5 + Math.sin(t * 0.7 + seed) * 0.25, y, Math.cos(cycle * 4 + seed) * 0.4);
      const s = 0.3 + cycle * 0.9;
      m.scale.setScalar(s * (0.35 + k * 0.65));
      (m.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - cycle) * 0.16 * (0.3 + k));
      m.visible = k > 0.03;
    });
  });

  const stones = useMemo(() => {
    const rng = mulberry32(77);
    return Array.from({ length: 9 }, (_, i) => {
      const a = (i / 9) * Math.PI * 2 + rng() * 0.4;
      const r = 1.15 + rng() * 0.25;
      return [Math.cos(a) * r, 0.08, Math.sin(a) * r, rng() * Math.PI] as const;
    });
  }, []);

  return (
    <group position={[0, 0, 0]}>
      <pointLight ref={light} color="#ff9a3c" intensity={30} distance={26} decay={1.6} position={[0, 1.4, 0]} />
      {/* поленья */}
      <mesh position={[0, 0.14, 0]} rotation={[0, 0.4, Math.PI / 2.6]}>
        <cylinderGeometry args={[0.09, 0.11, 1.5, 6]} />
        <meshStandardMaterial color="#3a2a1e" roughness={1} />
      </mesh>
      <mesh position={[0, 0.16, 0]} rotation={[0, -1.2, Math.PI / 2.5]}>
        <cylinderGeometry args={[0.08, 0.1, 1.4, 6]} />
        <meshStandardMaterial color="#33241a" roughness={1} />
      </mesh>
      <mesh position={[0, 0.18, 0]} rotation={[0, 2.2, Math.PI / 2.9]}>
        <cylinderGeometry args={[0.07, 0.09, 1.3, 6]} />
        <meshStandardMaterial color="#2c1f16" roughness={1} />
      </mesh>
      {/* угли: светятся всегда, даже когда пламя умерло */}
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.55, 12]} />
        <meshBasicMaterial color="#8c2f14" transparent opacity={0.75} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {/* пламя */}
      <mesh ref={flameA} position={[0, 0.75, 0]}>
        <coneGeometry args={[0.34, 1.1, 7]} />
        <meshBasicMaterial color="#ff7a26" transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={flameB} position={[0.05, 0.55, 0.03]}>
        <coneGeometry args={[0.2, 0.7, 6]} />
        <meshBasicMaterial color="#ffd27a" transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {/* дым */}
      {smokeSeeds.map((i) => (
        <mesh key={i} ref={(m) => { smokeRefs.current[i] = m; }} position={[0, 2, 0]}>
          <sphereGeometry args={[0.32, 8, 8]} />
          <meshBasicMaterial color="#3a3644" transparent opacity={0.12} depthWrite={false} />
        </mesh>
      ))}
      {/* камни */}
      {stones.map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[r, r * 2, r]} scale={0.8 + (i % 3) * 0.15}>
          <dodecahedronGeometry args={[0.22, 0]} />
          <meshStandardMaterial color="#3d3a44" roughness={1} />
        </mesh>
      ))}
      <Sparks />
    </group>
  );
}

/* ---------------- поленницы ---------------- */

function Woodpiles() {
  const piles = useZarnitsa((s) => s.fire.piles);
  return (
    <group>
      {WOOD_PILES.map((p) => {
        const left = piles[p.id] ?? 0;
        return (
          <group key={p.id} position={[p.x, 0, p.z]} rotation={[0, (p.x * 13 + p.z * 7) % Math.PI, 0]}>
            {/* помост */}
            <mesh position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.85, 10]} />
              <meshStandardMaterial color="#241f2b" roughness={1} />
            </mesh>
            {/* поленья: до 3 */}
            {left >= 1 && (
              <mesh position={[-0.16, 0.16, 0]} rotation={[0, 0.2, Math.PI / 2]}>
                <cylinderGeometry args={[0.09, 0.09, 0.9, 6]} />
                <meshStandardMaterial color="#4a3524" roughness={1} />
              </mesh>
            )}
            {left >= 2 && (
              <mesh position={[0.18, 0.16, 0.08]} rotation={[0, -0.3, Math.PI / 2]}>
                <cylinderGeometry args={[0.09, 0.09, 0.9, 6]} />
                <meshStandardMaterial color="#42301f" roughness={1} />
              </mesh>
            )}
            {left >= 3 && (
              <mesh position={[0.01, 0.31, -0.02]} rotation={[0, 0.9, Math.PI / 2]}>
                <cylinderGeometry args={[0.08, 0.08, 0.85, 6]} />
                <meshStandardMaterial color="#52402c" roughness={1} />
              </mesh>
            )}
            {/* слабое кольцо, чтобы штабель было видно издалека */}
            {left > 0 && (
              <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.95, 0.028, 6, 28]} />
                <meshStandardMaterial color="#8a8494" emissive="#6a6476" emissiveIntensity={0.35} roughness={0.7} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

/* ---------------- дозорные Мглы ---------------- */

function Watcher({ angle, idx }: { angle: number; idx: number }) {
  const group = useRef<THREE.Group>(null);
  const eyeL = useRef<THREE.Mesh>(null);
  const eyeR = useRef<THREE.Mesh>(null);
  const night = useZarnitsa((s) => s.night);
  const scale = 0.85 + ((idx * 37) % 5) * 0.09;

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.getElapsedTime();
    // живое кольцо: ночь + подступ по топливу + свой «зыбкий» шаг у фигуры (M0.9)
    const zs = useZarnitsa.getState();
    const fuel = zs.fire.fuel;
    const dl = dreadLevel(fuel);
    // развязка (M1.4): Мгла прижата к Столпу — дозорные смотрят сцену изплотную
    const finaleNow = zs.screen === "event" && zs.activeEvent?.id === FINALE_EVENT_ID;
    const baseR = finaleNow ? 7.4 : watcherTargetR(night, fuel);
    const targetR = baseR - 0.7 - Math.sin(t * 0.23 + idx * 2.1) * 0.7;
    const curR = Math.hypot(g.position.x, g.position.z);
    const rate = finaleNow ? 0.16 : fuel <= 0 ? 0.032 : 0.015;
    const nextR = curR + (targetR - curR) * Math.min(1, rate);
    const dir = Math.atan2(g.position.z, g.position.x) || angle;
    g.position.x = Math.cos(dir) * nextR;
    g.position.z = Math.sin(dir) * nextR;
    // качание и дыхание — злее при подступе
    g.position.y = Math.sin(t * (0.8 + dl * 0.9) + idx * 1.7) * (0.12 + dl * 0.1);
    g.rotation.y = dir + Math.PI + Math.sin(t * (0.5 + dl * 0.8) + idx) * 0.12;
    // глаза: пульс, наливаются кровью при подступе
    const glow = (1.6 + Math.sin(t * 1.9 + idx * 2.3) * 0.9) * (1 + dl * 1.3);
    for (const e of [eyeL.current, eyeR.current]) {
      if (e) (e.material as THREE.MeshStandardMaterial).emissiveIntensity = glow;
    }
  });

  return (
    <group ref={group} position={[Math.cos(angle) * 40, 0, Math.sin(angle) * 40]} scale={scale}>
      {/* фигура-саван */}
      <mesh position={[0, 1.25, 0]}>
        <coneGeometry args={[0.55, 2.5, 7]} />
        <meshStandardMaterial color="#0e0a14" roughness={1} />
      </mesh>
      <mesh position={[0, 2.62, 0.06]}>
        <sphereGeometry args={[0.2, 10, 10]} />
        <meshStandardMaterial color="#120d18" roughness={1} />
      </mesh>
      {/* глаза */}
      <mesh ref={eyeL} position={[-0.07, 2.66, 0.2]}>
        <sphereGeometry args={[0.032, 6, 6]} />
        <meshStandardMaterial color="#1a0508" emissive="#c22a3a" emissiveIntensity={1.8} />
      </mesh>
      <mesh ref={eyeR} position={[0.07, 2.66, 0.2]}>
        <sphereGeometry args={[0.032, 6, 6]} />
        <meshStandardMaterial color="#1a0508" emissive="#c22a3a" emissiveIntensity={1.8} />
      </mesh>
    </group>
  );
}

function Watchers() {
  const screen = useZarnitsa((s) => s.screen);
  // днём (утренний обход) Мгла отступает до сумерек
  if (screen === "title" || screen === "camp") return null;
  return (
    <group>
      {WATCHER_ANGLES.map((a, i) => (
        <Watcher key={i} angle={a} idx={i} />
      ))}
    </group>
  );
}

/* ---------------- шатры, обоз, ящики ---------------- */

function Tents() {
  const tents: { pos: [number, number]; rot: number; color: string }[] = [
    { pos: [6.8, 2.2], rot: -2.2, color: "#2a2331" },
    { pos: [-6.9, 3.6], rot: 2.4, color: "#262028" },
    { pos: [4.9, -6.2], rot: -0.7, color: "#2e2430" },
  ];
  return (
    <group>
      {tents.map((t, i) => (
        <group key={i} position={[t.pos[0], 0, t.pos[1]]} rotation={[0, t.rot, 0]}>
          <mesh position={[0, 1.05, 0]}>
            <coneGeometry args={[1.75, 2.1, 5]} />
            <meshStandardMaterial color={t.color} roughness={1} />
          </mesh>
          <mesh position={[0, 2.16, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.5, 4]} />
            <meshStandardMaterial color="#4a3b2c" roughness={1} />
          </mesh>
        </group>
      ))}
      {/* ящики Ходаты */}
      <mesh position={[5.4, 0.32, 4.4]} rotation={[0, 0.5, 0]}>
        <boxGeometry args={[0.9, 0.62, 0.62]} />
        <meshStandardMaterial color="#4a3a26" roughness={1} />
      </mesh>
      <mesh position={[6.1, 0.26, 3.7]} rotation={[0, -0.3, 0]}>
        <boxGeometry args={[0.7, 0.5, 0.55]} />
        <meshStandardMaterial color="#3f3122" roughness={1} />
      </mesh>
      {/* обоз Милуты */}
      <group position={[-7.6, 0, -3.2]} rotation={[0, 0.9, 0]}>
        <mesh position={[0, 0.85, 0]}>
          <boxGeometry args={[2.4, 1.0, 1.15]} />
          <meshStandardMaterial color="#3b2f26" roughness={1} />
        </mesh>
        <mesh position={[0, 1.42, -0.35]} rotation={[0.18, 0, 0]}>
          <boxGeometry args={[2.2, 0.75, 0.06]} />
          <meshStandardMaterial color="#2e241d" roughness={1} />
        </mesh>
        {[-1.0, 1.0].map((x) => (
          <mesh key={x} position={[x, 0.42, 0.62]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.42, 0.42, 0.09, 10]} />
            <meshStandardMaterial color="#241c15" roughness={1} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* ---------------- Столп присяги ---------------- */

function Pillar() {
  const ring = useRef<THREE.Mesh>(null);
  const flame = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ring.current) {
      const m = ring.current.material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = 0.75 + Math.sin(clock.getElapsedTime() * 1.6) * 0.3;
    }
    // ритуальный огонь на Столпе горит, только когда костёр жив
    if (flame.current) {
      const k = useZarnitsa.getState().fire.fuel / 100;
      flame.current.visible = k >= 0.4;
      const s = 0.7 + Math.sin(clock.getElapsedTime() * 5) * 0.1;
      flame.current.scale.set(s, s * 1.3, s);
    }
  });
  return (
    <group position={[PILLAR_POS[0], 0, PILLAR_POS[1]]}>
      <mesh position={[0, 2.1, 0]}>
        <cylinderGeometry args={[0.62, 0.78, 4.2, 8]} />
        <meshStandardMaterial color="#37313f" roughness={0.95} />
      </mesh>
      <mesh position={[0, 4.32, 0]}>
        <cylinderGeometry args={[0.85, 0.68, 0.32, 8]} />
        <meshStandardMaterial color="#413a4a" roughness={0.9} />
      </mesh>
      <mesh ref={ring} position={[0, 3.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.66, 0.05, 8, 32]} />
        <meshStandardMaterial color="#c9a227" emissive="#c9a227" emissiveIntensity={0.8} roughness={0.4} />
      </mesh>
      {/* ритуальная чаша: пламя обряда */}
      <mesh position={[0, 4.62, 0]}>
        <cylinderGeometry args={[0.3, 0.18, 0.22, 8]} />
        <meshStandardMaterial color="#2a2430" roughness={1} />
      </mesh>
      <mesh ref={flame} position={[0, 4.95, 0]} visible={false}>
        <coneGeometry args={[0.2, 0.55, 6]} />
        <meshBasicMaterial color="#ffd27a" transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <pointLight color="#c9a227" intensity={7} distance={10} decay={1.8} position={[0, 3.4, 0]} />
      {/* плита-ступень */}
      <mesh position={[0, 0.09, 0]}>
        <cylinderGeometry args={[1.5, 1.7, 0.18, 10]} />
        <meshStandardMaterial color="#2c2733" roughness={1} />
      </mesh>
    </group>
  );
}

/* ---------------- лес и мелкие детали ---------------- */

function Forest() {
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const foliageRef = useRef<THREE.InstancedMesh>(null);
  const foliageRef2 = useRef<THREE.InstancedMesh>(null);
  const COUNT = 130;

  useLayoutOnce(() => {
    const rng = mulberry32(1234);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < COUNT; i++) {
      const a = rng() * Math.PI * 2;
      const r = 42 + rng() * 30;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const s = 0.8 + rng() * 1.5;
      dummy.position.set(x, 1.3 * s, z);
      dummy.scale.setScalar(s);
      dummy.rotation.y = rng() * Math.PI;
      dummy.updateMatrix();
      trunkRef.current?.setMatrixAt(i, dummy.matrix);
      dummy.position.set(x, (2.4 + 1.6) * s * 0.9, z);
      dummy.updateMatrix();
      foliageRef.current?.setMatrixAt(i, dummy.matrix);
      dummy.position.set(x, (2.4 + 3.1) * s * 0.9, z);
      dummy.scale.setScalar(s * 0.72);
      dummy.updateMatrix();
      foliageRef2.current?.setMatrixAt(i, dummy.matrix);
    }
    if (trunkRef.current) trunkRef.current.instanceMatrix.needsUpdate = true;
    if (foliageRef.current) foliageRef.current.instanceMatrix.needsUpdate = true;
    if (foliageRef2.current) foliageRef2.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={trunkRef} args={[undefined, undefined, COUNT]} frustumCulled={false}>
        <cylinderGeometry args={[0.22, 0.34, 2.6, 5]} />
        <meshStandardMaterial color="#2e2531" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={foliageRef} args={[undefined, undefined, COUNT]} frustumCulled={false}>
        <coneGeometry args={[1.5, 4.2, 6]} />
        <meshStandardMaterial color="#1e3025" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={foliageRef2} args={[undefined, undefined, COUNT]} frustumCulled={false}>
        <coneGeometry args={[1.1, 3.2, 6]} />
        <meshStandardMaterial color="#24392b" roughness={1} />
      </instancedMesh>
    </group>
  );
}

function useLayoutOnce(fn: () => void) {
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    fn();
  });
}

function Scatter() {
  const rockRef = useRef<THREE.InstancedMesh>(null);
  const grassRef = useRef<THREE.InstancedMesh>(null);
  const ROCKS = 46;
  const GRASS = 130;

  useLayoutOnce(() => {
    const rng = mulberry32(555);
    const dummy = new THREE.Object3D();
    const blocked: [number, number, number][] = [
      [0, 0, 2.6],
      ...Object.values(CAMP_SPOTS).map((p) => [p[0], p[1], 1.4] as [number, number, number]),
      ...SCENE_EVENTS.map((e) => [e.pos[0], e.pos[1], 1.6] as [number, number, number]),
      [PILLAR_POS[0], PILLAR_POS[1], 2.4],
      ...WOOD_PILES.map((p) => [p.x, p.z, 1.3] as [number, number, number]),
    ];
    const free = (x: number, z: number) =>
      blocked.every(([bx, bz, br]) => (x - bx) ** 2 + (z - bz) ** 2 > br * br);

    let placed = 0;
    let guard = 0;
    while (placed < ROCKS && guard++ < 500) {
      const a = rng() * Math.PI * 2;
      const r = 5 + rng() * 33;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (!free(x, z)) continue;
      dummy.position.set(x, 0.1, z);
      dummy.scale.setScalar(0.35 + rng() * 0.85);
      dummy.rotation.set(rng() * 3, rng() * 3, rng() * 3);
      dummy.updateMatrix();
      rockRef.current?.setMatrixAt(placed, dummy.matrix);
      placed++;
    }
    if (rockRef.current) rockRef.current.instanceMatrix.needsUpdate = true;

    placed = 0;
    guard = 0;
    while (placed < GRASS && guard++ < 900) {
      const a = rng() * Math.PI * 2;
      const r = 3.5 + rng() * 35;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (!free(x, z)) continue;
      dummy.position.set(x, 0.16, z);
      dummy.scale.set(0.5 + rng() * 0.7, 0.7 + rng() * 1.1, 0.5 + rng() * 0.7);
      dummy.rotation.set(0, rng() * Math.PI, 0);
      dummy.updateMatrix();
      grassRef.current?.setMatrixAt(placed, dummy.matrix);
      placed++;
    }
    if (grassRef.current) grassRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={rockRef} args={[undefined, undefined, ROCKS]} frustumCulled={false}>
        <dodecahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial color="#34303c" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={grassRef} args={[undefined, undefined, GRASS]} frustumCulled={false}>
        <coneGeometry args={[0.16, 0.5, 4]} />
        <meshStandardMaterial color="#1c2a1e" roughness={1} />
      </instancedMesh>
    </group>
  );
}

/* ---------------- сборка мира ---------------- */

export function World() {
  const isDay = useZarnitsa((s) => s.screen) === "camp";
  return (
    <group>
      {/* луна — днём за тучами */}
      {!isDay && (
        <>
          <mesh position={[-44, 36, -64]}>
            <sphereGeometry args={[3.6, 24, 24]} />
            <meshBasicMaterial color="#e6e2d4" />
          </mesh>
          <mesh position={[-44, 36, -64]}>
            <sphereGeometry args={[5.4, 24, 24]} />
            <meshBasicMaterial color="#8d94b8" transparent opacity={0.16} depthWrite={false} />
          </mesh>
        </>
      )}

      {/* земля */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <circleGeometry args={[76, 48]} />
        <meshStandardMaterial color="#1c1826" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <circleGeometry args={[15, 36]} />
        <meshStandardMaterial color="#262130" roughness={1} />
      </mesh>

      <Fire />
      <Woodpiles />
      <Watchers />
      <Tents />
      <Pillar />
      <Forest />
      <Scatter />
      <Crow />
    </group>
  );
}
