import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "../types/auth.types";
import { authApi } from "../api/authApi";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;

  // Actions
  setTokens: (access: string, refresh: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
  refreshAccessToken: () => Promise<void>;
  isAuthenticated: () => boolean;
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,

      setTokens: (access, refresh) =>
        set({ accessToken: access, refreshToken: refresh }),

      setUser: (user) => set({ user }),

      logout: () => {
        const refresh = get().refreshToken;
        if (refresh) {
          // Fire and forget — don't await
          authApi.logout(refresh).catch(() => {});
        }
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
        });
      },

      refreshAccessToken: async () => {
        const refresh = get().refreshToken;
        if (!refresh) {
          get().logout();
          return;
        }
        try {
          const data = await authApi.refresh(refresh);
          set({
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
          });
        } catch {
          get().logout();
        }
      },

      isAuthenticated: () => !!(get().accessToken && get().user),

      isAdmin: () => get().user?.is_admin === true,
    }),
    {
      name: "medicare-auth",
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    }
  )
);
