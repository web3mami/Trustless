"use client";

import { useRef, useState } from "react";
import { Opening } from "@/components/opening/index";
import {
  AURA_LABEL,
  DEAL,
  SEATS,
  type Aura,
  type Phase,
  type Seat,
} from "@/lib/table";

type Message = {
  id: string;
  author: string;
  text: string;
  system?: boolean;
};

type Read = {
  round: number;
  seatId: number;
  aura: Aura;
};

const OPENING: Message[] = [
  {
    id: "m1",
    author: "Mara",
    text: "If you have a night read, say the seat and the word. Signed, unsigned, or blind.",
  },
  {
    id: "m2",
    author: "Ren",
    text: "I am not claiming until someone is actually checked.",
  },
  {
    id: "m3",
    author: "Quinn",
    text: "The first name in the chat is bait. Read the roll before you pile on.",
  },
];

export function Game() {
  const [opened, setOpened] = useState(false);
  const [seatedName, setSeatedName] = useState<string | null>(null);

  if (!opened) {
    return <Opening onDone={() => setOpened(true)} />;
  }

  if (!seatedName) {
    return <Gate onSit={setSeatedName} />;
  }

  return <Table you={seatedName} onLeave={() => setSeatedName(null)} />;
}

function Gate({ onSit }: { onSit: (name: string) => void }) {
  const [name, setName] = useState("");
  const trimmed = name.trim();

  return (
    <main className="room gate">
      <div className="gate-card">
        <p className="kicker">Table 04 · 16 seats</p>
        <h1 className="display">Trustless</h1>
        <p className="lede">Trust no one. Verify everything.</p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (trimmed) onSit(trimmed);
          }}
        >
          <label htmlFor="seat-name">Your name at the table</label>
          <input
            id="seat-name"
            autoFocus
            autoComplete="nickname"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="How the village should address you"
          />
          <button className="primary" type="submit" disabled={!trimmed}>
            Sit down
          </button>
        </form>
      </div>
    </main>
  );
}

