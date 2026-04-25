import { create } from "zustand";

export type ToastType = "error" | "success" | "info";

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastState {
  toasts: ToastMessage[];
  showToast: (message: string, type?: ToastType) => void;
  dismissToast: (id: string) => void;
}

let autoIncrementId = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  showToast: (message, type = "error") => {
    const id = String(++autoIncrementId);

    set((state) => ({
      toasts: [...state.toasts, { id, message, type }]
    }));

    // Auto-dismiss after 3.5 seconds
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id)
      }));
    }, 3500);
  },

  dismissToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id)
    }));
  }
}));

/**
 * Convenience helper — extracts a human-readable message from an API error or
 * any unknown thrown value. Use this in catch blocks across all stores.
 */
export const extractErrorMessage = (error: unknown, fallback = "Something went wrong"): string => {
  if (!error) {
    return fallback;
  }

  // Axios error with response from our backend
  const axiosMessage = (error as any)?.response?.data?.message;
  if (typeof axiosMessage === "string" && axiosMessage) {
    return axiosMessage;
  }

  // Standard JS Error
  const stdMessage = (error as any)?.message;
  if (typeof stdMessage === "string" && stdMessage) {
    return stdMessage;
  }

  return fallback;
};
