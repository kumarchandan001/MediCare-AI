export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  gender?: string | null;
  height?: number | null;
  weight?: number | null;
  blood_type?: string | null;
  medical_conditions?: string | null;
  allergies?: string | null;
  profile_picture_url?: string | null;
  email_verified: boolean;
  is_admin: boolean;
  created_at: string;
}

export interface UserProfileUpdate {
  first_name?: string | null;
  last_name?: string | null;
  gender?: string | null;
  height?: number | null;
  weight?: number | null;
  blood_type?: string | null;
  medical_conditions?: string | null;
  allergies?: string | null;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface OTPSentData {
  email: string;
  purpose: OTPPurpose;
  expires_in_minutes: number;
  resend_cooldown: number;
}

export type OTPPurpose = "signup" | "login" | "reset_password";

export interface SignupPayload {
  username: string;
  email: string;
  password: string;
  confirm_password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface DirectLoginPayload {
  email: string;
  password: string;
}

export interface VerifyOTPPayload {
  email: string;
  otp: string;
  purpose: OTPPurpose;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
  confirm_password: string;
}
