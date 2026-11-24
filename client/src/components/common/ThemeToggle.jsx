import { Sun, Moon, Feather } from "lucide-react";
import { useThemeStore } from "../../store/themeStore.js";

export default function ThemeToggle({ className = "", compact = false }) {
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "Editorial Parchment (Light)" : "Midnight Kraft (Dark)"} Paper Theme`}
      title={isDark ? "Switch to Editorial Parchment (Light Paper)" : "Switch to Midnight Kraft (Dark Paper)"}
      className={`group relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface2 transition-all shadow-paper-sm focus:outline-none focus:ring-2 focus:ring-accent select-none active:scale-95 ${className}`}
    >
      {isDark ? (
        <>
          <Sun size={14} className="text-amber-400 group-hover:rotate-45 transition-transform" />
          {!compact && (
            <span className="text-xs font-medium text-gray-300 group-hover:text-gray-100 hidden sm:inline">
              Parchment
            </span>
          )}
        </>
      ) : (
        <>
          <Moon size={14} className="text-accent group-hover:-rotate-12 transition-transform" />
          {!compact && (
            <span className="text-xs font-medium text-gray-300 group-hover:text-gray-100 hidden sm:inline">
              Midnight Kraft
            </span>
          )}
        </>
      )}
    </button>
  );
}
