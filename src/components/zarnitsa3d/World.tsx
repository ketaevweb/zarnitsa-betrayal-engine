"use client";

/* Статичный мир: поляна, лагерь, костёр, Столп присяги, лес, луна */

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Sparks } from "./Particles";
import { CAMP_SPOTS, PILLAR_POS, SCENE_EVENTS } from "@/lib/zarnitsa/scenario3d";

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

/* ---------------- костёр ---------------- */

function Fire() {
  const light = useRef<THREE.PointLight>(null);
  const flameA = useRef<THREE.Mesh>(null);
  const flameB = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (light.current) {
      light.current.intensity = 26 + Math.sin(t * 9.3) * 4 + Math.sin(t * 23.7) * 2.5;
    }
    if (flameA.current) {
      const s = 1 + Math.sin(t * 11) * 0.12;
      flameA.current.scale.set(s, 1 + Math.sin(t * 7.7) * 0.2, s);
      flameA.current.rotation.y = t * 1.4;
    }
    if (flameB.current) {
      const s = 1 + Math.sin(t * 8.1 + 2) * 0.15;
      flameB.current.scale.set(s, 1 + Math.sin(t * 9.9) * 0.25, s);
      flameB.current.rotation.y = -t * 1.1;
    }
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
      {/* пламя */}
      <mesh ref={flameA} position={[0, 0.75, 0]}>
        <coneGeometry args={[0.34, 1.1, 7]} />
        <meshBasicMaterial color="#ff7a26" transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={flameB} position={[0.05, 0.55, 0.03]}>
        <coneGeometry args={[0.2, 0.7, 6]} />
        <meshBasicMaterial color="#ffd27a" transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
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
  useFrame(({ clock }) => {
    if (ring.current) {
      const m = ring.current.material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = 0.75 + Math.sin(clock.getElapsedTime() * 1.6) * 0.3;
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
  return (
    <group>
      {/* свет */}
      <ambientLight intensity={0.62} color="#46405e" />
      <hemisphereLight intensity={0.42} color="#322c4a" groundColor="#14111c" />
      <directionalLight position={[30, 38, -22]} intensity={0.8} color="#9db0d4" />

      {/* луна */}
      <mesh position={[-44, 36, -64]}>
        <sphereGeometry args={[3.6, 24, 24]} />
        <meshBasicMaterial color="#e6e2d4" />
      </mesh>
      <mesh position={[-44, 36, -64]}>
        <sphereGeometry args={[5.4, 24, 24]} />
        <meshBasicMaterial color="#8d94b8" transparent opacity={0.16} depthWrite={false} />
      </mesh>

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
      <Tents />
      <Pillar />
      <Forest />
      <Scatter />
    </group>
  );
}
