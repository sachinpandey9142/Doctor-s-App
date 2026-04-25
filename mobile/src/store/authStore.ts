import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

import { setAuthToken } from "@/services/api/client";
import { disconnectSocket } from "@/services/socket/socketClient";
import type { User } from "@/types/models";

const AUTH_STORAGE_KEY = "doctors-app-auth-session";

interface SessionData {
  token: string;
  user: User;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  setSession: (data: SessionData) => Promise<void>;
  updateUser: (patch: Partial<User>) => Promise<void>;
  logout: () => Promise<void>;
}

const persistSession = async (token: string, user: User) => {
  await AsyncStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({
      token,
      user
    })
  );
};

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isHydrated: false,

  hydrate: async () => {
    try {
      const sessionRaw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (!sessionRaw) {
        set({ isHydrated: true });
        return;
      }

      const session = JSON.parse(sessionRaw) as SessionData;
      setAuthToken(session.token);
      set({
        token: session.token,
        user: session.user,
        isHydrated: true
      });
    } catch (_error) {
      set({
        token: null,
        user: null,
        isHydrated: true
      });
    }
  },

  setSession: async ({ token, user }) => {
    setAuthToken(token);
    set({ token, user });
    await persistSession(token, user);
  },

  updateUser: async (patch) => {
    const current = get().user;
    if (!current) {
      return;
    }

    const updatedUser = {
      ...current,
      ...patch
    };

    set({ user: updatedUser });

    const token = get().token;
    if (token) {
      await persistSession(token, updatedUser);
    }
  },

  logout: async () => {
    setAuthToken(null);
    disconnectSocket();
    set({ token: null, user: null });
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
  }
}));
