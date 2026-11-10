import {
  createHash,
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import {
  isAdminRole,
  permissionsFor,
  type AdminRole,
  type Permission,
} from "@/lib/admin/permissions";
import type { AdminIdentity } from "@/lib/admin/types";
import { db, prepareAdmin } from "@/lib/admin/server/db";

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

export const SESSION_COOKIE = "trustless-admin-session";
export const SESSION_SECONDS = 12 * 60 * 60;
export const MIN_PASSWORD_LENGTH = 12;
const MAX_LOGIN_FAILURES = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const ACTION_LIMIT_PER_MINUTE = 90;

export class AdminError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export type AdminContext = AdminIdentity & {
  sessionRef: string;
  ip: string | null;
  userAgent: string | null;
};

const memory = globalThis as typeof globalThis & {
  __trustlessLoginFailures?: Map<string, { count: number; until: number }>;
  __trustlessActionCounts?: Map<number, { count: number; windowStart: number }>;
};

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

async function verifyPassword(password: string, stored: string) {
  const [scheme, saltText, hashText] = stored.split("$");
  if (scheme !== "scrypt" || !saltText || !hashText) return false;
  const expected = Buffer.from(hashText, "base64");
  const actual = await scrypt(password, Buffer.from(saltText, "base64"), expected.length);
  return timingSafeEqual(actual, expected);
}

export function passwordProblem(password: string) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password.length > 200) return "That password is too long.";
  return null;
}

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function newTotpSecret() {
  const bytes = randomBytes(20);
  let bits = "";
  for (const byte of bytes) bits += byte.toString(2).padStart(8, "0");
  let secret = "";
  for (let index = 0; index + 5 <= bits.length; index += 5) {
    secret += BASE32[parseInt(bits.slice(index, index + 5), 2)];
  }
  return secret;
}

function base32Decode(secret: string) {
  let bits = "";
  for (const char of secret.replace(/=+$/, "").toUpperCase()) {
    const value = BASE32.indexOf(char);
    if (value < 0) return null;
    bits += value.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(parseInt(bits.slice(index, index + 8), 2));
  }
  return Buffer.from(bytes);
}

function totpAt(key: Buffer, counter: number) {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", key).update(message).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const code = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return code.toString().padStart(6, "0");
}

export function verifyTotp(secret: string, code: string) {
  const key = base32Decode(secret);
  const clean = code.replace(/\s/g, "");
  if (!key || !/^\d{6}$/.test(clean)) return false;
  const counter = Math.floor(Date.now() / 30_000);
  return [-1, 0, 1].some((drift) =>
    timingSafeEqual(Buffer.from(totpAt(key, counter + drift)), Buffer.from(clean)),
  );
}

export function totpUri(username: string, secret: string) {
  const label = encodeURIComponent(`TRUSTLESS Admin:${username}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent("TRUSTLESS Admin")}`;
}

function clientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null
  );
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function readCookie(request: Request, name: string) {
  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return "";
}

function lockoutKey(request: Request, username: string) {
  return `${clientIp(request) ?? "local"}:${username.toLowerCase()}`;
}

export function loginLockedFor(request: Request, username: string) {
  const failures = (memory.__trustlessLoginFailures ??= new Map());
  const entry = failures.get(lockoutKey(request, username));
  return entry && entry.until > Date.now() ? entry.until - Date.now() : 0;
}

function recordLoginFailure(request: Request, username: string) {
  const failures = (memory.__trustlessLoginFailures ??= new Map());
  const key = lockoutKey(request, username);
  const entry = failures.get(key);
  const lockoutEnded = entry && entry.until > 0 && entry.until <= Date.now();
  const count = (lockoutEnded ? 0 : (entry?.count ?? 0)) + 1;
  failures.set(key, { count, until: count >= MAX_LOGIN_FAILURES ? Date.now() + LOCKOUT_MS : 0 });
}

