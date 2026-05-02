import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  HealthProfile,
  UserPreferences,
  AppLanguage,
  ProfileFormData,
} from "../types/profile.types";

interface ProfileStore {
  // ── User Info ──────────────────────────
  userInfo: ProfileFormData;
  setUserInfo: (info: Partial<ProfileFormData>) => void;

  // ── Health Profile ─────────────────────
  healthProfile: HealthProfile;
  setHealthProfile: (data: Partial<HealthProfile>) => void;
  addCondition: (condition: string) => void;
  removeCondition: (condition: string) => void;
  addAllergy: (allergy: string) => void;
  removeAllergy: (allergy: string) => void;
  addMedication: (medication: string) => void;
  removeMedication: (medication: string) => void;

  // ── Preferences ────────────────────────
  preferences: UserPreferences;
  setPreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
  setLanguage: (lang: AppLanguage) => void;

  // ── Meta ────────────────────────────────
  lastSaved: string | null;
  markSaved: () => void;
}

const DEFAULT_HEALTH_PROFILE: HealthProfile = {
  height: 0,
  weight: 0,
  blood_type: "",
  conditions: [],
  allergies: [],
  medications: [],
};

const DEFAULT_PREFERENCES: UserPreferences = {
  notifications: true,
  emailReports: true,
  healthReminders: true,
  dataSharing: false,
  biometricLogin: false,
  twoFactorAuth: false,
  language: "en",
};

const DEFAULT_USER_INFO: ProfileFormData = {
  full_name: "",
  phone: "",
  date_of_birth: "",
  gender: "",
};

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set, get) => ({
      // ── User Info ──────────────────────
      userInfo: DEFAULT_USER_INFO,
      setUserInfo: (info) =>
        set((s) => ({ userInfo: { ...s.userInfo, ...info } })),

      // ── Health Profile ─────────────────
      healthProfile: DEFAULT_HEALTH_PROFILE,
      setHealthProfile: (data) =>
        set((s) => ({ healthProfile: { ...s.healthProfile, ...data } })),

      addCondition: (condition) =>
        set((s) => ({
          healthProfile: {
            ...s.healthProfile,
            conditions: s.healthProfile.conditions.includes(condition)
              ? s.healthProfile.conditions
              : [...s.healthProfile.conditions, condition],
          },
        })),
      removeCondition: (condition) =>
        set((s) => ({
          healthProfile: {
            ...s.healthProfile,
            conditions: s.healthProfile.conditions.filter((c) => c !== condition),
          },
        })),

      addAllergy: (allergy) =>
        set((s) => ({
          healthProfile: {
            ...s.healthProfile,
            allergies: s.healthProfile.allergies.includes(allergy)
              ? s.healthProfile.allergies
              : [...s.healthProfile.allergies, allergy],
          },
        })),
      removeAllergy: (allergy) =>
        set((s) => ({
          healthProfile: {
            ...s.healthProfile,
            allergies: s.healthProfile.allergies.filter((a) => a !== allergy),
          },
        })),

      addMedication: (medication) =>
        set((s) => ({
          healthProfile: {
            ...s.healthProfile,
            medications: s.healthProfile.medications.includes(medication)
              ? s.healthProfile.medications
              : [...s.healthProfile.medications, medication],
          },
        })),
      removeMedication: (medication) =>
        set((s) => ({
          healthProfile: {
            ...s.healthProfile,
            medications: s.healthProfile.medications.filter((m) => m !== medication),
          },
        })),

      // ── Preferences ────────────────────
      preferences: DEFAULT_PREFERENCES,
      setPreference: (key, value) =>
        set((s) => ({
          preferences: { ...s.preferences, [key]: value },
        })),
      setLanguage: (lang) =>
        set((s) => ({
          preferences: { ...s.preferences, language: lang },
        })),

      // ── Meta ────────────────────────────
      lastSaved: null,
      markSaved: () => set({ lastSaved: new Date().toISOString() }),
    }),
    {
      name: "medicare-profile",
    }
  )
);
