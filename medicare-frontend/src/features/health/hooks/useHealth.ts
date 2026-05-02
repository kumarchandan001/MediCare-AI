import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { healthApi } from "../api/healthApi";
import { useToast } from "@/shared/hooks/useToast";
import { QUERY_KEYS } from "@/config/constants";
import type {
  VitalsFormData,
  ActivityFormData,
  BMIFormData,
  BMIResult,
  HealthTab,
} from "../types/health.types";

export function useHealth() {
  const toast = useToast();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<HealthTab>("vitals");
  const [bmiResult, setBmiResult] = useState<BMIResult | null>(null);

  // ── Queries ──────────────────────────
  const {
    data: history,
    isLoading: historyLoading,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: QUERY_KEYS.HEALTH_HISTORY,
    queryFn: () => healthApi.getHistory(30),
  });

  const {
    data: medications,
    isLoading: medsLoading,
    refetch: refetchMeds,
  } = useQuery({
    queryKey: QUERY_KEYS.MEDICATIONS,
    queryFn: () => healthApi.getMedications(),
  });

  const {
    data: summary,
    isLoading: summaryLoading,
  } = useQuery({
    queryKey: QUERY_KEYS.HEALTH_SUMMARY,
    queryFn: () => healthApi.getSummary(7),
    staleTime: 5 * 60 * 1000,
  });

  // ── Invalidate dashboard caches ──────
  const invalidateDashboard = () => {
    qc.invalidateQueries({ queryKey: QUERY_KEYS.HEALTH_SUMMARY });
    qc.invalidateQueries({ queryKey: QUERY_KEYS.RISK_SCORE });
    qc.invalidateQueries({ queryKey: QUERY_KEYS.ALERTS });
  };

  // ── Save Vitals ──────────────────────
  const vitalsMutation = useMutation({
    mutationFn: healthApi.saveVitals,
    onSuccess: () => {
      toast.success("Vitals saved successfully!");
      invalidateDashboard();
      qc.invalidateQueries({ queryKey: QUERY_KEYS.HEALTH_HISTORY });
    },
    onError: () => {
      toast.error("Failed to save vitals.");
    },
  });

  // ── Save Activity ────────────────────
  const activityMutation = useMutation({
    mutationFn: healthApi.saveActivity,
    onSuccess: () => {
      toast.success("Activity logged!");
      invalidateDashboard();
      qc.invalidateQueries({ queryKey: QUERY_KEYS.HEALTH_HISTORY });
    },
    onError: () => {
      toast.error("Failed to log activity.");
    },
  });

  // ── Calculate BMI ────────────────────
  const bmiMutation = useMutation({
    mutationFn: healthApi.calculateBMI,
    onSuccess: (data) => {
      setBmiResult(data as BMIResult);
      const d = data as BMIResult;
      toast.success(`BMI: ${d.bmi} — ${d.category}`);
      invalidateDashboard();
    },
    onError: () => {
      toast.error("BMI calculation failed.");
    },
  });

  // ── Add Medication ───────────────────
  const addMedMutation = useMutation({
    mutationFn: healthApi.addMedication,
    onSuccess: () => {
      toast.success("Medication added!");
      refetchMeds();
    },
    onError: () => {
      toast.error("Failed to add medication.");
    },
  });

  // ── Toggle Medication ────────────────
  const toggleMedMutation = useMutation({
    mutationFn: healthApi.toggleMedication,
    onSuccess: () => {
      refetchMeds();
    },
  });

  // ── Delete Medication ────────────────
  const deleteMedMutation = useMutation({
    mutationFn: healthApi.deleteMedication,
    onSuccess: () => {
      toast.success("Medication removed.");
      refetchMeds();
    },
    onError: () => {
      toast.error("Failed to delete medication.");
    },
  });

  return {
    // Tab
    activeTab,
    setActiveTab,

    // Queries
    history,
    historyLoading,
    medications,
    medsLoading,
    summary,
    summaryLoading,

    // BMI result
    bmiResult,
    setBmiResult,

    // Mutations
    saveVitals: (data: VitalsFormData) => vitalsMutation.mutate(data),
    saveActivity: (data: ActivityFormData) => activityMutation.mutate(data),
    calculateBMI: (data: BMIFormData) => bmiMutation.mutate(data),
    addMedication: addMedMutation.mutate,
    toggleMedication: toggleMedMutation.mutate,
    deleteMedication: deleteMedMutation.mutate,

    // Loading states
    isSavingVitals: vitalsMutation.isPending,
    isSavingActivity: activityMutation.isPending,
    isCalculatingBMI: bmiMutation.isPending,
    isAddingMed: addMedMutation.isPending,
    isTogglingMed: toggleMedMutation.isPending,
    isDeletingMed: deleteMedMutation.isPending,
  };
}