function Table({ you, onLeave }: { you: string; onLeave: () => void }) {
  const dealRef = useRef<HTMLDialogElement>(null);
  const [phase, setPhase] = useState<Phase>("night");
  const [round, setRound] = useState(1);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [reads, setReads] = useState<Read[]>([]);
  const [votes, setVotes] = useState<{ round: number; seatId: number }[]>([]);
  const [messages, setMessages] = useState<Message[]>(OPENING);
  const [draft, setDraft] = useState("");

  const seats = SEATS.map((seat) =>
    seat.id === 1 ? { ...seat, name: you } : seat,
  );
  const selected = seats.find((seat) => seat.id === selectedId) ?? null;
  const nightRead = reads.find((read) => read.round === round) ?? null;
  const vote = votes.find((entry) => entry.round === round) ?? null;
  const votedSeat = seats.find((seat) => seat.id === vote?.seatId) ?? null;

  function speak(author: string, text: string, system = false) {
    setMessages((current) => [
      ...current,
      { id: `${Date.now()}-${current.length}`, author, text, system },
    ]);
  }

  function shiftPhase() {
    setSelectedId(null);
    if (phase === "night") {
      setPhase("day");
      speak("Table", `Dawn. Day ${round} is in session.`, true);
      return;
    }
    setPhase("night");
    setRound((current) => current + 1);
    speak("Table", "Dusk. The village closes.", true);
  }

  function readSignature() {
    if (phase !== "night" || !selected || selected.id === 1 || nightRead) return;
    setReads((current) => [
      ...current,
      { round, seatId: selected.id, aura: selected.aura },
    ]);
  }

  function castVote() {
    if (phase !== "day" || !selected || selected.id === 1) return;
    setVotes((current) => [
      ...current.filter((entry) => entry.round !== round),
      { round, seatId: selected.id },
    ]);
  }

  return (
    <main className="room" data-phase={phase}>
      <header className="top">
        <div className="brand">
          <p className="kicker">Table 04</p>
          <h1 className="display">Trustless</h1>
        </div>
        <div className="phase-block">
          <strong className="display">
            {phase === "night" ? "Night" : "Day"} {round}
          </strong>
          <span className="alive">16 alive</span>
        </div>
        <div className="top-actions">
          <button className="text-btn" type="button" onClick={() => dealRef.current?.showModal()}>
            The deal
          </button>
          <button className="text-btn" type="button" onClick={shiftPhase}>
            {phase === "night" ? "Dawn" : "Dusk"}
          </button>
          <button className="text-btn" type="button" onClick={onLeave}>
            Leave
          </button>
        </div>
      </header>

      <div className="stage">
        <ol className="roll">
          {seats.map((seat) => (
            <li key={seat.id}>
              <SeatButton
                seat={seat}
                you={seat.id === 1}
                pressed={selectedId === seat.id}
                revealed={open}
                onPick={() => setSelectedId(seat.id === selectedId ? null : seat.id)}
              />
            </li>
          ))}
        </ol>

        <aside className="side">
          <section>
            <h2>Your role</h2>
            {open ? (
              <>
                <p className="role-name display">Auditor</p>
                <p>
                  Each night, check one player. Signed is village. Unsigned is a
                  wolf. Blind is a solo, Phantom, or a villager who kills.
                </p>
                <span className="aura aura-signed">Signed</span>
              </>
            ) : (
              <>
                <button className="seal-btn" type="button" onClick={() => setOpen(true)}>
                  Open
                </button>
                <p className="hint">The seal is still closed.</p>
              </>
            )}
          </section>

          <section className="action">
            <h2>{phase === "night" ? "Night check" : "Vote"}</h2>
            {phase === "night" ? (
              <NightCheck
                selected={selected}
                read={nightRead}
                seats={seats}
                onRead={readSignature}
              />
            ) : (
              <DayVote selected={selected} voted={votedSeat} onVote={castVote} />
            )}
            {reads.length > 0 ? (
              <ul className="log">
                {reads.map((read) => {
                  const seat = seats.find((item) => item.id === read.seatId);
                  return (
                    <li key={`${read.round}-${read.seatId}`}>
                      Night {read.round} · {seat?.name} ·{" "}
                      <span className={`aura aura-${read.aura}`}>
                        {AURA_LABEL[read.aura]}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </section>
        </aside>
      </div>

      <section className="transcript">
        <h2>Village</h2>
        <ul className="messages">
          {messages.map((message) =>
            message.system ? (
              <li key={message.id} className="system">
                {message.text}
              </li>
            ) : (
              <li key={message.id}>
                <span className="author">{message.author}</span>
                <span>{message.text}</span>
              </li>
            ),
          )}
        </ul>
        <form
          className="composer"
          onSubmit={(event) => {
            event.preventDefault();
            const text = draft.trim();
            if (!text) return;
            speak(you, text);
            setDraft("");
          }}
        >
          <input
            aria-label="Message the village"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Speak to the village"
          />
          <button className="text-btn" type="submit">
            Send
          </button>
        </form>
      </section>

      <dialog className="deal" ref={dealRef}>
        <p className="kicker">Public setup</p>
        <h2 className="display">The deal</h2>
        {DEAL.map((group) => (
          <div className="deal-group" key={group.side}>
            <h3>{group.side}</h3>
            <ul>
              {group.roles.map((role) => (
                <li key={role}>{role}</li>
              ))}
            </ul>
          </div>
        ))}
        <button
          className="text-btn"
          type="button"
          onClick={() => dealRef.current?.close()}
        >
          Close
        </button>
      </dialog>
    </main>
  );
}

function SeatButton({
  seat,
  you,
  pressed,
  revealed,
  onPick,
}: {
  seat: Seat;
  you: boolean;
  pressed: boolean;
  revealed: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      className={you ? "seat you" : "seat"}
      aria-pressed={pressed}
      disabled={you}
      onClick={onPick}
    >
      <span className="num">{String(seat.id).padStart(2, "0")}</span>
      <span className="who">
        <span className="name">{seat.name}</span>
        {you ? <span className="tag">{revealed ? "You · Auditor" : "You"}</span> : null}
      </span>
    </button>
  );
}

function NightCheck({
  selected,
  read,
  seats,
  onRead,
}: {
  selected: Seat | null;
  read: Read | null;
  seats: Seat[];
  onRead: () => void;
}) {
  const readSeat = seats.find((seat) => seat.id === read?.seatId);

  return (
    <>
      <p>
        {read && readSeat
          ? `${readSeat.name} reads ${AURA_LABEL[read.aura].toLowerCase()}.`
          : selected
            ? `Ready to read ${selected.name}.`
            : "Pick a seat from the roll."}
      </p>
      <button
        className="primary"
        type="button"
        disabled={!selected || selected.id === 1 || Boolean(read)}
        onClick={onRead}
      >
        Read signature
      </button>
    </>
  );
}

function DayVote({
  selected,
  voted,
  onVote,
}: {
  selected: Seat | null;
  voted: Seat | null;
  onVote: () => void;
}) {
  return (
    <>
      <p>
        {voted
          ? `Your vote is on ${voted.name}.`
          : selected
            ? `Ready to vote ${selected.name}.`
            : "Pick a seat from the roll."}
      </p>
      <button
        className="primary"
        type="button"
        disabled={!selected || selected.id === 1}
        onClick={onVote}
      >
        Cast vote
      </button>
    </>
  );
}
