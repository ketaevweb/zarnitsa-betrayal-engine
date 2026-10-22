/* ============================================================
 * ЗАРНИЦА: КЛЯТВА — аудио-движок (WebAudio, без внешних файлов)
 *
 *   Эмбиент:   треск костра + ветер (шумовые генераторы)
 *   SFX:       клики, открытие событий, ступени доверия (±),
 *              «укол за живое», колокол ночи, рассвет, рог Права
 *              слова, дрон финала, шаги по снегу, сердцебиение
 *
 *   Правила автоплея: контекст создаётся/оживляется только по
 *   жесту пользователя (кнопка «Выйти в ночь», выборы).
 *   Настройка звука сохраняется в localStorage.
 * ============================================================ */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let ambBus: GainNode | null = null;
let sfxBus: GainNode | null = null;
let running = false; // эмбиент играет
let enabled = true; // пользовательский тумблер
let popTimer: ReturnType<typeof setTimeout> | null = null;
let heartTimer: ReturnType<typeof setTimeout> | null = null;
let heartIntensity = 0;
let dread = 0; // Мгла подступает: 0..1 (M0.9)
let windGain: GainNode | null = null;
let fireGain: GainNode | null = null;
let dayMode = false; // дневной микс (M1.2): костёр дремлет, ветер тише, птицы
let birdTimer: ReturnType<typeof setTimeout> | null = null;

const LS_KEY = "zarnitsa3d_audio";

function loadPref(): boolean {
  try {
    return localStorage.getItem(LS_KEY) !== "0";
  } catch {
    return true;
  }
}
function savePref(on: boolean) {
  try {
    localStorage.setItem(LS_KEY, on ? "1" : "0");
  } catch {
    /* приватный режим — молча */
  }
}

/* ---------------- ядро ---------------- */

function noiseBuffer(ac: AudioContext, seconds: number, brown: boolean): AudioBuffer {
  const len = Math.floor(ac.sampleRate * seconds);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  if (brown) {
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.2;
    }
  } else {
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }
  return buf;
}

function buildAmbience() {
  const ac = ctx!;
  // костёр: коричневый шум → lowpass (днём дремлет — тише, M1.2)
  const fire = ac.createBufferSource();
  fire.buffer = noiseBuffer(ac, 2.4, true);
  fire.loop = true;
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 420;
  const fg = ac.createGain();
  fg.gain.value = dayMode ? 0.1 : 0.34;
  fire.connect(lp).connect(fg).connect(ambBus!);
  fire.start();
  fireGain = fg;

  // ветер: шум → bandpass, громкость дышит LFO (днём едва слышен, M1.2)
  const wind = ac.createBufferSource();
  wind.buffer = noiseBuffer(ac, 3.1, false);
  wind.loop = true;
  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 340;
  bp.Q.value = 0.6;
  windGain = ac.createGain();
  windGain.gain.value = dayMode ? 0.018 : 0.05 + dread * 0.11;
  const lfo = ac.createOscillator();
  lfo.frequency.value = 0.13;
  const lfoGain = ac.createGain();
  lfoGain.gain.value = 0.035;
  lfo.connect(lfoGain).connect(windGain.gain);
  wind.connect(bp).connect(windGain).connect(ambBus!);
  wind.start();
  lfo.start();
}

function schedulePop() {
  if (!ctx || !ambBus || !running) return;
  const ac = ctx;
  const t = ac.currentTime;
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac, 0.06, false);
  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 1400 + Math.random() * 2400;
  bp.Q.value = 1.2;
  const g = ac.createGain();
  const peak = 0.05 + Math.random() * 0.12;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);
  src.connect(bp).connect(g).connect(ambBus);
  src.start(t);
  src.stop(t + 0.08);
  popTimer = setTimeout(schedulePop, 90 + Math.random() * 480);
}

