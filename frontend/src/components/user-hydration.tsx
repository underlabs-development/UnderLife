"use client";

import { useEffect } from "react";
import { useUserProfileStore } from "@/features/user-profile/stores/user-profile-store";

interface BackendUser {
  id: number;
  email: string;
  username: string | null;
  first_name: string;
  last_name: string;
  display_name: string;
  last_login: string | null;
}

interface UserHydrationProps {
  user: BackendUser | null;
}

export function UserHydration({ user }: UserHydrationProps) {
  const updateProfile = useUserProfileStore((s) => s.updateProfile);

  useEffect(() => {
    if (!user) return;
    updateProfile({
      id: String(user.id),
      email: user.email,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      displayName: user.display_name || user.email.split("@")[0],
      lastLogin: user.last_login,
    });
  }, [user, updateProfile]);

  return null;
}
