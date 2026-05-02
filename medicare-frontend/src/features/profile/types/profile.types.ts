// ── Profile Types ─────────────────────────

export interface ProfileData {
  id: number;
  full_name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  blood_group?: string;
  height?: number;
  weight?: number;
  allergies?: string[];
  medical_conditions?: string[];
  avatar_url?: string;
}

export interface HealthProfile {
  height: number;        // in cm
  weight: number;        // in kg
  blood_type: BloodType;
  conditions: string[];
  allergies: string[];
  medications: string[];
}

export type BloodType = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | "";

export type AppLanguage = "en" | "ta" | "hi";

export interface UserPreferences {
  notifications: boolean;
  emailReports: boolean;
  healthReminders: boolean;
  dataSharing: boolean;
  biometricLogin: boolean;
  twoFactorAuth: boolean;
  language: AppLanguage;
}

export interface SecuritySession {
  id: string;
  device: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

export interface ProfileFormData {
  full_name: string;
  phone: string;
  date_of_birth: string;
  gender: string;
}

export const BLOOD_TYPES: BloodType[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export const COMMON_CONDITIONS = [
  "Diabetes (Type 1)",
  "Diabetes (Type 2)",
  "Hypertension",
  "Asthma",
  "Heart Disease",
  "Arthritis",
  "Thyroid Disorder",
  "Migraine",
  "GERD",
  "Anemia",
];

export const LANGUAGES: { code: AppLanguage; label: string; nativeLabel: string; flag: string }[] = [
  { code: "en", label: "English", nativeLabel: "English", flag: "🇬🇧" },
  { code: "ta", label: "Tamil", nativeLabel: "தமிழ்", flag: "🇮🇳" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी", flag: "🇮🇳" },
];
