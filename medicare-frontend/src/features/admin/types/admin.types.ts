export interface PlatformStats {
  total_users: number;
  active_today: number;
  new_this_week: number;
  new_this_month: number;
  total_predictions: number;
  predictions_today: number;
  total_vitals: number;
  total_chats: number;
  total_alerts: number;
  critical_alerts: number;
  avg_health_score: number;
  avg_risk_score: number;
  user_growth_pct: number;
  prediction_growth_pct: number;
}

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  is_admin: boolean;
  email_verified: boolean;
  account_locked: boolean;
  created_at: string;
  last_login_at?: string;
  health_records: number;
  predictions: number;
  risk_level?: string;
  risk_score?: number;
}

export interface AdminUserList {
  users: AdminUser[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface AdminUserDetail {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  gender?: string;
  height?: number;
  weight?: number;
  blood_type?: string;
  is_active: boolean;
  is_admin: boolean;
  email_verified: boolean;
  account_locked: boolean;
  failed_login_count: number;
  created_at: string;
  last_login_at?: string;
  health_records: number;
  predictions: number;
  medications: number;
  alerts: number;
  avg_sleep: number;
  avg_heart_rate: number;
  avg_stress: number;
  last_prediction?: string;
  risk_score?: number;
  risk_level?: string;
}

export interface HealthIntelligence {
  avg_sleep_platform: number;
  avg_heart_rate_platform: number;
  avg_stress_platform: number;
  avg_oxygen_platform: number;
  avg_steps_platform: number;
  avg_bmi_platform: number;
  users_with_low_sleep: number;
  users_with_high_stress: number;
  users_with_high_risk: number;
  top_diseases: Array<{ disease: string; count: number; avg_confidence: number }>;
  daily_active_users: Array<{ date: string; count: number }>;
  risk_distribution: Record<string, number>;
}

export interface AIMonitorStats {
  total_predictions: number;
  predictions_today: number;
  predictions_this_week: number;
  avg_confidence: number;
  high_confidence_count: number;
  low_confidence_count: number;
  top_predicted_diseases: Array<{ disease: string; count: number; avg_conf: number }>;
  recent_predictions: Array<{ id: number; disease: string; conf: number; symptoms: string; date: string }>;
  confidence_distribution: Record<string, number>;
}

export interface SystemHealth {
  status: string;
  api_version: string;
  uptime_seconds: number;
  database: Record<string, any>;
  cache: Record<string, any>;
  disk: Record<string, any>;
  memory: Record<string, any>;
  ml_models: Record<string, any>;
  last_checked: string;
}

// ── New types for expanded admin panel ──

export interface AdminPredictionItem {
  id: number;
  user_id: number;
  username: string;
  email: string;
  predicted_disease: string;
  confidence: number;
  symptoms: string;
  created_at: string;
}

export interface AdminPredictionList {
  predictions: AdminPredictionItem[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface AdminAlertItem {
  id: number;
  user_id: number;
  username: string;
  email: string;
  title: string;
  message?: string;
  severity: string;
  category?: string;
  is_read: boolean;
  created_at: string;
}

export interface AdminAlertList {
  alerts: AdminAlertItem[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface AuditLogItem {
  id: number;
  admin_email: string;
  action: string;
  target_type?: string;
  target_id?: number;
  details?: string;
  created_at: string;
}

export interface AuditLogList {
  logs: AuditLogItem[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface AppSetting {
  key: string;
  value: string;
  value_type: "string" | "boolean" | "integer" | "json";
  description?: string;
  is_public: boolean;
  updated_at?: string;
}

export interface UserHealthData {
  vitals_count: number;
  activity_count: number;
  predictions_count: number;
  medications_count: number;
  alerts_count: number;
  avg_sleep: number;
  avg_hr: number;
  avg_stress: number;
  latest_bmi?: number;
  bmi_category?: string;
  risk_score?: number;
  risk_level?: string;
  recent_predictions: Array<{
    id: number;
    disease: string;
    conf: number;
    date: string;
    symptoms: string;
  }>;
  recent_vitals: Array<{
    sleep?: number;
    hr?: number;
    o2?: number;
    stress?: number;
    date: string;
  }>;
  recent_alerts: Array<{
    id: number;
    title: string;
    severity: string;
    is_read: boolean;
    date: string;
  }>;
  medications: Array<{
    name: string;
    dosage?: string;
    frequency: string;
    is_active: boolean;
  }>;
}
