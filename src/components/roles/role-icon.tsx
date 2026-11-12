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
  { id: "alpha-werewolf", label: "Alpha wolf" },
  { id: "seer-werewolf", label: "Hooded wolf" },
  { id: "guardian-werewolf", label: "Shield wolf" },
  { id: "roleblocker-werewolf", label: "Chained wolf" },
  { id: "serial-killer", label: "Dagger" },
  { id: "rugpuller", label: "Trickster mask" },
];

const PAINTED_ICONS = new Set([
  "villager",
  "chain-analyst",
  "investigator",
  "auditor",
  "doctor",
  "aegis",
  "roleblocker",
  "vigilante",
  "governor",
  "tracker",
  "medium",
  "alpha-werewolf",
  "seer-werewolf",
  "guardian-werewolf",
  "roleblocker-werewolf",
  "serial-killer",
  "rugpuller",
]);

export function RoleIcon({ role, className }: { role: IconRole; className?: string }) {
  const key = role.icon || role.id;
  if (PAINTED_ICONS.has(key)) {
    return <img src={`/role-icons/${key}.png`} alt="" className={className ?? "roles-icon"} draggable={false} />;
  }
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
      <path d="M8 37 28 29 34 20 30 8 40 20 44 10 52 22c8 0 12 12 8 22l-4 12-18 4-16-8-8-7z" fill="#3c3330" stroke="#f3ecdf" strokeWidth="2.3" strokeLinejoin="round" />
      <path d="M8 37 26 31 28 41 18 49 10 43z" fill="#d9d0c4" />
      <path d="M8 37 13 35 13 40.6z" fill="#1a1210" />
      <path d="M36 31c2-2.2 6.4-2 8 .4 1.4 2.2-.6 4.8-3.6 4.6-2.4 0-4.8-2.4-4.4-5z" fill="#1a1210" />
      <path d="M40 30.2v5" stroke="#c47832" strokeWidth="1.7" strokeLinecap="round" />
    </>
  ),
  "seer-werewolf": (
    <>
      <path d="M24 30c-2-12 10-22 26-20 12 2 16 14 14 26l2 18-22 6-20-8-8-8c-2-6 2-10 8-14z" fill="#2c2426" stroke="#f3ecdf" strokeWidth="2.3" strokeLinejoin="round" />
      <path d="M22 32c2-10 12-16 22-12" fill="none" stroke="#7a4a38" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M14 38 30 30 34 22 38 12 46 24c6 2 8 12 4 20l-2 10-16 4-14-8z" fill="#5c534c" stroke="#f3ecdf" strokeWidth="2.1" strokeLinejoin="round" />
      <path d="M14 38 28 32 28 42 18 48 14 42z" fill="#d4cbb8" />
      <path d="M14 38 18 36.2 18 41.2z" fill="#1a1210" />
      <path d="M34 32c1.6-2 5.2-1.8 6.4.2 1 1.8-.4 4-2.8 3.8-2.2-.2-4-2-3.6-4z" fill="#16120f" />
      <path d="M37.2 31.2v4.6" stroke="#e7e1d6" strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),
  "guardian-werewolf": (
    <>
      <path d="M8 34 26 26 30 18 26 6 36 18 40 8 48 20c8 0 12 12 8 22l-2 12-16 4-14-8-12-6z" fill="#3e4652" stroke="#f3ecdf" strokeWidth="2.3" strokeLinejoin="round" />
      <path d="M8 34 24 28 26 38 16 46 9 40z" fill="#c5ced6" />
      <path d="M8 34 12.2 32.2 12.2 37.4z" fill="#1a1210" />
      <path d="M32 29c2-2.2 6.2-2 7.6.4 1.2 2-.8 4.6-3.4 4.4-2.4 0-4.6-2.2-4.2-4.8z" fill="#1a1210" />
      <path d="M35.6 28.4v4.8" stroke="#e4dcc8" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M36 30h16v10q0 10-8 16-8-6-8-16z" fill="#9aa3ae" stroke="#f3ecdf" strokeWidth="2" strokeLinejoin="round" />
    </>
  ),
  "roleblocker-werewolf": (
    <>
      <path d="M14 36 32 28 36 20 32 8 42 20 46 10 54 22c8 0 10 12 6 22l-4 12-18 4-16-8-8-6z" fill="#5c2e2c" stroke="#f3ecdf" strokeWidth="2.3" strokeLinejoin="round" />
      <path d="M14 36 30 30 32 40 22 48 15 42z" fill="#d4cbb8" />
      <path d="M14 36 18.4 34 18.4 39.4z" fill="#1a1210" />
      <path d="M38 31c2-2.2 6.2-2 7.6.4 1.2 2-.6 4.6-3.4 4.4-2.4 0-4.6-2.4-4.2-4.8z" fill="#1a1210" />
      <path d="M41.6 30.2v5" stroke="#e4dcc8" strokeWidth="1.5" strokeLinecap="round" />
      <ellipse cx="24" cy="44" rx="8" ry="4.6" fill="none" stroke="#c5ced6" strokeWidth="2.3" transform="rotate(-28 24 44)" />
      <ellipse cx="33" cy="49" rx="7" ry="4" fill="none" stroke="#8b929e" strokeWidth="2.2" transform="rotate(18 33 49)" />
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
      <Paint d="M8 7h28v17q0 16-14 28-14-12-14-28z" fill="#3e4652" />
      <path
        d="M12 16l3.4 4.4-1.7 3.6 3.5 3.4M15.4 20.4l2.2-2"
        fill="none"
        stroke="#14181e"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Paint d="M22 14h30v18q0 16-15 28-15-12-15-28z" fill="#9aa3ae" />
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
