"use client";

/* Маркеры событий на местности: кольцо, луч света, подпись */

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { availableEvents, useZarnitsa } from "@/lib/zarnitsa/store";
import { labelSprite } from "@/lib/zarnitsa/sprites";

function Marker({
  id,
  x,
  z,
  label,
  accent,
  dim,
  active,
}: {
  id: string;
  x: number;
  z: number;
  label: string;
  accent: string;
  /** бытовое событие: тише и ниже ключевых */
  dim?: boolean;
  active: boolean;
}) {
  const beam = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const sprite = useMemo(() => labelSprite(label, undefined, dim ? 0.78 : 0.95), [label, dim]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (beam.current) {
      const mat = beam.current.material as THREE.MeshBasicMaterial;
      mat.opacity = ((active ? 0.34 : dim ? 0.09 : 0.16) + Math.sin(t * 2.2 + x) * 0.05) * (dim ? 0.7 : 1);
      const s = active ? 1.15 : 1;
      beam.current.scale.set(s, dim ? 0.62 : 1, s);
    }
    if (ring.current) {
      ring.current.rotation.z = t * 0.5;
      const mat = ring.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = (active ? 1.6 : dim ? 0.4 : 0.7) * (dim ? 0.75 : 1);
    }
  });

  return (
    <group position={[x, 0, z]}>
      {/* луч */}
      <mesh ref={beam} position={[0, 1.6, 0]}>
        <cylinderGeometry args={[0.26, 0.34, 3.2, 8, 1, true]} />
        <meshBasicMaterial
          color={accent}
          transparent
          opacity={0.2}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* кольцо на земле */}
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <torusGeometry args={[dim ? 0.68 : 0.85, 0.05, 8, 36]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.8} roughness={0.5} />
      </mesh>
      {/* подпись */}
      <primitive object={sprite} position={[0, 2.9, 0]} />
    </group>
  );
}

export function Markers() {
  const state = useZarnitsa((s) => s.state);
  const night = useZarnitsa((s) => s.night);
  const doneToday = useZarnitsa((s) => s.doneToday);
  const nearest = useZarnitsa((s) => s.nearest);
  const screen = useZarnitsa((s) => s.screen);

  const list = useMemo(
    () => availableEvents(state, night, doneToday),
    [state, night, doneToday],
  );

  if (screen === "title" || screen === "end") return null;

  return (
    <group>
      {list.map((ev) => {
        const accent = ev.ambient
          ? "#7a8aa0"
          : ev.title.startsWith("⸸")
            ? "#d95f3b"
            : ev.gated
              ? "#e8d48a"
              : "#c9a227";
        return (
          <Marker
            key={ev.id}
            id={ev.id}
            x={ev.pos[0]}
            z={ev.pos[1]}
            label={ev.marker}
            accent={accent}
            dim={ev.ambient}
            active={nearest?.kind === "event" && nearest.id === ev.id}
          />
        );
      })}
    </group>
  );
}
