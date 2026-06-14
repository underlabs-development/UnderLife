"use server";

import { cookies } from "next/headers";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";
const THIRTY_DAYS = 30 * 24 * 60 * 60;

export type UpdateProfileResult =
  | { user: { id: number; email: string; username: string | null; first_name: string; last_name: string; display_name: string; last_login: string | null } }
  | { error: string };

export async function updateProfile(fields: {
  firstName?: string;
  lastName?: string;
  username?: string;
}): Promise<UpdateProfileResult> {
  const cookieStore = await cookies();
  const token = cookieStore.get("under-access-token")?.value;
  if (!token) return { error: "Not authenticated." };

  const body: Record<string, string> = {};
  if (fields.firstName !== undefined) body.first_name = fields.firstName;
  if (fields.lastName !== undefined) body.last_name = fields.lastName;
  if (fields.username !== undefined) body.username = fields.username;

  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/api/users/me/`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    return { error: "Cannot connect to server." };
  }

  if (!res.ok) {
    const payload = await res.json().catch(() => ({})) as { detail?: string };
    return { error: payload.detail ?? "Failed to update profile." };
  }

  const user = await res.json();
  cookieStore.set("under-user", JSON.stringify(user), {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: THIRTY_DAYS,
    path: "/",
    httpOnly: false,
  });

  return { user };
}
