/**
 * Timeline for the launch plate. Volumes live here, not in the loader.
 * Files live in public/opening/audio/. Loops stay up for the whole plate.
 * A loading-line change only plays tick.wav. It does not restart the bed.
 *
 * night.wav    loop, soft night air, from the start
 * drone.wav    loop, light wind and a low tone with the moon
 * village.wav  loop, faint forest, then ducks when the wolf arrives
 * breath.wav   loop, quiet heavy breathing as the werewolf appears
 * growl.wav    one restrained low growl with that reveal
 * scrape.wav   one soft scrape as the claws settle
 * title.wav    one low, short tone as the word appears
 * tick.wav     a tiny muted pulse as each loading line changes
 *
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
};

const CUES: Cue[] = [
  { file: "night.wav", at: 0.15, gain: 0.28, fade: 2.4, loop: true },
  { file: "drone.wav", at: 0.55, gain: 0.16, fade: 2.6, loop: true },
  {
    file: "village.wav",
    at: 1.3,
    gain: 0.12,
    fade: 2.2,
    loop: true,
    easeAt: 3.5,
    settle: 0.05,
    ease: 2.2,
  },
  { file: "breath.wav", at: 3.5, gain: 0.22, fade: 1.1, loop: true },
  { file: "growl.wav", at: 4.2, gain: 0.18, fade: 0.35, loop: false },
  { file: "scrape.wav", at: 5.5, gain: 0.2, fade: 0.12, loop: false },
  { file: "title.wav", at: 6.85, gain: 0.22, fade: 0.05, loop: false },
  { file: "tick.wav", at: 0.2, gain: 0.1, fade: 0.02, loop: false },
  { file: "tick.wav", at: 2.4, gain: 0.1, fade: 0.02, loop: false },
  { file: "tick.wav", at: 4.8, gain: 0.1, fade: 0.02, loop: false },
  { file: "tick.wav", at: 7.2, gain: 0.1, fade: 0.02, loop: false },
];

type Layer = Cue & {
  el: HTMLAudioElement;
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
    const span = layer.ease || 1.5;
    const mix = Math.min(1, (t - layer.easeAt) / span);
    level = level * (1 - mix) + (layer.settle ?? 0) * mix;
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
  if (layer.missing || t + 0.08 < layer.at) return false;
  if (!layer.loop && t > layer.at + 1.6) return false;
  return true;
}

function playLayer(layer: Layer, t: number) {
  if (layer.loop && layer.el.paused) layer.el.currentTime = Math.max(0, t - layer.at);
  const pending = layer.el.play();
  if (!pending) {
    layer.played = true;
    return;
  }
  pending.then(() => {
    layer.played = true;
    blocked = false;
  }).catch(() => {
    blocked = true;
    layer.played = false;
  });
}

function pump() {
  const t = clock();
  const m = masterNow();
  for (const layer of layers) {
    if (layer.missing) continue;
    layer.el.volume = Math.max(0, Math.min(1, m * envelope(layer, t)));
    if (layer.played || blocked || !due(layer, t)) continue;
    layer.played = true;
    playLayer(layer, t);
  }
  frame = window.requestAnimationFrame(pump);
}

function unlock() {
  blocked = false;
  const t = clock();
  for (const layer of layers) {
    if (layer.missing || layer.played || !due(layer, t)) continue;
    layer.played = true;
    playLayer(layer, t);
  }
}

export function startOpeningAudio(animationStartedAt: number, reduced: boolean) {
  window.clearTimeout(releaseTimer);
  if (!animationStartedAt || !enabled()) return;
  if (bootedFor === animationStartedAt) return;
  bootedFor = animationStartedAt;
  origin = animationStartedAt;
  master = reduced ? 0.45 : 1;
  fadeStart = 0;
  stopElements();

  const cues = reduced ? CUES.filter((cue) => cue.file === "night.wav") : CUES;
  layers = cues.map((cue) => {
    const el = new Audio(`/opening/audio/${cue.file}`);
    el.loop = cue.loop;
    el.preload = "auto";
    el.volume = 0;
    const layer: Layer = { ...cue, el, played: false, missing: false };
    el.addEventListener("error", () => {
      layer.missing = true;
    });
    return layer;
  });

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
  for (const layer of layers) {
    layer.el.pause();
    layer.el.src = "";
  }
  layers = [];
}
