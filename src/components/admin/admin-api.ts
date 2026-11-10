import type { AdminIdentity } from "@/lib/admin/types";

export class AdminApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

async function parse(response: Response) {
  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
    message?: string;
  };
  if (!response.ok) {
    throw new AdminApiError(
      response.status,
      body.error ?? "error",
      body.message ?? "Request failed.",
    );
  }
  return body as Record<string, unknown>;
}

export async function adminSession(): Promise<AdminIdentity | null> {
  const response = await fetch("/api/admin/session", { cache: "no-store", credentials: "same-origin" });
  const body = (await parse(response)) as { admin?: AdminIdentity | null };
  return body.admin ?? null;
}

export async function adminLogin(input: {
  username: string;
  password: string;
  code?: string;
}) {
  const response = await fetch("/api/admin/session", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "x-trustless-admin": "1",
    },
    body: JSON.stringify(input),
  });
  return parse(response) as Promise<{ admin?: AdminIdentity; error?: string; message?: string }>;
}

export async function adminLogout() {
  await fetch("/api/admin/session", {
    method: "DELETE",
    credentials: "same-origin",
  }).catch(() => null);
}

export async function adminGet(view: string, params: Record<string, string> = {}) {
  const query = new URLSearchParams({ view, ...params });
  const response = await fetch(`/api/admin?${query}`, {
    cache: "no-store",
    credentials: "same-origin",
  });
  return parse(response);
}

export async function adminAct(action: string, payload: Record<string, unknown> = {}) {
  const response = await fetch("/api/admin", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "x-trustless-admin": "1",
    },
    body: JSON.stringify({ action, payload }),
  });
  return parse(response);
}
