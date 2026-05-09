/**
 * Auth Types — Authentication & user models
 */

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: "user" | "admin";
  is_active: boolean;
  profile_picture?: string;
  onboarding_complete: boolean;
  created_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface SignupRequest {
  email: string;
  password: string;
  full_name: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: () => boolean;
  isAdmin: () => boolean;
  login: (data: LoginResponse) => void;
  logout: () => void;
  refreshAccessToken: () => Promise<void>;
}
