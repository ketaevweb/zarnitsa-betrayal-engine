"use client";

/* R3F-канвас: сцена, палитра ночей/рассвета, клавиатура, следы (M0.8) */

import { useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import * as THREE from "three";
import { World } from "./World";
import { Player, keys, playerPos } from "./Player";
import { Companions } from "./Companions";
import { companionLive } from "./campLife";
import { Markers } from "./Markers";
import { Snow } from "./Particles";
import { Floaters } from "./Floaters";
import { Footprints } from "./Footprints";
import { useZarnitsa } from "@/lib/zarnitsa/store";
import { CAMP_SPOTS, SCENE_EVENTS } from "@/lib/zarnitsa/scenario3d";
import { DAWN_PALETTE, DAY_PALETTE, NIGHT_PALETTES, WOOD_PILES, type Palette } from "@/lib/zarnitsa/camp3d";

const C_A = new THREE.Color();
const C_B = new THREE.Color();

/** свет и туман: плавный лерп палитры ночи (+жар костра отодвигает Мглу),
 *  на экране рассвета мир на минуту теплеет */
function SkyLight() {
  const scene = useThree((s) => s.scene);
  const amb = useRef<THREE.AmbientLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const dir = useRef<THREE.DirectionalLight>(null);
  const fog = useRef<THREE.Fog | null>(null);
  const bgObj = useRef<THREE.Color | null>(null);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    if (!fog.current) fog.current = (scene.fog as THREE.Fog) ?? null;
    // фон сцены — существующий Color из <color attach="background">: мутируем его каналы
    if (!bgObj.current) bgObj.current = (scene.background as THREE.Color) ?? null;
    const { night, screen, fire } = useZarnitsa.getState();
    const pal: Palette =
      screen === "dawn"
        ? DAWN_PALETTE
        : screen === "camp"
          ? DAY_PALETTE
          : (NIGHT_PALETTES[night] ?? NIGHT_PALETTES[1]);
    const k = 1 - Math.exp(-dt * 1.3);
    const heat = fire.fuel / 100;

    if (bgObj.current) bgObj.current.lerp(C_A.set(pal.bg), k);
    if (fog.current) {
      if (bgObj.current) fog.current.color.copy(bgObj.current);
      fog.current.near += (pal.fogNear - heat * 2.2 - fog.current.near) * k;
      fog.current.far += (pal.fogFar + heat * 9 - fog.current.far) * k;
    }
    if (amb.current) {
      amb.current.intensity += (pal.amb.i - amb.current.intensity) * k;
      amb.current.color.lerp(C_B.set(pal.amb.c), k);
    }
    if (hemi.current) {
      hemi.current.intensity += (pal.hemi.i - hemi.current.intensity) * k;
      hemi.current.color.lerp(C_B.set(pal.hemi.c), k);
      hemi.current.groundColor.lerp(C_B.set(pal.hemi.ground), k);
    }
    if (dir.current) {
      dir.current.intensity += (pal.dir.i - dir.current.intensity) * k;
      dir.current.color.lerp(C_B.set(pal.dir.c), k);
    }
  });

  return (
    <>
      <ambientLight ref={amb} intensity={0.62} color="#46405e" />
      <hemisphereLight ref={hemi} intensity={0.42} color="#322c4a" groundColor="#14111c" />
      <directionalLight ref={dir} position={[30, 38, -22]} intensity={0.8} color="#9db0d4" />
    </>
  );
}

export default function GameCanvas() {
  const isDay = useZarnitsa((s) => s.screen) === "camp";

  useEffect(() => {
    // dev-параметр: /?tp=e13 — телепорт к маркеру, /?tp=gavrila — к спутнику,
    // /?tp=w1 — к поленнице (M0.8)
    const tp = new URLSearchParams(window.location.search).get("tp");
    if (tp) {
      const ev = SCENE_EVENTS.find((e) => e.id === tp);
      const spot = CAMP_SPOTS[tp];
      const pile = WOOD_PILES.find((p) => p.id === tp);
      const p = playerPos();
      if (ev) p.set(ev.pos[0] + 1.4, 0, ev.pos[1] + 1.4);
      else if (pile) p.set(pile.x + 1.1, 0, pile.z + 1.1);
      else if (spot) p.set(spot[0] + 1.3, 0, spot[1] + 1.3);
    }
    // ?tour=1 — режим экскурсии (авто-ход к маркерам)
    if (new URLSearchParams(window.location.search).has("tour")) {
      useZarnitsa.setState({ tour: true });
    }

    // dev-хук для автотестов (agent-browser): позиция игрока + стор + события
    (window as unknown as Record<string, unknown>).__zarnitsa = {
      pos: () => ({ x: playerPos().x, z: playerPos().z }),
      tp: (x: number, z: number) => playerPos().set(x, 0, z),
      store: useZarnitsa,
      events: SCENE_EVENTS,
      companions: companionLive,
    };

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
      if (e.code === "KeyJ") {
        useZarnitsa.getState().toggleJournal();
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
      {!isDay && (
        <Stars radius={150} depth={40} count={2600} factor={4} saturation={0} fade speed={0.6} />
      )}
      <SkyLight />
      <World />
      <Player />
      <Companions />
      <Markers />
      <Floaters />
      <Footprints />
      <Snow />
    </Canvas>
  );
}
