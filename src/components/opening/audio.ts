/**
 * Timeline for the launch plate. Volumes live here, not in the loader.
 *
 * Drop these files in public/opening/audio/ when they exist.
 * Missing files are skipped. Nothing here is synthesized.
 *
 * night.mp3    loop, near silence and a trace of night, from the start
 * drone.mp3    loop, quiet wind and a low tone as the moon emerges
 * village.mp3  loop, faint night village and forest, with the moon
 * breath.mp3   loop, quiet heavy breathing as the werewolf takes shape
 * scrape.mp3   one soft scrape as the claws settle
 * growl.mp3    one very low, restrained growl as the eyes appear
 *
 * No howl, no hit, no trailer boom. Missing files are skipped.
 *
 * Set localStorage "trustless-sound" to "off" to mute. A later settings
 * control can use that same key.
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
  { file: "night.mp3", at: 0.2, gain: 0.14, fade: 3.2, loop: true },
  { file: "drone.mp3", at: 0.7, gain: 0.11, fade: 3.4, loop: true },
  {
    file: "village.mp3",
    at: 1.5,
    gain: 0.09,
    fade: 2.8,
    loop: true,
    easeAt: 3.6,
    settle: 0.03,
    ease: 2.4,
  },
  { file: "breath.mp3", at: 3.6, gain: 0.2, fade: 1.4, loop: true },
  { file: "scrape.mp3", at: 5.5, gain: 0.16, fade: 0.2, loop: false },
  { file: "growl.mp3", at: 7.15, gain: 0.14, fade: 0.55, loop: false },
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

function pump() {
  const t = origin ? (performance.now() - origin) / 1000 : 0;
  const m = masterNow();
  for (const layer of layers) {
    if (layer.missing) continue;
    layer.el.volume = Math.max(0, Math.min(1, m * envelope(layer, t)));
    if (layer.played) continue;
    if (t + 0.08 < layer.at) continue;
    if (!layer.loop && t > layer.at + 0.45) {
      layer.played = true;
      continue;
    }
    layer.played = true;
    if (layer.loop) layer.el.currentTime = Math.max(0, t - layer.at);
    layer.el.play().catch(() => {
      layer.played = false;
    });
  }
  frame = window.requestAnimationFrame(pump);
}

function unlock() {
  for (const layer of layers) {
    if (!layer.played && !layer.missing) layer.el.play().catch(() => undefined);
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

  const cues = reduced ? CUES.filter((cue) => cue.file === "night.mp3") : CUES;
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
