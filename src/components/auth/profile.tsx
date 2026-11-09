"use client";

import { useCreateWallet, usePrivy, useWallets } from "@privy-io/react-auth";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { FactionIcon } from "@/components/faction-icon";
import { PlayerCharacter } from "@/components/main-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Gender } from "@/components/auth/character";

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
  mostPlayedRoles: {
    role: string;
    games: number;
  }[];
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
          <svg className="profile-crest" viewBox="0 0 460 320" aria-hidden="true">
            <path d="M18 86c78-52 150-30 214 20 46 36 98 42 150 18" />
            <path d="M34 124c68-38 132-18 190 26 40 30 86 36 136 16" />
            <circle cx="22" cy="90" r="3.2" />
            <circle cx="126" cy="52" r="2.5" />
            <circle cx="228" cy="104" r="3" />
            <circle cx="348" cy="78" r="2.6" />
            <circle cx="438" cy="112" r="2.2" />
            <circle className="profile-crest-ring" cx="156" cy="128" r="96" />
            <circle className="profile-crest-ring" cx="156" cy="128" r="68" />
            <path d="M156 44v168M72 128h168" />
          </svg>
          <div className="profile-portrait">
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
              <span>{player.achievements.length} / 24 unlocked</span>
            </div>
            {player.achievements.length > 0 ? (
              <ul className="profile-records">
                {player.achievements.map((achievement) => (
                  <li key={achievement.id}>
                    <strong>{achievement.name}</strong>
                    <span>{achievement.description}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyRecord icon={<AchievementMark />}>
                No achievements unlocked yet.
              </EmptyRecord>
            )}
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
            <h2>Most Played Roles</h2>
            {player.mostPlayedRoles.length > 0 ? (
              <ol className="profile-role-list">
                {player.mostPlayedRoles.map((role) => (
                  <li key={role.role}>
                    <span>{role.role}</span>
                    <strong>{role.games} games</strong>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyRecord icon={<RoleMark />}>
                No roles played yet.
              </EmptyRecord>
            )}
          </section>
        </div>

        <section className="profile-section profile-chain">
          <div>
            <p className="kicker">On-chain Identity</p>
            <h2>Network Passport</h2>
          </div>
          <dl>
            <div className="profile-wallet-record">
              <IdentityMark />
              <div>
                <dt>Embedded wallet</dt>
                <dd className="profile-wallet-value">
                  {address ? (
                    <>
                      <span title={address}>{shortAddress}</span>
                      <span className="profile-wallet-status">Active</span>
                      <button
                        type="button"
                        aria-label={copied ? "Address copied" : "Copy address"}
                        title={copied ? "Copied" : "Copy address"}
                        onClick={() => {
                          void navigator.clipboard.writeText(address).then(() => {
                            setCopied(true);
                            window.setTimeout(() => setCopied(false), 1600);
                          });
                        }}
                      >
                        <CopyMark copied={copied} />
                      </button>
                    </>
                  ) : walletError ? (
                    <span className="profile-wallet-error">{walletError}</span>
                  ) : (
                    <span>Loading identity…</span>
                  )}
                </dd>
              </div>
            </div>
          </dl>
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

function AchievementMark() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <circle cx="9" cy="7" r="4.2" />
      <path d="m6.2 10.4-1.3 5.2L9 13.4l4.1 2.2-1.3-5.2" />
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

function IdentityMark() {
  return (
    <svg className="profile-identity-mark" viewBox="0 0 18 18" aria-hidden="true">
      <circle cx="9" cy="9" r="2" />
      <path d="M9 2.4v2.2M9 13.4v2.2M2.4 9h2.2M13.4 9h2.2M4.3 4.3l1.6 1.6M12.1 12.1l1.6 1.6M13.7 4.3l-1.6 1.6M5.9 12.1l-1.6 1.6" />
    </svg>
  );
}

function CopyMark({ copied }: { copied: boolean }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      {copied ? (
        <path d="m3.2 8.2 3 3.1 6.6-6.8" />
      ) : (
        <>
          <path d="M5.2 5.2h7.2v8H5.2Z" />
          <path d="M3.6 10.6V2.8h7.2" />
        </>
      )}
    </svg>
  );
}