async function bootstrapSuperAdmin(username: string, password: string) {
  const envUser = process.env.ADMIN_USERNAME ?? "";
  const envPassword = process.env.ADMIN_PASSWORD ?? "";
  if (!envUser || !envPassword) return false;
  const sql = db();
  const [{ count }] = (await sql`SELECT COUNT(*)::int AS count FROM admin_accounts`) as { count: number }[];
  if (count > 0) return false;
  const left = createHash("sha256").update(`${username}\n${password}`).digest();
  const right = createHash("sha256").update(`${envUser}\n${envPassword}`).digest();
  if (!timingSafeEqual(left, right)) return false;
  await sql`
    INSERT INTO admin_accounts (username, password_hash, role, created_by_name)
    VALUES (${envUser}, ${await hashPassword(envPassword)}, 'super_admin', 'bootstrap')
    ON CONFLICT DO NOTHING
  `;
  return true;
}

type AccountRow = {
  id: number;
  username: string;
  password_hash: string;
  role: string;
  totp_secret: string | null;
  totp_enabled: boolean;
  disabled_at: string | null;
};

export async function login(
  request: Request,
  input: { username: string; password: string; code: string },
): Promise<
  | { status: "ok"; token: string; admin: AdminIdentity }
  | { status: "invalid" | "totp-required" | "totp-invalid" | "locked"; retryAfterMs?: number }
> {
  await prepareAdmin();
  const username = input.username.trim();
  const locked = loginLockedFor(request, username);
  if (locked) return { status: "locked", retryAfterMs: locked };

  const sql = db();
  const bootstrapped = await bootstrapSuperAdmin(username, input.password);
  const rows = (await sql`
    SELECT id, username, password_hash, role, totp_secret, totp_enabled, disabled_at
    FROM admin_accounts WHERE lower(username) = lower(${username}) LIMIT 1
  `) as AccountRow[];
  const account = rows[0];
  const passwordOk = account ? await verifyPassword(input.password, account.password_hash) : false;

  if (!account || !passwordOk || account.disabled_at || !isAdminRole(account.role)) {
    recordLoginFailure(request, username);
    await writeLoginAudit(request, username, "admin.login_failed", null);
    return { status: "invalid" };
  }
  if (account.totp_enabled && account.totp_secret) {
    if (!input.code) return { status: "totp-required" };
    if (!verifyTotp(account.totp_secret, input.code)) {
      recordLoginFailure(request, username);
      await writeLoginAudit(request, username, "admin.login_failed_2fa", account.id);
      return { status: "totp-invalid" };
    }
  }

  memory.__trustlessLoginFailures?.delete(lockoutKey(request, username));
  const token = randomBytes(32).toString("base64url");
  await sql.transaction([
    sql`
      INSERT INTO admin_sessions (token_hash, admin_id, expires_at, ip, user_agent)
      VALUES (
        ${tokenHash(token)}, ${account.id},
        now() + make_interval(secs => ${SESSION_SECONDS}),
        ${clientIp(request)}, ${request.headers.get("user-agent")?.slice(0, 300) ?? null}
      )
    `,
    sql`UPDATE admin_accounts SET last_login_at = now() WHERE id = ${account.id}`,
    sql`
      INSERT INTO admin_audit_log (admin_id, admin_name, action, target_type, target_id, new_value, ip, user_agent, session_ref)
      VALUES (
        ${account.id}, ${account.username}, ${bootstrapped ? "admin.bootstrap_login" : "admin.login"},
        'admin', ${String(account.id)}, ${JSON.stringify({ twoFactor: account.totp_enabled })},
        ${clientIp(request)}, ${request.headers.get("user-agent")?.slice(0, 300) ?? null},
        ${tokenHash(token).slice(0, 12)}
      )
    `,
  ]);

  return {
    status: "ok",
    token,
    admin: {
      id: account.id,
      username: account.username,
      role: account.role,
      totpEnabled: account.totp_enabled,
      permissions: [...permissionsFor(account.role)],
    },
  };
}

