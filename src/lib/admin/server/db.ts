import { prepareProfiles, sql } from "@/lib/usernames";

const state = globalThis as typeof globalThis & {
  __trustlessAdminReadyV1?: Promise<void>;
};

export function db() {
  if (!sql) throw new Error("DATABASE_URL is not configured");
  return sql;
}

export function prepareAdmin() {
  state.__trustlessAdminReadyV1 ??= (async () => {
    await prepareProfiles();
    const sql = db();
    await sql`
      CREATE TABLE IF NOT EXISTS admin_accounts (
        id BIGSERIAL PRIMARY KEY,
        username TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL,
        totp_secret TEXT,
        totp_enabled BOOLEAN NOT NULL DEFAULT false,
        disabled_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by_name TEXT,
        last_login_at TIMESTAMPTZ,
        password_changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS admin_accounts_username_unique
      ON admin_accounts ((lower(username)))
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS admin_sessions (
        token_hash TEXT PRIMARY KEY,
        admin_id BIGINT NOT NULL REFERENCES admin_accounts(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        expires_at TIMESTAMPTZ NOT NULL,
        ip TEXT,
        user_agent TEXT,
        revoked_at TIMESTAMPTZ
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS admin_audit_log (
        id BIGSERIAL PRIMARY KEY,
        admin_id BIGINT,
        admin_name TEXT NOT NULL,
        action TEXT NOT NULL,
        target_type TEXT,
        target_id TEXT,
        previous_value JSONB,
        new_value JSONB,
        reason TEXT,
        ip TEXT,
        user_agent TEXT,
        session_ref TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS admin_audit_log_created_idx
      ON admin_audit_log (created_at DESC)
    `;
    await sql`
      CREATE OR REPLACE FUNCTION trustless_audit_append_only() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'admin_audit_log is append-only';
      END;
      $$ LANGUAGE plpgsql
    `;
    await sql`DROP TRIGGER IF EXISTS admin_audit_log_append_only ON admin_audit_log`;
    await sql`
      CREATE TRIGGER admin_audit_log_append_only
      BEFORE UPDATE OR DELETE OR TRUNCATE ON admin_audit_log
      FOR EACH STATEMENT EXECUTE FUNCTION trustless_audit_append_only()
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS game_settings (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_by_name TEXT
      )
    `;
  })();
  return state.__trustlessAdminReadyV1;
}
