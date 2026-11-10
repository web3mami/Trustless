import type { ReactNode } from "react";
import { FactionIcon } from "@/components/faction-icon";
import { profileFaction } from "@/lib/game/catalog";
import type { ActionType, RoleDefinition } from "@/lib/game/types";

type IconRole = Pick<RoleDefinition, "id" | "faction"> & {
  icon?: string;
  actionType?: ActionType | null;
  revealActivatesVote?: boolean;
};

export const ROLE_ICON_OPTIONS: { id: string; label: string }[] = [
  { id: "villager", label: "Lantern" },
  { id: "chain-analyst", label: "Analysis lens" },
  { id: "investigator", label: "Comparison lens" },
  { id: "auditor", label: "Audit ledger" },
  { id: "doctor", label: "Medical satchel" },
  { id: "aegis", label: "Twin shields" },
  { id: "roleblocker", label: "Shackles" },
  { id: "vigilante", label: "Crossbow" },
  { id: "governor", label: "Town seal" },
  { id: "tracker", label: "Footprints" },
  { id: "medium", label: "Candle" },
  { id: "alpha-werewolf", label: "Fang crown" },
  { id: "seer-werewolf", label: "Wolf eye" },
  { id: "guardian-werewolf", label: "Fanged shield" },
  { id: "roleblocker-werewolf", label: "Claw and chain" },
  { id: "serial-killer", label: "Dagger" },
  { id: "rugpuller", label: "Trickster mask" },
];

export function RoleIcon({ role, className }: { role: IconRole; className?: string }) {
  const mark = MARKS[role.icon ?? ""] ?? MARKS[role.id] ?? fallback(role);
  if (mark === "faction") {
    return <FactionIcon faction={profileFaction(role.faction)} className={className ?? "roles-icon"} />;
  }
  return <IconFrame className={className}>{mark}</IconFrame>;
}

function IconFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const chain = (
  <>
    <circle cx="8" cy="9" r="2.6" />
    <circle cx="15.2" cy="15.2" r="2.6" />
    <path d="m10.2 10.6 3.2 3" />
  </>
);

const shield = (
  <path d="M12 3.4 18.2 6v5.4c0 3.8-2.6 6.4-6.2 8.2-3.6-1.8-6.2-4.4-6.2-8.2V6Z" />
);

const knife = (
  <>
    <path d="M16.2 3.8 7.2 15.6" />
    <path d="M6 16.8 8.4 14.4l1.8 3.2-2.8 1.1Z" />
    <path d="M10.8 11.2 13.6 8.8" />
  </>
);

const seal = (
  <>
    <circle cx="12" cy="9" r="4.3" />
    <path d="M12 7v4M10.2 9h3.6" />
    <path d="M9.2 12.6 8 19.2 12 17.2l4 2-1.2-6.6" />
  </>
);

