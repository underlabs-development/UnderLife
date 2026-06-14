export interface UserPreferences {
  theme: "dark" | "light";
  language: string;
  notifications: boolean;
}

export interface UserProfile {
  id: string;
  username: string | null;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  avatar: string;
  lastLogin: string | null;
  preferences: UserPreferences;
}
