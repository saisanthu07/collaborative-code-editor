import { Sun, Moon } from "lucide-react";
import { useThemeStore } from "../../store/themeStore.js";

export default function ThemeToggle({ className = "" }) {
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "Editorial Parchment (Light)" : "Midnight Kraft (Dark)"} Paper Theme`}
      title={isDark ? "Switch to Editorial Parchment (Light Paper)" : "Switch to Midnight Kraft (Dark Paper)"}
      className={`group relative flex items-center justify-center p-2 rounded-lg border border-border bg-surface hover:bg-surface2 transition-all shadow-paper-sm focus:outline-none focus:ring-2 focus:ring-accent select-none active:scale-95 ${className}`}
    >
      {isDark ? (
        <Sun size={15} className="text-amber-400 group-hover:rotate-45 transition-transform" />
      ) : (
        <Moon size={15} className="text-accent group-hover:-rotate-12 transition-transform" />
      )}
    </button>
  );
}