const MARKS: Record<string, ReactNode> = {
  villager: (
    <>
      <path d="M10.2 4.4h3.6" />
      <path d="M12 2.6v1.8" />
      <path d="M9.2 6.4h5.6L13.6 15H10.4Z" />
      <path d="M8.4 15h7.2" />
      <path d="M10.8 9.2c.5.9 1.9.9 2.4 0" />
    </>
  ),
  "chain-analyst": (
    <>
      <circle cx="12" cy="12" r="6.4" />
      <path d="M12 5.6v2M12 16.4v2M5.6 12h2M16.4 12h2" />
      <path d="M8 12c.7-1.8 2-2.6 4-2.6s3.3.8 4 2.6c-.7 1.8-2 2.6-4 2.6s-3.3-.8-4-2.6Z" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  investigator: (
    <>
      <circle cx="9" cy="8.6" r="4" />
      <path d="m12.2 11.6 3.4 3.4" />
      <circle cx="6.6" cy="16.8" r="1.2" />
      <circle cx="11.4" cy="16.8" r="1.2" />
      <path d="M5.2 19h2.8M10 19h2.8" />
    </>
  ),
  auditor: (
    <>
      <path d="M5.4 4.2h9.2v15.2H5.4Z" />
      <path d="M7.4 7.6h5M7.4 10.4h5M7.4 13.2h3.2" />
      <circle cx="16.4" cy="15.4" r="3.1" />
      <path d="m15.2 15.4 1 1.1 1.8-2.2" />
    </>
  ),
  doctor: (
    <>
      <path d="M5 9.2c1.8-2.6 12.2-2.6 14 0" />
      <path d="M6.2 10h11.6v8.2H6.2Z" />
      <path d="M6.2 13h11.6" />
      <path d="M12 14.4v2.6M10.7 15.7h2.6" />
    </>
  ),
  aegis: (
    <>
      <path d="M12 3 18.6 5.8v5.4c0 3.6-2.6 6.2-6.6 8.1-4-1.9-6.6-4.5-6.6-8.1V5.8Z" />
      <path d="M12 6.2 15.8 8.1v3.2c0 2.1-1.5 3.5-3.8 4.5-2.3-1-3.8-2.4-3.8-4.5V8.1Z" />
      <path d="M8.6 10.4h6.8M9 12.6h6" />
    </>
  ),
  roleblocker: (
    <>
      <circle cx="7.4" cy="9.2" r="2.5" />
      <circle cx="16.6" cy="9.2" r="2.5" />
      <path d="M9.8 9.2h4.4" />
      <path d="M7.4 11.6v3.4M16.6 11.6v3.4" />
    </>
  ),
  vigilante: (
    <>
      <path d="M4 9.2h16" />
      <path d="M4 9.2c1.8 4 4.2 6 8 6s6.2-2 8-6" />
      <path d="M12 9.2v9.2" />
      <path d="M9.2 16.6h5.6" />
      <path d="M14.6 11.4h4.2" />
    </>
  ),
  governor: seal,
  tracker: (
    <>
      <ellipse cx="8" cy="16.2" rx="2.1" ry="2.5" />
      <circle cx="6.1" cy="12.2" r=".8" />
      <circle cx="8" cy="11.2" r=".8" />
      <circle cx="9.9" cy="12.2" r=".8" />
      <ellipse cx="16.2" cy="8.6" rx="2.1" ry="2.5" transform="rotate(-28 16.2 8.6)" />
      <circle cx="13.6" cy="5.6" r=".8" />
      <circle cx="15.5" cy="4.6" r=".8" />
      <circle cx="17.4" cy="5.8" r=".8" />
    </>
  ),
  medium: (
    <>
      <path d="M12 3.2c1.3 1.6.4 2.8-.6 3.2 1 .4 2 1.5.4 3-1.3 1.2-3 .2-2.6-1.4.3-1.2 1.2-2 1.6-3.2.3-.8 1-1.2 1.2-1.6Z" />
      <path d="M10.2 9.6h3.6V17H10.2Z" />
      <path d="M8.8 17h6.4" />
    </>
  ),
  "alpha-werewolf": (
    <>
      <path d="M4.8 8h14.4" />
      <path d="M7 8 8.4 3.6 9.8 8M12 8V3.2M14.2 8 15.6 3.6 17 8" />
      <path d="M6.6 12.2 8.4 18.4 10.6 12.8" />
      <path d="M13.4 12.8 15.6 18.4 17.4 12.2" />
    </>
  ),
  "seer-werewolf": (
    <>
      <path d="M7.2 8.4 8.6 5.4 10.2 8.2" />
      <path d="M13.8 8.2 15.4 5.4 16.8 8.4" />
      <path d="M4.4 13c2-2.6 4.4-3.6 7.6-3.6s5.6 1 7.6 3.6c-2 2.6-4.4 3.6-7.6 3.6s-5.6-1-7.6-3.6Z" />
      <path d="M12 10.4v4.8" />
    </>
  ),
  "guardian-werewolf": (
    <>
      {shield}
      <path d="M12 9.2 13.3 13.2 12 12.2 10.7 13.2Z" />
    </>
  ),
  "roleblocker-werewolf": (
    <>
      <path d="M4.6 16.4c1.4-3.2 1-5.4 0-7M7.6 16.8c.8-3.4.2-5.6-1-7.2M10.4 16.6c.2-3.6-.6-5.8-1.6-7.4" />
      <circle cx="15.4" cy="8.2" r="2.2" />
      <circle cx="18.2" cy="12.4" r="2.2" />
      <path d="m17 9.6 1.2 1.4" />
    </>
  ),
  "serial-killer": (
    <>
      <path d="M16.2 3.4 7.4 15.2" strokeWidth="3.2" />
      <path d="M5.8 16.6 8.6 14.2l2.2 3.2-3.2 1.4Z" />
      <path d="M10.2 12.2 13.4 9.2" />
    </>
  ),
  rugpuller: (
    <>
      <path d="M7.2 8.6c.2-3.2 2.6-5.2 5.4-4.6 2.6.5 4.2 2.6 4 5.4.4 3.6-1.8 6.4-4.8 7.4-3.4-.8-5.2-3.4-4.6-8.2Z" />
      <circle cx="9.6" cy="11" r=".95" />
      <circle cx="14.8" cy="10.2" r=".95" />
      <path d="M9.6 14.4c1.4 1.2 3.6.2 4.4-.8" />
    </>
  ),
};

function fallback(role: IconRole): ReactNode | "faction" {
  if (role.revealActivatesVote) return seal;
  switch (role.actionType) {
    case "kill":
      return knife;
    case "protect":
      return shield;
    case "investigate":
    case "read_role":
      return MARKS["chain-analyst"];
    case "read_aura":
      return MARKS.auditor;
    case "compare":
      return MARKS.investigator;
    case "block":
      return chain;
    case "track":
      return MARKS.tracker;
    case "vote_modifier":
      return seal;
    case "special":
      return (
        <>
          <circle cx="12" cy="12" r="3.2" />
          <path d="M12 4.2v2.4M12 17.4v2.4M4.2 12h2.4M17.4 12h2.4" />
        </>
      );
    default:
      return "faction";
  }
}
