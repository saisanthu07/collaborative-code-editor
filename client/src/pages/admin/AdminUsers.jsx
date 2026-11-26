import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { UserX, UserCheck, Ban, ShieldCheck, Trash2, Search, RefreshCw } from "lucide-react";
import { api } from "../../services/api.js";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);

  async function loadUsers() {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/users");
      setUsers(data.users || []);
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
    try {
      if (user.status === "SUSPENDED") {
        await api.patch(`/admin/users/${user._id}/unsuspend`);
        toast.success(`User ${user.username} unsuspended`);
      } else {
        await api.patch(`/admin/users/${user._id}/suspend`);
        toast.success(`User ${user.username} suspended`);
      }
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || "Operation failed");
    }
  }

  async function handleBanToggle(user) {
    try {
      if (user.status === "BANNED") {
        await api.patch(`/admin/users/${user._id}/unban`);
        toast.success(`User ${user.username} unbanned`);
      } else {
        if (!window.confirm(`Ban user "${user.username}"? They will be signed out and blocked.`)) return;
        await api.patch(`/admin/users/${user._id}/ban`);
        toast.success(`User ${user.username} banned`);
      }
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || "Operation failed");
    }
  }

  async function handleDeleteUser(user) {
    if (!window.confirm(`Permanently delete "${user.username}" and all their owned rooms?`)) return;
    try {
      await api.delete(`/admin/users/${user._id}`);
      toast.success(`Deleted user ${user.username}`);
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || "Operation failed");
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
            <div key={u._id} className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 text-sm gap-2">
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
    </div>
  );
}
