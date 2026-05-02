import { useToastStore } from "@/store/toastStore";

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
