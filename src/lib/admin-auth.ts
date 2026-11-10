import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";
const JWKS_TTL = 60 * 60 * 1000;

export const ADMIN_COOKIE = "trustless-admin";
export const ADMIN_SESSION_SECONDS = 12 * 60 * 60;
const MAX_FAILURES = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

type Jwk = JsonWebKey & { kid?: string };

const cache = globalThis as typeof globalThis & {
  __trustlessPrivyKeys?: { keys: Jwk[]; fetchedAt: number };
  __trustlessAdminFailures?: Map<string, { count: number; until: number }>;
};

function decodeSegment(segment: string) {
  return Buffer.from(segment, "base64url");
}

async function privyKeys(forceRefresh = false) {
  const cached = cache.__trustlessPrivyKeys;
  if (!forceRefresh && cached && Date.now() - cached.fetchedAt < JWKS_TTL) {
    return cached.keys;
  }
  const response = await fetch(
    `https://auth.privy.io/api/v1/apps/${APP_ID}/jwks.json`,
    { cache: "no-store" },
  );
  if (!response.ok) throw new Error("Could not load Privy signing keys");
  const { keys } = (await response.json()) as { keys: Jwk[] };
  cache.__trustlessPrivyKeys = { keys, fetchedAt: Date.now() };
  return keys;
}

export async function verifyPrivyToken(token: string) {
  if (!APP_ID) return null;
  const [headerPart, payloadPart, signaturePart] = token.split(".");
  if (!headerPart || !payloadPart || !signaturePart) return null;

  try {
    const header = JSON.parse(decodeSegment(headerPart).toString()) as {
      alg?: string;
      kid?: string;
    };
    if (header.alg !== "ES256") return null;

    let keys = await privyKeys();
    let jwk = keys.find((key) => !header.kid || key.kid === header.kid);
    if (!jwk) {
      keys = await privyKeys(true);
      jwk = keys.find((key) => !header.kid || key.kid === header.kid);
    }
    if (!jwk) return null;

    const key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    );
    const valid = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      decodeSegment(signaturePart),
      new TextEncoder().encode(`${headerPart}.${payloadPart}`),
    );
    if (!valid) return null;

    const claims = JSON.parse(decodeSegment(payloadPart).toString()) as {
      sub?: string;
      iss?: string;
      aud?: string | string[];
      exp?: number;
    };
    const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (
      claims.iss !== "privy.io" ||
      !audiences.includes(APP_ID) ||
      typeof claims.exp !== "number" ||
      claims.exp * 1000 < Date.now() ||
      typeof claims.sub !== "string"
    ) {
      return null;
    }
    return claims.sub;
  } catch {
    return null;
  }
}

export async function requestUserId(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  return token ? verifyPrivyToken(token) : null;
}

function adminConfig() {
  const username = process.env.ADMIN_USERNAME ?? "";
  const password = process.env.ADMIN_PASSWORD ?? "";
  const secret = process.env.ADMIN_SESSION_SECRET ?? "";
  return username && password && secret.length >= 32
    ? { username, password, secret }
    : null;
}

export function adminConfigured() {
  return adminConfig() !== null;
}

function sameText(a: string, b: string) {
  const left = createHash("sha256").update(a).digest();
  const right = createHash("sha256").update(b).digest();
  return timingSafeEqual(left, right);
}

function sign(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function clientKey(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

export function loginLockedFor(request: Request) {
  const failures = (cache.__trustlessAdminFailures ??= new Map());
  const entry = failures.get(clientKey(request));
  return entry && entry.until > Date.now() ? entry.until - Date.now() : 0;
}

export function checkAdminLogin(request: Request, username: string, password: string) {
  const config = adminConfig();
  if (!config) return null;
  const failures = (cache.__trustlessAdminFailures ??= new Map());
  const key = clientKey(request);
  const valid =
    sameText(username, config.username) && sameText(password, config.password);

  if (!valid) {
    const entry = failures.get(key);
    const lockoutEnded = entry && entry.until > 0 && entry.until <= Date.now();
    const count = (lockoutEnded ? 0 : (entry?.count ?? 0)) + 1;
    failures.set(key, {
      count,
      until: count >= MAX_FAILURES ? Date.now() + LOCKOUT_MS : 0,
    });
    return null;
  }

  failures.delete(key);
  const expires = String(Date.now() + ADMIN_SESSION_SECONDS * 1000);
  return `${expires}.${sign(expires, config.secret)}`;
}

function readCookie(request: Request, name: string) {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return "";
}

export function authorizeAdmin(request: Request) {
  const config = adminConfig();
  const session = readCookie(request, ADMIN_COOKIE);
  const [expires, signature] = session.split(".");
  if (!config || !expires || !signature) return false;
  if (!sameText(signature, sign(expires, config.secret))) return false;
  return Number(expires) > Date.now();
}
