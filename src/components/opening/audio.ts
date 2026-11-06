/**
 * Three distinct layers. The bed stays up for the whole plate.
 * A React remount does not restart it.
 *
 * ambient.wav   quiet dark drone
 * wind.wav      low night breeze before the werewolf
 * growl.wav     one low growl as the werewolf appears
 * breath.wav    quiet breathing under the title
 *
 * No wind loop, forest, howl, impact, or loading ticks.
 * Set localStorage "trustless-sound" to "off" to mute.
 */

export const SOUND_KEY = "trustless-sound";

type Cue = {
  file: string;
  at: number;
  gain: number;
  fade: number;
  loop: boolean;
  easeAt?: number;
  settle?: number;
  ease?: number;
  fallAt?: number;
  fall?: number;
  fallEase?: number;
};

const CUES: Cue[] = [
  {
    file: "ambient.wav",
    at: 0.35,
    gain: 0.16,
    fade: 3.4,
    loop: true,
    easeAt: 2.6,
    settle: 0.2,
    ease: 2.2,
  },
  {
    file: "wind.wav",
    at: 0.12,
    gain: 0.13,
    fade: 1.4,
    loop: true,
    fallAt: 3.55,
    fall: 0,
    fallEase: 1.6,
  },
  { file: "growl.wav", at: 3.7, gain: 0.2, fade: 0.35, loop: false },
  { file: "breath.wav", at: 8.15, gain: 0.24, fade: 1.1, loop: true },
];

type Layer = Cue & {
  buffer: AudioBuffer | null;
  loopEnd: number;
  amp: GainNode | null;
  source: AudioBufferSourceNode | null;
  played: boolean;
  missing: boolean;
};

let origin = 0;
let layers: Layer[] = [];
let frame = 0;
let master = 1;
let fadeFrom = 1;
let fadeStart = 0;
let fadeMs = 0;
let releaseTimer = 0;
let gestureBound = false;
let bootedFor = 0;
let blocked = false;
let armed = false;
let session = 0;
let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
const waiters = new Set<(waiting: boolean) => void>();

function waiting() {
  return !armed || blocked || !ctx || ctx.state !== "running";
}

function tell() {
  const next = waiting();
  for (const fn of waiters) fn(next);
}

export function listenOpeningAudio(fn: (waiting: boolean) => void) {
  waiters.add(fn);
  fn(waiting());
  return () => {
    waiters.delete(fn);
  };
}

export function armOpeningAudio() {
  unlock();
}

