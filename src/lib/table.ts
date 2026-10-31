export type Aura = "signed" | "unsigned" | "blind";
export type Phase = "night" | "day";

export type Seat = {
  id: number;
  name: string;
  aura: Aura;
};

export const AURA_LABEL: Record<Aura, string> = {
  signed: "Signed",
  unsigned: "Unsigned",
  blind: "Blind",
};

/** Mock deal for the first table. Auras drive the Auditor check. Roles stay off the board. */
export const SEATS: Seat[] = [
  { id: 1, name: "You", aura: "signed" },
  { id: 2, name: "Mara", aura: "signed" },
  { id: 3, name: "Ivo", aura: "blind" },
  { id: 4, name: "Sable", aura: "blind" },
  { id: 5, name: "Quinn", aura: "blind" },
  { id: 6, name: "Ren", aura: "unsigned" },
  { id: 7, name: "Hester", aura: "signed" },
  { id: 8, name: "Jules", aura: "blind" },
  { id: 9, name: "Anouk", aura: "signed" },
  { id: 10, name: "Beck", aura: "unsigned" },
  { id: 11, name: "Noor", aura: "signed" },
  { id: 12, name: "Cass", aura: "unsigned" },
  { id: 13, name: "Leif", aura: "blind" },
  { id: 14, name: "Willa", aura: "signed" },
  { id: 15, name: "Omar", aura: "signed" },
  { id: 16, name: "Petra", aura: "signed" },
];

export const DEAL: { side: string; roles: string[] }[] = [
  {
    side: "Village",
    roles: [
      "Auditor — a night check. Signed, unsigned, or blind.",
      "Explorer — who one player visited.",
      "Archivist — a dead player's role, and the side they are on.",
      "Circuit Breaker — pause one player for the night.",
      "Hardware Wallet — blind. You can die in someone's place.",
      "Slasher — blind. One shot. A wolf dies, or you do.",
      "Snare — stop the first player who visits your target.",
      "Senator — reveal once. Your vote counts as two.",
      "Reporter — see how one player voted yesterday.",
    ],
  },
  {
    side: "Wolves",
    roles: [
      "Alpha — votes last. A tie is a random pick between the names.",
      "Dark Auditor — one check, and you sit out the kill that night.",
      "Mixer — twice, a check comes back with no record.",
      "Phantom — the one wolf who reads as blind.",
    ],
  },
  {
    side: "The rest",
    roles: [
      "Drainer — blind. Kills one player and learns their role.",
      "Cursed — signed, and village, until a wolf or the Drainer lands a hit.",
      "Delegate — blind. Gives their vote to someone. It counts as two.",
    ],
  },
];
