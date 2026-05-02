import { create } from "zustand";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  addToast: (toast) => {
    const id = Math.random().toString(36).slice(2);
    const newToast = { ...toast, id };

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    // Auto-remove after duration
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, toast.duration || 4000);
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  clearAll: () => set({ toasts: [] }),
}));

// ── Convenience hook ─────────────────────
export function useToast() {
  const { addToast } = useToastStore();
  return {
    success: (msg: string, dur = 4000) =>
      addToast({ type: "success", message: msg, duration: dur }),
    error: (msg: string, dur = 5000) =>
      addToast({ type: "error", message: msg, duration: dur }),
    warning: (msg: string, dur = 4000) =>
      addToast({ type: "warning", message: msg, duration: dur }),
    info: (msg: string, dur = 4000) =>
      addToast({ type: "info", message: msg, duration: dur }),
  };
}
