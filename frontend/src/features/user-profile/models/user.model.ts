export interface UserPreferences {
  theme: "dark" | "light";
  language: string;
  notifications: boolean;
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatar: string;
  preferences: UserPreferences;
}
