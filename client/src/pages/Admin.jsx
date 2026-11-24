import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Shield, Lock, Unlock, UserX, UserCheck } from "lucide-react";
import { api } from "../services/api.js";
import Navbar from "../components/common/Navbar.jsx";

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [statsRes, usersRes, roomsRes] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/admin/users"),
        api.get("/admin/rooms"),
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data.users);
      setRooms(roomsRes.data.rooms);
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not load admin data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleSuspend(user) {
    try {
      if (user.status === "SUSPENDED") {
        await api.patch(`/admin/users/${user._id}/unsuspend`);
        toast.success(`User ${user.username} unsuspended`);
      } else {
        await api.patch(`/admin/users/${user._id}/suspend`);
        toast.success(`User ${user.username} suspended`);
      }
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Operation failed");
    }
  }

  async function toggleLock(room) {
    try {
      const isLocked = room.settings?.locked || room.settings?.lockedByAdmin;
      if (isLocked) {
        await api.patch(`/admin/rooms/${room.roomId}/unlock`);
        toast.success(`Room ${room.name} unlocked`);
      } else {
        await api.patch(`/admin/rooms/${room.roomId}/lock`);
        toast.success(`Room ${room.name} locked`);
      }
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Operation failed");
    }
  }

  return (
    <div className="min-h-dvh bg-bg text-gray-100 flex flex-col">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8 flex-1 w-full">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-accent/15 border border-accent/25 flex items-center justify-center text-accent shadow-paper-sm">
            <Shield size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold font-serif text-gray-100">Archival Administration</h1>
            <p className="text-xs text-gray-400">Platform registry and room governance</p>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
            {Object.entries(stats).map(([key, value]) => (
              <div key={key} className="bg-surface border border-border rounded-2xl p-4 shadow-paper">
                <div className="text-xs font-semibold text-gray-400 capitalize font-mono">
                  {key.replace(/([A-Z])/g, " $1")}
                </div>
                <div className="text-2xl font-bold font-serif mt-1 text-gray-100">{value}</div>
              </div>
            ))}
          </div>
        )}

        <div>
          <h2 className="text-xs uppercase tracking-wider font-semibold text-gray-400 mb-3 font-mono">
            Registered Users ({users.length})
          </h2>
          <div className="bg-surface border border-border rounded-2xl divide-y divide-border overflow-hidden shadow-paper">
            {users.map((u) => (
              <div key={u._id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <span className="font-semibold text-gray-200">{u.username}</span>
                  <span className="text-gray-500 text-xs ml-2 font-mono">({u.email})</span>
                  {u.role === "ADMIN" && (
                    <span className="ml-2 text-[10px] bg-accent/15 text-accent border border-accent/25 px-2 py-0.5 rounded-full font-bold">
                      ADMIN
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                      u.status === "SUSPENDED"
                        ? "bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30"
                        : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                    }`}
                  >
                    {u.status}
                  </span>
                  {u.role !== "ADMIN" && (
                    <button
                      onClick={() => toggleSuspend(u)}
                      className={`text-xs flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-accent ${
                        u.status === "SUSPENDED"
                          ? "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                          : "text-rose-700 dark:text-rose-400 hover:bg-rose-500/10"
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
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xs uppercase tracking-wider font-semibold text-gray-400 mb-3 font-mono">
            Active Rooms ({rooms.length})
          </h2>
          <div className="bg-surface border border-border rounded-2xl divide-y divide-border overflow-hidden shadow-paper">
            {rooms.map((r) => {
              const isLocked = r.settings?.locked || r.settings?.lockedByAdmin;
              return (
                <div key={r._id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <span className="font-semibold text-gray-200">{r.name}</span>
                    <span className="text-gray-500 font-mono text-xs ml-2">({r.roomId})</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500 text-xs">
                      {r.members?.length || 0} members
                    </span>
                    <button
                      onClick={() => toggleLock(r)}
                      className={`text-xs flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-accent ${
                        isLocked
                          ? "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                          : "text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
                      }`}
                    >
                      {isLocked ? (
                        <>
                          <Unlock size={13} /> Unlock
                        </>
                      ) : (
                        <>
                          <Lock size={13} /> Lock
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
