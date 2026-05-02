// Standard API response types used across the app

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface ApiMeta {
  timestamp: string;
  version: string;
  request_id: string;
}

export interface ApiSuccessResponse<T> {
  status: "success";
  code: number;
  data: T;
  message?: string;
  meta: ApiMeta;
}

export interface ApiErrorResponse {
  status: "error";
  code: number;
  error: {
    type: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta: ApiMeta;
}

export type SortDirection = "asc" | "desc";

export interface QueryParams {
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_dir?: SortDirection;
  search?: string;
}
