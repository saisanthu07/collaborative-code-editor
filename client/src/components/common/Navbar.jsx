import { Link, NavLink, useNavigate } from "react-router-dom";
import { LogOut, User, Shield, LayoutDashboard } from "lucide-react";
import { useAuthStore } from "../../store/authStore.js";
import { api } from "../../services/api.js";
import { disconnectSocket } from "../../services/socket.js";
import ThemeToggle from "./ThemeToggle.jsx";
import BrandMark from "./BrandMark.jsx";

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore network errors on logout
    } finally {
      logout();
      disconnectSocket();
      navigate("/login");
    }
  }

  return (
    <header className="sticky top-0 border-b border-border bg-surface/90 backdrop-blur-md shrink-0 shadow-paper-sm z-30 w-full">
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-3 flex items-center justify-between gap-3">
        <Link
          to={user ? "/dashboard" : "/"}
          aria-label="CodeTogether Home"
          className="flex items-center gap-2.5 font-semibold text-base sm:text-lg text-gray-100 hover:text-accent transition-colors focus:outline-none focus:ring-2 focus:ring-accent rounded-lg shrink-0"
        >
          <BrandMark size={32} className="text-accent" />
          <span className="tracking-tight font-serif text-lg font-bold">CodeTogether</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          {user && (
            <nav aria-label="User Navigation" className="flex items-center gap-1.5 sm:gap-2 text-sm text-gray-300">
              <NavLink
                to="/dashboard"
                aria-label="Dashboard"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-accent text-xs font-medium ${
                    isActive
                      ? "bg-accent/10 text-accent border-accent/25 font-semibold shadow-paper-sm"
                      : "border-transparent text-gray-300 hover:text-gray-100 hover:border-border hover:bg-surface2"
                  }`
                }
              >
                <LayoutDashboard size={15} aria-hidden="true" />
                <span className="hidden sm:inline">Dashboard</span>
              </NavLink>
              <NavLink
                to="/profile"
                aria-label={`Profile for ${user.username}`}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-accent text-xs font-medium ${
                    isActive
                      ? "bg-accent/10 text-accent border-accent/25 font-semibold shadow-paper-sm"
                      : "border-transparent text-gray-300 hover:text-gray-100 hover:border-border hover:bg-surface2"
                  }`
                }
              >
                <User size={15} aria-hidden="true" />
                <span className="hidden sm:inline">{user.username}</span>
              </NavLink>
              {user.role === "ADMIN" && (
                <NavLink
                  to="/admin"
                  aria-label="Admin Console"
                  className={({ isActive }) =>
                    `flex items-center gap-1 px-2.5 py-1.5 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-accent text-xs font-medium ${
                      isActive
                        ? "bg-accent text-white border-accent font-semibold shadow-paper-sm"
                        : "text-accent hover:opacity-90 border-accent/20 bg-accent/10"
                    }`
                  }
                >
                  <Shield size={14} aria-hidden="true" />
                  <span className="hidden sm:inline">Admin</span>
                </NavLink>
              )}
              <button
                onClick={handleLogout}
                aria-label="Log out of account"
                className="flex items-center gap-1.5 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 px-2.5 py-1.5 rounded-lg border border-transparent hover:border-border hover:bg-surface2 transition-all focus:outline-none focus:ring-2 focus:ring-accent text-xs"
              >
                <LogOut size={15} aria-hidden="true" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}
