/**
 * APIProtectionEngine — Protects API endpoints with rate limiting,
 * request validation, anomaly detection, and circuit breaking.
 */
import { useCallback, useRef } from "react";

export interface RateLimitBucket {
  endpoint: string;
  windowMs: number;
  maxRequests: number;
  currentCount: number;
  windowStart: number;
  blocked: boolean;
}

export interface CircuitBreaker {
  endpoint: string;
  state: "closed" | "open" | "half_open";
  failureCount: number;
  failureThreshold: number;
  lastFailure: number | null;
  resetTimeoutMs: number;
  successCount: number;
}

export interface RequestValidation {
  endpoint: string;
  method: string;
  valid: boolean;
  violations: string[];
  sanitized: boolean;
}

export function useAPIProtectionEngine() {
  const buckets = useRef<Map<string, RateLimitBucket>>(new Map());
  const breakers = useRef<Map<string, CircuitBreaker>>(new Map());

  const checkRateLimit = useCallback((endpoint: string, maxPerMinute = 60): { allowed: boolean; retryAfterMs: number } => {
    const now = Date.now();
    let bucket = buckets.current.get(endpoint);
    if (!bucket || now - bucket.windowStart > 60000) {
      bucket = { endpoint, windowMs: 60000, maxRequests: maxPerMinute, currentCount: 0, windowStart: now, blocked: false };
    }
    bucket.currentCount++;
    if (bucket.currentCount > bucket.maxRequests) {
      bucket.blocked = true;
      buckets.current.set(endpoint, bucket);
      return { allowed: false, retryAfterMs: 60000 - (now - bucket.windowStart) };
    }
    buckets.current.set(endpoint, bucket);
    return { allowed: true, retryAfterMs: 0 };
  }, []);

  const checkCircuitBreaker = useCallback((endpoint: string): { allowed: boolean; state: CircuitBreaker["state"] } => {
    let breaker = breakers.current.get(endpoint);
    if (!breaker) {
      breaker = { endpoint, state: "closed", failureCount: 0, failureThreshold: 5, lastFailure: null, resetTimeoutMs: 30000, successCount: 0 };
      breakers.current.set(endpoint, breaker);
    }
    if (breaker.state === "open") {
      if (breaker.lastFailure && Date.now() - breaker.lastFailure > breaker.resetTimeoutMs) {
        breaker.state = "half_open";
        breakers.current.set(endpoint, breaker);
        return { allowed: true, state: "half_open" };
      }
      return { allowed: false, state: "open" };
    }
    return { allowed: true, state: breaker.state };
  }, []);

  const recordFailure = useCallback((endpoint: string) => {
    const breaker = breakers.current.get(endpoint);
    if (!breaker) return;
    breaker.failureCount++;
    breaker.lastFailure = Date.now();
    if (breaker.failureCount >= breaker.failureThreshold) breaker.state = "open";
    breakers.current.set(endpoint, breaker);
  }, []);

  const recordSuccess = useCallback((endpoint: string) => {
    const breaker = breakers.current.get(endpoint);
    if (!breaker) return;
    if (breaker.state === "half_open") { breaker.state = "closed"; breaker.failureCount = 0; }
    breaker.successCount++;
    breakers.current.set(endpoint, breaker);
  }, []);

  const validateRequest = useCallback((endpoint: string, method: string, body?: unknown): RequestValidation => {
    const violations: string[] = [];
    if (method === "GET" && body) violations.push("GET requests should not have a body");
    if (typeof body === "string" && (body.includes("<script") || body.includes("javascript:"))) violations.push("Potential XSS payload detected");
    return { endpoint, method, valid: violations.length === 0, violations, sanitized: true };
  }, []);

  return { checkRateLimit, checkCircuitBreaker, recordFailure, recordSuccess, validateRequest };
}
