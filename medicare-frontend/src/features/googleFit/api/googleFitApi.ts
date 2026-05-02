import { api } from "@/lib/apiClient";
import type {
  GoogleFitStatus,
  GoogleFitSyncSummary,
  GoogleFitAuthUrl,
  GoogleFitSyncHistory,
} from "../types/googleFit.types";

export const googleFitApi = {
  getStatus: () =>
    api.get<GoogleFitStatus>("/google-fit/status"),

  getAuthUrl: () =>
    api.get<GoogleFitAuthUrl>("/google-fit/auth-url"),

  completeAuth: (tokens: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }) =>
    api.post<{
      connected: boolean;
      initial_sync: GoogleFitSyncSummary | null;
    }>("/google-fit/complete-auth", tokens),

  sync: (daysBack: number = 1) =>
    api.post<GoogleFitSyncSummary>(`/google-fit/sync?days_back=${daysBack}`),

  toggleAutoSync: (enabled: boolean) =>
    api.patch("/google-fit/auto-sync", { enabled }),

  disconnect: () =>
    api.delete("/google-fit/disconnect"),

  getHistory: () =>
    api.get<{ history: GoogleFitSyncHistory[] }>("/google-fit/history"),
};
