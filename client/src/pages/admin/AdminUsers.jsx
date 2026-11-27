import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import toast from "react-hot-toast";
import {
  UserX,
  UserCheck,
  Ban,
  ShieldCheck,
  Shield,
  ShieldOff,
  Trash2,
  Search,
  RefreshCw,
  Scale,
  Lock,
} from "lucide-react";
import { api } from "../../services/api.js";
import { useAuthStore } from "../../store/authStore.js";
import ConfirmModal from "../../components/common/ConfirmModal.jsx";
import UserAvatar from "../../components/common/UserAvatar.jsx";

export default function AdminUsers() {
  const outletContext = useOutletContext();
  const refreshPendingAppeals = outletContext?.refreshPendingAppeals;
  const currentUser = useAuthStore((s) => s.user);

  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [confirmState, setConfirmState] = useState(null); // { type: "suspend" | "ban" | "delete" | "promote" | "demote", user }
  const [moderationReason, setModerationReason] = useState("");
  const [suspendDurationHours, setSuspendDurationHours] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
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
    setSuspendDurationHours("168");
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
    setAdminPassword("");
    setConfirmState({ type: "delete", user });
  }

  function handleRoleChangePrompt(user, nextRole) {
    setModerationReason("");
    setAdminPassword("");
    setConfirmState({
      type: nextRole === "ADMIN" ? "promote" : "demote",
      user,
    });
  }

  async function executeConfirmAction() {
    if (!confirmState) return;
    setConfirmBusy(true);
    try {
      const reason = moderationReason.trim();
      const durationHours = Number(suspendDurationHours) || null;
      if (confirmState.type === "suspend") {
        await api.patch(`/admin/users/${confirmState.user._id}/suspend`, {
          ...(reason ? { reason } : {}),
          ...(durationHours ? { durationHours } : {}),
        });
        toast.success(`User ${confirmState.user.username} suspended`);
      } else if (confirmState.type === "ban") {
        await api.patch(`/admin/users/${confirmState.user._id}/ban`, {
          ...(reason ? { reason } : {}),
        });
        toast.success(`User ${confirmState.user.username} banned`);
      } else if (confirmState.type === "promote" || confirmState.type === "demote") {
        const nextRole = confirmState.type === "promote" ? "ADMIN" : "USER";
        await api.patch(`/admin/users/${confirmState.user._id}/role`, {
          role: nextRole,
          currentPassword: adminPassword,
        });
        toast.success(
          nextRole === "ADMIN"
            ? `Promoted @${confirmState.user.username} to Administrator`
            : `Demoted @${confirmState.user.username} to User`
        );
      } else {
        await api.delete(`/admin/users/${confirmState.user._id}`);
        toast.success(`Deleted user ${confirmState.user.username}`);
      }
      setConfirmState(null);
      setModerationReason("");
      setAdminPassword("");
      loadUsers();
    } catch (err) {
      const details = err.response?.data?.details;
      toast.error(details?.[0]?.message || err.response?.data?.error || "Operation failed");
    } finally {
      setConfirmBusy(false);
    }
  }

  const q = search.trim().toLowerCase();
  const filtered = users.filter((u) => {
    if (statusFilter !== "ALL" && u.status !== statusFilter) return false;
    if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
    if (!q) return true;
    return (
      u.username?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.name?.toLowerCase().includes(q)
    );
  });

  const isRoleModal =
    confirmState?.type === "promote" || confirmState?.type === "demote";

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
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

          <div className="flex items-center gap-1 bg-surface border border-border rounded-xl p-1 w-fit">
            {[
              { id: "ALL", label: "All Roles" },
              { id: "ADMIN", label: "Admins" },
              { id: "USER", label: "Users" },
            ].map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRoleFilter(r.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-colors ${
                  roleFilter === r.id
                    ? "bg-accent2 text-white font-semibold"
                    : "text-gray-400 hover:text-gray-100"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
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
                    {currentUser?._id === u._id && (
                      <span className="text-[10px] font-mono bg-surface2 text-gray-300 border border-border px-2 py-0.5 rounded-full">
                        You
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
                  {u.status === "SUSPENDED" && u.suspendedUntil && (
                    <div className="text-[10px] font-mono text-amber-500 mt-0.5">
                      Suspended until {new Date(u.suspendedUntil).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                {currentUser?._id !== u._id && u.role === "USER" && u.status === "ACTIVE" && (
                  <button
                    type="button"
                    onClick={() => handleRoleChangePrompt(u, "ADMIN")}
                    className="text-xs flex items-center gap-1 px-2.5 py-1 rounded-lg border border-accent/30 bg-accent/10 text-accent hover:bg-accent/20 transition-colors font-medium"
                  >
                    <Shield size={13} /> Make Admin
                  </button>
                )}

                {currentUser?._id !== u._id && u.role === "ADMIN" && (
                  <button
                    type="button"
                    onClick={() => handleRoleChangePrompt(u, "USER")}
                    className="text-xs flex items-center gap-1 px-2.5 py-1 rounded-lg border border-amber-500/35 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors font-medium"
                  >
                    <ShieldOff size={13} /> Demote Admin
                  </button>
                )}

                {u.role !== "ADMIN" && (
                  <>
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
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmModal
        open={Boolean(confirmState)}
        title={
          confirmState?.type === "promote"
            ? `Promote "${confirmState?.user?.username}" to Admin?`
            : confirmState?.type === "demote"
            ? `Demote "${confirmState?.user?.username}" to User?`
            : confirmState?.type === "suspend"
            ? `Suspend "${confirmState?.user?.username}"?`
            : confirmState?.type === "ban"
            ? `Ban "${confirmState?.user?.username}"?`
            : `Delete "${confirmState?.user?.username}"?`
        }
        message={
          confirmState?.type === "promote"
            ? "They will immediately gain full Archival Administration access to manage users, rooms, appeals, and audit logs."
            : confirmState?.type === "demote"
            ? "Their administrator privileges and active refresh sessions will be revoked immediately."
            : confirmState?.type === "suspend"
            ? "They will be disconnected immediately and shown a suspension popup where they can submit an appeal."
            : confirmState?.type === "ban"
            ? "They will be signed out of all active sessions, disconnected immediately, and shown a ban popup with appeal access."
            : "This permanently deletes the user account and all of their owned collaborative rooms."
        }
        confirmLabel={
          confirmState?.type === "promote"
            ? "Promote to Admin"
            : confirmState?.type === "demote"
            ? "Demote to User"
            : confirmState?.type === "suspend"
            ? "Suspend User"
            : confirmState?.type === "ban"
            ? "Ban User"
            : "Delete User"
        }
        tone={
          confirmState?.type === "promote"
            ? "accent"
            : confirmState?.type === "delete"
            ? "danger"
            : "warning"
        }
        loading={confirmBusy}
        confirmDisabled={isRoleModal && !adminPassword}
        onClose={() => {
          if (!confirmBusy) {
            setConfirmState(null);
            setAdminPassword("");
          }
        }}
        onConfirm={executeConfirmAction}
      >
        {isRoleModal && (
          <div>
            <label
              htmlFor="admin-role-password"
              className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1.5"
            >
              Confirm Your Admin Password
            </label>
            <div className="relative">
              <Lock
                size={13}
                aria-hidden="true"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
              />
              <input
                id="admin-role-password"
                type="password"
                autoComplete="current-password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && adminPassword && !confirmBusy) {
                    e.preventDefault();
                    executeConfirmAction();
                  }
                }}
                placeholder="Enter your password to authorize"
                className="w-full bg-surface2 border border-border rounded-xl pl-8 pr-3 py-2 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>
        )}

        {(confirmState?.type === "suspend" || confirmState?.type === "ban") && (
          <div className="space-y-3">
            {confirmState?.type === "suspend" && (
              <div>
                <label
                  htmlFor="suspension-duration-select"
                  className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1.5"
                >
                  Suspension Duration
                </label>
                <select
                  id="suspension-duration-select"
                  value={suspendDurationHours}
                  onChange={(e) => setSuspendDurationHours(e.target.value)}
                  className="w-full bg-surface2 border border-border rounded-xl px-3 py-2 text-xs text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="24">24 Hours</option>
                  <option value="168">7 Days</option>
                  <option value="720">30 Days</option>
                  <option value="">Indefinite (Manual Unsuspend)</option>
                </select>
              </div>
            )}
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
          </div>
        )}
      </ConfirmModal>
    </div>
  );
}
