"use client";

import { useCreateWallet, usePrivy, useWallets } from "@privy-io/react-auth";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { FactionIcon } from "@/components/faction-icon";
import { PlayerCharacter } from "@/components/main-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Gender } from "@/components/auth/character";
import {
  ACHIEVEMENTS,
  type Achievement,
  type AchievementMark as AchievementMarkName,
} from "@/lib/achievements";
import { FACTION_LABEL, type RoleStat } from "@/lib/roles";

type ProfilePlayer = {
  userId: string;
  playerId: string;
  username: string;
  gender: Gender;
  memberSince: string;
  level: number;
  xp: number;
  rank: string;
  stats: {
    matches: number;
    wins: number;
    correctVotes: number;
  };
  achievements: {
    id: string;
    name: string;
    description: string;
    unlockedAt: string;
  }[];
  matchHistory: {
    id: string;
    result: "win" | "loss";
    role: string;
    faction: "good" | "werewolf" | "solo" | "neutral";
    xpEarned: number;
    playedAt: string;
  }[];
  factionRecord: Record<
    "good" | "werewolf" | "solo" | "neutral",
    { games: number; wins: number }
  >;
  roleStats: RoleStat[];
};

export function Profile({
  player,
  onBack,
}: {
  player: ProfilePlayer;
  onBack: () => void;
}) {
  const { user, logout } = usePrivy();
  const { ready: walletsReady, wallets } = useWallets();
  const [createdAddress, setCreatedAddress] = useState("");
  const [walletError, setWalletError] = useState("");
  const [copied, setCopied] = useState(false);
  const attemptedWallet = useRef(false);
  const { createWallet } = useCreateWallet({
    onError: () => setWalletError("Could not load your on-chain identity."),
  });
  const embedded = wallets.find((wallet) => wallet.walletClientType === "privy");
  const linkedEmbedded = user?.linkedAccounts.find(
    (account) =>
      account.type === "wallet" && account.walletClientType === "privy",
  );
  const linkedAddress =
    linkedEmbedded &&
    "address" in linkedEmbedded &&
    typeof linkedEmbedded.address === "string"
      ? linkedEmbedded.address
      : "";
  const address = embedded?.address || linkedAddress || createdAddress;
  const winRate =
    player.stats.matches > 0
      ? `${Math.round((player.stats.wins / player.stats.matches) * 100)}%`
      : "—";
  const xpGoal = 100;
  const xpProgress = Math.min(100, Math.max(0, (player.xp / xpGoal) * 100));
  const memberSince = new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(new Date(player.memberSince));
  const [showAllAchievements, setShowAllAchievements] = useState(false);
  const unlockedIds = new Set(player.achievements.map((achievement) => achievement.id));
  const unlockedCount = ACHIEVEMENTS.filter((achievement) =>
    unlockedIds.has(achievement.id),
  ).length;
  const shownAchievements = showAllAchievements
    ? ACHIEVEMENTS
    : [
        ...ACHIEVEMENTS.filter((achievement) => unlockedIds.has(achievement.id)),
        ...ACHIEVEMENTS.filter((achievement) => !unlockedIds.has(achievement.id)),
      ].slice(0, 4);
  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "";

  useEffect(() => {
    if (
      !walletsReady ||
      !user ||
      address ||
      walletError ||
      attemptedWallet.current
    ) {
      return;
    }
    attemptedWallet.current = true;
    void createWallet()
      .then((wallet) => setCreatedAddress(wallet.address))
      .catch(() => setWalletError("Could not load your on-chain identity."));
  }, [address, createWallet, user, walletError, walletsReady]);

  return (
    <main className="room account profile-page profile-passport">
      <ThemeToggle className="account-theme-toggle" />
      <div className="profile-shell">
        <p className="kicker profile-page-label">Player Profile</p>

        <header className="profile-identity">
          <div className="profile-portrait">
            <ProfileCrest />
            <PlayerCharacter
              gender={player.gender}
              className="profile-avatar-character"
            />
          </div>

          <div className="profile-identity-copy">
            <h1 className="display">{player.username}</h1>
            <p className="profile-public-id">
              <strong aria-label={`Player ID ${player.playerId}`}>{player.playerId}</strong>
            </p>
            <p className="profile-verified">
              <span className="profile-status-dot" />
              Network verified
            </p>

            <div className="profile-progression">
              <div className="profile-level-line">
                <span>Level <strong>{player.level}</strong></span>
                <span>{player.rank}</span>
              </div>
              <div className="profile-xp-row">
                <div
                  className="profile-xp-track"
                  role="progressbar"
                  aria-label="Experience progress"
                  aria-valuemin={0}
                  aria-valuemax={xpGoal}
                  aria-valuenow={Math.min(player.xp, xpGoal)}
                >
                  <span style={{ width: `${xpProgress}%` }} />
                </div>
                <span>{player.xp} / {xpGoal} XP</span>
              </div>
            </div>

            <p className="profile-member">Member since {memberSince}</p>
          </div>
        </header>

        <section className="profile-section profile-record">
          <h2>Player Record</h2>
          <ul className="profile-stats">
            <StatTile icon={<MatchesMark />} label="Matches" value={player.stats.matches} />
            <StatTile icon={<WinsMark />} label="Wins" value={player.stats.wins} />
            <StatTile icon={<WinRateMark />} label="Win rate" value={winRate} />
          </ul>
        </section>

        <section className="profile-section profile-factions">
          <h2>Faction Record</h2>
          <ul className="profile-faction-badges">
            {(["good", "werewolf", "solo", "neutral"] as const).map((faction) => (
              <li key={faction} data-faction={faction}>
                <span className="profile-faction-emblem">
                  <FactionIcon faction={faction} className="profile-faction-mark" />
                </span>
                <strong>{faction}</strong>
                <span className="profile-faction-tally">
                  {player.factionRecord[faction].wins} Wins
                  <span aria-hidden="true"> • </span>
                  {player.factionRecord[faction].games} Games
                </span>
              </li>
            ))}
          </ul>
        </section>

        <div className="profile-lower-grid">
          <section className="profile-section profile-achievements">
            <div className="profile-section-heading">
              <h2>Achievements</h2>
              <span>{unlockedCount} / {ACHIEVEMENTS.length}</span>
            </div>
            <ul className="profile-achievement-grid">
              {shownAchievements.map((achievement) => (
                <AchievementMedallion
                  key={achievement.id}
                  achievement={achievement}
                  unlocked={unlockedIds.has(achievement.id)}
                />
              ))}
              <li>
                <button
                  className="profile-achievement profile-achievement-more"
                  type="button"
                  aria-expanded={showAllAchievements}
                  onClick={() => setShowAllAchievements((open) => !open)}
                >
                  <span className="profile-medallion">
                    <ArrowMark open={showAllAchievements} />
                  </span>
                  <span className="profile-achievement-name">
                    {showAllAchievements ? "Show less" : "View all"}
                  </span>
                </button>
              </li>
            </ul>
          </section>

          <section className="profile-section profile-history">
            <h2>Match History</h2>
            {player.matchHistory.length > 0 ? (
              <ul className="profile-records">
                {player.matchHistory.map((match) => (
                  <li key={match.id}>
                    <div>
                      <strong>{match.role}</strong>
                      <span>{match.faction.toUpperCase()}</span>
                      <time dateTime={match.playedAt}>
                        {new Intl.DateTimeFormat("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }).format(new Date(match.playedAt))}
                      </time>
                    </div>
                    <div>
                      <strong>{match.result === "win" ? "Victory" : "Defeat"}</strong>
                      <span>+{match.xpEarned} XP</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyRecord icon={<HistoryMark />}>
                No matches played yet.
              </EmptyRecord>
            )}
          </section>

          <section className="profile-section profile-roles">
            <h2>Role Stats</h2>
            {player.roleStats.length > 0 ? (
              <ul className="profile-role-grid">
                {player.roleStats.map((stat) => (
                  <li key={stat.roleId}>
                    <RoleStatCard stat={stat} />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="profile-role-empty">
                <RoleMark />
                <div>
                  <strong>No role stats yet</strong>
                  <span>Play your first match to start building your role record.</span>
                </div>
              </div>
            )}
          </section>
        </div>

        <section className="profile-section profile-chain" aria-label="Network Passport">
          <svg className="profile-passport-mesh" viewBox="0 0 640 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <path d="M8 38h70l46 42h90l40-42h120l48 36h90l48-28" />
            <path d="M24 128h86l40-48" />
            <path d="M214 146h70l36-44" />
            <path d="M360 132h96l42-46h110" />
            <path d="M124 38v78M254 38v70M414 38v94" />
            <circle cx="8" cy="38" r="2" />
            <circle cx="78" cy="38" r="2.2" />
            <circle cx="124" cy="80" r="2.3" />
            <circle cx="214" cy="80" r="2" />
            <circle cx="254" cy="38" r="2.2" />
            <circle cx="374" cy="38" r="2" />
            <circle cx="422" cy="74" r="2.2" />
            <circle cx="512" cy="74" r="2" />
            <circle cx="560" cy="46" r="2.1" />
            <circle cx="110" cy="128" r="2" />
            <circle cx="284" cy="146" r="1.8" />
            <circle cx="456" cy="132" r="2" />
            <circle cx="608" cy="86" r="1.8" />
          </svg>
          <header className="profile-passport-head">
            <p>Network Passport</p>
            <span className="profile-passport-verified">{address ? "Verified" : "Pending"}</span>
          </header>
          <div className="profile-passport-identity">
            <span className="profile-passport-glyph" aria-hidden="true">◈</span>
            <div>
              <p>Embedded identity</p>
              <div className="profile-wallet-value">
                {address ? (
                  <>
                    <span title={address}>{shortAddress}</span>
                    <button
                      type="button"
                      aria-label={copied ? "Address copied" : "Copy address"}
                      onClick={() => {
                        void copyText(address).then((ok) => {
                          if (!ok) return;
                          setCopied(true);
                          window.setTimeout(() => setCopied(false), 1600);
                        });
                      }}
                    >
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </>
                ) : walletError ? (
                  <span className="profile-wallet-error">{walletError}</span>
                ) : (
                  <span>Loading identity…</span>
                )}
              </div>
            </div>
          </div>
          <footer className="profile-passport-foot">
            <span>Trustless Network</span>
            <strong className="profile-wallet-status">{walletError ? "Unavailable" : address ? "Active" : "Waiting"}</strong>
          </footer>
        </section>

        <footer className="profile-footer">
          <button className="profile-menu-action" type="button" onClick={onBack}>
            Main menu
          </button>
          <button className="profile-signout" type="button" onClick={() => void logout()}>
            Sign out
          </button>
        </footer>
      </div>
    </main>
  );
}

async function copyText(value: string) {
  try {
    if (navigator.clipboard && document.hasFocus()) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // The page can lose focus between click and write. Try the fallback.
  }
  try {
    const field = document.createElement("textarea");
    field.value = value;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.focus();
    field.select();
    const ok = document.execCommand("copy");
    field.remove();
    return ok;
  } catch {
    return false;
  }
}

function EmptyRecord({
  icon,
  children,
}: {
  icon: ReactNode;
  children: string;
}) {
  return (
    <p className="profile-empty">
      {icon}
      <span>{children}</span>
    </p>
  );
}

function StatTile({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <li className="profile-stat">
      <div className="profile-stat-tile">
        {icon}
        <strong>{value}</strong>
      </div>
      <span>{label}</span>
    </li>
  );
}

function MatchesMark() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <path d="M3.4 3.4 12 12M10.2 13.8l3.6-3.6M12.6 12.6l2 2" />
      <path d="M14.6 3.4 6 12M4.2 10.2l3.6 3.6M5.4 12.6l-2 2" />
    </svg>
  );
}

function WinsMark() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <path d="m2.8 6 3.4 2.8L9 3.6l2.8 5.2L15.2 6l-1.4 7.4H4.2Z" />
      <path d="M4.2 15.4h9.6" />
    </svg>
  );
}

function WinRateMark() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <circle cx="9" cy="9" r="6.2" />
      <circle cx="9" cy="9" r="3.2" />
      <circle cx="9" cy="9" r="0.6" />
    </svg>
  );
}

function RoleStatCard({
  stat,
  onSelect,
}: {
  stat: RoleStat;
  onSelect?: (stat: RoleStat) => void;
}) {
  const monogram = stat.roleName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  const content = (
    <>
      <div className="profile-role-head">
        <span className="profile-role-emblem" aria-hidden="true">
          {monogram}
        </span>
        <div className="profile-role-title">
          <strong>{stat.roleName}</strong>
          <span className="profile-role-faction">
            <FactionIcon faction={stat.faction} className="profile-role-faction-mark" />
            {FACTION_LABEL[stat.faction]}
          </span>
        </div>
      </div>
      <div className="profile-role-numbers">
        <span className="profile-role-wins">
          <strong>{stat.wins}</strong> {stat.wins === 1 ? "Win" : "Wins"}
        </span>
        <span>{stat.gamesPlayed} Played</span>
        <span>
          <strong>{stat.winRate}%</strong> Win rate
        </span>
      </div>
      <div className="profile-role-bar" aria-hidden="true">
        <span style={{ width: `${stat.winRate}%` }} />
      </div>
    </>
  );

  return onSelect ? (
    <button
      className="profile-role-card"
      type="button"
      data-faction={stat.faction}
      onClick={() => onSelect(stat)}
    >
      {content}
    </button>
  ) : (
    <article className="profile-role-card" data-faction={stat.faction}>
      {content}
    </article>
  );
}

function AchievementMedallion({
  achievement,
  unlocked,
}: {
  achievement: Achievement;
  unlocked: boolean;
}) {
  const hidden = achievement.secret && !unlocked;
  const name = hidden ? "???" : achievement.name;
  const detail = hidden ? "Hidden achievement" : achievement.description;

  return (
    <li
      className="profile-achievement"
      data-state={unlocked ? "unlocked" : "locked"}
      title={`${name}: ${detail}`}
      aria-label={`${name}, ${unlocked ? "unlocked" : "locked"}. ${detail}`}
    >
      <span className="profile-medallion">
        {unlocked ? <AchievementGlyph mark={achievement.mark} /> : <LockMark />}
      </span>
      <span className="profile-achievement-name">{name}</span>
    </li>
  );
}

function AchievementGlyph({ mark }: { mark: AchievementMarkName }) {
  if (mark === "good" || mark === "werewolf" || mark === "solo" || mark === "neutral") {
    return <FactionIcon faction={mark} className="profile-medallion-mark" />;
  }

  return (
    <svg className="profile-medallion-mark" viewBox="0 0 16 16" aria-hidden="true">
      {mark === "blood" ? (
        <path d="M8 2.2c2.4 3.2 3.8 5.3 3.8 7.2a3.8 3.8 0 0 1-7.6 0c0-1.9 1.4-4 3.8-7.2Z" />
      ) : mark === "eye" ? (
        <>
          <path d="M1.8 8c1.6-2.8 3.7-4.2 6.2-4.2s4.6 1.4 6.2 4.2c-1.6 2.8-3.7 4.2-6.2 4.2S3.4 10.8 1.8 8Z" />
          <circle cx="8" cy="8" r="1.9" />
        </>
      ) : mark === "moon" ? (
        <path d="M10.6 2.4a5.8 5.8 0 1 0 3 8.8 4.6 4.6 0 0 1-3-8.8Z" />
      ) : mark === "shield" ? (
        <path d="M8 1.8 13.2 3.8v4c0 3-2.2 5.2-5.2 6.4-3-1.2-5.2-3.4-5.2-6.4v-4Z" />
      ) : mark === "crown" ? (
        <>
          <path d="m2.4 5.2 3 2.6L8 3l2.6 4.8 3-2.6-1.2 6.6H3.6Z" />
          <path d="M3.6 13.4h8.8" />
        </>
      ) : mark === "vote" ? (
        <>
          <path d="M2.8 7.4h10.4v6.4H2.8Z" />
          <path d="m5.6 4.6 1.8 1.8 3.4-3.6" />
        </>
      ) : (
        <path d="m8 1.8 1.8 4 4.4.4-3.3 2.9 1 4.3L8 11.2l-3.9 2.2 1-4.3-3.3-2.9 4.4-.4Z" />
      )}
    </svg>
  );
}

function ProfileCrest() {
  const seats = Array.from({ length: 16 }, (_, index) => {
    const turn = -0.3 + (index / 15) * 0.6;
    const angle = turn * Math.PI * 2 - Math.PI / 2;
    return {
      cx: 100 + Math.cos(angle) * 72,
      cy: 104 + Math.sin(angle) * 72,
    };
  });

  return (
    <svg className="profile-crest" viewBox="0 0 200 200" aria-hidden="true">
      <path d="M88 22a14 14 0 0 1 24-8" />
      <path d="M31.5 126A72 72 0 1 1 168.5 126" />
      {seats.map((seat, index) => (
        <circle key={index} className="seat" cx={seat.cx} cy={seat.cy} r="2.15" />
      ))}
    </svg>
  );
}

function LockMark() {
  return (
    <svg className="profile-medallion-mark" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M4 7.2h8v6.4H4Z" />
      <path d="M5.6 7.2V5.4a2.4 2.4 0 0 1 4.8 0v1.8" />
      <path d="M8 9.8v1.4" />
    </svg>
  );
}

function ArrowMark({ open }: { open: boolean }) {
  return (
    <svg className="profile-medallion-mark" viewBox="0 0 16 16" aria-hidden="true">
      {open ? <path d="M12.6 8H3.4M7 4.4 3.4 8 7 11.6" /> : <path d="M3.4 8h9.2M9 4.4l3.6 3.6L9 11.6" />}
    </svg>
  );
}

function HistoryMark() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <path d="M3.2 4.2h11.6v10.2H3.2Z" />
      <path d="M3.2 7.4h11.6M6.4 3v2.4M11.6 3v2.4" />
    </svg>
  );
}

function RoleMark() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <path d="M4 3.2h7.2L15 7v7.8H4Z" />
      <path d="M11.2 3.4V7H15" />
    </svg>
  );
}

