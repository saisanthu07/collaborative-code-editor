import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../services/api.js";
import Navbar from "../components/common/Navbar.jsx";

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);

  async function load() {
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
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function suspend(userId) {
    await api.patch(`/admin/users/${userId}/suspend`);
    toast.success("User suspended");
    load();
  }

  async function lockRoom(roomId) {
    await api.patch(`/admin/rooms/${roomId}/lock`);
    toast.success("Room locked");
    load();
  }

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <h1 className="text-lg font-medium">Admin Dashboard</h1>

        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(stats).map(([key, value]) => (
              <div key={key} className="bg-surface border border-border rounded-lg p-4">
                <div className="text-xs text-gray-500 capitalize">{key.replace(/([A-Z])/g, " $1")}</div>
                <div className="text-xl font-semibold mt-1">{value}</div>
              </div>
            ))}
          </div>
        )}

        <div>
          <h2 className="text-sm uppercase tracking-wide text-gray-500 mb-3">Users</h2>
          <div className="bg-surface border border-border rounded-lg divide-y divide-border">
            {users.map((u) => (
              <div key={u._id} className="flex items-center justify-between px-4 py-2 text-sm">
                <span>
                  {u.username} <span className="text-gray-500">({u.email})</span>
                </span>
                <div className="flex items-center gap-3">
                  <span className={u.status === "SUSPENDED" ? "text-red-400" : "text-accent2"}>{u.status}</span>
                  {u.status !== "SUSPENDED" && (
                    <button onClick={() => suspend(u._id)} className="text-xs text-red-400 hover:underline">
                      Suspend
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm uppercase tracking-wide text-gray-500 mb-3">Rooms</h2>
          <div className="bg-surface border border-border rounded-lg divide-y divide-border">
            {rooms.map((r) => (
              <div key={r._id} className="flex items-center justify-between px-4 py-2 text-sm">
                <span>
                  {r.name} <span className="text-gray-500">({r.roomId})</span>
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-gray-500">{r.members.length} members</span>
                  {!r.settings.locked && (
                    <button onClick={() => lockRoom(r.roomId)} className="text-xs text-yellow-400 hover:underline">
                      Lock
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