/** Создаёт/будит аудиоконтекст. Звать из обработчиков жестов. */
export function ensureAudio(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (!ctx) {
      enabled = loadPref();
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = enabled ? 1 : 0.0001;
      master.connect(ctx.destination);
      ambBus = ctx.createGain();
      ambBus.gain.value = 0.5;
      ambBus.connect(master);
      sfxBus = ctx.createGain();
      sfxBus.gain.value = 0.85;
      sfxBus.connect(master);
      buildAmbience();
    }
    void ctx.resume();
    return true;
  } catch {
    return false;
  }
}

/** Полный старт: жест → контекст → эмбиент. */
export function audioStart(): boolean {
  if (!ensureAudio()) return false;
  applyMaster(true);
  if (!running) {
    running = true;
    popTimer = setTimeout(schedulePop, 200);
    applyDayMix(); // если контекст создан уже в дневной фазе — дневной микс сразу
  }
  return true;
}

function applyMaster(on: boolean) {
  if (!ctx || !master) return;
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setTargetAtTime(on ? 1 : 0.0001, ctx.currentTime, 0.25);
}

/** Тумблер «звук». Возвращает новое состояние. */
export function audioToggle(): boolean {
  if (!ensureAudio()) return !enabled;
  enabled = !enabled;
  savePref(enabled);
  applyMaster(enabled);
  if (enabled && !running) {
    running = true;
    popTimer = setTimeout(schedulePop, 200);
  }
  return enabled;
}

export function audioEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (ctx) return enabled;
  return loadPref();
}

export function audioStarted(): boolean {
  return ctx !== null && running;
}

/* ---------------- SFX-примитивы ---------------- */

function tone(
  freq: number,
  dur: number,
  opts: { type?: OscillatorType; gain?: number; slide?: number; delay?: number; attack?: number } = {},
) {
  if (!ctx || !sfxBus || !enabled) return;
  const ac = ctx;
  const t0 = ac.currentTime + (opts.delay ?? 0);
  const osc = ac.createOscillator();
  osc.type = opts.type ?? "sine";
  osc.frequency.setValueAtTime(freq, t0);
  if (opts.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, opts.slide), t0 + dur);
  const g = ac.createGain();
  const peak = opts.gain ?? 0.1;
  const atk = opts.attack ?? 0.008;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + atk);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(sfxBus);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noiseBurst(
  dur: number,
  opts: { freq?: number; q?: number; gain?: number; type?: BiquadFilterType; delay?: number } = {},
) {
  if (!ctx || !sfxBus || !enabled) return;
  const ac = ctx;
  const t0 = ac.currentTime + (opts.delay ?? 0);
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac, dur + 0.02, false);
  const f = ac.createBiquadFilter();
  f.type = opts.type ?? "bandpass";
  f.frequency.value = opts.freq ?? 1200;
  f.Q.value = opts.q ?? 1;
  const g = ac.createGain();
  const peak = opts.gain ?? 0.08;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(sfxBus);
  src.start(t0);
  src.stop(t0 + dur + 0.05);
}

/* ---------------- публичные SFX ---------------- */

export function sfxClick() {
  tone(660, 0.05, { type: "triangle", gain: 0.07 });
  noiseBurst(0.03, { freq: 2200, gain: 0.03 });
}

export function sfxOpen() {
  tone(330, 0.09, { type: "triangle", gain: 0.07 });
  tone(415, 0.12, { type: "triangle", gain: 0.06, delay: 0.07 });
}

export function sfxClose() {
  tone(415, 0.07, { type: "triangle", gain: 0.05 });
  tone(311, 0.1, { type: "triangle", gain: 0.05, delay: 0.05 });
}

/** открытие ключевого события: глухой удар + шелест */
export function sfxReveal() {
  tone(110, 0.28, { type: "sine", gain: 0.16, slide: 72 });
  noiseBurst(0.4, { freq: 900, q: 0.4, gain: 0.05, type: "bandpass", delay: 0.05 });
}

/** доверие выросло: тёплая двух-нота */
export function sfxDeltaUp() {
  tone(523, 0.09, { type: "sine", gain: 0.09 });
  tone(784, 0.14, { type: "sine", gain: 0.08, delay: 0.08 });
}

