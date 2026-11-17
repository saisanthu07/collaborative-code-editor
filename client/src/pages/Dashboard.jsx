import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Plus, LogIn, Star, Users, X } from "lucide-react";
import { api } from "../services/api.js";
import Navbar from "../components/common/Navbar.jsx";
import { LANGUAGES } from "../constants/languages.js";

export default function Dashboard() {
  const [rooms, setRooms] = useState({ owned: [], memberOf: [], starred: [] });
  const [showCreate, setShowCreate] = useState(false);
  const [joinId, setJoinId] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    language: "javascript",
    visibility: "PRIVATE",
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const modalRef = useRef(null);
  const firstInputRef = useRef(null);

  async function loadRooms() {
    try {
      const { data } = await api.get("/rooms");
      setRooms(data);
    } catch {
      toast.error("Could not load your rooms");
    }
  }

  useEffect(() => {
    loadRooms();
  }, []);

  // Modal accessibility (Escape key and focus trap)
  useEffect(() => {
    if (!showCreate) return;
    firstInputRef.current?.focus();

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        setShowCreate(false);
        return;
      }
      if (e.key === "Tab") {
        const focusable = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showCreate]);

  async function handleCreate(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/rooms", form);
      toast.success("Room created");
      setShowCreate(false);
      navigate(`/room/${data.room.roomId}`);
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not create room");
    } finally {
      setLoading(false);
    }
  }

  function handleJoin(e) {
    e.preventDefault();
    if (!joinId.trim()) return;
    const id = joinId.trim().split("/room/").pop().trim();
    navigate(`/room/${id}`);
  }

  const allRoomsMap = new Map();
  [...rooms.owned, ...rooms.memberOf, ...rooms.starred].forEach((r) => {
    if (!allRoomsMap.has(r.roomId)) {
      allRoomsMap.set(r.roomId, r);
    }
  });
  const allRooms = Array.from(allRoomsMap.values());

  return (
    <div className="min-h-dvh bg-bg text-gray-100 flex flex-col">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        <div className="grid sm:grid-cols-2 gap-4 mb-10">
          <button
            onClick={() => setShowCreate(true)}
            aria-label="Create a new collaborative room"
            className="bg-surface border border-border hover:border-accent transition-colors rounded-xl p-6 text-left flex items-center gap-4 focus:outline-none focus:ring-2 focus:ring-accent group"
          >
            <div className="bg-accent/20 text-accent p-3 rounded-lg group-hover:bg-accent group-hover:text-white transition-colors">
              <Plus size={22} />
            </div>
            <div>
              <div className="font-semibold text-gray-100">Create Room</div>
              <div className="text-sm text-gray-400">Start a new collaborative session</div>
            </div>
          </button>

          <form
            onSubmit={handleJoin}
            className="bg-surface border border-border rounded-xl p-6 flex items-center gap-4"
          >
            <div className="bg-accent2/20 text-accent2 p-3 rounded-lg shrink-0">
              <LogIn size={22} />
            </div>
            <div className="flex-1">
              <label htmlFor="join-room-input" className="block text-sm font-semibold mb-1 text-gray-100">
                Join Room
              </label>
              <input
                id="join-room-input"
                value={joinId}
                onChange={(e) => setJoinId(e.target.value)}
                placeholder="Room ID or paste link"
                className="w-full bg-surface2 border border-border rounded-md px-3 py-1.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
              />
            </div>
            <button
              type="submit"
              aria-label="Join room"
              className="text-sm bg-accent hover:bg-blue-600 px-4 py-2 rounded-md font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-accent self-end"
            >
              Join
            </button>
          </form>
        </div>

        {/* Create Room Modal */}
        {showCreate && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4"
            onClick={() => setShowCreate(false)}
            role="presentation"
          >
            <form
              ref={modalRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="create-room-title"
              onSubmit={handleCreate}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface border border-border rounded-xl p-6 w-full max-w-md space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="flex justify-between items-center">
                <h2 id="create-room-title" className="font-semibold text-lg text-gray-100">
                  New Collaborative Room
                </h2>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  aria-label="Close dialog"
                  className="text-gray-400 hover:text-white p-1 rounded focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <X size={18} />
                </button>
              </div>

              <div>
                <label htmlFor="room-name-input" className="block text-sm text-gray-300 mb-1">
                  Room Name
                </label>
                <input
                  ref={firstInputRef}
                  id="room-name-input"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Algorithms Pair Session"
                  className="w-full bg-surface2 border border-border rounded-md px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                />
              </div>

              <div>
                <label htmlFor="room-desc-input" className="block text-sm text-gray-300 mb-1">
                  Description <span className="text-gray-500 text-xs">(optional)</span>
                </label>
                <textarea
                  id="room-desc-input"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What are you building or discussing?"
                  className="w-full bg-surface2 border border-border rounded-md px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="room-lang-select" className="block text-sm text-gray-300 mb-1">
                    Language
                  </label>
                  <select
                    id="room-lang-select"
                    value={form.language}
                    onChange={(e) => setForm({ ...form, language: e.target.value })}
                    className="w-full bg-surface2 border border-border rounded-md px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.key} value={l.key} className="bg-surface">
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="room-visibility-select" className="block text-sm text-gray-300 mb-1">
                    Visibility
                  </label>
                  <select
                    id="room-visibility-select"
                    value={form.visibility}
                    onChange={(e) => setForm({ ...form, visibility: e.target.value })}
                    className="w-full bg-surface2 border border-border rounded-md px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                  >
                    <option value="PRIVATE" className="bg-surface">Private (Link / Invited)</option>
                    <option value="PUBLIC" className="bg-surface">Public</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-sm bg-accent rounded-md hover:bg-blue-600 text-white font-medium disabled:opacity-60 transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  {loading ? "Creating..." : "Create Room"}
                </button>
              </div>
            </form>
          </div>
        )}

        <section>
          <h2 className="text-xs uppercase tracking-wider font-semibold text-gray-500 mb-4">
            Recent Rooms
          </h2>
          {allRooms.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-xl">
              <p className="text-gray-400 text-sm">No rooms yet — create one or join with a link to get started.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
              {allRooms.map((room) => (
                <div
                  key={room.roomId}
                  onClick={() => navigate(`/room/${room.roomId}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(`/room/${room.roomId}`);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Open room ${room.name}`}
                  className="bg-surface border border-border rounded-xl p-4 cursor-pointer hover:border-accent hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-accent flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-gray-100 truncate">{room.name}</span>
                      <Star
                        size={16}
                        aria-hidden="true"
                        className={`shrink-0 ${
                          room.isStarred ? "text-amber-400 fill-amber-400" : "text-gray-600"
                        }`}
                      />
                    </div>
                    {room.description && (
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">{room.description}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 mt-4 pt-2 border-t border-border/50">
                    <span className="bg-surface2 px-2 py-0.5 rounded text-[11px] text-gray-400 capitalize">
                      {room.language}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Users size={12} aria-hidden="true" />
                      <span>{room.memberCount ?? room.members?.length ?? 0}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
