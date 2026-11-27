import { useEffect, useState } from "react";
import { ShieldAlert, Ban, Send, Clock, CheckCircle2, XCircle, X } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../../services/api.js";
import { useAuthStore } from "../../store/authStore.js";

export default function ModerationModal() {
  const { moderationNotice, setModerationNotice, clearModerationNotice } = useAuthStore();
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setMessage("");
  }, [moderationNotice?.username, moderationNotice?.status]);

  useEffect(() => {
    if (!moderationNotice) return;
    function onKeyDown(e) {
      if (e.key === "Escape" && !submitting) {
        clearModerationNotice();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [moderationNotice, submitting, clearModerationNotice]);

  if (!moderationNotice) return null;

  const isBanned = moderationNotice.status === "BANNED";
  const latestAppeal = moderationNotice.latestAppeal;
  const hasPendingAppeal = latestAppeal?.status === "PENDING";
  const wasRejected = latestAppeal?.status === "REJECTED";
  const trimmedLen = message.trim().length;

  async function handleSubmitAppeal(e) {
    e.preventDefault();
    if (!moderationNotice.appealToken) {
      toast.error("Please try signing in once to refresh your appeal session.");
      return;
    }
    if (trimmedLen < 10) {
      toast.error("Please provide at least 10 characters explaining your appeal.");
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post("/auth/appeal", {
        appealToken: moderationNotice.appealToken,
        message: message.trim(),
      });
      setModerationNotice({
        ...moderationNotice,
        latestAppeal: data.appeal,
      });
      setMessage("");
      toast.success("Appeal submitted for administrator review");
    } catch (err) {
      const existing = err.response?.data?.appeal;
      if (existing) {
        setModerationNotice({
          ...moderationNotice,
          latestAppeal: existing,
        });
      }
      const details = err.response?.data?.details;
      toast.error(details?.[0]?.message || err.response?.data?.error || "Could not submit appeal");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-stone-950/70 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="moderation-modal-title"
        className="bg-surface border border-border rounded-2xl w-full max-w-lg shadow-paper-lg overflow-hidden my-auto"
      >
        {/* Top Banner */}
        <div
          className={`px-6 py-5 border-b border-border flex items-start justify-between gap-3 ${
            isBanned ? "bg-rose-500/10" : "bg-amber-500/10"
          }`}
        >
          <div className="flex items-start gap-3.5">
            <div
              className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${
                isBanned
                  ? "bg-rose-500/15 border-rose-500/30 text-rose-500"
                  : "bg-amber-500/15 border-amber-500/30 text-amber-500"
              }`}
            >
              {isBanned ? <Ban size={21} /> : <ShieldAlert size={21} />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  id="moderation-modal-title"
                  className="font-bold font-serif text-lg text-gray-100 leading-tight"
                >
                  {isBanned ? "Account Banned" : "Account Suspended"}
                </h2>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                    isBanned
                      ? "bg-rose-500/15 text-rose-500 border-rose-500/35"
                      : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/35"
                  }`}
                >
                  {moderationNotice.status}
                </span>
              </div>
              {moderationNotice.username && (
                <p className="text-xs font-mono text-gray-400 mt-1">
                  Account: <span className="text-gray-200">@{moderationNotice.username}</span>
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={clearModerationNotice}
            disabled={submitting}
            aria-label="Close moderation dialog"
            className="text-gray-400 hover:text-gray-100 hover:bg-surface2 p-1.5 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Reason & Details */}
          <div className="rounded-xl border border-border bg-surface2/60 p-4 space-y-1.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-gray-400 font-semibold">
              Moderation Notice
            </div>
            <p className="text-xs text-gray-200 leading-relaxed">
              {moderationNotice.reason
                ? moderationNotice.reason
                : isBanned
                ? "Your account has been banned by an administrator and cannot access collaborative rooms or sessions."
                : "Your account has been temporarily suspended by an administrator. You may submit an appeal below for review."}
            </p>
            {moderationNotice.moderatedAt && (
              <div className="text-[10px] font-mono text-gray-400 pt-1">
                Updated {new Date(moderationNotice.moderatedAt).toLocaleString()}
              </div>
            )}
            {!isBanned && moderationNotice.suspendedUntil && (
              <div className="text-[11px] font-mono text-amber-600 dark:text-amber-400 pt-0.5">
                Auto-restores on {new Date(moderationNotice.suspendedUntil).toLocaleString()}
              </div>
            )}
          </div>

          {/* Pending Appeal Status */}
          {hasPendingAppeal ? (
            <div className="rounded-xl border border-accent2/35 bg-accent2/10 p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-accent2">
                  <Clock size={15} />
                  <span>Appeal Submitted · Under Admin Review</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface border border-accent2/30 text-accent2">
                  PENDING
                </span>
              </div>
              <p className="text-xs text-gray-200 bg-surface/80 border border-border rounded-lg p-3 leading-relaxed">
                {latestAppeal.message}
              </p>
              <p className="text-[11px] text-gray-400">
                Submitted {new Date(latestAppeal.createdAt).toLocaleString()}. An administrator can inspect and approve your appeal from the Admin Panel.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {wasRejected && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-500">
                    <XCircle size={14} />
                    <span>Previous Appeal Declined</span>
                  </div>
                  {latestAppeal.adminNote && (
                    <p className="text-xs text-gray-200">
                      Reviewer note: {latestAppeal.adminNote}
                    </p>
                  )}
                  <p className="text-[11px] text-gray-400">
                    You can submit a follow-up appeal with additional context below.
                  </p>
                </div>
              )}

              {latestAppeal?.status === "APPROVED" && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 flex items-center gap-2 text-xs text-emerald-500 font-medium">
                  <CheckCircle2 size={15} />
                  <span>Your previous appeal was approved.</span>
                </div>
              )}

              <form onSubmit={handleSubmitAppeal} className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="appeal-message"
                      className="text-[11px] font-mono uppercase tracking-wider font-semibold text-gray-300"
                    >
                      Appeal for Unban / Reactivation
                    </label>
                    <span className="text-[10px] font-mono text-gray-400">
                      {trimmedLen}/1000
                    </span>
                  </div>
                  <textarea
                    id="appeal-message"
                    rows={4}
                    maxLength={1000}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Explain why your account should be reinstated or clarify what happened..."
                    className="w-full bg-surface2/80 focus:bg-surface border border-border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent resize-y shadow-paper-sm"
                  />
                </div>

                <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-border">
                  <button
                    type="button"
                    onClick={clearModerationNotice}
                    disabled={submitting}
                    className="px-4 py-2 rounded-xl border border-border bg-surface hover:bg-surface2 text-xs font-medium text-gray-300 transition-colors"
                  >
                    Dismiss
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || trimmedLen < 10}
                    className="inline-flex items-center justify-center gap-1.5 bg-accent hover:bg-accent-hover text-white px-5 py-2 rounded-xl text-xs font-semibold shadow-paper-sm disabled:opacity-50 transition-all active:scale-95"
                  >
                    <Send size={13} />
                    <span>{submitting ? "Submitting Appeal..." : "Submit Appeal"}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {hasPendingAppeal && (
            <div className="flex justify-end pt-2 border-t border-border">
              <button
                type="button"
                onClick={clearModerationNotice}
                className="px-4 py-2 rounded-xl border border-border bg-surface hover:bg-surface2 text-xs font-medium text-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
