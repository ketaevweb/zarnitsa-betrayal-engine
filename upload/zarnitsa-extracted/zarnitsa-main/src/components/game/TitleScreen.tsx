'use client';

import Image from 'next/image';

export default function TitleScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* фон */}
      <div className="absolute inset-0">
        <Image
          src="/title.png"
          alt="Ватага у обетного огня против Мглы"
          fill
          priority
          className="object-cover opacity-55"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#131111]/70 via-[#131111]/40 to-[#131111]" />
        <div className="absolute inset-0 zn-mist" />
      </div>

      <div className="relative z-10 text-center px-6 max-w-3xl zn-rise">
        <p className="zn-gold tracking-[0.5em] text-xs md:text-sm mb-6 uppercase">
          Вертикальный срез · Три ночи
        </p>
        <h1 className="zn-display text-7xl md:text-8xl font-semibold tracking-wide text-[#f3e7cf] zn-flicker">
          ЗАРНИЦА
        </h1>
        <hr className="zn-rule my-7" />
        <p className="zn-display text-2xl md:text-3xl italic text-[#c96a5a] leading-snug">
          Обет держит ватагу.
          <br />
          Ватага держит мир.
        </p>
        <p className="mt-6 text-[15px] md:text-base leading-relaxed text-[#cbbda3]">
          Тридцать лет назад люди убили последнего бога. С той ночи из-под земли
          поднимается Мгла. Ты — Обетный атаман: веди ватагу через три ночи.
          Братья помнят каждое твоё решение — и однажды один из них может
          поднять нож. Пространство — пауза, мышь — приказы.
        </p>

        <button
          onClick={onStart}
          className="zn-btn zn-btn-primary mt-10 text-xl px-10 py-3"
        >
          Дать обет
        </button>

        <p className="mt-8 text-xs zn-muted leading-relaxed">
          Прототип по дизайн-документу «ЗАРНИЦА» · сингл-вертикальный срез
          <br />
          бой с обетной паузой · память спутников · лестница разрыва I–V
        </p>
      </div>
    </div>
  );
}
