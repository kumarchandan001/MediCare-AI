import { api } from "@/lib/apiClient";
import type { ProfileData, UserPreferences } from "../types/profile.types";

export const profileApi = {
  getProfile: () => api.get<ProfileData>("/profile"),
  updateProfile: (data: Partial<ProfileData>) => api.patch<ProfileData>("/profile", data),
  getPreferences: () => api.get<UserPreferences>("/profile/preferences"),
  updatePreferences: (data: Partial<UserPreferences>) => api.patch<UserPreferences>("/profile/preferences", data),
};
