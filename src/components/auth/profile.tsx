"use client";

import { useCreateWallet, usePrivy, useWallets } from "@privy-io/react-auth";
import { useEffect, useRef, useState, type ReactNode } from "react";
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
    month: "long",
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
          <div className="profile-portrait">
            <PlayerCharacter
              gender={player.gender}
              className="profile-avatar-character"
            />
          </div>

          <div className="profile-identity-copy">
            <h1 className="display">{player.username}</h1>
            <p className="profile-public-id">
              <span>Player ID</span>
              <strong>{player.playerId}</strong>
            </p>
            <dl className="profile-passport-meta">
              <div>
                <dt>Member since</dt>
                <dd>{memberSince}</dd>
              </div>
              <div>
                <dt>Network status</dt>
                <dd><span className="profile-status-dot" />Verified</dd>
              </div>
            </dl>
          </div>

          <div className="profile-progression">
            <div>
              <span>Level</span>
              <strong>{player.level}</strong>
            </div>
            <p>{player.rank}</p>
            <div className="profile-xp-copy">
              <span>XP</span>
              <span>{player.xp} / {xpGoal} XP</span>
            </div>
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
          </div>
        </header>

        <section className="profile-section profile-record">
          <h2>Player Record</h2>
          <dl className="profile-stats">
            <div><dt>Matches</dt><dd>{player.stats.matches}</dd></div>
            <div><dt>Wins</dt><dd>{player.stats.wins}</dd></div>
            <div><dt>Win rate</dt><dd>{winRate}</dd></div>
            <div><dt>Correct votes</dt><dd>{player.stats.correctVotes}</dd></div>
          </dl>
        </section>

        <section className="profile-section profile-factions">
          <h2>Faction Record</h2>
          <dl>
            {(["good", "werewolf", "solo", "neutral"] as const).map((faction) => (
              <div key={faction} data-faction={faction}>
                <dt>
                  <FactionMark faction={faction} />
                  {faction}
                </dt>
                <dd>
                  <strong>{player.factionRecord[faction].wins}</strong>
                  <span>/ {player.factionRecord[faction].games} games</span>
                </dd>
              </div>
            ))}
          </dl>
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

function FactionMark({
  faction,
}: {
  faction: "good" | "werewolf" | "solo" | "neutral";
}) {
  return (
    <svg className="profile-faction-mark" viewBox="0 0 16 16" aria-hidden="true">
      {faction === "good" ? (
        <path d="M8 1.8 13 4v4.2c0 2.7-1.8 4.6-5 5.8-3.2-1.2-5-3.1-5-5.8V4Z" />
      ) : faction === "werewolf" ? (
        <path d="M9.8 2.2A5.4 5.4 0 1 0 13.7 11 4.4 4.4 0 0 1 9.8 2.2Z" />
      ) : faction === "solo" ? (
        <path d="M8 1.6 14.2 8 8 14.4 1.8 8Z" />
      ) : (
        <>
          <circle cx="8" cy="8" r="5.4" />
          <path d="M8 4.2v7.6M4.2 8h7.6" />
        </>
      )}
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
