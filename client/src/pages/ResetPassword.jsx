import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { KeyRound, Lock, Eye, EyeOff, Check, ArrowRight } from "lucide-react";
import { api } from "../services/api.js";
import AuthLayout from "../components/auth/AuthLayout.jsx";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState(searchParams.get("token") || "");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const passwordChecks = [
    { label: "8+ chars", met: newPassword.length >= 8 },
    { label: "Uppercase", met: /[A-Z]/.test(newPassword) },
    { label: "Lowercase", met: /[a-z]/.test(newPassword) },
    { label: "Number", met: /[0-9]/.test(newPassword) },
  ];

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token: token.trim(), newPassword });
      toast.success("Password updated! Please sign in.");
      navigate("/login", { replace: true });
    } catch (err) {
      const details = err.response?.data?.details;
      toast.error(details?.[0]?.message || err.response?.data?.error || "Could not reset password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Credential Update"
      title="Set a fresh password"
      highlight="and sign back in."
      subtitle="Completing a reset invalidates all previous device sessions so your collaborative rooms stay secure."
      previewFile="auth/reset-token.js"
      previewBadge="Single-Use · Verified"
      alternateText="Need a new reset token?"
      alternateLinkLabel="Request one"
      alternateTo="/forgot-password"
    >
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-12 h-12 rounded-2xl bg-accent/15 border border-accent/25 flex items-center justify-center text-accent mb-3.5 shadow-paper-sm">
          <KeyRound size={24} />
        </div>
        <h2 className="text-2xl font-bold font-serif tracking-tight text-gray-100">
          Reset Password
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          Enter your reset token and choose a strong password
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="reset-token"
            className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 font-mono"
          >
            Reset Token
          </label>
          <input
            id="reset-token"
            type="text"
            required
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste reset token"
            className="w-full bg-surface2/75 hover:bg-surface2 focus:bg-surface border border-border rounded-xl px-3.5 py-2.5 text-xs font-mono text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent/35 focus:border-accent transition-all shadow-paper-sm"
          />
        </div>

        <div>
          <label
            htmlFor="reset-password"
            className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 font-mono"
          >
            New Password
          </label>
          <div className="relative">
            <Lock
              size={16}
              aria-hidden="true"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
            />
            <input
              id="reset-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-surface2/75 hover:bg-surface2 focus:bg-surface border border-border rounded-xl pl-10 pr-10 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent/35 focus:border-accent transition-all shadow-paper-sm"
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
          className="w-full inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover transition-all rounded-xl py-2.5 text-sm font-semibold text-white shadow-paper hover:shadow-paper-md disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-accent active:scale-[0.99]"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Resetting...</span>
            </>
          ) : (
            <>
              <span>Reset Password</span>
              <ArrowRight size={15} aria-hidden="true" />
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  );
}
