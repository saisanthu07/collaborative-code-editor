import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Lock, Unlock, Trash2, Search, RefreshCw, ExternalLink } from "lucide-react";
import { api } from "../../services/api.js";
import ConfirmModal from "../../components/common/ConfirmModal.jsx";

export default function AdminRooms() {
  const [rooms, setRooms] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL"); // ALL | PUBLIC | PRIVATE | LOCKED
  const [loading, setLoading] = useState(true);
  const [roomToDelete, setRoomToDelete] = useState(null);
  const [deletingRoom, setDeletingRoom] = useState(false);

  async function loadRooms() {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/rooms");
      setRooms(data.rooms || []);
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not load rooms");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRooms();
  }, []);

  async function handleToggleLock(room) {
    try {
      const isLocked = room.settings?.locked || room.settings?.lockedByAdmin;
      if (isLocked) {
        await api.patch(`/admin/rooms/${room.roomId}/unlock`);
        toast.success(`Room ${room.name} unlocked`);
      } else {
        await api.patch(`/admin/rooms/${room.roomId}/lock`);
        toast.success(`Room ${room.name} locked`);
      }
      loadRooms();
    } catch (err) {
      toast.error(err.response?.data?.error || "Operation failed");
    }
  }

  function handleDeleteRoom(room) {
    setRoomToDelete(room);
  }

  async function confirmDeleteRoom() {
    if (!roomToDelete) return;
    setDeletingRoom(true);
    try {
      await api.delete(`/admin/rooms/${roomToDelete.roomId}`);
      toast.success(`Deleted room ${roomToDelete.name}`);
      setRoomToDelete(null);
      loadRooms();
    } catch (err) {
      toast.error(err.response?.data?.error || "Operation failed");
    } finally {
      setDeletingRoom(false);
    }
  }

  const q = search.trim().toLowerCase();
  const filtered = rooms.filter((r) => {
    const isLocked = Boolean(r.settings?.locked || r.settings?.lockedByAdmin);
    if (filter === "LOCKED" && !isLocked) return false;
    if (filter === "PUBLIC" && r.visibility !== "PUBLIC") return false;
    if (filter === "PRIVATE" && r.visibility !== "PRIVATE") return false;
    if (!q) return true;
    return (
      r.name?.toLowerCase().includes(q) ||
      r.roomId?.toLowerCase().includes(q) ||
      r.language?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-surface border border-border rounded-xl p-1 w-fit">
          {["ALL", "PUBLIC", "PRIVATE", "LOCKED"].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-colors ${
                filter === f
                  ? "bg-accent text-white font-semibold"
                  : "text-gray-400 hover:text-gray-100"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search room name or ID..."
              className="w-full bg-surface border border-border rounded-xl pl-8 pr-3 py-1.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <button
            type="button"
            onClick={loadRooms}
            disabled={loading}
            aria-label="Refresh rooms"
            className="p-2 bg-surface border border-border rounded-xl text-gray-300 hover:text-gray-100"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-2xl divide-y divide-border overflow-hidden shadow-paper">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-400">
            {loading ? "Loading rooms..." : "No matching rooms found."}
          </div>
        ) : (
          filtered.map((r) => {
            const isLocked = r.settings?.locked || r.settings?.lockedByAdmin;
            return (
              <div key={r._id} className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 text-sm gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-200">{r.name}</span>
                    <span className="text-gray-500 font-mono text-xs">({r.roomId})</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface2 border border-border text-gray-300">
                      {r.visibility}
                    </span>
                    <span className="text-[10px] font-mono text-gray-400">
                      {r.members?.length || 0} members • {r.language}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Link
                    to={`/room/${r.roomId}`}
                    className="text-xs flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border text-gray-300 hover:text-gray-100 hover:bg-surface2"
                  >
                    <ExternalLink size={12} /> Open
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleToggleLock(r)}
                    className={`text-xs flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border transition-colors ${
                      isLocked
                        ? "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                        : "text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
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
                  <button
                    type="button"
                    onClick={() => handleDeleteRoom(r)}
                    title={`Delete ${r.name}`}
                    aria-label={`Delete ${r.name}`}
                    className="text-xs flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-500/30 text-rose-500 hover:bg-rose-500/10"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <ConfirmModal
        open={Boolean(roomToDelete)}
        title={`Delete room "${roomToDelete?.name}"?`}
        message={`This permanently removes room ${roomToDelete?.roomId || ""} along with all code files, checkpoints, comments, and chat history.`}
        confirmLabel="Delete Room"
        tone="danger"
        loading={deletingRoom}
        onClose={() => !deletingRoom && setRoomToDelete(null)}
        onConfirm={confirmDeleteRoom}
      />
    </div>
  );
}
