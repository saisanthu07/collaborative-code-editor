import { useState } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import toast from "react-hot-toast";
import { User, AtSign, Mail, Lock, Eye, EyeOff, ArrowRight, Check } from "lucide-react";
import { api } from "../services/api.js";
import { useAuthStore } from "../store/authStore.js";
import BrandMark from "../components/common/BrandMark.jsx";
import AuthLayout from "../components/auth/AuthLayout.jsx";

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

  const passwordChecks = [
    { label: "8+ chars", met: form.password.length >= 8 },
    { label: "Uppercase", met: /[A-Z]/.test(form.password) },
    { label: "Lowercase", met: /[a-z]/.test(form.password) },
    { label: "Number", met: /[0-9]/.test(form.password) },
  ];

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
    <AuthLayout
      eyebrow="New Developer Desk"
      title="Claim your desk in"
      highlight="the collaborative studio."
      subtitle="Create permanent rooms with custom invite links, role-based access, starter templates, and full checkpoint history."
      previewFile="templates/interview-kit.js"
      previewBadge="Ready to Ship"
      alternateText="Already have an account?"
      alternateLinkLabel="Log in"
      alternateTo="/login"
      alternateState={location.state}
    >
      <div className="flex flex-col items-center text-center mb-5">
        <div className="w-12 h-12 rounded-2xl bg-accent/15 border border-accent/25 flex items-center justify-center text-accent mb-3 shadow-paper-sm">
          <BrandMark size={28} />
        </div>
        <h2 className="text-2xl font-bold font-serif tracking-tight text-gray-100">
          Create your account
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          Set up your developer identity in seconds
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label
              htmlFor="reg-name"
              className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 font-mono"
            >
              Full Name
            </label>
            <div className="relative">
              <User
                size={15}
                aria-hidden="true"
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
              />
              <input
                id="reg-name"
                type="text"
                autoComplete="name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-surface2/75 hover:bg-surface2 focus:bg-surface border border-border rounded-xl pl-9 pr-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent/35 focus:border-accent transition-all shadow-paper-sm"
                placeholder="Jane Doe"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="reg-username"
              className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 font-mono"
            >
              Username
            </label>
            <div className="relative">
              <AtSign
                size={15}
                aria-hidden="true"
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
              />
              <input
                id="reg-username"
                type="text"
                autoComplete="username"
                required
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="w-full bg-surface2/75 hover:bg-surface2 focus:bg-surface border border-border rounded-xl pl-9 pr-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent/35 focus:border-accent transition-all shadow-paper-sm"
                placeholder="janedoe"
              />
            </div>
          </div>
        </div>

        <div>
          <label
            htmlFor="reg-email"
            className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 font-mono"
          >
            Email Address
          </label>
          <div className="relative">
            <Mail
              size={16}
              aria-hidden="true"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
            />
            <input
              id="reg-email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full bg-surface2/75 hover:bg-surface2 focus:bg-surface border border-border rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent/35 focus:border-accent transition-all shadow-paper-sm"
              placeholder="jane@example.com"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="reg-password"
            className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 font-mono"
          >
            Password
          </label>
          <div className="relative">
            <Lock
              size={16}
              aria-hidden="true"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
            />
            <input
              id="reg-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
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

          <div className="flex flex-wrap gap-1.5 mt-2">
            {passwordChecks.map(({ label, met }) => (
              <span
                key={label}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono border transition-colors ${
                  met
                    ? "bg-accent2/15 text-accent2 border-accent2/30 font-semibold"
                    : "bg-surface2/70 text-gray-500 border-border"
                }`}
              >
                {met ? (
                  <Check size={10} aria-hidden="true" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-500/60" />
                )}
                <span>{label}</span>
              </span>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover transition-all rounded-xl py-2.5 text-sm font-semibold text-white shadow-paper hover:shadow-paper-md disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-surface active:scale-[0.99] mt-2"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Creating account...</span>
            </>
          ) : (
            <>
              <span>Create Account</span>
              <ArrowRight size={15} aria-hidden="true" />
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  );
}
