import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { predictionApi } from "../api/predictionApi";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { useToast } from "@/shared/hooks/useToast";
import { QUERY_KEYS } from "@/config/constants";
import type {
  PredictionResult,
  WHOCountry,
  LifestyleInput,
} from "../types/prediction.types";

export interface LifestyleState {
  smoker:       boolean;
  drinker:      boolean;
  diabetic:     boolean;
  hypertensive: boolean;
  age_group:    "young" | "middle" | "senior";
  bmi_category: "normal" | "overweight" | "obese";
}

const DEFAULT_LIFESTYLE: LifestyleState = {
  smoker:       false,
  drinker:      false,
  diabetic:     false,
  hypertensive: false,
  age_group:    "middle",
  bmi_category: "normal",
};

export function usePrediction() {
  const toast = useToast();
  const qc    = useQueryClient();

  // ── Core symptom state ────────────────────────
  const [selectedSymptoms, setSelected] = useState<string[]>([]);
  const [searchQuery,  setSearchQuery]  = useState("");
  const [activeCategory, setCategory]   = useState("All");
  const [result, setResult]             = useState<PredictionResult | null>(null);

  // ── Country state ─────────────────────────────
  const [selectedCountry, setSelectedCountry] = useState<string>("");

  // ── Lifestyle state ───────────────────────────
  const [lifestyle,     setLifestyle]     = useState<LifestyleState>(DEFAULT_LIFESTYLE);
  const [showLifestyle, setShowLifestyle] = useState(false);

  const toggleLifestyleFlag = useCallback(
    (key: keyof Pick<LifestyleState, "smoker" | "drinker" | "diabetic" | "hypertensive">) => {
      setLifestyle((prev) => ({ ...prev, [key]: !prev[key] }));
    },
    []
  );

  const setLifestyleField = useCallback(
    <K extends keyof LifestyleState>(key: K, value: LifestyleState[K]) => {
      setLifestyle((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const resetLifestyle = useCallback(() => setLifestyle(DEFAULT_LIFESTYLE), []);

  // ── Debounced search ──────────────────────────
  const debouncedSearch = useDebounce(searchQuery, 300);

  // ── Load symptoms ─────────────────────────────
  const { data: symptomsData, isLoading: symptomsLoading } = useQuery({
    queryKey: ["prediction", "symptoms"],
    queryFn:  predictionApi.getSymptoms,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime:    24 * 60 * 60 * 1000,
  });

  // ── Load WHO countries ────────────────────────
  const { data: countriesData } = useQuery({
    queryKey: ["prediction", "countries"],
    queryFn:  predictionApi.getCountries,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime:    24 * 60 * 60 * 1000,
  });
  const countries: WHOCountry[] = countriesData?.countries ?? [];

  // ── Prediction history ────────────────────────
  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: QUERY_KEYS.PREDICT_HISTORY,
    queryFn:  () => predictionApi.getHistory(),
  });

  // ── Predict mutation ──────────────────────────
  const predictMutation = useMutation({
    mutationFn: predictionApi.predict,
    onSuccess: (data) => {
      setResult(data);
      const country = data.who_adjustment?.country_name;
      toast.success(
        `Prediction: ${data.predicted_disease}` +
        (country ? ` (WHO: ${country})` : "")
      );
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PREDICT_HISTORY });
    },
    onError: () => {
      toast.error("Prediction failed. Please try again.");
    },
  });

  // ── Filtered symptoms ─────────────────────────
  const filteredSymptoms = useMemo(() => {
    if (!symptomsData) return [];
    let list = symptomsData.symptoms ?? [];
    if (activeCategory !== "All" && symptomsData.categories) {
      list = symptomsData.categories[activeCategory] ?? [];
    }
    if (debouncedSearch) {
      list = list.filter(
        (s) =>
          s.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          s.replace(/_/g, " ").toLowerCase().includes(debouncedSearch.toLowerCase())
      );
    }
    return list;
  }, [symptomsData, activeCategory, debouncedSearch]);

  // ── Category list ─────────────────────────────
  const categories = useMemo(() => {
    if (!symptomsData?.categories) return ["All"];
    return ["All", ...Object.keys(symptomsData.categories)];
  }, [symptomsData]);

  // ── Actions ───────────────────────────────────
  const toggleSymptom = useCallback((symptom: string) => {
    setSelected((prev) =>
      prev.includes(symptom)
        ? prev.filter((s) => s !== symptom)
        : prev.length >= 20
          ? prev
          : [...prev, symptom]
    );
  }, []);

  const removeSymptom = useCallback(
    (symptom: string) => setSelected((prev) => prev.filter((s) => s !== symptom)),
    []
  );

  const clearAll = useCallback(() => {
    setSelected([]);
    setResult(null);
  }, []);

  const runPrediction = useCallback(() => {
    if (selectedSymptoms.length === 0) return;

    // Build lifestyle payload — only send if any flag is set
    const hasLifestyle =
      lifestyle.smoker || lifestyle.drinker || lifestyle.diabetic ||
      lifestyle.hypertensive || lifestyle.age_group !== "middle" ||
      lifestyle.bmi_category !== "normal";

    const lifestylePayload: LifestyleInput | undefined = hasLifestyle
      ? {
          smoker:       lifestyle.smoker,
          drinker:      lifestyle.drinker,
          diabetic:     lifestyle.diabetic,
          hypertensive: lifestyle.hypertensive,
          age_group:    lifestyle.age_group,
          bmi_category: lifestyle.bmi_category,
        }
      : undefined;

    predictMutation.mutate({
      symptoms:     selectedSymptoms,
      country_code: selectedCountry || undefined,
      lifestyle:    lifestylePayload,
    });
  }, [selectedSymptoms, selectedCountry, lifestyle, predictMutation]);

  return {
    // Symptoms
    symptomsData,
    symptomsLoading,
    filteredSymptoms,
    categories,
    selectedSymptoms,
    toggleSymptom,
    removeSymptom,
    clearAll,
    searchQuery,
    setSearchQuery,
    activeCategory,
    setCategory,
    // Country
    countries,
    selectedCountry,
    setSelectedCountry,
    // Lifestyle
    lifestyle,
    showLifestyle,
    setShowLifestyle,
    toggleLifestyleFlag,
    setLifestyleField,
    resetLifestyle,
    // Prediction
    runPrediction,
    isPredicting: predictMutation.isPending,
    result,
    clearResult: () => setResult(null),
    // History
    history,
    historyLoading,
  };
}