/** доверие упало: глухой спад */
export function sfxDeltaDown() {
  tone(262, 0.12, { type: "sawtooth", gain: 0.07, slide: 208 });
  tone(196, 0.16, { type: "sawtooth", gain: 0.06, delay: 0.09, slide: 165 });
}

/** «уколоть за живое»: диссонанс + удар */
export function sfxNeedle() {
  tone(466, 0.22, { type: "sawtooth", gain: 0.08 });
  tone(494, 0.22, { type: "sawtooth", gain: 0.08 });
  noiseBurst(0.12, { freq: 500, q: 0.8, gain: 0.1, type: "lowpass" });
}

/** колокол начала ночи */
export function sfxBell() {
  if (!ctx || !sfxBus || !enabled) return;
  tone(96, 2.6, { type: "sine", gain: 0.14, attack: 0.01 });
  tone(144, 2.2, { type: "sine", gain: 0.07 });
  tone(192, 1.6, { type: "sine", gain: 0.045 });
  tone(240, 0.9, { type: "sine", gain: 0.03 });
  noiseBurst(0.08, { freq: 3200, q: 2, gain: 0.04 });
}

/** рассвет: восходящее трезвучие */
export function sfxDawn() {
  tone(392, 0.5, { type: "triangle", gain: 0.08, attack: 0.05 });
  tone(494, 0.5, { type: "triangle", gain: 0.07, delay: 0.18, attack: 0.05 });
  tone(587, 0.8, { type: "triangle", gain: 0.08, delay: 0.36, attack: 0.05 });
}

/** рог Права слова */
export function sfxHorn() {
  tone(233, 0.55, { type: "triangle", gain: 0.09, attack: 0.06 });
  tone(311, 0.45, { type: "triangle", gain: 0.07, delay: 0.28, attack: 0.05 });
}

/** дрон финала: тёмный аккорд */
export function sfxEnding() {
  tone(65, 2.8, { type: "sine", gain: 0.12, attack: 0.4 });
  tone(98, 2.8, { type: "sine", gain: 0.08, attack: 0.5 });
  tone(110, 2.4, { type: "triangle", gain: 0.05, attack: 0.6 });
}

/** шаг по снегу */
export function sfxStep() {
  noiseBurst(0.045, { freq: 480 + Math.random() * 260, q: 0.7, gain: 0.028, type: "lowpass" });
}

/** шёпот Мглы (костёр гас / ночь III): шум-выдох + диссонанс */
export function sfxWhisper() {
  noiseBurst(0.55, { freq: 620, q: 0.5, gain: 0.05, type: "bandpass" });
  tone(124, 0.7, { type: "sine", gain: 0.045, slide: 96 });
  tone(131, 0.7, { type: "sine", gain: 0.035, slide: 104, delay: 0.08 });
}

/** полено в костёр: глухой стук + россыпь искр */
export function sfxFeed() {
  noiseBurst(0.09, { freq: 220, q: 0.9, gain: 0.14, type: "lowpass" });
  noiseBurst(0.3, { freq: 1800, q: 0.6, gain: 0.05, delay: 0.1 });
  tone(88, 0.16, { type: "sine", gain: 0.09, slide: 60 });
}

/** взять полено со штабеля */
export function sfxPickup() {
  noiseBurst(0.07, { freq: 900, q: 0.8, gain: 0.06, type: "lowpass" });
  tone(220, 0.06, { type: "triangle", gain: 0.05, delay: 0.05 });
}

/** карканье ворона (M1.3): жёсткая пила вниз + шумовое шипение */
export function sfxCaw() {
  const f = 470 + Math.random() * 190;
  tone(f, 0.17, { type: "sawtooth", gain: 0.045, slide: f * 0.68 });
  noiseBurst(0.2, { freq: 1500, q: 0.7, gain: 0.02, delay: 0.02 });
  if (Math.random() < 0.55) {
    tone(f * 1.22, 0.13, { type: "sawtooth", gain: 0.032, slide: f * 0.9, delay: 0.19 });
  }
}

