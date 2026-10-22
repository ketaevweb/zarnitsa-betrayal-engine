"use client";

/* Спутники у костра: фигуры, таблички имён, свечение ступени лестницы */

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { COMPANIONS } from "@/lib/zarnitsa/data";
import { CAMP_SPOTS } from "@/lib/zarnitsa/scenario3d";
import { LEVEL_COLOR, useZarnitsa } from "@/lib/zarnitsa/store";
import { labelSprite } from "@/lib/zarnitsa/sprites";
import { playerPos } from "./Player";

const CLOAK: Record<string, string> = {
  gavrila: "#46586b", // сталь
  khodata: "#6b3a30", // бордовый
  miluta: "#3f5a41", // зелёный
  ratmir: "#7a5a2e", // охра
};

function Figure({ cid }: { cid: string }) {
  const def = COMPANIONS.find((c) => c.id === cid)!;
  const group = useRef<THREE.Group>(null);
  const orb = useRef<THREE.Mesh>(null);
  const level = useZarnitsa((s) => s.state.party[cid]?.level ?? 0);
  const frozen = useZarnitsa((s) => s.state.party[cid]?.frozen ?? false);
  const gone = useZarnitsa((s) => s.state.party[cid]?.gone ?? false);
  const spot = CAMP_SPOTS[cid];

  const nameplate = useMemo(() => labelSprite(def.name, def.title, 1.05), [def]);

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.getElapsedTime();
    g.position.y = Math.sin(t * 1.6 + spot[0] * 3) * 0.035;

    // поворот: к игроку, когда близко; иначе — к костру
    const pp = playerPos();
    const near = Math.hypot(pp.x - spot[0], pp.z - spot[1]) < 6;
    const want = near
      ? Math.atan2(pp.x - spot[0], pp.z - spot[1])
      : Math.atan2(-spot[0], -spot[1]);
    const cur = g.rotation.y;
    let diff = want - cur;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    g.rotation.y = cur + diff * 0.06;

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

export function Companions() {
  return (
    <group>
      {COMPANIONS.map((c) => (
        <Figure key={c.id} cid={c.id} />
      ))}
    </group>
  );
}
