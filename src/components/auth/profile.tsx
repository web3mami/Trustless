"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";

export function Profile({ onBack }: { onBack: () => void }) {
  const { user, logout } = usePrivy();
  const { wallets } = useWallets();
  const embedded = wallets.find((wallet) => wallet.walletClientType === "privy");
  const address = embedded?.address ?? user?.wallet?.address ?? "";
  const mail = user?.email?.address ?? user?.google?.email ?? "";
  const handle = user?.twitter?.username ? `@${user.twitter.username}` : "";

  return (
    <main className="room account">
      <div className="gate-card">
        <p className="kicker">Profile</p>
        <h1 className="display">Your seat</h1>
        <p className="lede">The wallet was created when you signed in.</p>
        <dl className="account-list">
          <div>
            <dt>Identity</dt>
            <dd>{handle || mail || "Signed in"}</dd>
          </div>
          <div>
            <dt>Wallet</dt>
            <dd className="account-wallet">{address || "Creating…"}</dd>
          </div>
        </dl>
        <div className="account-actions">
          <button className="text-btn" type="button" onClick={onBack}>
            Back
          </button>
          <button className="text-btn" type="button" onClick={() => void logout()}>
            Sign out
          </button>
        </div>
      </div>
    </main>
  );
}
