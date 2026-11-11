import { Link, useNavigate } from "react-router-dom";
import { Code2, LogOut, User } from "lucide-react";
import { useAuthStore } from "../../store/authStore.js";

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-surface">
      <Link to="/dashboard" className="flex items-center gap-2 font-semibold text-lg">
        <Code2 size={22} className="text-accent" />
        CodeTogether
      </Link>
      {user && (
        <div className="flex items-center gap-4 text-sm text-gray-300">
          <Link to="/profile" className="flex items-center gap-1 hover:text-white">
            <User size={16} />
            {user.username}
          </Link>
          {user.role === "ADMIN" && (
            <Link to="/admin" className="hover:text-white">
              Admin
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 hover:text-red-400 transition-colors"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      )}
    </header>
  );
}
