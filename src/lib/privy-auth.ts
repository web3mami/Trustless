const APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";
const JWKS_TTL = 60 * 60 * 1000;

type Jwk = JsonWebKey & { kid?: string };

const cache = globalThis as typeof globalThis & {
  __trustlessPrivyKeys?: { keys: Jwk[]; fetchedAt: number };
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
