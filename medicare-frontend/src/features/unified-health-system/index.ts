/**
 * Phase 6 & 7 — Unified Health System Barrel Export
 */

// Core OS
export * from "./UnifiedHealthEngine";
export { default as UnifiedHealthStateProvider, useUnifiedHealthContext } from "./UnifiedHealthStateProvider";
export { default as HealthOperatingSystem } from "./HealthOperatingSystem";

// Mobile Interface (Batch 7)
export { default as MobileHealthExperience } from "./mobile/MobileHealthExperience";
export { default as CompactHealthCards } from "./mobile/CompactHealthCards";
export { default as MobileMonitoringView } from "./mobile/MobileMonitoringView";

// Dashboard & Components
export { default as UnifiedHealthDashboard } from "./dashboard/UnifiedHealthDashboard";
export { default as HealthCommandCenter } from "./dashboard/HealthCommandCenter";
export { default as CrossSystemInsightHub } from "./dashboard/CrossSystemInsightHub";
export { default as PreventiveMonitoringCenter } from "./dashboard/PreventiveMonitoringCenter";

// Storytelling
export { default as HolisticHealthTimeline } from "./storytelling/HolisticHealthTimeline";
