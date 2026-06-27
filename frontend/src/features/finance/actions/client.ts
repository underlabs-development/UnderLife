import { cookies } from "next/headers";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export class FinanceError extends Error {}

/**
 * Server-only helper that calls the Django finance API with the user's JWT.
 * Not a Server Action (no "use server"): it is imported only by action
 * modules, never by client components, so the token never reaches the browser.
 */
export async function financeFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  return apiFetch<T>("/finance", path, init);
}

/**
 * Generic authenticated call to a backend router (e.g. "/finance", "/banksync").
 */
export async function apiFetch<T>(
  prefix: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const token = (await cookies()).get("under-access-token")?.value;
  if (!token) throw new FinanceError("Not authenticated.");

  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/api${prefix}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...init?.headers,
      },
      cache: "no-store",
    });
  } catch {
    throw new FinanceError("Cannot connect to server.");
  }

  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new FinanceError(payload.detail ?? `Request failed (${res.status}).`);
  }

  // DELETE endpoints still return a JSON message; everything returns JSON.
  return res.json() as Promise<T>;
}
