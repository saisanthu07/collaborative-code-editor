import { useEffect, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { MailCheck, ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { api } from "../services/api.js";
import { useAuthStore } from "../store/authStore.js";
import AuthLayout from "../components/auth/AuthLayout.jsx";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const initialToken = searchParams.get("token") || "";
  const [token, setToken] = useState(initialToken);
  const [status, setStatus] = useState(initialToken ? "verifying" : "idle"); // "idle" | "verifying" | "verified" | "error"
  const [errorMsg, setErrorMsg] = useState("");
  const { user, updateUser } = useAuthStore();

  const submitVerify = useCallback(
    async (rawToken) => {
      const cleaned = rawToken.trim();
      if (!cleaned) return;
      setStatus("verifying");
      setErrorMsg("");
      try {
        const { data } = await api.post("/auth/verify-email", { token: cleaned });
        if (data.user && user) {
          updateUser(data.user);
        }
        setStatus("verified");
        toast.success("Email verified!");
      } catch (err) {
        const msg = err.response?.data?.error || "Invalid or expired verification token";
        setErrorMsg(msg);
        setStatus("error");
      }
    },
    [user, updateUser]
  );

  useEffect(() => {
    if (initialToken) {
      submitVerify(initialToken);
    }
  }, [initialToken, submitVerify]);

  function handleSubmit(e) {
    e.preventDefault();
    submitVerify(token);
  }

  return (
    <AuthLayout
      eyebrow="Account Verification"
      title="Confirm your email"
      highlight="to protect recovery."
      subtitle="Verified accounts protect password resets and keep collaborative room invitations secure."
      previewFile="auth/verify-email.js"
      previewBadge="SHA-256 · 24h TTL"
      alternateText={user ? "Ready to return to your desk?" : "Already verified?"}
      alternateLinkLabel={user ? "Open Dashboard" : "Log in"}
      alternateTo={user ? "/dashboard" : "/login"}
    >
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-12 h-12 rounded-2xl bg-accent2/15 border border-accent2/25 flex items-center justify-center text-accent2 mb-3.5 shadow-paper-sm">
          <MailCheck size={24} />
        </div>
        <h2 className="text-2xl font-bold font-serif tracking-tight text-gray-100">
          Verify Email
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          Confirm ownership of your CodeTogether email address
        </p>
      </div>

      {status === "verifying" ? (
        <div className="py-8 flex flex-col items-center gap-3 text-xs text-gray-400">
          <span className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          <span>Verifying your email token...</span>
        </div>
      ) : status === "verified" ? (
        <div className="bg-accent2/10 border border-accent2/30 rounded-xl p-5 text-center space-y-3">
          <CheckCircle2 size={28} className="text-accent2 mx-auto" />
          <div className="font-semibold font-serif text-base text-gray-100">
            Email address verified
          </div>
          <p className="text-xs text-gray-400">
            Your account email is confirmed. You can continue to your workspace.
          </p>
          <Link
            to={user ? "/dashboard" : "/login"}
            className="inline-flex items-center gap-1.5 bg-accent2 hover:bg-accent2-hover text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-paper-sm transition-colors"
          >
            <span>{user ? "Go to Dashboard" : "Log In"}</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {status === "error" && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400">
              <XCircle size={15} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label
              htmlFor="verify-token"
              className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 font-mono"
            >
              Verification Token
            </label>
            <input
              id="verify-token"
              type="text"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste verification token"
              className="w-full bg-surface2/75 hover:bg-surface2 focus:bg-surface border border-border rounded-xl px-3.5 py-2.5 text-xs font-mono text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent/35 focus:border-accent transition-all shadow-paper-sm"
            />
          </div>

          <button
            type="submit"
            disabled={!token.trim()}
            className="w-full inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover transition-all rounded-xl py-2.5 text-sm font-semibold text-white shadow-paper hover:shadow-paper-md disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-accent active:scale-[0.99]"
          >
            <span>Verify Email</span>
            <ArrowRight size={15} aria-hidden="true" />
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
