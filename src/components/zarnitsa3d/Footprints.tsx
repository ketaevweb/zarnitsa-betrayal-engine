"use client";

/* Следы на снегу за игроком: кольцевой буфер из campLife, тают со временем */

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { footprints } from "./campLife";

const COUNT = 26;
const LIFETIME = 14000;

export function Footprints() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const geo = useMemo(() => {
    const g = new THREE.CircleGeometry(0.15, 8);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);

  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    const now = performance.now();
    for (let i = 0; i < COUNT; i++) {
      const fp = footprints[footprints.length - COUNT + i];
      if (!fp || now - fp.t > LIFETIME) {
        dummy.position.set(0, -10, 0);
        dummy.scale.setScalar(0.001);
        dummy.rotation.set(0, 0, 0);
      } else {
        const age = (now - fp.t) / LIFETIME;
        const s = 1 - age * 0.8; // снег затягивает след
        dummy.position.set(fp.x, 0.03, fp.z);
        dummy.rotation.set(0, fp.a, 0);
        dummy.scale.set(s * 0.8, 1, s * 1.3);
      }
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[geo, undefined, COUNT]} frustumCulled={false}>
      <meshBasicMaterial color="#0c0a14" transparent opacity={0.5} depthWrite={false} />
    </instancedMesh>
  );
}
