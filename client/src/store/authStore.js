import { create } from "zustand";

const STORAGE_KEY = "collab-editor-auth";

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { user: null, token: null, refreshToken: null };
  } catch {
    return { user: null, token: null, refreshToken: null };
  }
}

export const useAuthStore = create((set) => ({
  ...loadInitial(),

  setAuth: (user, token, refreshToken) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, token, refreshToken }));
    set({ user, token, refreshToken });
  },

  updateUser: (user) => {
    set((state) => {
      const next = { user, token: state.token, refreshToken: state.refreshToken };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ user: null, token: null, refreshToken: null });
  },
}));
