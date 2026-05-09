/**
 * Wearable Types — Wearable device & sensor data models
 */

export interface WearableDevice {
  id: string;
  provider: "google_fit" | "apple_health" | "fitbit" | "garmin" | "manual";
  name: string;
  connected: boolean;
  last_sync: string;
  battery_level?: number;
  firmware_version?: string;
}

export interface WearableSnapshot {
  heart_rate: number;
  steps: number;
  calories_burned: number;
  distance_km: number;
  active_minutes: number;
  sleep_hours: number;
  blood_oxygen?: number;
  hrv_ms?: number;
  stress_level?: number;
  body_temperature?: number;
  timestamp: string;
  source: string;
}

export interface SensorFusionResult {
  fused_heart_rate: number;
  fused_stress: number;
  fused_activity: number;
  confidence: number;
  sources_used: string[];
  fusion_quality: "high" | "medium" | "low";
  timestamp: string;
}

export interface WearableSyncStatus {
  is_syncing: boolean;
  last_sync: string;
  next_sync: string;
  sync_quality: "excellent" | "good" | "poor" | "disconnected";
  data_points_synced: number;
  errors: string[];
}
