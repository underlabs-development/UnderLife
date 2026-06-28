"use server";

import { cookies } from "next/headers";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export interface LogChunk {
  lines: string[];
  offset: number;
  size: number;
}

export type LogsResult = { data: LogChunk } | { error: string };

/**
 * Tail the backend log file. Auth (JWT) stays server-side via the httpOnly
 * cookie; the browser only ever talks to this Server Action.
 */
export async function getLogs(offset: number): Promise<LogsResult> {
  const token = (await cookies()).get("under-access-token")?.value;
  if (!token) return { error: "Not authenticated." };

  try {
    const res = await fetch(`${BACKEND_URL}/api/logs/?offset=${offset}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.status === 403) {
      return { error: "Admin only — this needs a superuser account." };
    }
    if (!res.ok) return { error: `Failed to load logs (${res.status}).` };
    return { data: (await res.json()) as LogChunk };
  } catch {
    return { error: "Cannot reach the server." };
  }
}
