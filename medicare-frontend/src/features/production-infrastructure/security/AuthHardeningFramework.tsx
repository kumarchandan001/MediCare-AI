/**
 * AuthHardeningFramework — Strengthens authentication with token lifecycle
 * management, multi-factor readiness, and credential security scoring.
 */
import { useCallback, useRef } from "react";

export interface TokenLifecycle {
  accessToken: string;
  refreshToken: string;
  issuedAt: number;
  accessExpiresAt: number;
  refreshExpiresAt: number;
  rotationCount: number;
  lastRotated: number;
}

export interface AuthStrengthScore {
  overall: number;
  passwordStrength: number;
  mfaEnabled: boolean;
  tokenHealth: number;
  sessionIntegrity: number;
  recommendations: string[];
}

export function useAuthHardeningFramework() {
  const tokenRotations = useRef(0);

  const evaluateTokenHealth = useCallback((token: TokenLifecycle): { healthy: boolean; action: "none" | "rotate" | "refresh" | "re_auth" } => {
    const now = Date.now();
    if (now > token.accessExpiresAt) {
      if (now > token.refreshExpiresAt) return { healthy: false, action: "re_auth" };
      return { healthy: false, action: "refresh" };
    }
    const accessRemaining = token.accessExpiresAt - now;
    const accessTotal = token.accessExpiresAt - token.issuedAt;
    if (accessRemaining < accessTotal * 0.2) return { healthy: true, action: "rotate" };
    return { healthy: true, action: "none" };
  }, []);

  const scoreAuthStrength = useCallback((config: {
    passwordLength: number; hasSpecialChars: boolean; hasMFA: boolean;
    tokenAge: number; sessionAge: number;
  }): AuthStrengthScore => {
    let passwordStrength = Math.min(100, config.passwordLength * 8);
    if (config.hasSpecialChars) passwordStrength = Math.min(100, passwordStrength + 20);
    const tokenHealth = Math.max(0, 100 - config.tokenAge / 3600000 * 10);
    const sessionIntegrity = Math.max(0, 100 - config.sessionAge / 3600000 * 5);
    const mfaBonus = config.hasMFA ? 20 : 0;
    const overall = Math.min(100, (passwordStrength * 0.3 + tokenHealth * 0.3 + sessionIntegrity * 0.2 + mfaBonus));
    const recommendations: string[] = [];
    if (!config.hasMFA) recommendations.push("Enable multi-factor authentication for stronger security");
    if (passwordStrength < 60) recommendations.push("Use a stronger password with mixed characters");
    if (tokenHealth < 50) recommendations.push("Token aging — consider refreshing your session");
    return { overall, passwordStrength, mfaEnabled: config.hasMFA, tokenHealth, sessionIntegrity, recommendations };
  }, []);

  const rotateToken = useCallback((current: TokenLifecycle, newAccessToken: string, newExpiresIn: number): TokenLifecycle => {
    tokenRotations.current++;
    return {
      ...current, accessToken: newAccessToken,
      issuedAt: Date.now(), accessExpiresAt: Date.now() + newExpiresIn,
      rotationCount: current.rotationCount + 1, lastRotated: Date.now(),
    };
  }, []);

  return { evaluateTokenHealth, scoreAuthStrength, rotateToken };
}
