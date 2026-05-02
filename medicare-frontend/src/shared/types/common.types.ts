// Common types shared across features

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: "user" | "admin";
  avatar_url?: string;
  is_verified: boolean;
  created_at: string;
}

export interface SelectOption {
  value: string;
  label: string;
}

export type Status = "idle" | "loading" | "success" | "error";

export interface TimeRange {
  start: string;
  end: string;
}

export type Period = "day" | "week" | "month" | "year";
