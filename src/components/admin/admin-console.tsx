"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AdminApiError,
  adminLogin,
  adminLogout,
  adminSession,
} from "@/components/admin/admin-api";
import { OverviewSection } from "@/components/admin/sections/overview";
import { PlayersSection } from "@/components/admin/sections/players";
import {
  AchievementsSection,
  AdminsSection,
  AnalyticsSection,
  AuditSection,
  MatchesSection,
  ModerationSection,
  RolesFactionsSection,
  SettingsSection,
  SupportSection,
} from "@/components/admin/sections/ops";
import { EmptyState, SectionPlaceholder, StatusBadge } from "@/components/admin/ui";
import { ADMIN_NAV, findSection } from "@/lib/admin/navigation";
import { ADMIN_ROLES, can } from "@/lib/admin/permissions";
import type { AdminIdentity } from "@/lib/admin/types";

export function AdminConsole() {
  const [admin, setAdmin] = useState<AdminIdentity | null | undefined>(undefined);

  useEffect(() => {
    adminSession()
      .then(setAdmin)
      .catch(() => setAdmin(null));
  }, []);

  if (admin === undefined) {
    return <Gate title="Loading" body="Checking your admin session…" />;
  }
  if (!admin) {
    return <LoginForm onSignedIn={setAdmin} />;
  }
  return <Shell admin={admin} onSignedOut={() => setAdmin(null)} />;
}

function Gate({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <main className="room account">
      <div className="gate-card admin-login">
        <p className="kicker">Trustless admin</p>
        <h1 className="display">{title}</h1>
        <p className="lede">{body}</p>
        {children}
      </div>
    </main>
  );
}

function LoginForm({ onSignedIn }: { onSignedIn: (admin: AdminIdentity) => void }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [needCode, setNeedCode] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const body = await adminLogin({
        username: String(form.get("username") ?? ""),
        password: String(form.get("password") ?? ""),
        code: String(form.get("code") ?? ""),
      });
      if (body.admin) {
        onSignedIn(body.admin);
        return;
      }
      throw new Error("Sign-in failed.");
    } catch (err) {
      if (err instanceof AdminApiError && err.code === "totp-required") {
        setNeedCode(true);
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "Could not sign in.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="room account">
      <form className="gate-card admin-login" onSubmit={submit}>
        <p className="kicker">Trustless admin</p>
        <h1 className="display">Admin sign-in</h1>
        <label>
          Username
          <input name="username" autoComplete="username" required autoFocus />
        </label>
        <label>
          Password
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        {needCode ? (
          <label>
            2FA code
            <input name="code" inputMode="numeric" autoComplete="one-time-code" required />
          </label>
        ) : null}
        {error ? (
          <p className="admin-login-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="account-actions">
          <button className="primary" type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </div>
      </form>
    </main>
  );
}

function Shell({
  admin,
  onSignedOut,
}: {
  admin: AdminIdentity;
  onSignedOut: () => void;
}) {
  const [sectionId, setSectionId] = useState("overview");
  const [playerFocus, setPlayerFocus] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(ADMIN_NAV.map((group) => [group.id, true])),
  );

  const visibleNav = useMemo(
    () =>
      ADMIN_NAV.map((group) => ({
        ...group,
        sections: group.sections.filter((section) => can(admin.permissions, section.permission)),
      })).filter((group) => group.sections.length > 0),
    [admin.permissions],
  );

  const section = findSection(sectionId) ?? findSection("overview")!;

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <p className="kicker">Trustless</p>
          <strong>Operations</strong>
        </div>
        <nav aria-label="Admin">
          {visibleNav.map((group) => (
            <div key={group.id} className="admin-nav-group">
              <button
                type="button"
                className="admin-nav-group-toggle"
                aria-expanded={openGroups[group.id] !== false}
                onClick={() =>
                  setOpenGroups((current) => ({
                    ...current,
                    [group.id]: !(current[group.id] !== false),
                  }))
                }
              >
                {group.label}
              </button>
              {openGroups[group.id] !== false ? (
                <ul>
                  {group.sections.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={item.id === section.id ? "is-active" : undefined}
                        onClick={() => {
                          setSectionId(item.id);
                          if (item.id !== "players") setPlayerFocus("");
                        }}
                      >
                        <span>{item.label}</span>
                        <StatusBadge status={item.status} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </nav>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div>
            <p className="kicker">{section.label}</p>
            <h1 className="display">{section.label}</h1>
            <p className="admin-top-copy">{section.summary}</p>
          </div>
          <div className="admin-top-actions">
            <div className="admin-who">
              <strong>{admin.username}</strong>
              <span>{ADMIN_ROLES[admin.role]}</span>
            </div>
            <Link className="admin-secondary" href="/">
              Back to game
            </Link>
            <button
              className="admin-secondary"
              type="button"
              onClick={async () => {
                await adminLogout();
                onSignedOut();
              }}
            >
              Sign out
            </button>
          </div>
        </header>

        <div className="admin-content">
          {!can(admin.permissions, section.permission) ? (
            <EmptyState title="Not permitted" body="Your admin role cannot open this section." />
          ) : (
            <SectionBody
              admin={admin}
              sectionId={section.id}
              playerFocus={playerFocus}
              onOpenPlayer={(userId) => {
                setPlayerFocus(userId);
                setSectionId("players");
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function SectionBody({
  admin,
  sectionId,
  playerFocus,
  onOpenPlayer,
}: {
  admin: AdminIdentity;
  sectionId: string;
  playerFocus: string;
  onOpenPlayer: (userId: string) => void;
}) {
  const section = findSection(sectionId);
  if (!section) return <EmptyState title="Unknown section" />;

  switch (sectionId) {
    case "overview":
      return <OverviewSection />;
    case "players":
      return <PlayersSection admin={admin} initialUserId={playerFocus} />;
    case "matches":
      return <MatchesSection admin={admin} />;
    case "moderation":
      return <ModerationSection admin={admin} />;
    case "roles":
      return <RolesFactionsSection mode="roles" />;
    case "factions":
      return <RolesFactionsSection mode="factions" />;
    case "achievements":
      return <AchievementsSection />;
    case "analytics":
      return <AnalyticsSection />;
    case "game-config":
      return <SettingsSection kind="game" admin={admin} />;
    case "feature-flags":
      return <SettingsSection kind="flags" admin={admin} />;
    case "maintenance":
      return <SettingsSection kind="maintenance" admin={admin} />;
    case "admins":
      return <AdminsSection admin={admin} />;
    case "audit":
      return <AuditSection admin={admin} />;
    case "support":
      return <SupportSection onOpenPlayer={onOpenPlayer} />;
    default:
      return (
        <SectionPlaceholder
          title={section.label}
          summary={section.summary}
          capabilities={section.capabilities}
          needs={section.needs}
        />
      );
  }
}
