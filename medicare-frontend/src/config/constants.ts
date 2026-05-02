export const APP_NAME = "MediCare AI";
export const APP_VERSION = "2.0.0";
export const APP_TAGLINE = "Because your health deserves intelligence";

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000";

export const CACHE_TIMES = {
  HEALTH_SUMMARY: 5 * 60 * 1000, // 5 min
  RISK_SCORE: 10 * 60 * 1000, // 10 min
  HABIT_TIPS: 30 * 60 * 1000, // 30 min
  DISEASE_LIST: 24 * 60 * 60 * 1000, // 24hr
  ADMIN_STATS: 5 * 60 * 1000, // 5 min
  USER_PROFILE: 15 * 60 * 1000, // 15 min
  ALERTS: 2 * 60 * 1000, // 2 min
  REPORTS: 10 * 60 * 1000, // 10 min
} as const;

export const STALE_TIMES = {
  HEALTH_SUMMARY: 2 * 60 * 1000, // 2 min
  RISK_SCORE: 5 * 60 * 1000, // 5 min
  HABIT_TIPS: 15 * 60 * 1000, // 15 min
  DISEASE_LIST: 60 * 60 * 1000, // 1 hr
  ALERTS: 30 * 1000, // 30 sec
} as const;

export const QUERY_KEYS = {
  HEALTH_SUMMARY: ["health", "summary"],
  RISK_SCORE: ["health", "risk-score"],
  HEALTH_HISTORY: ["health", "history"],
  VITALS_LATEST: ["health", "vitals", "latest"],
  BMI: ["health", "bmi"],
  ACTIVITY: ["health", "activity"],
  MEDICATIONS: ["health", "medications"],
  TRENDS: ["health", "trends"],
  ALERTS: ["alerts"],
  CRITICAL_ALERTS: ["alerts", "critical"],
  HABIT_TIPS: ["habits", "tips"],
  CHAT_HISTORY: ["chat", "history"],
  CHAT_CONTEXT: ["chat", "context"],
  CHAT_SUGGESTED: ["chat", "suggested"],
  PREDICT_HISTORY: ["prediction", "history"],
  USER_PROFILE: ["user", "profile"],
  USER_CONTACTS: ["user", "contacts"],
  ADMIN_STATS: ["admin", "stats"],
  ADMIN_USERS: ["admin", "users"],
  ADMIN_HEALTH: ["admin", "health-intelligence"],
  REPORTS_OVERVIEW: ["reports", "overview"],
  REPORTS_TRENDS: ["reports", "trends"],
  REPORTS_SUMMARY: ["reports", "ai-summary"],
  REPORTS_STATS: ["reports", "stats"],
} as const;

export const DEBOUNCE_TIMES = {
  SEARCH: 300, // ms
  API_CALL: 500, // ms
  RESIZE: 100, // ms
  SCROLL: 50, // ms
  INPUT: 400, // ms
} as const;

export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  SIGNUP: "/signup",
  VERIFY_OTP: "/verify-otp",
  ONBOARDING: "/onboarding",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",
  DASHBOARD: "/dashboard",
  HEALTH: "/health",
  PREDICTION: "/prediction",
  AI_ASSISTANT: "/ai-assistant",
  REPORTS: "/reports",
  EMERGENCY: "/emergency",
  PROFILE: "/profile",
  ADMIN: "/admin",
  ADMIN_USERS: "/admin/users",
  ADMIN_USER_DETAIL: "/admin/users/:id",
  ADMIN_HEALTH: "/admin/health-intelligence",
  ADMIN_AI: "/admin/ai-monitor",
  ADMIN_PREDICTIONS: "/admin/predictions",
  ADMIN_ALERTS: "/admin/alerts",
  ADMIN_EMERGENCY: "/admin/emergency-reports",
  ADMIN_SYSTEM: "/admin/system-health",
  ADMIN_AUDIT_LOG: "/admin/audit-log",
  ADMIN_SETTINGS: "/admin/settings",
} as const;
