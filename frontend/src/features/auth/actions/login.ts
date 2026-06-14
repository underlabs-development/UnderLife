"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";
const THIRTY_DAYS = 30 * 24 * 60 * 60;

export type LoginState = { error: string } | undefined;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const identifier = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!identifier || !password) {
    return { error: "Email or username and password are required." };
  }

  if (identifier.includes("@") && !EMAIL_REGEX.test(identifier)) {
    return { error: "That doesn't look like a valid email address." };
  }

  let tokenRes: Response;
  try {
    tokenRes = await fetch(`${BACKEND_URL}/api/token/pair`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: identifier, password }),
    });
  } catch {
    return { error: "Cannot connect to server. Try again later." };
  }

  if (!tokenRes.ok) {
    return { error: "Invalid credentials." };
  }

  const { access } = (await tokenRes.json()) as { access: string; refresh: string };

  const meRes = await fetch(`${BACKEND_URL}/api/users/me`, {
    headers: { Authorization: `Bearer ${access}` },
  });

  const cookieStore = await cookies();
  const cookieOpts = {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: THIRTY_DAYS,
    path: "/",
  };

  cookieStore.set("under-access-token", access, { ...cookieOpts, httpOnly: true });

  if (meRes.ok) {
    const user = (await meRes.json()) as { id: number; email: string; username: string | null; display_name: string };
    cookieStore.set("under-user", JSON.stringify(user), { ...cookieOpts, httpOnly: false });
  }

  redirect("/");
}
