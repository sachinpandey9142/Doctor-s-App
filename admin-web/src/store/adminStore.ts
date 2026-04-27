import { create } from "zustand";

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface AdminStore {
  token: string | null;
  user: AdminUser | null;
  login: (token: string, user: AdminUser) => void;
  logout: () => void;
}

export const useAdminStore = create<AdminStore>((set) => ({
  token: localStorage.getItem("admin_token"),
  user: localStorage.getItem("admin_user") ? JSON.parse(localStorage.getItem("admin_user") as string) : null,
  login: (token, user) => {
    localStorage.setItem("admin_token", token);
    localStorage.setItem("admin_user", JSON.stringify(user));
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    set({ token: null, user: null });
  },
}));
