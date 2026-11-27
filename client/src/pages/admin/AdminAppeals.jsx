import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Scale,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  Clock,
  ShieldAlert,
  Ban,
} from "lucide-react";
import { api } from "../../services/api.js";
import UserAvatar from "../../components/common/UserAvatar.jsx";

export default function AdminAppeals() {
  const outletContext = useOutletContext();
  const refreshPendingAppeals = outletContext?.refreshPendingAppeals;

  const [appeals, setAppeals] = useState([]);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState({});
  const [busyId, setBusyId] = useState(null);

  async function loadAppeals() {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/appeals");
      setAppeals(data.appeals || []);
      refreshPendingAppeals?.();
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not load moderation appeals");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAppeals();
  }, []);

  async function handleReview(appeal, decision) {
    setBusyId(appeal._id);
    try {
      const adminNote = (notes[appeal._id] || "").trim();
      await api.patch(`/admin/appeals/${appeal._id}/review`, {
        decision,
        ...(adminNote ? { adminNote } : {}),
      });
      toast.success(
        decision === "APPROVED"
          ? `Approved appeal and restored @${appeal.username}`
          : `Declined appeal from @${appeal.username}`
      );
      await loadAppeals();
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not review appeal");
    } finally {
      setBusyId(null);
    }
  }

  const q = search.trim().toLowerCase();
  const filtered = appeals.filter((a) => {
    if (statusFilter !== "ALL" && a.status !== statusFilter) return false;
    if (!q) return true;
    return (
      a.username?.toLowerCase().includes(q) ||
      a.email?.toLowerCase().includes(q) ||
      a.message?.toLowerCase().includes(q)
    );
  });

  const pendingCount = appeals.filter((a) => a.status === "PENDING").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-surface border border-border rounded-xl p-1 w-fit flex-wrap">
          {["PENDING", "APPROVED", "REJECTED", "ALL"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono transition-colors ${
                statusFilter === st
                  ? "bg-accent text-white font-semibold"
                  : "text-gray-400 hover:text-gray-100"
              }`}
            >
              <span>{st}</span>
              {st === "PENDING" && pendingCount > 0 && (
                <span
                  className={`px-1.5 py-0 rounded-full text-[10px] ${
                    statusFilter === "PENDING"
                      ? "bg-white/20 text-white"
                      : "bg-accent/20 text-accent"
                  }`}
                >
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user or appeal..."
              className="w-full bg-surface border border-border rounded-xl pl-8 pr-3 py-1.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <button
            type="button"
            onClick={loadAppeals}
            disabled={loading}
            aria-label="Refresh appeals"
            className="p-2 bg-surface border border-border rounded-xl text-gray-300 hover:text-gray-100"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl p-8 text-center shadow-paper space-y-2">
          <Scale size={24} className="mx-auto text-gray-500" />
          <p className="text-xs text-gray-400">
            {loading
              ? "Loading moderation appeals..."
              : `No ${statusFilter === "ALL" ? "" : statusFilter.toLowerCase()} appeals found.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((appeal) => {
            const isPending = appeal.status === "PENDING";
            const isBanned = appeal.accountStatus === "BANNED";
            const isBusy = busyId === appeal._id;

            return (
              <article
                key={appeal._id}
                className={`bg-surface border rounded-2xl p-5 shadow-paper space-y-3.5 ${
                  isPending ? "border-accent/40" : "border-border"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar username={appeal.username} size="sm" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-gray-100">
                          @{appeal.username}
                        </span>
                        <span className="text-xs font-mono text-gray-400 truncate">
                          ({appeal.email})
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold ${
                            isBanned
                              ? "bg-rose-500/15 text-rose-500 border-rose-500/35"
                              : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/35"
                          }`}
                        >
                          {isBanned ? <Ban size={10} /> : <ShieldAlert size={10} />}
                          {appeal.accountStatus}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-gray-500 mt-0.5">
                        Submitted {new Date(appeal.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border w-fit shrink-0 ${
                      appeal.status === "PENDING"
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/35"
                        : appeal.status === "APPROVED"
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/35"
                        : "bg-rose-500/15 text-rose-500 border-rose-500/35"
                    }`}
                  >
                    {appeal.status === "PENDING" ? (
                      <Clock size={11} />
                    ) : appeal.status === "APPROVED" ? (
                      <CheckCircle2 size={11} />
                    ) : (
                      <XCircle size={11} />
                    )}
                    {appeal.status}
                  </span>
                </div>

                {appeal.moderationReason && (
                  <div className="rounded-xl bg-surface2/60 border border-border px-3.5 py-2 text-xs text-gray-300">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-gray-400 mr-2">
                      Action Reason:
                    </span>
                    {appeal.moderationReason}
                  </div>
                )}

                <div className="rounded-xl bg-paper-editor border border-border px-4 py-3 text-xs sm:text-sm text-gray-100 leading-relaxed">
                  {appeal.message}
                </div>

                {isPending ? (
                  <div className="flex flex-col md:flex-row md:items-center gap-2.5 pt-2 border-t border-border">
                    <input
                      type="text"
                      maxLength={500}
                      value={notes[appeal._id] || ""}
                      onChange={(e) =>
                        setNotes((prev) => ({ ...prev, [appeal._id]: e.target.value }))
                      }
                      placeholder="Optional reviewer note to record with decision..."
                      className="flex-1 bg-surface2/75 border border-border rounded-xl px-3 py-2 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleReview(appeal, "REJECTED")}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-500/35 text-rose-500 hover:bg-rose-500/10 text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        <XCircle size={14} />
                        <span>Decline</span>
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleReview(appeal, "APPROVED")}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent2 hover:bg-accent2-hover text-white text-xs font-semibold shadow-paper-sm transition-all disabled:opacity-50 active:scale-95"
                      >
                        <CheckCircle2 size={14} />
                        <span>{isBusy ? "Processing..." : "Approve & Unban"}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-gray-400 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border">
                    <span>
                      Reviewed by{" "}
                      <span className="font-mono text-gray-200">
                        @{appeal.reviewedByUsername || "admin"}
                      </span>{" "}
                      {appeal.reviewedAt ? `on ${new Date(appeal.reviewedAt).toLocaleString()}` : ""}
                    </span>
                    {appeal.adminNote && (
                      <span className="italic text-gray-300">Note: {appeal.adminNote}</span>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
