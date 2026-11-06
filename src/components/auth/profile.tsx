"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { ThemeToggle } from "@/components/theme-toggle";

export function Profile({
  alias,
  onBack,
}: {
  alias: string;
  onBack: () => void;
}) {
  const { user, logout } = usePrivy();
  const { wallets } = useWallets();
  const embedded = wallets.find((wallet) => wallet.walletClientType === "privy");
  const external = wallets.find((wallet) => wallet.walletClientType !== "privy");
  const address = embedded?.address ?? user?.wallet?.address ?? "";
  const playerId = user?.id ?? "Unavailable";

  return (
    <main className="room account profile-page">
      <ThemeToggle className="account-theme-toggle" />
      <div className="profile-shell">
        <header className="profile-header">
          <div>
            <p className="kicker">Player Profile</p>
            <h1 className="display">{alias}</h1>
            <p className="profile-id">{playerId}</p>
          </div>
          <div className="profile-level">
            <span>Level</span>
            <strong>1</strong>
            <small>Unranked</small>
          </div>
        </header>

        <section className="profile-section">
          <h2>Match Statistics</h2>
          <dl className="profile-stats">
            <div><dt>Matches</dt><dd>0</dd></div>
            <div><dt>Wins</dt><dd>0</dd></div>
            <div><dt>Win rate</dt><dd>—</dd></div>
            <div><dt>Correct votes</dt><dd>0</dd></div>
          </dl>
        </section>

        <div className="profile-columns">
          <section className="profile-section">
            <h2>Achievements</h2>
            <p className="profile-empty">No achievements unlocked yet.</p>
          </section>
          <section className="profile-section">
            <h2>Match History</h2>
            <p className="profile-empty">No matches played yet.</p>
          </section>
        </div>

        <section className="profile-section profile-chain">
          <div>
            <p className="kicker">On-chain Identity</p>
            <h2>Embedded wallet</h2>
          </div>
          <dl>
            <div>
              <dt>Wallet address</dt>
              <dd>{address || "Creating…"}</dd>
            </div>
            <div>
              <dt>External wallet</dt>
              <dd>{external?.address ?? "Not connected"}</dd>
            </div>
          </dl>
        </section>

        <footer className="account-actions">
          <button className="text-btn" type="button" onClick={onBack}>
            Main menu
          </button>
          <button className="text-btn" type="button" onClick={() => void logout()}>
            Sign out
          </button>
        </footer>
      </div>
    </main>
  );
}