async function writeLoginAudit(request: Request, username: string, action: string, adminId: number | null) {
  await db()`
    INSERT INTO admin_audit_log (admin_id, admin_name, action, target_type, ip, user_agent)
    VALUES (${adminId}, ${username.slice(0, 60) || "(blank)"}, ${action}, 'admin',
      ${clientIp(request)}, ${request.headers.get("user-agent")?.slice(0, 300) ?? null})
  `;
}

export async function logout(request: Request) {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return;
  await prepareAdmin();
  await db()`UPDATE admin_sessions SET revoked_at = now() WHERE token_hash = ${tokenHash(token)}`;
}

export async function currentAdmin(request: Request): Promise<AdminContext | null> {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token || token.length > 100) return null;
  await prepareAdmin();
  const hash = tokenHash(token);
  const rows = (await db()`
    SELECT a.id, a.username, a.role, a.totp_enabled
    FROM admin_sessions s
    JOIN admin_accounts a ON a.id = s.admin_id
    WHERE s.token_hash = ${hash}
      AND s.revoked_at IS NULL
      AND s.expires_at > now()
      AND a.disabled_at IS NULL
    LIMIT 1
  `) as { id: number; username: string; role: string; totp_enabled: boolean }[];
  const row = rows[0];
  if (!row || !isAdminRole(row.role)) return null;
  return {
    id: Number(row.id),
    username: row.username,
    role: row.role as AdminRole,
    totpEnabled: row.totp_enabled,
    permissions: [...permissionsFor(row.role as AdminRole)],
    sessionRef: hash.slice(0, 12),
    ip: clientIp(request),
    userAgent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
  };
}

function assertSameOrigin(request: Request) {
  if (request.headers.get("x-trustless-admin") !== "1") {
    throw new AdminError(403, "csrf", "Request blocked.");
  }
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (origin && host && new URL(origin).host !== host) {
    throw new AdminError(403, "csrf", "Request blocked.");
  }
}

function assertActionRate(adminId: number) {
  const counts = (memory.__trustlessActionCounts ??= new Map());
  const now = Date.now();
  const entry = counts.get(adminId);
  if (!entry || now - entry.windowStart > 60_000) {
    counts.set(adminId, { count: 1, windowStart: now });
    return;
  }
  entry.count += 1;
  if (entry.count > ACTION_LIMIT_PER_MINUTE) {
    throw new AdminError(429, "rate-limited", "Too many admin actions. Wait a minute and try again.");
  }
}

export async function requireAdmin(
  request: Request,
  permission?: Permission,
  options: { mutating?: boolean } = {},
) {
  if (options.mutating) assertSameOrigin(request);
  const admin = await currentAdmin(request);
  if (!admin) throw new AdminError(401, "unauthenticated", "Sign in again.");
  if (permission && !admin.permissions.includes(permission)) {
    throw new AdminError(403, "forbidden", "Your admin role can't do that.");
  }
  if (options.mutating) assertActionRate(admin.id);
  return admin;
}

export async function reauthenticate(admin: AdminContext, password: unknown, code: unknown) {
  const rows = (await db()`
    SELECT password_hash, totp_secret, totp_enabled FROM admin_accounts WHERE id = ${admin.id}
  `) as { password_hash: string; totp_secret: string | null; totp_enabled: boolean }[];
  const row = rows[0];
  if (!row || typeof password !== "string" || !(await verifyPassword(password, row.password_hash))) {
    throw new AdminError(401, "reauth-failed", "Your password was not accepted.");
  }
  if (row.totp_enabled && row.totp_secret) {
    if (typeof code !== "string" || !verifyTotp(row.totp_secret, code)) {
      throw new AdminError(401, "reauth-failed", "Your 2FA code was not accepted.");
    }
  }
}

export async function checkPassword(adminId: number, password: string) {
  const rows = (await db()`SELECT password_hash FROM admin_accounts WHERE id = ${adminId}`) as {
    password_hash: string;
  }[];
  return Boolean(rows[0] && (await verifyPassword(password, rows[0].password_hash)));
}

export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge,
  };
}
