import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { googleFitApi } from "../api/googleFitApi";
import { useToast } from "@/shared/hooks/useToast";

export function useGoogleFitStatus() {
  return useQuery({
    queryKey: ["google-fit", "status"],
    queryFn: googleFitApi.getStatus,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000,
  });
}

export function useGoogleFitConnect() {
  const toast = useToast();
  const qc = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();

  // Handle OAuth callback on profile page
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const fitStatus = params.get("google_fit");

    if (fitStatus === "success") {
      const access_token = params.get("access_token") || "";
      const refresh_token = params.get("refresh_token") || "";
      const expires_in = parseInt(params.get("expires_in") || "3600");

      if (access_token) {
        googleFitApi
          .completeAuth({ access_token, refresh_token, expires_in })
          .then(() => {
            toast.success("Google Fit connected! Initial data synced.");
            qc.invalidateQueries({ queryKey: ["google-fit"] });
            qc.invalidateQueries({ queryKey: ["health"] });
          })
          .catch(() => {
            toast.error("Failed to save Google Fit tokens.");
          });
      }
      navigate("/profile", { replace: true });
    } else if (fitStatus === "error") {
      toast.error("Google Fit connection failed.");
      navigate("/profile", { replace: true });
    }
  }, [location.search]);

  const connectMutation = useMutation({
    mutationFn: async () => {
      const data = await googleFitApi.getAuthUrl();
      window.location.href = data.auth_url;
    },
    onError: () => {
      toast.error("Failed to start Google Fit connection.");
    },
  });

  return {
    connect: connectMutation.mutate,
    isConnecting: connectMutation.isPending,
  };
}

export function useGoogleFitSync() {
  const toast = useToast();
  const qc = useQueryClient();

  const syncMutation = useMutation({
    mutationFn: (daysBack: number = 1) => googleFitApi.sync(daysBack),
    onSuccess: (summary) => {
      const parts: string[] = [];
      if (summary.vitals_synced > 0) parts.push(`${summary.vitals_synced} vitals`);
      if (summary.activities_synced > 0) parts.push(`${summary.activities_synced} activities`);
      if (summary.total_steps > 0) parts.push(`${summary.total_steps.toLocaleString()} steps`);
      toast.success(
        parts.length > 0 ? `Synced: ${parts.join(", ")}` : "Sync complete. No new data."
      );
      qc.invalidateQueries({ queryKey: ["health"] });
      qc.invalidateQueries({ queryKey: ["google-fit"] });
    },
    onError: (err: Error) => {
      toast.error(err?.message || "Sync failed. Try again.");
    },
  });

  const autoSyncMutation = useMutation({
    mutationFn: googleFitApi.toggleAutoSync,
    onSuccess: (_: unknown, enabled: boolean) => {
      toast.success(`Auto-sync ${enabled ? "enabled" : "disabled"}.`);
      qc.invalidateQueries({ queryKey: ["google-fit", "status"] });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: googleFitApi.disconnect,
    onSuccess: () => {
      toast.success("Google Fit disconnected.");
      qc.invalidateQueries({ queryKey: ["google-fit"] });
    },
    onError: () => {
      toast.error("Failed to disconnect.");
    },
  });

  return {
    sync: syncMutation.mutate,
    isSyncing: syncMutation.isPending,
    lastSyncResult: syncMutation.data,
    toggleAutoSync: autoSyncMutation.mutate,
    disconnect: disconnectMutation.mutate,
    isDisconnecting: disconnectMutation.isPending,
  };
}

export function useGoogleFitHistory() {
  return useQuery({
    queryKey: ["google-fit", "history"],
    queryFn: googleFitApi.getHistory,
    staleTime: 5 * 60 * 1000,
  });
}
