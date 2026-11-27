import { create } from "zustand";

export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isInitialized: false,
  moderationNotice: null,

  setAuth: (user, token) => {
    set({ user, token, isInitialized: true, moderationNotice: null });
  },

  setToken: (token) => {
    set({ token });
  },

  updateUser: (user) => {
    set({ user });
  },

  setInitialized: (isInitialized = true) => {
    set({ isInitialized });
  },

  setModerationNotice: (moderationNotice) => {
    set({ moderationNotice });
  },

  clearModerationNotice: () => {
    set({ moderationNotice: null });
  },

  logout: () => {
    set({ user: null, token: null, isInitialized: true });
  },
}));
