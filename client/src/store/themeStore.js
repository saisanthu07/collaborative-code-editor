import { create } from "zustand";

const THEME_STORAGE_KEY = "codetogether_paper_theme";

function getInitialTheme() {
  if (typeof window === "undefined") return "dark";
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "light" || saved === "dark") {
      return saved;
    }
  } catch {
    // ignore storage access errors
  }
  return "dark";
}

function applyThemeToDocument(theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
    root.setAttribute("data-theme", "midnight-kraft");
  } else {
    root.classList.remove("dark");
    root.classList.add("light");
    root.setAttribute("data-theme", "editorial-parchment");
  }
}

// Apply on initial load
if (typeof window !== "undefined") {
  applyThemeToDocument(getInitialTheme());
}

export const useThemeStore = create((set, get) => ({
  theme: getInitialTheme(),
  setTheme: (newTheme) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch {
      // ignore storage write errors
    }
    applyThemeToDocument(newTheme);
    set({ theme: newTheme });
  },
  toggleTheme: () => {
    const current = get().theme;
    const nextTheme = current === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // ignore
    }
    applyThemeToDocument(nextTheme);
    set({ theme: nextTheme });
  },
}));
