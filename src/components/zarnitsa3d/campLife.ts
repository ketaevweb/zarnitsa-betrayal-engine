/* ============================================================
 * ЗАРНИЦА 3D — shared-состояние между 3D-компонентами (вне React):
 * живые позиции спутников, ввод джойстика, следы на снегу.
 * ============================================================ */

/** текущие позиции спутников (обновляет Companions, читает Player/Minimap) */
export const companionLive: Record<string, { x: number; z: number }> = {};

/** вектор тач-джойстика (-1..1, y — «вперёд») */
export const touchInput = { x: 0, y: 0, active: false };

/** след на снегу */
export interface Footprint {
  x: number;
  z: number;
  a: number;
  t: number; // performance.now()
}

/** кольцевой буфер следов (обновляет Player, читает Footprints) */
export const footprints: Footprint[] = [];

export function addFootprint(x: number, z: number, a: number) {
  footprints.push({ x, z, a, t: performance.now() });
  if (footprints.length > 26) footprints.shift();
}
