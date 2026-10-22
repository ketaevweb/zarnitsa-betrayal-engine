/* ЗАРНИЦА: КЛЯТВА — точка входа.
 * По умолчанию — 3D-версия (поляна, лагерь, Мгла).
 * /?classic=1 — прежний текстовый прототип. */

import ClassicGame from "@/components/zarnitsa/ClassicGame";
import Game3D from "@/components/zarnitsa3d/Game3D";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  if (sp.classic) return <ClassicGame />;
  return <Game3D />;
}
