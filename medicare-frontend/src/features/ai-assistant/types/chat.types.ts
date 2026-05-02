export interface ChatMessage {
  id: number | string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  isTyping?: boolean;
}

export interface ChatResponse {
  reply: string;
  role: string;
  message_id: number;
  context_used: boolean;
}

export interface SuggestedQuestions {
  questions: string[];
  category: string;
}

export interface HealthContextSummary {
  has_data: boolean;
  latest_sleep?: number;
  latest_heart_rate?: number;
  latest_stress?: number;
  latest_oxygen?: number;
  latest_steps?: number;
  latest_bmi?: number;
  bmi_category?: string;
  risk_level?: string;
  risk_score?: number;
  last_prediction?: string;
  prediction_confidence?: number;
  active_alerts: number;
  medications: string[];
  days_of_data: number;
}

export interface SendMessagePayload {
  message: string;
  include_health_context: boolean;
}
