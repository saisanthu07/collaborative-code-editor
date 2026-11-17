import { useState } from "react";
import { Link, useNavigate, useLocation, Navigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Code2 } from "lucide-react";
import { api } from "../services/api.js";
import { useAuthStore } from "../store/authStore.js";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
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
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm bg-surface border border-border rounded-xl p-8 shadow-xl">
        <div className="flex items-center gap-2 justify-center mb-6">
          <Code2 className="text-accent" size={28} aria-hidden="true" />
          <span className="text-xl font-semibold text-gray-100">CodeTogether</span>
        </div>
        <h1 className="text-lg font-medium mb-6 text-center text-gray-200">Log in to your account</h1>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate={false}>
          <div>
            <label htmlFor="login-email" className="block text-sm text-gray-400 mb-1">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full bg-surface2 border border-border rounded-md px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="login-password" className="block text-sm text-gray-400 mb-1">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full bg-surface2 border border-border rounded-md px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:bg-blue-600 transition-colors rounded-md py-2.5 text-sm font-medium text-white disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-surface"
          >
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>
        <p className="text-sm text-gray-400 mt-5 text-center">
          Don't have an account?{" "}
          <Link
            to="/register"
            state={location.state}
            className="text-accent hover:underline focus:outline-none focus:ring-1 focus:ring-accent rounded"
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
