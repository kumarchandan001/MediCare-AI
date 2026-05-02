import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "../store/authStore";
import { authApi } from "../api/authApi";
import { useToast } from "@/store/toastStore";
import { ROUTES } from "@/config/constants";
import type {
  SignupPayload,
  LoginPayload,
  DirectLoginPayload,
  VerifyOTPPayload,
  OTPSentData,
  AuthTokens,
} from "../types/auth.types";

export function useAuth() {
  const navigate = useNavigate();
  const toast = useToast();
  const {
    setTokens,
    setUser,
    logout: storeLogout,
    isAuthenticated,
    isAdmin,
    user,
  } = useAuthStore();

  const [pendingOTP, setPendingOTP] = useState<OTPSentData | null>(null);

  // ── Signup ───────────────────────────
  const signupMutation = useMutation({
    mutationFn: authApi.signup,
    onSuccess: (data: OTPSentData) => {
      setPendingOTP(data);
      toast.success("Account created! Check your email for OTP.");
      navigate(ROUTES.VERIFY_OTP, {
        state: { purpose: "signup", email: data.email },
      });
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.error?.message ||
          "Signup failed. Please try again."
      );
    },
  });

  // ── Login (OTP flow) ────────────────
  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data: OTPSentData) => {
      setPendingOTP(data);
      toast.info("OTP sent to your email.");
      navigate(ROUTES.VERIFY_OTP, {
        state: { purpose: "login", email: data.email },
      });
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.error?.message || "Login failed."
      );
    },
  });

  // ── Login Direct (password only) ────
  const loginDirectMutation = useMutation({
    mutationFn: authApi.loginDirect,
    onSuccess: (data: any) => {
      setTokens(data.access_token, data.refresh_token);
      setUser(data.user);
      toast.success("Welcome back!");
      
      const isProfileIncomplete = !data.user.gender || !data.user.height || !data.user.weight || !data.user.blood_type;
      if (isProfileIncomplete) {
        navigate(ROUTES.ONBOARDING);
      } else {
        navigate(ROUTES.DASHBOARD);
      }
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.error?.message || "Login failed."
      );
    },
  });

  // ── Verify OTP ───────────────────────
  const verifyOTPMutation = useMutation({
    mutationFn: authApi.verifyOTP,
    onSuccess: (data: any) => {
      // Login/Signup success — has tokens
      if (data.access_token) {
        setTokens(data.access_token, data.refresh_token);
        setUser(data.user);
        toast.success("Welcome to MediCare AI!");
        
        const isProfileIncomplete = !data.user.gender || !data.user.height || !data.user.weight || !data.user.blood_type;
        if (isProfileIncomplete) {
          navigate(ROUTES.ONBOARDING);
        } else {
          navigate(ROUTES.DASHBOARD);
        }
      }
      // Reset password — has reset_token
      if (data.reset_token) {
        navigate(ROUTES.RESET_PASSWORD, {
          state: { token: data.reset_token },
        });
      }
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.error?.message ||
          "Invalid OTP. Please try again."
      );
    },
  });

  // ── Resend OTP ───────────────────────
  const resendOTPMutation = useMutation({
    mutationFn: ({
      email,
      purpose,
    }: {
      email: string;
      purpose: string;
    }) => authApi.resendOTP(email, purpose),
    onSuccess: () => {
      toast.success("OTP resent! Check your email.");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.error?.message || "Could not resend OTP."
      );
    },
  });

  // ── Forgot Password ──────────────────
  const forgotPasswordMutation = useMutation({
    mutationFn: authApi.forgotPassword,
    onSuccess: (_data: any, variables: { email: string }) => {
      toast.success(
        "If this email is registered, you'll receive an OTP."
      );
      navigate(ROUTES.VERIFY_OTP, {
        state: { purpose: "reset_password", email: variables.email },
      });
    },
  });

  // ── Reset Password ───────────────────
  const resetPasswordMutation = useMutation({
    mutationFn: authApi.resetPassword,
    onSuccess: () => {
      toast.success("Password reset successfully! Please login.");
      navigate(ROUTES.LOGIN);
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.error?.message ||
          "Reset failed. Please try again."
      );
    },
  });

  // ── Logout ───────────────────────────
  const logout = () => {
    storeLogout();
    toast.info("Logged out successfully.");
    navigate(ROUTES.LOGIN);
  };

  return {
    // State
    user,
    isAuthenticated: isAuthenticated(),
    isAdmin: isAdmin(),
    pendingOTP,

    // Mutations
    signup: signupMutation.mutate,
    login: loginMutation.mutate,
    loginDirect: loginDirectMutation.mutate,
    verifyOTP: verifyOTPMutation.mutate,
    resendOTP: resendOTPMutation.mutate,
    forgotPassword: forgotPasswordMutation.mutate,
    resetPassword: resetPasswordMutation.mutate,
    logout,

    // Loading states
    isSigningUp: signupMutation.isPending,
    isLoggingIn: loginMutation.isPending,
    isLoggingInDirect: loginDirectMutation.isPending,
    isVerifying: verifyOTPMutation.isPending,
    isResending: resendOTPMutation.isPending,
    isSendingReset: forgotPasswordMutation.isPending,
    isResetting: resetPasswordMutation.isPending,
  };
}
