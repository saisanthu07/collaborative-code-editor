import { create } from "zustand";

export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isInitialized: false,

  setAuth: (user, token) => {
    set({ user, token, isInitialized: true });
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

  logout: () => {
    set({ user: null, token: null, isInitialized: true });
  },
}));
