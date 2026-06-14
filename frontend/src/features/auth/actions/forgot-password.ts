"use server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export type ForgotPasswordState = { success: true } | { error: string } | undefined;

export async function forgotPassword(
  _prevState: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = formData.get("email") as string;

  if (!email) return { error: "Email is required." };

  try {
    const res = await fetch(`${BACKEND_URL}/api/users/password-reset/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (!res.ok) return { error: "Something went wrong. Please try again." };
  } catch {
    return { error: "Cannot connect to server. Try again later." };
  }

  return { success: true };
}
