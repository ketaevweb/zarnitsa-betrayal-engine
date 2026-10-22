"use client";

/* R3F-канвас: сцена, туман, звёзды, клавиатура, подступающая Мгла */

import { useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import * as THREE from "three";
import { World } from "./World";
import { Player, keys, playerPos } from "./Player";
import { Companions } from "./Companions";
import { Markers } from "./Markers";
import { Snow } from "./Particles";
import { Floaters } from "./Floaters";
import { useZarnitsa } from "@/lib/zarnitsa/store";
import { CAMP_SPOTS, SCENE_EVENTS } from "@/lib/zarnitsa/scenario3d";

/** туман сжимается с каждой ночью — Мгла подступает */
const FOG_BY_NIGHT: Record<number, { near: number; far: number }> = {
  1: { near: 16, far: 62 },
  2: { near: 14, far: 52 },
  3: { near: 12, far: 42 },
};

function FogNight() {
  const scene = useThree((s) => s.scene);
  const fog = useRef<THREE.Fog | null>(null);
  useFrame((_, dt) => {
    if (!fog.current) {
      fog.current = (scene.fog as THREE.Fog) ?? null;
    }
    const f = fog.current;
    if (!f) return;
    const target = FOG_BY_NIGHT[useZarnitsa.getState().night] ?? FOG_BY_NIGHT[1];
    const k = 1 - Math.exp(-dt * 0.9);
    f.near += (target.near - f.near) * k;
    f.far += (target.far - f.far) * k;
  });
  return null;
}

export default function GameCanvas() {
  useEffect(() => {
    // dev-параметр: /?tp=e13 — телепорт к маркеру, /?tp=gavrila — к спутнику
    const tp = new URLSearchParams(window.location.search).get("tp");
    if (tp) {
      const ev = SCENE_EVENTS.find((e) => e.id === tp);
      const spot = CAMP_SPOTS[tp];
      const p = playerPos();
      if (ev) p.set(ev.pos[0] + 1.4, 0, ev.pos[1] + 1.4);
      else if (spot) p.set(spot[0] + 1.3, 0, spot[1] + 1.3);
    }
    // ?tour=1 — режим экскурсии (авто-ход к маркерам)
    if (new URLSearchParams(window.location.search).has("tour")) {
      useZarnitsa.setState({ tour: true });
    }

    const down = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
        e.preventDefault();
      }
      if (e.repeat) return;
      keys.add(e.code);
      if (e.code === "KeyE") {
        useZarnitsa.getState().interact();
      }
      if (e.code === "KeyM") {
        useZarnitsa.getState().toggleMap();
      }
    };
    const up = (e: KeyboardEvent) => keys.delete(e.code);
    const blur = () => keys.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ fov: 55, position: [0, 16, 20], near: 0.1, far: 240 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMappingExposure = 1.5;
      }}
    >
      <color attach="background" args={["#0a0812"]} />
      <fog attach="fog" args={["#0a0812", 16, 62]} />
      <Stars radius={150} depth={40} count={2600} factor={4} saturation={0} fade speed={0.6} />
      <World />
      <Player />
      <Companions />
      <Markers />
      <Floaters />
      <Snow />
      <FogNight />
    </Canvas>
  );
}
