/**
 * InfrastructureProvisioning — Automated infrastructure provisioning,
 * resource allocation, and capacity planning for health platform services.
 */
import { useCallback } from "react";
import type { EnvironmentTier } from "../core/ProductionInfrastructureEngine";

export interface ProvisioningPlan {
  id: string;
  environment: EnvironmentTier;
  resources: ProvisionedResource[];
  estimatedCost: number;
  provisioningTimeMs: number;
  status: "planned" | "provisioning" | "ready" | "failed";
  createdAt: number;
}

export interface ProvisionedResource {
  type: "compute" | "database" | "cache" | "storage" | "queue" | "cdn";
  name: string;
  tier: string;
  replicas: number;
  config: Record<string, unknown>;
}

export function useInfrastructureProvisioning() {
  const generatePlan = useCallback((env: EnvironmentTier): ProvisioningPlan => {
    const resources: ProvisionedResource[] = [
      { type: "compute", name: "api-server", tier: env === "production" ? "high" : "standard", replicas: env === "production" ? 3 : 1, config: { cpu: env === "production" ? 4 : 1, memoryGB: env === "production" ? 8 : 2 } },
      { type: "database", name: "health-db", tier: env === "production" ? "high-availability" : "standard", replicas: env === "production" ? 2 : 1, config: { engine: "postgresql", storageGB: env === "production" ? 100 : 10 } },
      { type: "cache", name: "session-cache", tier: "standard", replicas: env === "production" ? 2 : 1, config: { engine: "redis", maxMemoryMB: env === "production" ? 512 : 64 } },
      { type: "queue", name: "task-queue", tier: "standard", replicas: 1, config: { engine: "rabbitmq", maxMessages: 10000 } },
      { type: "storage", name: "health-assets", tier: "standard", replicas: 1, config: { type: "object-storage", maxGB: 50 } },
    ];
    if (env === "production") {
      resources.push({ type: "cdn", name: "static-cdn", tier: "global", replicas: 1, config: { origins: ["api-server"], cacheMaxAge: 86400 } });
    }
    return { id: `prov-${env}-${Date.now()}`, environment: env, resources, estimatedCost: resources.length * (env === "production" ? 150 : 25), provisioningTimeMs: env === "production" ? 120000 : 30000, status: "planned", createdAt: Date.now() };
  }, []);

  const validatePlan = useCallback((plan: ProvisioningPlan): { valid: boolean; issues: string[] } => {
    const issues: string[] = [];
    if (plan.resources.length === 0) issues.push("No resources defined");
    const hasCompute = plan.resources.some(r => r.type === "compute");
    const hasDb = plan.resources.some(r => r.type === "database");
    if (!hasCompute) issues.push("Missing compute resources");
    if (!hasDb) issues.push("Missing database resources");
    if (plan.environment === "production") {
      const singleReplica = plan.resources.filter(r => r.replicas < 2 && r.type !== "cdn" && r.type !== "storage");
      if (singleReplica.length > 0) issues.push(`Production resources without redundancy: ${singleReplica.map(r => r.name).join(", ")}`);
    }
    return { valid: issues.length === 0, issues };
  }, []);

  return { generatePlan, validatePlan };
}
