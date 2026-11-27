import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import toast from "react-hot-toast";
import { UserX, UserCheck, Ban, ShieldCheck, Trash2, Search, RefreshCw, Scale } from "lucide-react";
import { api } from "../../services/api.js";
import ConfirmModal from "../../components/common/ConfirmModal.jsx";
import UserAvatar from "../../components/common/UserAvatar.jsx";

export default function AdminUsers() {
  const outletContext = useOutletContext();
  const refreshPendingAppeals = outletContext?.refreshPendingAppeals;

  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [confirmState, setConfirmState] = useState(null); // { type: "suspend" | "ban" | "delete", user }
  const [moderationReason, setModerationReason] = useState("");
  const [confirmBusy, setConfirmBusy] = useState(false);

  async function loadUsers() {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/users");
      setUsers(data.users || []);
      refreshPendingAppeals?.();
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleSuspendToggle(user) {
    if (user.status === "SUSPENDED") {
      try {
        await api.patch(`/admin/users/${user._id}/unsuspend`);
        toast.success(`User ${user.username} unsuspended`);
        loadUsers();
      } catch (err) {
        toast.error(err.response?.data?.error || "Operation failed");
      }
      return;
    }
    setModerationReason("");
    setConfirmState({ type: "suspend", user });
  }

  async function handleBanToggle(user) {
    if (user.status === "BANNED") {
      try {
        await api.patch(`/admin/users/${user._id}/unban`);
        toast.success(`User ${user.username} unbanned`);
        loadUsers();
      } catch (err) {
        toast.error(err.response?.data?.error || "Operation failed");
      }
      return;
    }
    setModerationReason("");
    setConfirmState({ type: "ban", user });
  }

  function handleDeleteUser(user) {
    setModerationReason("");
    setConfirmState({ type: "delete", user });
  }

  async function executeConfirmAction() {
    if (!confirmState) return;
    setConfirmBusy(true);
    try {
      const reason = moderationReason.trim();
      if (confirmState.type === "suspend") {
        await api.patch(`/admin/users/${confirmState.user._id}/suspend`, {
          ...(reason ? { reason } : {}),
        });
        toast.success(`User ${confirmState.user.username} suspended`);
      } else if (confirmState.type === "ban") {
        await api.patch(`/admin/users/${confirmState.user._id}/ban`, {
          ...(reason ? { reason } : {}),
        });
        toast.success(`User ${confirmState.user.username} banned`);
      } else {
        await api.delete(`/admin/users/${confirmState.user._id}`);
        toast.success(`Deleted user ${confirmState.user.username}`);
      }
      setConfirmState(null);
      setModerationReason("");
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || "Operation failed");
    } finally {
      setConfirmBusy(false);
    }
  }

  const q = search.trim().toLowerCase();
  const filtered = users.filter((u) => {
    if (statusFilter !== "ALL" && u.status !== statusFilter) return false;
    if (!q) return true;
    return (
      u.username?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-surface border border-border rounded-xl p-1 w-fit">
          {["ALL", "ACTIVE", "SUSPENDED", "BANNED"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-colors ${
                statusFilter === st
                  ? "bg-accent text-white font-semibold"
                  : "text-gray-400 hover:text-gray-100"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search username or email..."
              className="w-full bg-surface border border-border rounded-xl pl-8 pr-3 py-1.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <button
            type="button"
            onClick={loadUsers}
            disabled={loading}
            aria-label="Refresh users"
            className="p-2 bg-surface border border-border rounded-xl text-gray-300 hover:text-gray-100"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-2xl divide-y divide-border overflow-hidden shadow-paper">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-400">
            {loading ? "Loading users..." : "No matching users found."}
          </div>
        ) : (
          filtered.map((u) => (
            <div key={u._id} className="flex flex-col md:flex-row md:items-center justify-between px-4 sm:px-5 py-3.5 text-sm gap-2.5 hover:bg-surface2/35 transition-colors">
              <div className="min-w-0 flex items-center gap-3">
                <UserAvatar username={u.username} avatar={u.avatar} size="sm" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-200">{u.username}</span>
                    <span className="text-gray-500 text-xs font-mono">({u.email})</span>
                    {u.role === "ADMIN" && (
                      <span className="text-[10px] bg-accent/15 text-accent border border-accent/25 px-2 py-0.5 rounded-full font-bold">
                        ADMIN
                      </span>
                    )}
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        u.status === "BANNED"
                          ? "bg-rose-600/20 text-rose-400 border border-rose-500/40"
                          : u.status === "SUSPENDED"
                          ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                          : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                      }`}
                    >
                      {u.status}
                    </span>
                    {u.hasPendingAppeal && (
                      <Link
                        to="/admin/appeals"
                        className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30 hover:bg-accent/25 transition-colors"
                      >
                        <Scale size={10} />
                        <span>Appeal Pending</span>
                      </Link>
                    )}
                  </div>
                  {u.moderationReason && (
                    <div className="text-[11px] text-gray-400 mt-0.5 truncate">
                      Reason: {u.moderationReason}
                    </div>
                  )}
                </div>
              </div>

              {u.role !== "ADMIN" && (
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleSuspendToggle(u)}
                    className={`text-xs flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border transition-colors ${
                      u.status === "SUSPENDED"
                        ? "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                        : "text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                    }`}
                  >
                    {u.status === "SUSPENDED" ? (
                      <>
                        <UserCheck size={13} /> Unsuspend
                      </>
                    ) : (
                      <>
                        <UserX size={13} /> Suspend
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleBanToggle(u)}
                    className={`text-xs flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border transition-colors ${
                      u.status === "BANNED"
                        ? "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                        : "text-rose-500 hover:bg-rose-500/10"
                    }`}
                  >
                    {u.status === "BANNED" ? (
                      <>
                        <ShieldCheck size={13} /> Unban
                      </>
                    ) : (
                      <>
                        <Ban size={13} /> Ban
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteUser(u)}
                    title={`Delete ${u.username}`}
                    aria-label={`Delete ${u.username}`}
                    className="text-xs flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-500/30 text-rose-500 hover:bg-rose-500/10"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <ConfirmModal
        open={Boolean(confirmState)}
        title={
          confirmState?.type === "suspend"
            ? `Suspend "${confirmState?.user?.username}"?`
            : confirmState?.type === "ban"
            ? `Ban "${confirmState?.user?.username}"?`
            : `Delete "${confirmState?.user?.username}"?`
        }
        message={
          confirmState?.type === "suspend"
            ? "They will be disconnected immediately and shown a suspension popup where they can submit an appeal."
            : confirmState?.type === "ban"
            ? "They will be signed out of all active sessions, disconnected immediately, and shown a ban popup with appeal access."
            : "This permanently deletes the user account and all of their owned collaborative rooms."
        }
        confirmLabel={
          confirmState?.type === "suspend"
            ? "Suspend User"
            : confirmState?.type === "ban"
            ? "Ban User"
            : "Delete User"
        }
        tone={confirmState?.type === "delete" ? "danger" : "warning"}
        loading={confirmBusy}
        onClose={() => !confirmBusy && setConfirmState(null)}
        onConfirm={executeConfirmAction}
      >
        {(confirmState?.type === "suspend" || confirmState?.type === "ban") && (
          <div>
            <label
              htmlFor="moderation-reason-input"
              className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1.5"
            >
              Reason shown to user (optional)
            </label>
            <textarea
              id="moderation-reason-input"
              rows={2}
              maxLength={300}
              value={moderationReason}
              onChange={(e) => setModerationReason(e.target.value)}
              placeholder="e.g., Repeated violation of room conduct guidelines"
              className="w-full bg-surface2 border border-border rounded-xl px-3 py-2 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        )}
      </ConfirmModal>
    </div>
  );
}
