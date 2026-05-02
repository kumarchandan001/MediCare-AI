import { api } from "@/lib/apiClient";
import type {
  ChatResponse,
  ChatMessage,
  SuggestedQuestions,
  HealthContextSummary,
  SendMessagePayload,
} from "../types/chat.types";

interface HistoryResponse {
  messages: ChatMessage[];
  count: number;
  has_more: boolean;
}

export const chatApi = {
  sendMessage: (data: SendMessagePayload) =>
    api.post<ChatResponse>("/chat", data),

  getHistory: (limit = 20) =>
    api.get<HistoryResponse>("/chat/history", { limit }),

  clearHistory: () => api.delete("/chat/history"),

  getSuggestedQuestions: () =>
    api.get<SuggestedQuestions>("/chat/suggested-questions"),

  getHealthContext: () =>
    api.get<HealthContextSummary>("/chat/health-context"),
};
