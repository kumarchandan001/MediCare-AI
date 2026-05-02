import { api } from "@/lib/apiClient";
import type {
  AuthTokens,
  OTPSentData,
  SignupPayload,
  LoginPayload,
  DirectLoginPayload,
  VerifyOTPPayload,
  ForgotPasswordPayload,
  ResetPasswordPayload,
  User,
  UserProfileUpdate,
} from "../types/auth.types";

export const authApi = {
  signup: (data: SignupPayload) =>
    api.post<OTPSentData>("/auth/signup", data),

  login: (data: LoginPayload) =>
    api.post<OTPSentData>("/auth/login", data),

  loginDirect: (data: DirectLoginPayload) =>
    api.post<AuthTokens>("/auth/login-password", data),

  verifyOTP: (data: VerifyOTPPayload) =>
    api.post<AuthTokens | { reset_token: string }>(
      "/auth/verify-otp",
      data
    ),

  resendOTP: (email: string, purpose: string) =>
    api.post("/auth/resend-otp", { email, purpose }),

  forgotPassword: (data: ForgotPasswordPayload) =>
    api.post("/auth/forgot-password", data),

  resetPassword: (data: ResetPasswordPayload) =>
    api.post("/auth/reset-password", data),

  refresh: (refresh_token: string) =>
    api.post<AuthTokens>("/auth/refresh", { refresh_token }),

  logout: (refresh_token: string) =>
    api.post("/auth/logout", { refresh_token }),

  getMe: () => api.get<User>("/auth/me"),

  updateProfile: (data: UserProfileUpdate) => 
    api.put<User>("/auth/me", data),

  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post<{ profile_picture_url: string }>("/auth/me/avatar", formData);
  },
};
