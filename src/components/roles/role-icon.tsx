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
  { id: "doctor", label: "Medical kit" },
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
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      {children}
    </svg>
  );
}

function circle(cx: number, cy: number, r: number) {
  return `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0z`;
}

function Paint({ d, fill, rule }: { d: string; fill: string; rule?: "evenodd" }) {
  return <path d={d} fill={fill} fillRule={rule} stroke="#120e0c" strokeWidth="0.55" strokeLinejoin="round" />;
}

function Ring({ cx, cy, r, hole, fill }: { cx: number; cy: number; r: number; hole: number; fill: string }) {
  return <Paint d={`${circle(cx, cy, r)}${circle(cx, cy, hole)}`} fill={fill} rule="evenodd" />;
}

function Dot({ cx, cy, r, fill }: { cx: number; cy: number; r: number; fill: string }) {
  return <Paint d={circle(cx, cy, r)} fill={fill} />;
}

function segment(start: number, end: number) {
  const at = (radius: number, angle: number) => {
    const rad = (angle * Math.PI) / 180;
    return [32 + radius * Math.cos(rad), 32 + radius * Math.sin(rad)];
  };
  const [x0, y0] = at(29, start);
  const [x1, y1] = at(29, end);
  const [x2, y2] = at(22, end);
  const [x3, y3] = at(22, start);
  return `M${x0.toFixed(1)} ${y0.toFixed(1)}A29 29 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}A22 22 0 0 0 ${x3.toFixed(1)} ${y3.toFixed(1)}Z`;
}

