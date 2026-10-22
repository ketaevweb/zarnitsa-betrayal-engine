/* Текстовые спрайты на canvas — кириллица без внешних шрифтов */

import * as THREE from "three";

const cache = new Map<string, THREE.CanvasTexture>();

export function makeLabelTexture(text: string, sub?: string): THREE.CanvasTexture {
  const key = `${text}|${sub ?? ""}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const w = 512;
  const h = sub ? 176 : 128;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.9)";
  ctx.shadowBlur = 8;

  ctx.fillStyle = "#e8e0d0";
  ctx.font = '600 46px "IBM Plex Sans", system-ui, sans-serif';
  ctx.fillText(text, w / 2, sub ? h / 2 - 26 : h / 2);

  if (sub) {
    ctx.fillStyle = "#b3a88f";
    ctx.font = '400 30px "IBM Plex Sans", system-ui, sans-serif';
    ctx.fillText(sub, w / 2, h / 2 + 36);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 2;
  cache.set(key, tex);
  return tex;
}

export function labelSprite(text: string, sub?: string, scale = 1): THREE.Sprite {
  const tex = makeLabelTexture(text, sub);
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  const aspect = sub ? 512 / 176 : 512 / 128;
  sprite.scale.set(scale * aspect * 0.55, scale * 0.55, 1);
  return sprite;
}
