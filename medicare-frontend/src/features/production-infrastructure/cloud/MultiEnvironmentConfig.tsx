/**
 * MultiEnvironmentConfig — Unified configuration management across
 * local, staging, production, and research environments with
 * validation and migration support.
 */
import { useCallback } from "react";
import type { EnvironmentTier } from "../core/ProductionInfrastructureEngine";

export interface MultiEnvConfigEntry {
  key: string;
  values: Record<EnvironmentTier, string | number | boolean>;
  sensitive: boolean;
  description: string;
  lastModified: number;
}

export interface ConfigValidationResult {
  valid: boolean;
  errors: { key: string; environment: EnvironmentTier; message: string }[];
  warnings: { key: string; message: string }[];
}

const REQUIRED_KEYS = ["API_BASE_URL", "WS_BASE_URL", "SESSION_TIMEOUT", "MAX_RETRIES", "TELEMETRY_ENABLED"];

export function useMultiEnvironmentConfig() {
  const validateConfig = useCallback((entries: MultiEnvConfigEntry[]): ConfigValidationResult => {
    const errors: ConfigValidationResult["errors"] = [];
    const warnings: ConfigValidationResult["warnings"] = [];
    const envs: EnvironmentTier[] = ["local", "staging", "production", "research"];

    for (const req of REQUIRED_KEYS) {
      if (!entries.find(e => e.key === req)) {
        errors.push({ key: req, environment: "production", message: `Required config "${req}" is missing` });
      }
    }

    for (const entry of entries) {
      for (const env of envs) {
        if (entry.values[env] === undefined || entry.values[env] === "") {
          warnings.push({ key: entry.key, message: `"${entry.key}" has no value for ${env}` });
        }
      }
      if (entry.sensitive && typeof entry.values.local === "string" && entry.values.local === entry.values.production) {
        errors.push({ key: entry.key, environment: "production", message: `Sensitive key "${entry.key}" has same value in local and production` });
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }, []);

  const migrateConfig = useCallback((entries: MultiEnvConfigEntry[], from: EnvironmentTier, to: EnvironmentTier): MultiEnvConfigEntry[] => {
    return entries.map(e => ({
      ...e,
      values: { ...e.values, [to]: e.sensitive ? "" : e.values[from] },
      lastModified: Date.now(),
    }));
  }, []);

  const diffEnvironments = useCallback((entries: MultiEnvConfigEntry[], envA: EnvironmentTier, envB: EnvironmentTier) => {
    return entries.filter(e => e.values[envA] !== e.values[envB]).map(e => ({
      key: e.key, valueA: e.values[envA], valueB: e.values[envB],
    }));
  }, []);

  return { validateConfig, migrateConfig, diffEnvironments };
}