const MARKS: Record<string, ReactNode> = {
  villager: (
    <>
      <Ring cx={32} cy={7} r={4.2} hole={2} fill="#8d7344" />
      <Paint d="M20 11h24l3 7H17z" fill="#5c4a2e" />
      <Paint d="M16 18h32l-3 26H19z" fill="#c6a15a" />
      <Paint d="M26 27 32 21l6 6v10H26z" fill="#3a2c20" />
      <Paint d="M17 44h30l3 8H14z" fill="#4a3b24" />
    </>
  ),
  "chain-analyst": (
    <>
      <Paint d={segment(-72, -18)} fill="#8d7344" />
      <Paint d={segment(18, 72)} fill="#8d7344" />
      <Paint d={segment(108, 162)} fill="#8d7344" />
      <Paint d={segment(198, 252)} fill="#8d7344" />
      <Paint d="M16 32c4-11 28-11 32 0-4 11-28 11-32 0z" fill="#e7e1d6" />
      <Dot cx={32} cy={32} r={6.4} fill="#3d6452" />
      <Dot cx={32} cy={32} r={2.6} fill="#16120f" />
    </>
  ),
  doctor: (
    <>
      <Paint d="M47 14h9v16a4.5 3 0 0 1-9 0z" fill="#e4dccb" />
      <Paint d="M47 14a4.5 2.4 0 0 1 9 0 4.5 2.4 0 0 1-9 0z" fill="#f3ece0" />
      <Paint d="M47 20h9v2.4H47z" fill="#c9b89a" />
      <Paint d="M24 10c0-5 12-5 12 0h-2.4c0-2.4-7.2-2.4-7.2 0z" fill="#6a4a30" />
      <Paint d="M16 16h26v14c0 8-26 8-26 0z" fill="#4a3226" />
      <Paint d="M16 16h26v5c-5 5-21 5-26 0z" fill="#6e4b36" />
      <Paint d="M25 24h2.2v3.2h3.2v2.2h-3.2V33H25v-3.6h-3.2v-2.2H25z" fill="#8a3a34" />
      <Paint d="M7 28h5v4H7z" fill="#6a4a30" />
      <Paint d="M8 32h3v5H8z" fill="#d5e0e2" />
      <Paint d="M5 37h9v12a4.5 4.5 0 0 1-9 0z" fill="#d7e2e4" />
      <Paint d="M6 44h7v5a3.5 3.5 0 0 1-7 0z" fill="#2f6a4e" />
      <Paint d="M30 36v-8h2.6V36zm4.2-1.2V24h2.6v12.2zm4.2 1.2v-8h2.6V36z" fill="#c4a484" />
      <Paint d="M28 36h16c2 8 0 14-8 14s-10-6-8-14z" fill="#b89270" />
      <Paint d="M24 42c-4 0-5 4-2 6 2 1 5 0 5-3z" fill="#c4a484" />
      <Paint d="M34.2 42h2.2v1.6h1.6v2.2h-1.6V48h-2.2v-2.2h-1.6v-2.2h1.6z" fill="#8a3a34" />
    </>
  ),
  investigator: (
    <>
      <Ring cx={24} cy={27} r={21} hole={16} fill="#8d7344" />
      <Dot cx={24} cy={27} r={15.2} fill="#c5d4d8" />
      <Dot cx={16} cy={23} r={3.6} fill="#2a241c" />
      <Paint d="M11 28h10l1 8H10z" fill="#2a241c" />
      <Dot cx={31} cy={25} r={3} fill="#2a241c" />
      <Paint d="M27 30h8l1 7H26z" fill="#2a241c" />
      <Paint d="m38 40 16 18-5 4-16-18z" fill="#4a3226" />
    </>
  ),
  roleblocker: (
    <>
      <Ring cx={15} cy={32} r={12} hole={6.2} fill="#8b929e" />
      <Ring cx={49} cy={32} r={12} hole={6.2} fill="#8b929e" />
      <Ring cx={30} cy={32} r={4.4} hole={2} fill="#5e6672" />
      <Ring cx={34} cy={32} r={4.4} hole={2} fill="#5e6672" />
      <Paint d="M3 28h5v8H3zm53 0h5v8h-5z" fill="#3e4652" />
    </>
  ),
  vigilante: (
    <>
      <Paint d="M6 34C16 10 48 10 58 34l-6 1C42 18 22 18 12 35z" fill="#3e2a1e" />
      <Paint d="M14 36h36v2.2H14z" fill="#cbbfa6" />
      <Paint d="M26 22h14l12 7-12 7H26z" fill="#a8b0bb" />
      <Paint d="M30 38h6v18h-6z" fill="#5c4030" />
    </>
  ),
  governor: (
    <>
      <Ring cx={32} cy={32} r={29} hole={22} fill="#8d7344" />
      <Dot cx={32} cy={32} r={21} fill="#efe6d4" />
      <Paint d="M16 35 32 22l16 13v2.4H16z" fill="#3d5c48" />
      <Paint d="M17 38h30v3H17zM19 41h6v11h-6zm20 0h6v11h-6zM16 51h32v4H16z" fill="#2c4536" />
    </>
  ),
  tracker: (
    <>
      <Paint d="M14 36c-5 2-7 14-2 19 3 4 13 3 15-3 2-10-5-18-13-16z" fill="#5c4030" />
      <Dot cx={12} cy={32} r={2.6} fill="#a88868" />
      <Dot cx={18} cy={29} r={2.6} fill="#a88868" />
      <Dot cx={24} cy={33} r={2.4} fill="#a88868" />
      <Paint d="M40 16c-4 2-6 10-2 15 3 3 11 2 13-3 2-8-4-14-11-12z" fill="#6e4e38" />
      <Dot cx={39} cy={13} r={2.2} fill="#c4aa8c" />
      <Dot cx={44} cy={10} r={2.2} fill="#c4aa8c" />
      <Dot cx={50} cy={14} r={2} fill="#c4aa8c" />
      <Paint d="m30 30 6-4 1.2 2-6 4zm2 8 6-4 1.2 2-6 4z" fill="#cbbfa6" />
    </>
  ),
  medium: (
    <>
      <Paint d="M40 12c8 1 12 8 5 12 4-6-1-11-5-12z" fill="#8eb4c9" />
      <Paint d="M32 6c7 6 6 14 0 18-6-4-7-12 0-18z" fill="#c47832" />
      <Paint d="M32 11c3 3 2.4 6 0 8-2.4-2-3-5 0-8z" fill="#f0d7a4" />
      <Paint d="M26 28h12l1.4 20H24.6z" fill="#e6dcc8" />
      <Paint d="M24 34c-6 1-6 8 0 7z" fill="#cbbfa6" />
      <Paint d="M20 48h24v6H20z" fill="#b7a88c" />
    </>
  ),
  "alpha-werewolf": (
    <>
      <Paint d="M8 31h48v7H8z" fill="#2e2824" />
      <Paint d="m12 31 7-20 7 20zm15 0L32 6l6 25zm14 0 6-18 7 18z" fill="#e4dcc8" />
      <Paint d="m14 38 7 20 8-20zm20 0 8 20 7-20z" fill="#d4cbb8" />
    </>
  ),
  "seer-werewolf": (
    <>
      <Ring cx={32} cy={32} r={30} hole={26.8} fill="#6e3330" />
      <Paint d="m16 22-3-8 6 5zm32-3 6-7-1 9z" fill="#4a2422" />
      <Paint d="M10 34 22 22h20l12 12-12 12H22z" fill="#e7e1d6" />
      <Paint d="M18 34 26 26h12l8 8-8 10H26z" fill="#8a4034" />
      <Paint d="M30.5 27h3v16h-3z" fill="#16120f" />
    </>
  ),
  "guardian-werewolf": (
    <>
      <Paint d="M32 4 56 16v18c0 13-24 22-24 22S8 47 8 34V16z" fill="#5e6672" />
      <Paint d="M32 12 48 20v12c0 8-16 14-16 14S16 40 16 32V20z" fill="#a8b0bb" />
      <Paint d="M29 22h6L32 44z" fill="#e4dcc8" />
    </>
  ),
  "roleblocker-werewolf": (
    <>
      <Paint d="M10 50C16 38 15 24 8 12l6-1c8 14 8 28 3 40zm14 2c6-12 5-26-2-36l6 1c7 12 7 26 2 38zm14-3c5-12 6-24 2-34l6 2c3 12 1 24-3 36z" fill="#5c2e2c" />
      <Ring cx={50} cy={22} r={7} hole={3.4} fill="#8b929e" />
      <Ring cx={55} cy={36} r={6.2} hole={3} fill="#8b929e" />
      <Paint d="m45 26 7 5-2.4 2.6-7-5z" fill="#5e6672" />
    </>
  ),
  "serial-killer": (
    <>
      <Paint d="M10 56 40 18l6 6z" fill="#c5ced6" />
      <Paint d="M32 14 52 30l-5 6L26 20z" fill="#8d7344" />
      <Paint d="M44 16 56 6l5 6-12 10z" fill="#3e2a1e" />
    </>
  ),
  rugpuller: (
    <>
      <Paint d="M34 30c6-10 12-12 16-18-4 6-8 8-12 14z" fill="#8d7344" />
      <Paint d="M12 36c2-8 12-12 22-8 8 3 16 6 14 16-3 12-16 18-26 12-8-4-12-12-10-20z" fill="#3c3148" />
      <Dot cx={22} cy={40} r={3.4} fill="#d9d0c4" />
      <Dot cx={39} cy={45} r={2.5} fill="#d9d0c4" />
      <Dot cx={22.4} cy={40.4} r={1.5} fill="#16120f" />
      <Dot cx={39.3} cy={45.4} r={1.1} fill="#16120f" />
      <Paint d="M18 52c6 4 12 2 18-4-6 4-12 5-16 2z" fill="#241c2e" />
    </>
  ),
  auditor: (
    <>
      <Paint d="M8 10h26l10 10v32H8z" fill="#efe6d4" />
      <Paint d="M34 10v10h10z" fill="#d9ccb4" />
      <Paint d="M14 28h14v2.2H14zm0 7h14v2.2H14zm0 7h9v2.2H14z" fill="#6d5c48" />
      <Ring cx={46} cy={44} r={12} hole={7} fill="#8d7344" />
      <Dot cx={46} cy={44} r={2.4} fill="#6e3330" />
    </>
  ),
  aegis: (
    <>
      <Paint d="M16 6 42 16v14c0 10-26 16-26 16S4 40 4 30V16z" fill="#3e4652" />
      <Paint d="M30 18 58 32v14c0 10-28 14-28 14S14 54 14 44V32z" fill="#8b929e" />
      <Paint d="M32 26 46 34v6c0 5-14 8-14 8s-14-3-14-8v-6z" fill="#c5ced6" />
    </>
  ),
};

function fallback(role: IconRole): ReactNode | "faction" {
  if (role.revealActivatesVote) return MARKS.governor;
  switch (role.actionType) {
    case "kill":
      return MARKS["serial-killer"];
    case "protect":
      return MARKS.aegis;
    case "investigate":
    case "read_role":
      return MARKS["chain-analyst"];
    case "read_aura":
      return MARKS.auditor;
    case "compare":
      return MARKS.investigator;
    case "block":
      return MARKS.roleblocker;
    case "track":
      return MARKS.tracker;
    case "vote_modifier":
      return MARKS.governor;
    case "special":
      return MARKS.medium;
    default:
      return "faction";
  }
}
