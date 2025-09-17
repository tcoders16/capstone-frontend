import { create } from "zustand";
import { persist } from "zustand/middleware";
import { loginAdmin } from "../lib/api";

type Role = "admin" | "rider";

type State = {
  token?: string;
  role?: Role;
  email?: string;
  lastActive: number;                  // epoch ms
  login: (role: Role, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  touch: () => void;                   // update lastActive on user activity
};

export const INACTIVITY_MS = 30 * 60 * 1000; // 30 minutes

export const useAuth = create(
  persist<State>(
    (set) => ({
      token: undefined,
      role: undefined,
      email: undefined,
      lastActive: Date.now(),

      async login(role, email, password) {
        if (role === "admin") {
          const { token } = await loginAdmin(email, password);
          set({ token, role, email, lastActive: Date.now() });
          return !!token;
        }
        // rider stub
        set({ token: "rider-dev", role: "rider", email, lastActive: Date.now() });
        return true;
      },

      logout() {
        set({ token: undefined, role: undefined, email: undefined, lastActive: 0 });
      },

      touch() {
        set({ lastActive: Date.now() });
      },
    }),
    { name: "lnf-auth" }
  )
);