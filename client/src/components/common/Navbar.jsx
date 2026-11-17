import { Link, useNavigate } from "react-router-dom";
import { Code2, LogOut, User, Shield } from "lucide-react";
import { useAuthStore } from "../../store/authStore.js";
import { api } from "../../services/api.js";
import { disconnectSocket } from "../../services/socket.js";

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
    <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border bg-surface shrink-0">
      <Link
        to={user ? "/dashboard" : "/"}
        aria-label="CodeTogether Home"
        className="flex items-center gap-2 font-semibold text-base sm:text-lg text-gray-100 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-accent rounded"
      >
        <Code2 size={22} className="text-accent" aria-hidden="true" />
        <span>CodeTogether</span>
      </Link>
      {user && (
        <nav aria-label="User Navigation" className="flex items-center gap-3 sm:gap-4 text-sm text-gray-300">
          <Link
            to="/profile"
            aria-label={`Profile for ${user.username}`}
            className="flex items-center gap-1.5 hover:text-white px-2 py-1 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <User size={16} aria-hidden="true" />
            <span className="hidden sm:inline font-medium">{user.username}</span>
          </Link>
          {user.role === "ADMIN" && (
            <Link
              to="/admin"
              aria-label="Admin Console"
              className="flex items-center gap-1 hover:text-white px-2 py-1 rounded transition-colors text-accent focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <Shield size={16} aria-hidden="true" />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          )}
          <button
            onClick={handleLogout}
            aria-label="Log out of account"
            className="flex items-center gap-1.5 text-gray-400 hover:text-rose-400 px-2 py-1 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <LogOut size={16} aria-hidden="true" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </nav>
      )}
    </header>
  );
}
