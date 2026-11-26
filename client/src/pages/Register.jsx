import { useState } from "react";
import { Link, useNavigate, useLocation, Navigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Code2, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { api } from "../services/api.js";
import { useAuthStore } from "../store/authStore.js";
import ThemeToggle from "../components/common/ThemeToggle.jsx";

export default function Register() {
  const [form, setForm] = useState({ name: "", username: "", email: "", password: "" });
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
      const { data } = await api.post("/auth/register", form);
      setAuth(data.user, data.token);
      toast.success("Account created!");
      navigate(destination, { replace: true });
    } catch (err) {
      const details = err.response?.data?.details;
      toast.error(details?.[0]?.message || err.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-bg px-4 py-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between max-w-sm sm:max-w-md w-full mx-auto">
        <Link
          to="/"
          aria-label="Back to home"
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-100 transition-colors py-1 px-2 rounded-lg hover:bg-surface2"
        >
          <ArrowLeft size={14} />
          <span>Back to Home</span>
        </Link>
        <ThemeToggle compact />
      </div>

      {/* Main Form Card */}
      <div className="w-full max-w-sm sm:max-w-md mx-auto my-auto bg-surface border border-border rounded-2xl p-7 sm:p-8 shadow-paper-lg">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent mb-3 shadow-paper-sm">
            <Code2 size={24} aria-hidden="true" />
          </div>
          <span className="text-xl font-bold font-serif text-gray-100">CodeTogether</span>
          <p className="text-xs text-gray-400 mt-1">Create your developer identity</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label htmlFor="reg-name" className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1 font-mono">
              Full Name
            </label>
            <input
              id="reg-name"
              type="text"
              autoComplete="name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-surface2 border border-border rounded-lg px-3.5 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors shadow-paper-sm"
              placeholder="Jane Doe"
            />
          </div>
          <div>
            <label htmlFor="reg-username" className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1 font-mono">
              Username
            </label>
            <input
              id="reg-username"
              type="text"
              autoComplete="username"
              required
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="w-full bg-surface2 border border-border rounded-lg px-3.5 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors shadow-paper-sm"
              placeholder="janedoe"
            />
          </div>
          <div>
            <label htmlFor="reg-email" className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1 font-mono">
              Email Address
            </label>
            <input
              id="reg-email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full bg-surface2 border border-border rounded-lg px-3.5 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors shadow-paper-sm"
              placeholder="jane@example.com"
            />
          </div>
          <div>
            <label htmlFor="reg-password" className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1 font-mono">
              Password
            </label>
            <div className="relative">
              <input
                id="reg-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full bg-surface2 border border-border rounded-lg pl-3.5 pr-10 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors shadow-paper-sm"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
              >
                {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
              </button>
            </div>
            <p className="text-[11px] text-gray-500 mt-1 font-sans">
              At least 8 characters, with uppercase, lowercase, and a number.
            </p>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:opacity-90 transition-all rounded-lg py-2.5 text-sm font-semibold text-white shadow-paper hover:shadow-paper-md disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-surface active:scale-95 mt-2"
          >
            {loading ? "Creating account..." : "Register"}
          </button>
        </form>

        <p className="text-xs text-gray-400 mt-5 text-center">
          Already have an account?{" "}
          <Link
            to="/login"
            state={location.state}
            className="text-accent hover:underline font-semibold focus:outline-none focus:ring-1 focus:ring-accent rounded"
          >
            Log in
          </Link>
        </p>
      </div>

      {/* Footer Note */}
      <div className="text-center text-[11px] text-gray-500 font-serif">
        <span>Editorial Parchment & Midnight Kraft</span>
      </div>
    </div>
  );
}
