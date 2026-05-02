export interface VitalsFormData {
  sleep_hours?: number;
  heart_rate?: number;
  oxygen_level?: number;
  body_temperature?: number;
  stress_level?: number;
  blood_pressure?: string;
  notes?: string;
}

export interface ActivityFormData {
  steps: number;
  calories_burned: number;
  duration_minutes: number;
  activity_type: string;
}

export interface BMIFormData {
  height: number;
  weight: number;
}

export interface BMIResult {
  bmi: number;
  category: string;
  height: number;
  weight: number;
}

export interface HealthHistoryItem {
  id: number;
  date: string;
  sleep?: number;
  heart_rate?: number;
  oxygen?: number;
  stress?: number;
  temperature?: number;
  notes?: string;
  data_source?: string;
  created_at: string;
}

export interface Medication {
  id: number;
  medicine_name: string;
  dosage?: string;
  reminder_time?: string;
  frequency: string;
  instructions?: string;
  is_active: boolean;
  created_at: string;
}

export interface MedicationListData {
  medications: Medication[];
  count: number;
  active: number;
}

export type HealthTab =
  | "vitals"
  | "activity"
  | "bmi"
  | "medications"
  | "history";
