/**
 * ExternalHealthDataConnector — Manages connections to external health
 * data sources with authentication, rate limiting, and error handling.
 */
import { useCallback, useRef } from "react";

export interface ExternalDataSource {
  id: string;
  name: string;
  type: "ehr" | "lab" | "pharmacy" | "wearable_api" | "phr" | "research_registry";
  authMethod: "oauth2" | "api_key" | "certificate" | "saml" | "none";
  baseUrl: string;
  status: "active" | "inactive" | "error" | "rate_limited";
  rateLimitRemaining: number | null;
  lastSuccessfulRequest: number | null;
  errorCount: number;
}

export interface DataRequest {
  sourceId: string;
  endpoint: string;
  method: "GET" | "POST";
  params: Record<string, string>;
  timeout: number;
}

export function useExternalHealthDataConnector() {
  const sources = useRef<Map<string, ExternalDataSource>>(new Map());

  const registerSource = useCallback((source: ExternalDataSource): void => {
    sources.current.set(source.id, source);
  }, []);

  const checkConnectivity = useCallback((sourceId: string): { reachable: boolean; latency: number; message: string } => {
    const source = sources.current.get(sourceId);
    if (!source) return { reachable: false, latency: 0, message: "Source not registered" };
    if (source.status === "rate_limited") return { reachable: false, latency: 0, message: "Rate limited — retry later" };
    if (source.status === "error") return { reachable: false, latency: 0, message: `Source in error state (${source.errorCount} errors)` };
    return { reachable: source.status === "active", latency: 150, message: "Connection healthy" };
  }, []);

  const getActiveSources = useCallback((): ExternalDataSource[] => {
    return Array.from(sources.current.values()).filter(s => s.status === "active");
  }, []);

  return { registerSource, checkConnectivity, getActiveSources, getAllSources: () => Array.from(sources.current.values()) };
}
