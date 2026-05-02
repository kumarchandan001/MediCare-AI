import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../api/adminApi";
import { useToast } from "@/shared/hooks/useToast";
import { useDebounce } from "@/shared/hooks/useDebounce";

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin", "stats"],
    queryFn: adminApi.getStats,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 30 * 1000,
  });
}

export function useAdminUsers() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const dSearch = useDebounce(search, 400);

  const query = useQuery({
    queryKey: ["admin", "users", page, dSearch],
    queryFn: () => adminApi.getUsers({ page, per_page: 20, search: dSearch }),
    staleTime: 2 * 60 * 1000,
  });

  return { ...query, page, setPage, search, setSearch };
}

export function useAdminUserDetail(userId: number | null) {
  return useQuery({
    queryKey: ["admin", "user", userId],
    queryFn: () => adminApi.getUserDetail(userId!),
    enabled: userId !== null,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdminUserActions() {
  const toast = useToast();
  const qc = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => adminApi.updateUser(id, data),
    onSuccess: () => {
      toast.success("User updated.");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ["admin", "user"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
    onError: () => toast.error("Failed to update user."),
  });

  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteUser,
    onSuccess: () => {
      toast.success("User deleted.");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
    onError: () => toast.error("Failed to delete user."),
  });

  return {
    updateUser: (id: number, data: any) => updateMutation.mutate({ id, data }),
    deleteUser: deleteMutation.mutate,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export function useHealthIntelligence() {
  return useQuery({
    queryKey: ["admin", "health-intelligence"],
    queryFn: adminApi.getHealthIntelligence,
    staleTime: 15 * 60 * 1000,
  });
}

export function useAIMonitor() {
  return useQuery({
    queryKey: ["admin", "ai-monitor"],
    queryFn: adminApi.getAIMonitor,
    staleTime: 10 * 60 * 1000,
  });
}

export function useSystemHealth() {
  return useQuery({
    queryKey: ["admin", "system-health"],
    queryFn: adminApi.getSystemHealth,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

// ═══════════════════════════════════════════
//  NEW HOOKS
// ═══════════════════════════════════════════

export function useAdminUserHealth(userId: number | null) {
  return useQuery({
    queryKey: ["admin", "user-health", userId],
    queryFn: () => adminApi.getUserHealthData(userId!),
    enabled: userId !== null,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdminPredictions() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [disease, setDisease] = useState("");
  const dSearch = useDebounce(search, 400);
  const dDisease = useDebounce(disease, 400);

  const query = useQuery({
    queryKey: ["admin", "predictions", page, dSearch, dDisease],
    queryFn: () => adminApi.getAllPredictions({ page, per_page: 20, search: dSearch, disease: dDisease }),
    staleTime: 2 * 60 * 1000,
  });

  return { ...query, page, setPage, search, setSearch, disease, setDisease };
}

export function useAdminAlerts() {
  const [page, setPage] = useState(1);
  const [severity, setSeverity] = useState("");
  const [unreadOnly, setUnread] = useState(false);

  const query = useQuery({
    queryKey: ["admin", "alerts", page, severity, unreadOnly],
    queryFn: () => adminApi.getAllAlerts({ page, per_page: 20, severity, is_unread: unreadOnly }),
    staleTime: 60 * 1000,
    refetchInterval: 30 * 1000,
  });

  const toast = useToast();
  const qc = useQueryClient();

  const resolveMutation = useMutation({
    mutationFn: adminApi.resolveAlert,
    onSuccess: () => {
      toast.success("Alert resolved.");
      qc.invalidateQueries({ queryKey: ["admin", "alerts"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteAlert,
    onSuccess: () => {
      toast.success("Alert deleted.");
      qc.invalidateQueries({ queryKey: ["admin", "alerts"] });
    },
  });

  return {
    ...query,
    page, setPage,
    severity, setSeverity,
    unreadOnly, setUnread,
    resolveAlert: resolveMutation.mutate,
    deleteAlert: deleteMutation.mutate,
    isResolving: resolveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export function useAuditLog() {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("");

  return {
    ...useQuery({
      queryKey: ["admin", "audit-log", page, filter],
      queryFn: () => adminApi.getAuditLog({ page, per_page: 50, action: filter }),
      staleTime: 5 * 60 * 1000,
    }),
    page, setPage,
    filter, setFilter,
  };
}

export function useAppSettings() {
  const toast = useToast();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: adminApi.getSettings,
    staleTime: 10 * 60 * 1000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      adminApi.updateSetting(key, value),
    onSuccess: () => {
      toast.success("Setting updated.");
      qc.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
    onError: () => {
      toast.error("Failed to update setting.");
    },
  });

  return {
    ...query,
    settings: query.data?.settings || [],
    updateSetting: (key: string, value: string) => updateMutation.mutate({ key, value }),
    isUpdating: updateMutation.isPending,
  };
}

export function useAdminActions() {
  const toast = useToast();
  const qc = useQueryClient();

  const promoteMutation = useMutation({
    mutationFn: adminApi.promoteUser,
    onSuccess: () => {
      toast.success("User promoted to admin.");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ["admin", "user"] });
    },
    onError: () => toast.error("Failed to promote user."),
  });

  const demoteMutation = useMutation({
    mutationFn: adminApi.demoteUser,
    onSuccess: () => {
      toast.success("Admin demoted to user.");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ["admin", "user"] });
    },
  });

  const resetPwMutation = useMutation({
    mutationFn: adminApi.resetUserPassword,
    onSuccess: () => toast.success("Password reset email sent."),
    onError: () => toast.error("Failed to send reset email."),
  });

  const cacheMutation = useMutation({
    mutationFn: adminApi.clearCache,
    onSuccess: (data: any) => {
      toast.success(`Cache cleared: ${data?.keys_cleared || 0} keys.`);
    },
  });

  const broadcastMutation = useMutation({
    mutationFn: adminApi.broadcast,
    onSuccess: (data: any) => {
      toast.success(`Broadcast sent to ${data?.sent_to || 0} users.`);
    },
  });

  return {
    promoteUser: promoteMutation.mutate,
    demoteUser: demoteMutation.mutate,
    resetPassword: resetPwMutation.mutate,
    clearCache: cacheMutation.mutate,
    broadcast: broadcastMutation.mutate,
    isPromoting: promoteMutation.isPending,
    isDemoting: demoteMutation.isPending,
    isResetting: resetPwMutation.isPending,
    isClearingCache: cacheMutation.isPending,
    isBroadcasting: broadcastMutation.isPending,
  };
}
