"use client";

/* Корень 3D-игры: канвас + HUD */

import dynamic from "next/dynamic";
import { Hud } from "./Hud";

const GameCanvas = dynamic(() => import("./GameCanvas"), { ssr: false });

export default function Game3D() {
  return (
    <div className="z-root relative h-screen w-full overflow-hidden">
      <GameCanvas />
      <Hud />
    </div>
  );
}
