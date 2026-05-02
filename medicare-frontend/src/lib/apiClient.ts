import axios, {
  AxiosInstance,
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";
import { env } from "@/config/env";
import { handleGlobalError } from "./errorHandler";
import { useAuthStore } from "@/features/auth/store/authStore";

// Standard API response shape
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

// Create Axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: `${env.API_URL}/api/v1`,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: true,
});

// ── Request Interceptor ──────────────
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Attach JWT token if exists
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Let browser set Content-Type with boundary for FormData
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    // Add request timestamp for debugging
    if (env.isDev) {
      console.log(
        `[API] ${config.method?.toUpperCase()} ${config.url}`
      );
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// ── Response Interceptor ─────────────
apiClient.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    return response;
  },
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Handle 401 — try token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        await useAuthStore.getState().refreshAccessToken();
        const newToken = useAuthStore.getState().accessToken;
        if (newToken && originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        return apiClient(originalRequest);
      } catch {
        // Refresh failed → logout
        useAuthStore.getState().logout();
        window.location.href = "/login";
        return Promise.reject(error);
      }
    }

    // Handle other errors globally
    handleGlobalError(error);

    return Promise.reject(error);
  }
);

export default apiClient;

// ── Typed API helpers ─────────────────
export const api = {
  get: <T>(url: string, params?: object) =>
    apiClient
      .get<ApiResponse<T>>(url, { params })
      .then((r) => r.data.data),

  post: <T>(url: string, data?: object) =>
    apiClient
      .post<ApiResponse<T>>(url, data)
      .then((r) => r.data.data),

  put: <T>(url: string, data?: object) =>
    apiClient
      .put<ApiResponse<T>>(url, data)
      .then((r) => r.data.data),

  patch: <T>(url: string, data?: object) =>
    apiClient
      .patch<ApiResponse<T>>(url, data)
      .then((r) => r.data.data),

  delete: <T>(url: string) =>
    apiClient
      .delete<ApiResponse<T>>(url)
      .then((r) => r.data.data),
};
