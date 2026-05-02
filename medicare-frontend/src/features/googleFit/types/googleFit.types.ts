export interface GoogleFitStatus {
  connected: boolean;
  last_sync: string | null;
  auto_sync: boolean;
  scopes: string | null;
  token_valid: boolean;
}

export interface GoogleFitSyncSummary {
  vitals_synced: number;
  activities_synced: number;
  weight_synced: number;
  total_steps: number;
  avg_heart_rate: number | null;
  days_processed: number;
}

export interface GoogleFitSyncHistory {
  id: number;
  sync_type: "manual" | "auto" | "initial";
  status: "success" | "failed" | "partial";
  started_at: string;
  vitals: number;
  activities: number;
  total_steps: number;
  avg_hr: number | null;
  error: string | null;
}

export interface GoogleFitAuthUrl {
  auth_url: string;
  state: string;
  redirect_uri: string;
}
