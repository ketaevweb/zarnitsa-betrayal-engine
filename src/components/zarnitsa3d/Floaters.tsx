"use client";

/* Всплывающие Δ доверия над головами спутников (M0.7 «Живая ночь») */

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { deltaSprite } from "@/lib/zarnitsa/sprites";
import { CAMP_SPOTS } from "@/lib/zarnitsa/scenario3d";
import { useZarnitsa, type Floater as FloaterT } from "@/lib/zarnitsa/store";

const LIFE = 2000; // мс живёт число

function FloaterItem({ f }: { f: FloaterT }) {
  const sprite = useMemo(() => deltaSprite(f.delta), [f.delta]);
  const ref = useRef<THREE.Sprite>(null);
  const born = useRef(performance.now());
  const seed = useMemo(() => ((f.id * 137) % 5) - 2, [f.id]); // −2..2 лёгкий сдвиг
  const spot = CAMP_SPOTS[f.cid];

  useFrame(() => {
    const s = ref.current;
    if (!s) return;
    const age = (performance.now() - born.current) / LIFE;
    if (age >= 1) return;
    s.position.y = 2.28 + age * 1.15;
    const mat = s.material as THREE.SpriteMaterial;
    mat.opacity = age < 0.45 ? Math.min(1, age / 0.12) : Math.max(0, 1 - (age - 0.45) / 0.55);
    const pulse = 1 + Math.max(0, 0.25 - age) * 1.6; // лёгкий «выход» числа
    s.scale.set(1.15 * pulse, 0.5 * pulse, 1);
  });

  if (!spot) return null;
  return <primitive ref={ref} object={sprite} position={[spot[0] + seed * 0.14, 2.28, spot[1]]} />;
}

export function Floaters() {
  const floaters = useZarnitsa((s) => s.floaters);
  return (
    <group>
      {floaters.map((f) => (
        <FloaterItem key={f.id} f={f} />
      ))}
    </group>
  );
}
