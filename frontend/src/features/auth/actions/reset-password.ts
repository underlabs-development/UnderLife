"use server";

import { redirect } from "next/navigation";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export type ResetPasswordState = { error: string } | undefined;

export async function resetPassword(
  _prevState: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const uid = formData.get("uid") as string;
  const token = formData.get("token") as string;
  const newPassword = formData.get("new_password") as string;
  const confirmPassword = formData.get("confirm_password") as string;

  if (!uid || !token) return { error: "Invalid reset link." };
  if (!newPassword) return { error: "Password is required." };
  if (newPassword !== confirmPassword) return { error: "Passwords do not match." };

  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/api/users/password-reset/confirm/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid, token, new_password: newPassword }),
    });
  } catch {
    return { error: "Cannot connect to server. Try again later." };
  }

  if (!res.ok) {
    const data = (await res.json()) as { detail?: string };
    return { error: data.detail ?? "Invalid or expired reset link." };
  }

  redirect("/login");
}