function enabled() {
  try {
    return localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}

function envelope(layer: Layer, t: number) {
  if (layer.missing || t < layer.at) return 0;
  const rise = Math.min(1, (t - layer.at) / layer.fade);
  let level = layer.gain * rise;
  if (layer.easeAt != null && t > layer.easeAt) {
    const mix = Math.min(1, (t - layer.easeAt) / (layer.ease || 1.5));
    level = level * (1 - mix) + (layer.settle ?? 0) * mix;
  }
  if (layer.fallAt != null && t > layer.fallAt) {
    const mix = Math.min(1, (t - layer.fallAt) / (layer.fallEase || 1.5));
    level = level * (1 - mix) + (layer.fall ?? 0) * mix;
  }
  return level;
}

function masterNow() {
  if (!fadeStart) return master;
  const p = Math.min(1, (performance.now() - fadeStart) / fadeMs);
  return fadeFrom * (1 - p);
}

function clock() {
  return origin ? (performance.now() - origin) / 1000 : 0;
}

function due(layer: Layer, t: number) {
  if (layer.missing || !layer.buffer || t + 0.08 < layer.at) return false;
  if (!layer.loop && t > layer.at + 2.6) return false;
  return true;
}

function context() {
  if (!ctx) {
    ctx = new AudioContext();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0;
    masterGain.connect(ctx.destination);
  }
  return ctx;
}

function applyGains(t: number) {
  if (!masterGain) return;
  masterGain.gain.value = Math.max(0, Math.min(1, masterNow()));
  for (const layer of layers) {
    if (!layer.amp) continue;
    layer.amp.gain.value = Math.max(0, Math.min(1, envelope(layer, t)));
  }
}

function seal(audio: AudioContext, buffer: AudioBuffer) {
  const src = buffer.getChannelData(0);
  const pad = Math.min(256, src.length >> 2);
  const out = audio.createBuffer(1, src.length + pad, buffer.sampleRate);
  const dst = out.getChannelData(0);
  dst.set(src);
  dst.set(src.subarray(0, pad), src.length);
  return { buffer: out, loopEnd: src.length / buffer.sampleRate };
}

function startSource(layer: Layer) {
  if (!ctx || !layer.buffer || !layer.amp || layer.source) return;
  const now = ctx.currentTime;
  const source = ctx.createBufferSource();
  source.buffer = layer.buffer;
  source.connect(layer.amp);
  if (layer.loop) {
    source.loop = true;
    source.loopStart = 0;
    source.loopEnd = layer.loopEnd;
  }
  source.start(now);
  layer.source = source;
  layer.played = true;
}

function kick(t: number) {
  if (!ctx || ctx.state !== "running") return;
  for (const layer of layers) {
    if (layer.played || !due(layer, t)) continue;
    startSource(layer);
  }
}

function pump() {
  try {
    const t = clock();
    applyGains(t);
    if (!blocked) kick(t);
  } catch {
    /* Keep the clock running if a source is not ready yet. */
  }
  frame = window.requestAnimationFrame(pump);
}

function unlock() {
  armed = true;
  const audio = context();
  blocked = audio.state !== "running";
  tell();

  // iOS browsers need a source started inside the pointer gesture before
  // Web Audio is truly audible, even when resume() reports success.
  const wake = audio.createBufferSource();
  wake.buffer = audio.createBuffer(1, 1, audio.sampleRate);
  wake.connect(audio.destination);
  wake.start();

  audio.resume().then(() => {
    blocked = audio.state !== "running";
    tell();
    kick(clock());
  }).catch(() => {
    blocked = true;
    tell();
  });
}

async function loadBuffer(file: string, audio: AudioContext) {
  const response = await fetch(`/opening/audio/${file}?v=9`);
  if (!response.ok) throw new Error(String(response.status));
  const data = await response.arrayBuffer();
  return audio.decodeAudioData(data.slice(0));
}

async function boot(cues: Cue[], id: number) {
  const audio = context();
  const files = [...new Set(cues.map((cue) => cue.file))];
  const buffers = new Map<string, AudioBuffer | null>();
  await Promise.all(
    files.map(async (file) => {
      try {
        buffers.set(file, await loadBuffer(file, audio));
      } catch {
        buffers.set(file, null);
        console.warn(`Opening audio failed to load: ${file}`);
      }
    }),
  );
  if (id !== session || !masterGain) return;

  layers = cues.map((cue) => {
    const decoded = buffers.get(cue.file) ?? null;
    const sealed = decoded && cue.loop ? seal(audio, decoded) : null;
    const amp = audio.createGain();
    amp.gain.value = 0;
    amp.connect(masterGain!);
    return {
      ...cue,
      buffer: sealed?.buffer ?? decoded,
      loopEnd: sealed?.loopEnd ?? decoded?.duration ?? 0,
      amp,
      source: null,
      played: false,
      missing: !decoded,
    };
  });

  if (audio.state === "running" || armed) {
    blocked = false;
    tell();
    kick(clock());
    return;
  }
  blocked = true;
  tell();
  audio.resume().then(() => {
    if (id !== session) return;
    if (audio.state === "running") {
      armed = true;
      blocked = false;
      tell();
      kick(clock());
      return;
    }
    blocked = true;
    tell();
  }).catch(() => {
    blocked = true;
    tell();
  });
}

export function startOpeningAudio(animationStartedAt: number, reduced: boolean) {
  window.clearTimeout(releaseTimer);
  if (!animationStartedAt || !enabled()) return;
  if (bootedFor === animationStartedAt) return;
  bootedFor = animationStartedAt;
  origin = animationStartedAt;
  master = reduced ? 0.4 : 1;
  fadeStart = 0;
  blocked = false;
  stopElements();

  const cues = reduced ? CUES.filter((cue) => cue.file === "ambient.wav") : CUES;
  const id = session;
  void boot(cues, id);

  if (!gestureBound) {
    gestureBound = true;
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
  }
  if (!frame) frame = window.requestAnimationFrame(pump);
}

export function fadeOpeningAudio(ms: number) {
  fadeFrom = masterNow();
  fadeStart = performance.now();
  fadeMs = Math.max(200, ms);
}

/** Call on unmount. A quick remount cancels the stop. */
export function releaseOpeningAudio() {
  window.clearTimeout(releaseTimer);
  releaseTimer = window.setTimeout(() => {
    stopElements();
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
    bootedFor = 0;
  }, 1100);
}

function stopElements() {
  session += 1;
  for (const layer of layers) {
    try {
      layer.source?.stop();
    } catch {
      /* Already stopped. */
    }
    layer.amp?.disconnect();
  }
  layers = [];
}
