import { useState, useEffect } from 'react';

/**
 * Frontend Feature Flag System.
 * Matches backend defaults and loads environment variables gracefully.
 */
export const DEFAULT_FLAGS = {
  ENABLE_EXPERIMENTAL_SIMULATION: false,
  ENABLE_ADVANCED_ANALYTICS: false,
  ENABLE_NEW_DASHBOARD: false,
  ENABLE_DEBUG_ROUTES: import.meta.env.DEV, // default to true only in local dev
};

export type FeatureFlag = keyof typeof DEFAULT_FLAGS;

class FeatureFlagManager {
  private flags: Record<string, boolean> = { ...DEFAULT_FLAGS };

  constructor() {
    this.loadFromEnv();
  }

  private loadFromEnv() {
    // Vite injects env variables starting with VITE_
    for (const key in this.flags) {
      const envVal = import.meta.env[`VITE_FEATURE_FLAG_${key}`];
      if (envVal !== undefined) {
        this.flags[key] = envVal === 'true' || envVal === '1';
      }
    }
  }

  isEnabled(flag: FeatureFlag): boolean {
    return this.flags[flag] || false;
  }

  getAllFlags(): Record<string, boolean> {
    return { ...this.flags };
  }
}

export const featureFlags = new FeatureFlagManager();

/**
 * React Hook for safely accessing feature flags within components.
 * Useful for conditional rendering of experimental UI features.
 */
export function useFeatureFlag(flag: FeatureFlag): boolean {
  const [enabled, setEnabled] = useState(featureFlags.isEnabled(flag));

  useEffect(() => {
    // Setup listeners if we ever want to dynamically update flags from an API
    setEnabled(featureFlags.isEnabled(flag));
  }, [flag]);

  return enabled;
}
