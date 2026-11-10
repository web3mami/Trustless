"use client";

import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import { FACTION_LABEL, type Faction } from "@/lib/roles";
import type { Page } from "@/lib/admin/types";

export const dateTime = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function StatCard({
  label,
  value,
  note,
}: {
  label: string;
  value: ReactNode;
  note?: string;
}) {
  return (
    <div className="admin-stat">
      <span>{label}</span>
      <strong>{value}</strong>
      {note ? <em>{note}</em> : null}
    </div>
  );
}

export function StatusBadge({
  status,
}: {
  status: "active" | "restricted" | "suspended" | "banned" | "live" | "partial" | "planned" | string;
}) {
  return (
    <span className="admin-badge" data-status={status}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function FactionBadge({ faction }: { faction: Faction }) {
  return (
    <span className="admin-faction" data-faction={faction}>
      {FACTION_LABEL[faction]}
    </span>
  );
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="admin-empty">
      <strong>{title}</strong>
      {body ? <p>{body}</p> : null}
    </div>
  );
}

export function Pagination({
  page,
  onChange,
}: {
  page: Page<unknown>;
  onChange: (next: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(page.total / page.pageSize));
  if (pages <= 1) return null;
  return (
    <div className="admin-pager">
      <button type="button" disabled={page.page <= 1} onClick={() => onChange(page.page - 1)}>
        Previous
      </button>
      <span>
        Page {page.page} of {pages} · {page.total} total
      </span>
      <button type="button" disabled={page.page >= pages} onClick={() => onChange(page.page + 1)}>
        Next
      </button>
    </div>
  );
}

export function Panel({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="admin-panel">
      <div className="admin-panel-head">
        <h2>{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function ConfirmModal({
  title,
  body,
  confirmLabel = "Confirm",
  dangerous,
  confirmWord,
  needPassword,
  needCode,
  busy,
  error,
  onClose,
  onConfirm,
}: {
  title: string;
  body: string;
  confirmLabel?: string;
  dangerous?: boolean;
  confirmWord?: string;
  needPassword?: boolean;
  needCode?: boolean;
  busy?: boolean;
  error?: string;
  onClose: () => void;
  onConfirm: (input: { reason: string; password: string; code: string }) => void;
}) {
  const titleId = useId();
  const [reason, setReason] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [typed, setTyped] = useState("");
  const ready =
    reason.trim().length >= 4 &&
    (!confirmWord || typed === confirmWord) &&
    (!needPassword || password.length > 0) &&
    (!needCode || code.replace(/\s/g, "").length === 6);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!ready || busy) return;
    onConfirm({ reason: reason.trim(), password, code });
  }

  return (
    <div className="admin-modal-backdrop" role="presentation" onClick={onClose}>
      <form
        className={`admin-modal${dangerous ? " is-danger" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        onSubmit={submit}
      >
        <h3 id={titleId}>{title}</h3>
        <p>{body}</p>
        <label>
          Reason
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            required
            minLength={4}
            maxLength={500}
            autoFocus
          />
        </label>
        {confirmWord ? (
          <label>
            Type <strong>{confirmWord}</strong> to confirm
            <input value={typed} onChange={(event) => setTyped(event.target.value)} required />
          </label>
        ) : null}
        {needPassword ? (
          <label>
            Your password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
        ) : null}
        {needCode ? (
          <label>
            2FA code
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              required
            />
          </label>
        ) : null}
        {error ? <p className="admin-inline-error" role="alert">{error}</p> : null}
        <div className="admin-modal-actions">
          <button className="admin-secondary" type="button" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className={dangerous ? "admin-danger" : "admin-primary"} type="submit" disabled={!ready || busy}>
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

export function SectionPlaceholder({
  title,
  summary,
  capabilities,
  needs,
}: {
  title: string;
  summary: string;
  capabilities?: string[];
  needs?: string;
}) {
  return (
    <Panel title={title}>
      <div className="admin-placeholder">
        <p>{summary}</p>
        {capabilities?.length ? (
          <ul>
            {capabilities.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
        {needs ? <p className="admin-note">{needs}</p> : null}
      </div>
    </Panel>
  );
}
