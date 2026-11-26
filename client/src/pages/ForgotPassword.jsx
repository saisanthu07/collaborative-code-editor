import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { KeyRound, Mail, ArrowRight } from "lucide-react";
import { api } from "../services/api.js";
import AuthLayout from "../components/auth/AuthLayout.jsx";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submittedMsg, setSubmittedMsg] = useState("");
  const [devToken, setDevToken] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      setSubmittedMsg(
        data.message || "If an account with that email exists, password reset instructions have been sent."
      );
      setDevToken(data.devResetToken || "");
      toast.success("Password reset request processed");
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not process reset request");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Account Recovery"
      title="Recover access to"
      highlight="your coding studio."
      subtitle="Enter the email address associated with your account and we will issue a single-use, 15-minute reset token."
      previewFile="auth/recovery.js"
      previewBadge="SHA-256 · 15m TTL"
      alternateText="Remembered your password?"
      alternateLinkLabel="Back to Log In"
      alternateTo="/login"
    >
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-12 h-12 rounded-2xl bg-accent/15 border border-accent/25 flex items-center justify-center text-accent mb-3.5 shadow-paper-sm">
          <KeyRound size={24} />
        </div>
        <h2 className="text-2xl font-bold font-serif tracking-tight text-gray-100">
          Forgot Password
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          Enter your email to receive a password reset link
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="forgot-email"
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
              id="forgot-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-surface2/75 hover:bg-surface2 focus:bg-surface border border-border rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent/35 focus:border-accent transition-all shadow-paper-sm"
            />
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
              <span>Sending Request...</span>
            </>
          ) : (
            <>
              <span>Request Reset Link</span>
              <ArrowRight size={15} aria-hidden="true" />
            </>
          )}
        </button>
      </form>

      {submittedMsg && (
        <div className="mt-4 p-4 rounded-xl bg-surface2/80 border border-border text-xs text-gray-300 space-y-2.5">
          <p className="leading-relaxed">{submittedMsg}</p>
          {devToken && (
            <div className="pt-2.5 border-t border-border space-y-2">
              <div className="text-[10px] font-mono text-amber-600 dark:text-amber-400 break-all">
                DEV RESET TOKEN: {devToken}
              </div>
              <Link
                to={`/reset-password?token=${encodeURIComponent(devToken)}`}
                className="inline-flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white px-3.5 py-1.5 rounded-lg font-semibold text-xs shadow-paper-sm transition-colors"
              >
                <span>Continue to Reset Password</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          )}
        </div>
      )}
    </AuthLayout>
  );
}
