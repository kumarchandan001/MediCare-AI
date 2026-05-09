import React, { Suspense, lazy } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "@/lib/queryClient";
import { ErrorBoundary } from "@/shared/components/error/ErrorBoundary";
import { PageLoader } from "@/shared/components/loading/PageLoader";
import { AppLayout } from "@/shared/components/layout/AppLayout";
import { ToastContainer } from "@/shared/components/ui/ToastContainer";
import { ROUTES } from "@/config/constants";
import { env } from "@/config/env";

// ── Lazy load all pages ──────────────────
const LoginPage = lazy(() => import("@/features/auth/pages/LoginPage"));
const SignupPage = lazy(() => import("@/features/auth/pages/SignupPage"));
const VerifyOTPPage = lazy(() => import("@/features/auth/pages/VerifyOTPPage"));
const ForgotPasswordPage = lazy(() => import("@/features/auth/pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("@/features/auth/pages/ResetPasswordPage"));
const DashboardPage = lazy(() => import("@/features/dashboard/pages/DashboardPage"));
const HealthPage = lazy(() => import("@/features/health/pages/HealthPage"));
const PredictionPage = lazy(() => import("@/features/prediction/pages/PredictionPage"));
const ClinicalInterviewPage = lazy(() => import("@/features/clinical-interview/pages/ClinicalInterviewPage"));
const AIAssistantPage = lazy(() => import("@/features/ai-assistant/pages/AIAssistantPage"));
const ReportsPage = lazy(() => import("@/features/reports/pages/ReportsPage"));
const EmergencyPage = lazy(() => import("@/features/emergency/pages/EmergencyPage"));
const ProfilePage = lazy(() => import("@/features/profile/pages/ProfilePage"));
const OnboardingPage = lazy(() => import("@/features/onboarding/pages/OnboardingPage"));

// ── Admin pages ──────────────────────────
const AdminLayout = lazy(() => import("@/features/admin/components/AdminLayout"));
const AdminDashboardPage = lazy(() => import("@/features/admin/pages/AdminDashboardPage"));
const AdminUsersPage = lazy(() => import("@/features/admin/pages/AdminUsersPage"));
const AdminUserDetailPage = lazy(() => import("@/features/admin/pages/AdminUserDetailPage"));
const AdminAIMonitorPage = lazy(() => import("@/features/admin/pages/AdminAIMonitorPage"));
const AdminSystemHealthPage = lazy(() => import("@/features/admin/pages/AdminSystemHealthPage"));
const AdminHealthIntelPage = lazy(() => import("@/features/admin/pages/AdminHealthIntelPage"));
const AdminPredictionsPage = lazy(() => import("@/features/admin/pages/AdminPredictionsPage"));
const AdminAlertsPage = lazy(() => import("@/features/admin/pages/AdminAlertsPage"));
const AdminAuditLogPage = lazy(() => import("@/features/admin/pages/AdminAuditLogPage"));
const AdminSettingsPage = lazy(() => import("@/features/admin/pages/AdminSettingsPage"));

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public routes */}
              <Route path={ROUTES.LOGIN} element={<LoginPage />} />
              <Route path={ROUTES.SIGNUP} element={<SignupPage />} />
              <Route path={ROUTES.VERIFY_OTP} element={<VerifyOTPPage />} />
              <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />
              <Route path={ROUTES.RESET_PASSWORD} element={<ResetPasswordPage />} />
              
              {/* Standalone protected routes */}
              <Route path={ROUTES.ONBOARDING} element={<OnboardingPage />} />

              {/* Protected routes (AppLayout handles auth guard) */}
              <Route element={<AppLayout />}>
                <Route index element={<Navigate to={ROUTES.DASHBOARD} replace />} />
                <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
                <Route path={ROUTES.HEALTH} element={<HealthPage />} />
                <Route path={ROUTES.PREDICTION} element={<PredictionPage />} />
                <Route path={ROUTES.CLINICAL_INTERVIEW} element={<ClinicalInterviewPage />} />
                <Route path={ROUTES.AI_ASSISTANT} element={<AIAssistantPage />} />
                <Route path={ROUTES.REPORTS} element={<ReportsPage />} />
                <Route path={ROUTES.EMERGENCY} element={<EmergencyPage />} />
                <Route path={ROUTES.PROFILE} element={<ProfilePage />} />
              </Route>

              {/* Admin routes (AdminLayout handles admin guard) */}
              <Route element={<AdminLayout />}>
                <Route path={ROUTES.ADMIN} element={<AdminDashboardPage />} />
                <Route path={ROUTES.ADMIN_USERS} element={<AdminUsersPage />} />
                <Route path={ROUTES.ADMIN_USER_DETAIL} element={<AdminUserDetailPage />} />
                <Route path={ROUTES.ADMIN_HEALTH} element={<AdminHealthIntelPage />} />
                <Route path={ROUTES.ADMIN_AI} element={<AdminAIMonitorPage />} />
                <Route path={ROUTES.ADMIN_PREDICTIONS} element={<AdminPredictionsPage />} />
                <Route path={ROUTES.ADMIN_ALERTS} element={<AdminAlertsPage />} />
                <Route path={ROUTES.ADMIN_SYSTEM} element={<AdminSystemHealthPage />} />
                <Route path={ROUTES.ADMIN_AUDIT_LOG} element={<AdminAuditLogPage />} />
                <Route path={ROUTES.ADMIN_SETTINGS} element={<AdminSettingsPage />} />
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<Navigate to={ROUTES.LOGIN} replace />} />
            </Routes>
          </Suspense>

          {/* Global toast notifications */}
          <ToastContainer />
        </BrowserRouter>

        {/* React Query devtools (dev only) */}
        {env.isDev && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
