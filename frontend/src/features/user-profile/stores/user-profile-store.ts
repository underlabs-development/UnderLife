import { create } from "zustand";
import type { UserPreferences, UserProfile } from "../models/user.model";

const MOCK_USER: UserProfile = {
  id: "usr_001",
  username: "operator",
  displayName: "Operator",
  email: "operator@under.os",
  avatar: "",
  preferences: {
    theme: "dark",
    language: "en",
    notifications: true,
  },
};

interface UserProfileState {
  user: UserProfile;
  isSettingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  toggleSettings: () => void;
  updateProfile: (partial: Partial<UserProfile>) => void;
  updatePreferences: (partial: Partial<UserPreferences>) => void;
}

export const useUserProfileStore = create<UserProfileState>((set) => ({
  user: MOCK_USER,
  isSettingsOpen: false,

  openSettings: () => set({ isSettingsOpen: true }),
  closeSettings: () => set({ isSettingsOpen: false }),
  toggleSettings: () => set((s) => ({ isSettingsOpen: !s.isSettingsOpen })),

  updateProfile: (partial) =>
    set((s) => ({
      user: { ...s.user, ...partial },
    })),

  updatePreferences: (partial) =>
    set((s) => ({
      user: {
        ...s.user,
        preferences: { ...s.user.preferences, ...partial },
      },
    })),
}));
