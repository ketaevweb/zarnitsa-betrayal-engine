"use client";

/* Частицы: снег над лагерем и искры костра */

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function Snow() {
  const ref = useRef<THREE.Points>(null);
  const count = 900;
  const data = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 90;
      pos[i * 3 + 1] = Math.random() * 26;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 90;
      vel[i] = 0.8 + Math.random() * 1.6;
    }
    return { pos, vel };
  }, []);

  useFrame((_, dt) => {
    const pts = ref.current;
    if (!pts) return;
    const arr = pts.geometry.attributes.position.array as Float32Array;
    const t = performance.now() / 1000;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] -= data.vel[i] * dt;
      arr[i * 3] += Math.sin(t * 0.6 + i) * dt * 0.25;
      if (arr[i * 3 + 1] < 0) {
        arr[i * 3 + 1] = 26;
        arr[i * 3] = (Math.random() - 0.5) * 90;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 90;
      }
    }
    pts.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.pos, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#cfd4e8"
        size={0.09}
        transparent
        opacity={0.75}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

export function Sparks() {
  const ref = useRef<THREE.Points>(null);
  const count = 42;
  const data = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 0.5;
      pos[i * 3 + 1] = 0.6 + Math.random() * 0.8;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
      vel[i] = 0.9 + Math.random() * 1.4;
    }
    return { pos, vel };
  }, []);

  useFrame((_, dt) => {
    const pts = ref.current;
    if (!pts) return;
    const arr = pts.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += data.vel[i] * dt;
      arr[i * 3] += Math.sin(performance.now() / 300 + i * 7) * dt * 0.3;
      if (arr[i * 3 + 1] > 3.4) {
        arr[i * 3] = (Math.random() - 0.5) * 0.5;
        arr[i * 3 + 1] = 0.55;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
      }
    }
    pts.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref} position={[0, 0, 0]} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.pos, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#ffb066"
        size={0.07}
        transparent
        opacity={0.9}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
