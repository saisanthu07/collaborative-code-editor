import { useState } from "react";
import { Link, useNavigate, useLocation, Navigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Code2 } from "lucide-react";
import { api } from "../services/api.js";
import { useAuthStore } from "../store/authStore.js";

export default function Register() {
  const [form, setForm] = useState({ name: "", username: "", email: "", password: "" });
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
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm bg-surface border border-border rounded-xl p-8 shadow-xl">
        <div className="flex items-center gap-2 justify-center mb-6">
          <Code2 className="text-accent" size={28} aria-hidden="true" />
          <span className="text-xl font-semibold text-gray-100">CodeTogether</span>
        </div>
        <h1 className="text-lg font-medium mb-6 text-center text-gray-200">Create your account</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="reg-name" className="block text-sm text-gray-400 mb-1">
              Full Name
            </label>
            <input
              id="reg-name"
              type="text"
              autoComplete="name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-surface2 border border-border rounded-md px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
              placeholder="Jane Doe"
            />
          </div>
          <div>
            <label htmlFor="reg-username" className="block text-sm text-gray-400 mb-1">
              Username
            </label>
            <input
              id="reg-username"
              type="text"
              autoComplete="username"
              required
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="w-full bg-surface2 border border-border rounded-md px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
              placeholder="janedoe"
            />
          </div>
          <div>
            <label htmlFor="reg-email" className="block text-sm text-gray-400 mb-1">
              Email
            </label>
            <input
              id="reg-email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full bg-surface2 border border-border rounded-md px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
              placeholder="jane@example.com"
            />
          </div>
          <div>
            <label htmlFor="reg-password" className="block text-sm text-gray-400 mb-1">
              Password
            </label>
            <input
              id="reg-password"
              type="password"
              autoComplete="new-password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full bg-surface2 border border-border rounded-md px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
              placeholder="••••••••"
            />
            <p className="text-xs text-gray-500 mt-1">
              At least 8 characters, with uppercase, lowercase, and a number.
            </p>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:bg-blue-600 transition-colors rounded-md py-2.5 text-sm font-medium text-white disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-surface"
          >
            {loading ? "Creating account..." : "Register"}
          </button>
        </form>
        <p className="text-sm text-gray-400 mt-5 text-center">
          Already have an account?{" "}
          <Link
            to="/login"
            state={location.state}
            className="text-accent hover:underline focus:outline-none focus:ring-1 focus:ring-accent rounded"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
