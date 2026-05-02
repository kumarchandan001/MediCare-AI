const getEnvVar = (key: string, fallback?: string): string => {
  const value = import.meta.env[key];
  if (!value && !fallback) {
    console.warn(`[MediCare AI] Missing env var: ${key}`);
  }
  return value || fallback || "";
};

export const env = {
  API_URL: getEnvVar("VITE_API_URL", "http://localhost:8000"),
  APP_ENV: getEnvVar("VITE_APP_ENV", "development"),
  SENTRY_DSN: getEnvVar("VITE_SENTRY_DSN", ""),
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
} as const;
