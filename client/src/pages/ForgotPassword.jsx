import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { KeyRound, ArrowLeft } from "lucide-react";
import { api } from "../services/api.js";
import ThemeToggle from "../components/common/ThemeToggle.jsx";

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
        data.message || "If an account with that email exists, a reset token has been generated."
      );
      if (data.devResetToken) {
        setDevToken(data.devResetToken);
      }
      toast.success("Password reset request processed");
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not process reset request");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-bg px-4 py-6">
      <div className="flex items-center justify-between max-w-sm sm:max-w-md w-full mx-auto">
        <Link
          to="/login"
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-100 transition-colors py-1 px-2 rounded-lg hover:bg-surface2"
        >
          <ArrowLeft size={14} />
          <span>Back to Login</span>
        </Link>
        <ThemeToggle compact />
      </div>

      <div className="w-full max-w-sm sm:max-w-md mx-auto my-auto bg-surface border border-border rounded-2xl p-7 sm:p-8 shadow-paper-lg">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent mb-3 shadow-paper-sm">
            <KeyRound size={24} />
          </div>
          <h1 className="text-xl font-bold font-serif text-gray-100">Forgot Password</h1>
          <p className="text-xs text-gray-400 mt-1 text-center">
            Enter your account email to generate a password reset token.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="forgot-email" className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">
              Email Address
            </label>
            <input
              id="forgot-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-surface2 border border-border rounded-lg px-3.5 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:opacity-90 rounded-lg py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Generating..." : "Request Reset Token"}
          </button>
        </form>

        {submittedMsg && (
          <div className="mt-4 p-3.5 rounded-xl bg-surface2 border border-border text-xs text-gray-300 space-y-2">
            <p>{submittedMsg}</p>
            {devToken && (
              <div className="pt-1 border-t border-border space-y-1.5">
                <div className="text-[10px] font-mono text-amber-400">
                  DEV RESET TOKEN: <span className="break-all">{devToken}</span>
                </div>
                <Link
                  to={`/reset-password?token=${encodeURIComponent(devToken)}`}
                  className="inline-block bg-accent text-white px-3 py-1.5 rounded-lg font-semibold text-xs"
                >
                  Continue to Reset Password
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="text-center text-[11px] text-gray-500 font-serif">
        <span>CodeTogether Account Recovery</span>
      </div>
    </div>
  );
}
