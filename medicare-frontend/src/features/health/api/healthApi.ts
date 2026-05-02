import { api } from "@/lib/apiClient";
import type {
  VitalsFormData,
  ActivityFormData,
  BMIFormData,
  BMIResult,
  HealthHistoryItem,
  MedicationListData,
} from "../types/health.types";

export const healthApi = {
  // ── Vitals ──────────────────────────
  saveVitals: (data: VitalsFormData) => api.post("/health/vitals", data),

  // ── Activity ─────────────────────────
  saveActivity: (data: ActivityFormData) => api.post("/health/activity", data),

  // ── BMI ──────────────────────────────
  calculateBMI: (data: BMIFormData) =>
    api.post<BMIResult>("/health/bmi", data),

  // ── History ───────────────────────────
  getHistory: (days = 30) =>
    api.get<HealthHistoryItem[]>("/health/history", { days }),

  // ── Summary ───────────────────────────
  getSummary: (days = 7) => api.get("/health/summary", { days }),

  // ── Medications ──────────────────────
  getMedications: (activeOnly = false) =>
    api.get<MedicationListData>("/medications", { active_only: activeOnly }),

  addMedication: (data: {
    medicine_name: string;
    dosage?: string;
    reminder_time?: string;
    frequency: string;
    instructions?: string;
  }) => api.post("/medications", data),

  updateMedication: (
    id: number,
    data: Partial<{
      medicine_name: string;
      dosage: string;
      is_active: boolean;
    }>
  ) => api.patch(`/medications/${id}`, data),

  deleteMedication: (id: number) => api.delete(`/medications/${id}`),

  toggleMedication: (id: number) =>
    api.patch(`/medications/${id}/toggle`, {}),
};
