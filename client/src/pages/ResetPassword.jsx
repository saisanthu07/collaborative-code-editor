import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { KeyRound, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { api } from "../services/api.js";
import ThemeToggle from "../components/common/ThemeToggle.jsx";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState(searchParams.get("token") || "");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
          <h1 className="text-xl font-bold font-serif text-gray-100">Reset Password</h1>
          <p className="text-xs text-gray-400 mt-1 text-center">
            Enter your reset token and choose a new strong password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="reset-token" className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">
              Reset Token
            </label>
            <input
              id="reset-token"
              type="text"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste reset token"
              className="w-full bg-surface2 border border-border rounded-lg px-3.5 py-2.5 text-xs font-mono text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label htmlFor="reset-password" className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">
              New Password
            </label>
            <div className="relative">
              <input
                id="reset-password"
                type={showPassword ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-surface2 border border-border rounded-lg pl-3.5 pr-10 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-100 rounded-md"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              At least 8 characters, with uppercase, lowercase, and a number.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:opacity-90 rounded-lg py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      </div>

      <div className="text-center text-[11px] text-gray-500 font-serif">
        <span>CodeTogether Account Recovery</span>
      </div>
    </div>
  );
}
