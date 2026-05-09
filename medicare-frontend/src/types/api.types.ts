/**
 * API Type Contracts — Shared response/request types
 */

// ── Standard API Response ────────────────
export interface ApiResponse<T = unknown> {
  status: "success" | "error";
  code: number;
  data: T;
  message?: string;
  meta: {
    timestamp: string;
    version: string;
    request_id: string;
  };
}

export interface ApiError {
  status: "error";
  code: number;
  error: {
    type: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// ── Pagination ───────────────────────────
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface PaginationParams {
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

// ── Loading/Error States ─────────────────
export interface AsyncState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

// ── WebSocket Message ────────────────────
export interface WSMessage<T = unknown> {
  type: string;
  channel: string;
  payload: T;
  timestamp: string;
  correlation_id?: string;
}

export type WSConnectionStatus = "connecting" | "connected" | "disconnected" | "reconnecting" | "error";
