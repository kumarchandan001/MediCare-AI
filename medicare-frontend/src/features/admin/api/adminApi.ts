import { api } from "@/lib/apiClient";
import type {
  PlatformStats, AdminUserList, AdminUserDetail,
  HealthIntelligence, AIMonitorStats, SystemHealth,
  AdminPredictionList, AdminAlertList, AuditLogList,
  AppSetting, UserHealthData,
} from "../types/admin.types";

export const adminApi = {
  // ── Existing ──
  getStats: () => api.get<PlatformStats>("/admin/stats"),

  getUsers: (params: { page?: number; per_page?: number; search?: string }) =>
    api.get<AdminUserList>("/admin/users", params),

  getUserDetail: (id: number) => api.get<AdminUserDetail>(`/admin/users/${id}`),

  updateUser: (id: number, data: { is_active?: boolean; is_admin?: boolean; account_locked?: boolean; email_verified?: boolean }) =>
    api.patch(`/admin/users/${id}`, data),

  deleteUser: (id: number) => api.delete(`/admin/users/${id}`),

  getHealthIntelligence: () => api.get<HealthIntelligence>("/admin/health-intelligence"),

  getAIMonitor: () => api.get<AIMonitorStats>("/admin/ai-monitor"),

  getSystemHealth: () => api.get<SystemHealth>("/admin/system-health"),

  // ── New: User controls ──
  promoteUser: (id: number) => api.post(`/admin/users/${id}/promote`, {}),

  demoteUser: (id: number) => api.post(`/admin/users/${id}/demote`, {}),

  resetUserPassword: (id: number) => api.post(`/admin/users/${id}/reset-password`, {}),

  getUserHealthData: (id: number) => api.get<UserHealthData>(`/admin/users/${id}/health`),

  // ── New: Predictions ──
  getAllPredictions: (params: { page?: number; per_page?: number; search?: string; disease?: string }) =>
    api.get<AdminPredictionList>("/admin/predictions", params),

  // ── New: Alerts ──
  getAllAlerts: (params: { page?: number; per_page?: number; severity?: string; is_unread?: boolean }) =>
    api.get<AdminAlertList>("/admin/alerts", params),

  resolveAlert: (id: number) => api.patch(`/admin/alerts/${id}/resolve`, {}),

  deleteAlert: (id: number) => api.delete(`/admin/alerts/${id}`),

  // ── New: Cache ──
  clearCache: () => api.post<{ keys_cleared: number }>("/admin/cache/clear", {}),

  // ── New: Audit log ──
  getAuditLog: (params: { page?: number; per_page?: number; action?: string }) =>
    api.get<AuditLogList>("/admin/audit-log", params),

  // ── New: Settings ──
  getSettings: () => api.get<{ settings: AppSetting[] }>("/admin/settings"),

  updateSetting: (key: string, value: string) => api.patch(`/admin/settings/${key}`, { value }),

  // ── New: Broadcast ──
  broadcast: (data: { title: string; message: string; severity: string }) =>
    api.post<{ sent_to: number }>("/admin/broadcast", data),

  // ── New: Exports ──
  exportUsersUrl: () => `${import.meta.env.VITE_API_URL}/api/v1/admin/export/users`,

  exportPredictionsUrl: () => `${import.meta.env.VITE_API_URL}/api/v1/admin/export/predictions`,
};
