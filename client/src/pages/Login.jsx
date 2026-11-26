import { useState } from "react";
import { Link, useNavigate, useLocation, Navigate } from "react-router-dom";
import toast from "react-hot-toast";
import { AtSign, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { api } from "../services/api.js";
import { useAuthStore } from "../store/authStore.js";
import BrandMark from "../components/common/BrandMark.jsx";
import AuthLayout from "../components/auth/AuthLayout.jsx";

export default function Login() {
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user, token, setAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const destination = location.state?.from?.pathname || "/dashboard";

  // Redirect authenticated users away
  if (token && user) {
    return <Navigate to={destination} replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", form);
      setAuth(data.user, data.token);
      toast.success(`Welcome back, ${data.user.username}`);
      navigate(destination, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Session Gateway"
      title="Pick up right where"
      highlight="your team left off."
      subtitle="Rejoin permanent coding rooms, inspect saved version checkpoints, and run technical interviews with private scorecards."
      previewFile="rooms/pair-session.js"
      previewBadge="Live Cursors · Active"
      alternateText="Don't have an account?"
      alternateLinkLabel="Create an account"
      alternateTo="/register"
      alternateState={location.state}
    >
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-12 h-12 rounded-2xl bg-accent/15 border border-accent/25 flex items-center justify-center text-accent mb-3.5 shadow-paper-sm">
          <BrandMark size={28} />
        </div>
        <h2 className="text-2xl font-bold font-serif tracking-tight text-gray-100">
          Welcome back
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          Sign in to enter your collaborative workspace
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate={false}>
        <div>
          <label
            htmlFor="login-identifier"
            className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 font-mono"
          >
            Email or Username
          </label>
          <div className="relative">
            <AtSign
              size={16}
              aria-hidden="true"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
            />
            <input
              id="login-identifier"
              type="text"
              autoComplete="username"
              required
              value={form.identifier}
              onChange={(e) => setForm({ ...form, identifier: e.target.value })}
              className="w-full bg-surface2/75 hover:bg-surface2 focus:bg-surface border border-border rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent/35 focus:border-accent transition-all shadow-paper-sm"
              placeholder="you@example.com or username"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="login-password"
              className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 font-mono"
            >
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-[11px] text-accent hover:underline font-medium"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock
              size={16}
              aria-hidden="true"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
            />
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full bg-surface2/75 hover:bg-surface2 focus:bg-surface border border-border rounded-xl pl-10 pr-10 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent/35 focus:border-accent transition-all shadow-paper-sm"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-100 rounded-lg hover:bg-surface2 focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
            >
              {showPassword ? (
                <EyeOff size={16} aria-hidden="true" />
              ) : (
                <Eye size={16} aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover transition-all rounded-xl py-2.5 text-sm font-semibold text-white shadow-paper hover:shadow-paper-md disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-surface active:scale-[0.99] mt-1"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Signing In...</span>
            </>
          ) : (
            <>
              <span>Log In</span>
              <ArrowRight size={15} aria-hidden="true" />
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  );
}
