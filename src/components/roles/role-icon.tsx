import type { ReactNode } from "react";
import { FactionIcon } from "@/components/faction-icon";
import { profileFaction } from "@/lib/game/catalog";
import type { ActionType, RoleDefinition } from "@/lib/game/types";

type IconRole = Pick<RoleDefinition, "id" | "faction"> & {
  actionType?: ActionType | null;
  revealActivatesVote?: boolean;
};

export function RoleIcon({ role, className }: { role: IconRole; className?: string }) {
  const mark = MARKS[role.id] ?? fallback(role);
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

const eye = (
  <>
    <path d="M18.2 7.4a7 7 0 1 0 0 9.2" />
    <path d="M6.4 12c1.6-2.3 3.3-3.3 5.2-3.3s3.6 1 5.2 3.3c-1.6 2.3-3.3 3.3-5.2 3.3s-3.6-1-5.2-3.3Z" />
    <circle cx="11.6" cy="12" r="1.15" fill="currentColor" stroke="none" />
  </>
);

const vial = (
  <>
    <path d="M10 3.4h4" />
    <path d="M11.2 3.4v3L8.6 12a3.4 3.4 0 0 0 3 5.2h.8a3.4 3.4 0 0 0 3-5.2L12.8 6.4v-3" />
    <path d="M9.4 13h5.2" />
  </>
);

const lens = (
  <>
    <circle cx="10.4" cy="10.4" r="4.8" />
    <path d="m14 14 4.8 4.8" />
  </>
);

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

const wolf = (
  <>
    <path d="M4.6 2.8 8.4 7.4h7.2l3.8-4.6.3 8 2.1 2.7-5.1 2.1L12 21.2 7.3 15.6 2.2 13.5l2.1-2.7Z" />
    <path d="M8.2 11.2 10.4 12.4M15.8 11.2 13.6 12.4M11.2 16.4h1.6" />
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
  seer: eye,
  doctor: vial,
  detective: (
    <>
      {lens}
      <circle cx="8.8" cy="9.8" r=".7" fill="currentColor" stroke="none" />
      <circle cx="12" cy="9.8" r=".7" fill="currentColor" stroke="none" />
    </>
  ),
  roleblocker: (
    <>
      <circle cx="7.6" cy="8.2" r="2.3" />
      <path d="m9.4 9.6 6.2 6.2M13.8 14.2h2.4M13.8 16.2h1.7" />
      <path d="M16.8 6.2 9.2 15.2" />
      <circle cx="17.4" cy="5.6" r="1.15" />
      <circle cx="14.8" cy="8.4" r="1.15" />
    </>
  ),
  vigilante: (
    <>
      <path d="M9.2 4.2h5.6v8.4a2.8 2.8 0 0 1-5.6 0Z" />
      <path d="M9.6 12.4h4.8" />
      <circle cx="12" cy="8" r="1.05" />
    </>
  ),
  mayor: seal,
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
  "alpha-werewolf": wolf,
  "seer-werewolf": (
    <>
      <path d="M8.2 8.2 9.6 5.2 11.2 8" />
      <path d="M12.8 8 14.4 5.2 15.8 8.2" />
      {eye}
    </>
  ),
  "guardian-werewolf": shield,
  "roleblocker-werewolf": chain,
  "serial-killer": knife,
  fool: (
    <>
      <path d="M6.4 9.2c0-2.8 2.4-4.8 5.6-4.8s5.6 2 5.6 4.8v2.6c0 3.4-2.4 5.8-5.6 6.8-3.2-1-5.6-3.4-5.6-6.8Z" />
      <circle cx="9.6" cy="10.6" r="1" />
      <circle cx="14.4" cy="10.6" r="1" />
      <path d="M10 13.8c.9.8 3.1.8 4 0" />
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
      return eye;
    case "compare":
      return lens;
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
