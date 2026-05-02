import { api } from "@/lib/apiClient";
import type {
  PredictionResult,
  SymptomsData,
  PredictionHistoryItem,
  CountriesData,
  LifestyleInput,
} from "../types/prediction.types";

export const predictionApi = {
  getSymptoms: () =>
    api.get<SymptomsData>("/prediction/symptoms"),

  predict: (data: {
    symptoms:      string[];
    country_code?: string;
    lifestyle?:    LifestyleInput;
  }) =>
    api.post<PredictionResult>("/prediction/predict", data),

  getHistory: (limit = 10) =>
    api.get<PredictionHistoryItem[]>("/prediction/history", { limit }),

  getCountries: () =>
    api.get<CountriesData>("/prediction/countries"),
};
