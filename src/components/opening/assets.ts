/** Timing and copy for the launch plate. Swap the mark, not the menu. */
export const SEEN_KEY = "trustless-opening-seen";

export const LINE_MS = 2400;
export const OPENING_MS = 12000;
export const REDUCED_MS = 1800;

export const LINES = [
  "Verifying Signatures...",
  "Syncing the Ledger...",
  "Confirming the Block...",
  "Opening the Table...",
] as const;
