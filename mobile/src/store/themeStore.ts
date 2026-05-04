import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

const THEME_STORAGE_KEY = "doctors-app-theme-dark-mode";

interface ThemeState {
  isDarkMode: boolean;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  setDarkMode: (enabled: boolean) => Promise<void>;
  toggleDarkMode: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  isDarkMode: false,
  isHydrated: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (raw === null) {
        set({ isHydrated: true });
        return;
      }

      set({ isDarkMode: raw === "true", isHydrated: true });
    } catch (_error) {
      set({ isDarkMode: false, isHydrated: true });
    }
  },

  setDarkMode: async (enabled) => {
    set({ isDarkMode: enabled });
    await AsyncStorage.setItem(THEME_STORAGE_KEY, enabled ? "true" : "false");
  },

  toggleDarkMode: async () => {
    const next = !get().isDarkMode;
    await get().setDarkMode(next);
  }
}));