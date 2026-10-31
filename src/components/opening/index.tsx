"use client";

import { useEffect, useRef, useState } from "react";
import {
  armOpeningAudio,
  fadeOpeningAudio,
  listenOpeningAudio,
  releaseOpeningAudio,
  startOpeningAudio,
} from "./audio";
import { LINES, LINE_MS, OPENING_MS, REDUCED_MS, SEEN_KEY } from "./assets";
import { Mark } from "./mark";

let startedAt = 0;

function useOpeningShift() {
  const ref = useRef<number | null>(null);
  if (ref.current === null) {
    if (typeof window === "undefined") {
      ref.current = 0;
    } else {
      if (!startedAt) startedAt = performance.now();
      ref.current = Math.round(startedAt - performance.now());
    }
  }
  return ref.current;
}

export function Opening({ onDone }: { onDone: () => void }) {
  const shift = useOpeningShift();
  const [returning, setReturning] = useState(false);
  const [leave, setLeave] = useState(false);
  const [needSound, setNeedSound] = useState(false);
  const [touch, setTouch] = useState(false);
  const finished = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    try {
      setReturning(localStorage.getItem(SEEN_KEY) === "1");
    } catch {
      setReturning(false);
    }
    setTouch(window.matchMedia("(pointer: coarse)").matches);
    const stop = listenOpeningAudio(setNeedSound);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    startOpeningAudio(startedAt, reduce);
    const total = reduce ? REDUCED_MS : OPENING_MS;
    const wait = Math.max(400, total + shift);
    const hold = window.setTimeout(() => {
      fadeOpeningAudio(reduce ? 500 : 800);
      if (reduce) window.setTimeout(() => finish(), 520);
      else setLeave(true);
    }, wait);
    const cap = window.setTimeout(() => finish(), wait + 1600);
    return () => {
      window.clearTimeout(hold);
      window.clearTimeout(cap);
      stop();
      releaseOpeningAudio();
    };
  }, [shift]);

  function finish() {
    if (finished.current) return;
    finished.current = true;
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* private mode */
    }
    onDoneRef.current();
  }

  return (
    <main
      className={leave ? "opening opening-out" : "opening"}
      style={{ ["--shift" as string]: `${shift}ms` }}
      onAnimationEnd={(event) => {
        if (event.target !== event.currentTarget) return;
        if (!event.animationName.includes("opening-leave")) return;
        finish();
      }}
    >
      <div className="opening-scene">
        <Mark />
        <div className="opening-word">
          <h1>Trustless</h1>
          <p>
            <span className="opening-warn">Trust No One.</span>{" "}
            <span className="opening-vow">Verify Everything.</span>
          </p>
        </div>
        <Loader />
      </div>
      {needSound ? (
        <button className="opening-sound" type="button" onClick={armOpeningAudio}>
          {touch ? "Tap for sound" : "Click for sound"}
        </button>
      ) : null}
      {returning ? (
        <button className="opening-skip" type="button" onClick={() => setLeave(true)}>
          Skip
        </button>
      ) : null}
    </main>
  );
}

function Loader() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setIndex(LINES.length - 1);
      return;
    }
    const elapsed = startedAt ? performance.now() - startedAt : 0;
    let current = Math.min(LINES.length - 1, Math.floor(elapsed / LINE_MS));
    setIndex(current);
    if (current >= LINES.length - 1) return;

    let timeout = 0;
    const step = () => {
      const into = (performance.now() - (startedAt || performance.now())) % LINE_MS;
      timeout = window.setTimeout(() => {
        current += 1;
        setIndex(current);
        if (current < LINES.length - 1) step();
      }, LINE_MS - into);
    };
    step();
    return () => window.clearTimeout(timeout);
  }, []);

  const phase = String(index + 1).padStart(2, "0");

  return (
    <div className="opening-loader">
      <p className="opening-loader-meta">
        <span>Initializing</span>
        <span>
          {phase} / {String(LINES.length).padStart(2, "0")}
        </span>
      </p>
      <p key={index} className="opening-line" aria-live="polite">
        {LINES[index]}
      </p>
      <div className="opening-loader-line" aria-hidden="true">
        <span />
      </div>
    </div>
  );
}
