/* ============================================================
 * Амбиент лагеря — WebAudio без внешних файлов:
 *   - треск костра: коричневый шум через lowpass + случайные щелчки;
 *   - ветер: шум через bandpass с медленной модуляцией громкости.
 * Запуск — только по жесту пользователя (кнопка «звук»).
 * ============================================================ */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let running = false;
let popTimer: ReturnType<typeof setTimeout> | null = null;

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

function schedulePop() {
  if (!ctx || !master || !running) return;
  const ac = ctx;
  const t = ac.currentTime;

  // щелчок: короткий всплеск белого шума через узкий bandpass
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
  src.connect(bp).connect(g).connect(master);
  src.start(t);
  src.stop(t + 0.08);

  popTimer = setTimeout(schedulePop, 90 + Math.random() * 480);
}

export function ambienceStart() {
  if (running) return;
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);

      // костёр: коричневый шум → lowpass
      const fire = ctx.createBufferSource();
      fire.buffer = noiseBuffer(ctx, 2.4, true);
      fire.loop = true;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 420;
      const fireGain = ctx.createGain();
      fireGain.gain.value = 0.34;
      fire.connect(lp).connect(fireGain).connect(master);
      fire.start();

      // ветер: шум → bandpass, громкость дышит LFO
      const wind = ctx.createBufferSource();
      wind.buffer = noiseBuffer(ctx, 3.1, false);
      wind.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 340;
      bp.Q.value = 0.6;
      const windGain = ctx.createGain();
      windGain.gain.value = 0.05;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.13;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.035;
      lfo.connect(lfoGain).connect(windGain.gain);
      wind.connect(bp).connect(windGain).connect(master);
      wind.start();
      lfo.start();
    }
    void ctx.resume();
    master!.gain.cancelScheduledValues(ctx.currentTime);
    master!.gain.setTargetAtTime(0.5, ctx.currentTime, 0.7);
    running = true;
    popTimer = setTimeout(schedulePop, 200);
  } catch {
    /* аудио недоступно — играем молча */
  }
}

export function ambienceStop() {
  if (!running || !ctx || !master) return;
  master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.25);
  running = false;
  if (popTimer) {
    clearTimeout(popTimer);
    popTimer = null;
  }
}

export function ambienceOn(): boolean {
  return running;
}