/* ---------------- сердцебиение напряжения ---------------- */

function heartBeat() {
  if (!ctx || !sfxBus || !enabled || heartIntensity <= 0) return;
  const ac = ctx;
  const bus: GainNode = sfxBus; // сужение для замыкания thump
  const t0 = ac.currentTime;
  const thump = (delay: number, peak: number) => {
    const osc = ac.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(54, t0 + delay);
    osc.frequency.exponentialRampToValueAtTime(38, t0 + delay + 0.14);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t0 + delay);
    g.gain.exponentialRampToValueAtTime(peak, t0 + delay + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + delay + 0.15);
    osc.connect(g).connect(bus);
    osc.start(t0 + delay);
    osc.stop(t0 + delay + 0.2);
  };
  const eff = Math.min(1, heartIntensity + dread * 0.65);
  thump(0, 0.16 + eff * 0.1);
  thump(0.19, 0.1 + eff * 0.07);
  const period = Math.max(0.62, 1.15 - eff * 0.4);
  heartTimer = setTimeout(heartBeat, period * 1000);
}

/** Угроза Мглы 0..1: злее ветер, чаще сердце (M0.9). Безопасно звать каждый кадр. */
export function setDread(d: number) {
  const next = Math.max(0, Math.min(1, d));
  if (Math.abs(next - dread) < 0.04) return;
  dread = next;
  if (windGain && ctx) {
    // днём Мглы нет — ветер не злится, что бы ни считал движок (M1.2)
    const target = dayMode ? 0.018 : 0.05 + dread * 0.11;
    windGain.gain.setTargetAtTime(target, ctx.currentTime, dayMode ? 0.8 : 1.4);
  }
}

/* ---------------- дневной микс (M1.2) ---------------- */

/** птица: россыпь из 2–4 коротких ноток с лёгким глиссандо */
function chirp() {
  if (!ctx || !enabled || !dayMode) return;
  const n = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) {
    const f = 2500 + Math.random() * 1800;
    tone(f, 0.07, {
      type: "sine",
      gain: 0.014 + Math.random() * 0.012,
      slide: f * (0.75 + Math.random() * 0.5),
      delay: i * (0.09 + Math.random() * 0.06),
    });
  }
}

function scheduleBird() {
  if (!running || !dayMode) return;
  birdTimer = setTimeout(() => {
    chirp();
    scheduleBird();
  }, 2400 + Math.random() * 5200);
}

/** дневной баланс громкостей (зовётся при переключении фазы и старте аудио) */
function applyDayMix() {
  if (!ctx) return;
  if (windGain) {
    windGain.gain.cancelScheduledValues(ctx.currentTime);
    windGain.gain.setTargetAtTime(dayMode ? 0.018 : 0.05 + dread * 0.11, ctx.currentTime, 2.2);
  }
  if (fireGain) {
    fireGain.gain.cancelScheduledValues(ctx.currentTime);
    fireGain.gain.setTargetAtTime(dayMode ? 0.1 : 0.34, ctx.currentTime, 2.0);
  }
  if (birdTimer) {
    clearTimeout(birdTimer);
    birdTimer = null;
  }
  if (dayMode) scheduleBird();
}

/** День/ночь: костёр дремлет, ветер стихает, просыпаются птицы (M1.2).
 *  Безопасно звать каждый кадр — выход при совпадении. */
export function setDayMode(day: boolean) {
  if (day === dayMode) return;
  dayMode = day;
  applyDayMix();
}

/** 0..1 — сила страха отряда; 0 выключает сердцебиение */
export function setHeartbeat(intensity: number) {
  const next = Math.max(0, Math.min(1, intensity));
  if (next > 0 && heartIntensity <= 0 && ctx && enabled) {
    heartTimer = setTimeout(heartBeat, 50);
  }
  if (next <= 0 && heartTimer) {
    clearTimeout(heartTimer);
    heartTimer = null;
  }
  heartIntensity = next;
}
