from pydantic import BaseModel
from typing import List, Optional, Dict, Any


class PlatformStats(BaseModel):
    total_users: int
    active_today: int
    new_this_week: int
    new_this_month: int
    total_predictions: int
    predictions_today: int
    total_vitals: int
    total_chats: int
    total_alerts: int
    critical_alerts: int
    avg_health_score: float
    avg_risk_score: float
    user_growth_pct: float
    prediction_growth_pct: float


class AdminUserItem(BaseModel):
    id: int
    username: str
    email: str
    is_active: bool
    is_admin: bool
    email_verified: bool
    account_locked: bool
    created_at: str
    last_login_at: Optional[str]
    health_records: int
    predictions: int
    risk_level: Optional[str]
    risk_score: Optional[float]


class AdminUserListResponse(BaseModel):
    users: List[AdminUserItem]
    total: int
    page: int
    per_page: int
    total_pages: int


class AdminUserDetail(BaseModel):
    id: int
    username: str
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    gender: Optional[str]
    height: Optional[int]
    weight: Optional[int]
    blood_type: Optional[str]
    is_active: bool
    is_admin: bool
    email_verified: bool
    account_locked: bool
    failed_login_count: int
    created_at: str
    last_login_at: Optional[str]
    health_records: int
    predictions: int
    medications: int
    alerts: int
    avg_sleep: float
    avg_heart_rate: float
    avg_stress: float
    last_prediction: Optional[str]
    risk_score: Optional[float]
    risk_level: Optional[str]


class AdminUserUpdate(BaseModel):
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None
    account_locked: Optional[bool] = None
    email_verified: Optional[bool] = None


class HealthIntelligence(BaseModel):
    avg_sleep_platform: float
    avg_heart_rate_platform: float
    avg_stress_platform: float
    avg_oxygen_platform: float
    avg_steps_platform: float
    avg_bmi_platform: float
    users_with_low_sleep: int
    users_with_high_stress: int
    users_with_high_risk: int
    top_diseases: List[Dict[str, Any]]
    top_symptoms: List[Dict[str, Any]]
    risk_distribution: Dict[str, int]
    daily_active_users: List[Dict[str, Any]]


class AIMonitorStats(BaseModel):
    total_predictions: int
    predictions_today: int
    predictions_this_week: int
    avg_confidence: float
    high_confidence_count: int
    low_confidence_count: int
    top_predicted_diseases: List[Dict[str, Any]]
    confidence_distribution: Dict[str, int]
    recent_predictions: List[Dict[str, Any]]


class SystemHealthResponse(BaseModel):
    status: str
    api_version: str
    uptime_seconds: float
    database: Dict[str, Any]
    redis: Dict[str, Any]
    disk: Dict[str, Any]
    memory: Dict[str, Any]
    ml_models: Dict[str, Any]
    last_checked: str


# ── New schemas for expanded admin panel ──


class AdminPredictionItem(BaseModel):
    id: int
    user_id: int
    username: str
    email: str
    predicted_disease: str
    confidence: float
    symptoms: str
    created_at: str


class AdminPredictionList(BaseModel):
    predictions: List[AdminPredictionItem]
    total: int
    page: int
    per_page: int
    total_pages: int


class AdminAlertItem(BaseModel):
    id: int
    user_id: int
    username: str
    email: str
    title: str
    message: Optional[str]
    severity: str
    category: Optional[str]
    is_read: bool
    created_at: str


class AdminAlertList(BaseModel):
    alerts: List[AdminAlertItem]
    total: int
    page: int
    per_page: int
    total_pages: int


class AuditLogItem(BaseModel):
    id: int
    admin_email: str
    action: str
    target_type: Optional[str]
    target_id: Optional[int]
    details: Optional[str]
    created_at: str


class AuditLogList(BaseModel):
    logs: List[AuditLogItem]
    total: int
    page: int
    per_page: int
    total_pages: int


class AppSettingItem(BaseModel):
    key: str
    value: str
    value_type: str
    description: Optional[str]
    is_public: bool
    updated_at: Optional[str]


class AppSettingUpdate(BaseModel):
    value: str


class BroadcastRequest(BaseModel):
    title: str
    message: str
    severity: str = "info"


class UserHealthSummary(BaseModel):
    vitals_count: int
    activity_count: int
    predictions_count: int
    medications_count: int
    alerts_count: int
    avg_sleep: float
    avg_hr: float
    avg_stress: float
    latest_bmi: Optional[float]
    bmi_category: Optional[str]
    risk_score: Optional[float]
    risk_level: Optional[str]
    recent_predictions: List[Dict[str, Any]]
    recent_vitals: List[Dict[str, Any]]
    recent_alerts: List[Dict[str, Any]]
