import { AxiosError } from "axios";
import { useToastStore } from "@/store/toastStore";

// Error types
export type AppError = AxiosError | Error | unknown;

export interface ParsedError {
  message: string;
  type: string;
  statusCode: number;
  details?: Record<string, unknown>;
}

// ── Parse any error into standard shape ─────
export function parseError(error: AppError): ParsedError {
  // Axios error (API error)
  if (error instanceof Error && "response" in error) {
    const axiosError = error as AxiosError<{
      error?: {
        message?: string;
        type?: string;
        details?: Record<string, unknown>;
      };
    }>;

    const status = axiosError.response?.status || 500;
    const data = axiosError.response?.data;

    // Network error (no response)
    if (!axiosError.response) {
      return {
        message: "Network error. Please check your internet connection.",
        type: "NETWORK_ERROR",
        statusCode: 0,
      };
    }

    // Timeout
    if (axiosError.code === "ECONNABORTED") {
      return {
        message: "Request timed out. Please try again.",
        type: "TIMEOUT",
        statusCode: 408,
      };
    }

    // API returned error response
    return {
      message: data?.error?.message || getDefaultMessage(status),
      type: data?.error?.type || "API_ERROR",
      statusCode: status,
      details: data?.error?.details,
    };
  }

  // Standard JS Error
  if (error instanceof Error) {
    return {
      message: error.message,
      type: "CLIENT_ERROR",
      statusCode: 0,
    };
  }

  // Unknown error
  return {
    message: "An unexpected error occurred.",
    type: "UNKNOWN_ERROR",
    statusCode: 0,
  };
}

// ── Default messages by status code ─────
function getDefaultMessage(status: number): string {
  const messages: Record<number, string> = {
    400: "Invalid request. Please check your input.",
    401: "Session expired. Please login again.",
    403: "You don't have permission to do that.",
    404: "The requested resource was not found.",
    409: "A conflict occurred. Please try again.",
    422: "Validation failed. Please check your input.",
    429: "Too many requests. Please slow down.",
    500: "Server error. Our team has been notified.",
    502: "Service temporarily unavailable.",
    503: "Service under maintenance. Try again soon.",
  };
  return messages[status] || "Something went wrong. Please try again.";
}

// ── Global Error Handler ─────────────────
export function handleGlobalError(
  error: AppError,
  options?: {
    silent?: boolean;
    customMessage?: string;
  }
): ParsedError {
  const parsed = parseError(error);

  // Don't show toast for auth errors (handled by redirect to login)
  if (parsed.statusCode === 401) {
    return parsed;
  }

  // Don't show if silent mode
  if (options?.silent) {
    return parsed;
  }

  // Show toast notification
  const message = options?.customMessage || parsed.message;

  useToastStore.getState().addToast({
    type: "error",
    message,
    duration: 5000,
  });

  // Log in development
  if (import.meta.env.DEV) {
    console.error("[MediCare AI Error]", parsed);
  }

  return parsed;
}

// ── Async wrapper with error handling ───
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  options?: {
    silent?: boolean;
    customMessage?: string;
    onError?: (error: ParsedError) => void;
  }
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    const parsed = handleGlobalError(error, options);
    options?.onError?.(parsed);
    return null;
  }
}
