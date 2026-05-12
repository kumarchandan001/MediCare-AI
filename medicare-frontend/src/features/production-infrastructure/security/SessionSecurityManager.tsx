/**
 * SessionSecurityManager — Manages secure session lifecycle, idle detection,
 * concurrent session control, and session integrity verification.
 */
import { useCallback, useRef } from "react";

export interface SecureSession {
  id: string;
  userId: string;
  createdAt: number;
  lastActivity: number;
  expiresAt: number;
  fingerprint: string;
  ipAddress: string;
  deviceInfo: string;
  isActive: boolean;
  renewalCount: number;
}

export interface SessionPolicy {
  maxIdleMs: number;
  maxSessionDurationMs: number;
  maxConcurrentSessions: number;
  requireFingerprint: boolean;
  renewalEnabled: boolean;
  maxRenewals: number;
}

const DEFAULT_POLICY: SessionPolicy = {
  maxIdleMs: 30 * 60 * 1000, maxSessionDurationMs: 8 * 60 * 60 * 1000,
  maxConcurrentSessions: 3, requireFingerprint: true, renewalEnabled: true, maxRenewals: 5,
};

export function useSessionSecurityManager(policyOverrides?: Partial<SessionPolicy>) {
  const policy = useRef<SessionPolicy>({ ...DEFAULT_POLICY, ...policyOverrides });

  const validateSession = useCallback((session: SecureSession): { valid: boolean; reason: string | null } => {
    const now = Date.now();
    if (!session.isActive) return { valid: false, reason: "Session is inactive" };
    if (now > session.expiresAt) return { valid: false, reason: "Session expired" };
    if (now - session.lastActivity > policy.current.maxIdleMs) return { valid: false, reason: "Session idle timeout" };
    if (now - session.createdAt > policy.current.maxSessionDurationMs) return { valid: false, reason: "Maximum session duration exceeded" };
    return { valid: true, reason: null };
  }, []);

  const shouldRenew = useCallback((session: SecureSession): boolean => {
    if (!policy.current.renewalEnabled) return false;
    if (session.renewalCount >= policy.current.maxRenewals) return false;
    const timeRemaining = session.expiresAt - Date.now();
    return timeRemaining < policy.current.maxIdleMs * 0.3;
  }, []);

  const checkConcurrency = useCallback((sessions: SecureSession[], userId: string): { allowed: boolean; sessionsToRevoke: string[] } => {
    const userSessions = sessions.filter(s => s.userId === userId && s.isActive);
    if (userSessions.length < policy.current.maxConcurrentSessions) return { allowed: true, sessionsToRevoke: [] };
    const sorted = userSessions.sort((a, b) => a.lastActivity - b.lastActivity);
    const toRevoke = sorted.slice(0, userSessions.length - policy.current.maxConcurrentSessions + 1);
    return { allowed: true, sessionsToRevoke: toRevoke.map(s => s.id) };
  }, []);

  const generateFingerprint = useCallback((): string => {
    const nav = typeof navigator !== "undefined" ? navigator : null;
    const parts = [nav?.userAgent || "", nav?.language || "", screen?.width || 0, screen?.height || 0, Intl.DateTimeFormat().resolvedOptions().timeZone || ""];
    return btoa(parts.join("|")).slice(0, 32);
  }, []);

  return { validateSession, shouldRenew, checkConcurrency, generateFingerprint, getPolicy: () => policy.current };
}
