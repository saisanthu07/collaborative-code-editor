import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Plus, LogIn, Star, Users, X, FileCode, Search, Lock } from "lucide-react";
import { api } from "../services/api.js";
import Navbar from "../components/common/Navbar.jsx";
import { LANGUAGES } from "../constants/languages.js";

export default function Dashboard() {
  const [rooms, setRooms] = useState({ owned: [], memberOf: [], starred: [] });
  const [filterTab, setFilterTab] = useState("all"); // "all" | "owned" | "shared" | "starred"
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [joinId, setJoinId] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    language: "javascript",
    visibility: "PRIVATE",
    template: "blank",
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

  async function handleToggleStar(e, roomId) {
    e.stopPropagation();
    try {
      const { data } = await api.post(`/rooms/${roomId}/star`);
      toast.success(data.starred ? "Starred room" : "Removed star");
      loadRooms();
    } catch {
      toast.error("Could not update star");
    }
  }

  const allRoomsMap = new Map();
  [...rooms.owned, ...rooms.memberOf, ...rooms.starred].forEach((r) => {
    if (!allRoomsMap.has(r.roomId)) {
      allRoomsMap.set(r.roomId, r);
    }
  });

  const baseList =
    filterTab === "owned"
      ? rooms.owned
      : filterTab === "shared"
      ? rooms.memberOf
      : filterTab === "starred"
      ? rooms.starred
      : Array.from(allRoomsMap.values());

  const q = searchQuery.trim().toLowerCase();
  const visibleRooms = q
    ? baseList.filter(
        (r) =>
          r.name?.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q) ||
          r.roomId?.toLowerCase().includes(q) ||
          r.language?.toLowerCase().includes(q)
      )
    : baseList;

  return (
    <div className="min-h-dvh bg-bg text-gray-100 flex flex-col">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        <div className="grid sm:grid-cols-2 gap-4 mb-10">
          <button
            onClick={() => setShowCreate(true)}
            aria-label="Create a new collaborative room"
            className="bg-surface border border-border hover:border-accent transition-all rounded-2xl p-6 text-left flex items-center gap-4 focus:outline-none focus:ring-2 focus:ring-accent group shadow-paper hover:shadow-paper-md active:scale-[0.99]"
          >
            <div className="bg-accent/15 text-accent p-3.5 rounded-xl border border-accent/25 group-hover:bg-accent group-hover:text-white transition-all shadow-paper-sm">
              <Plus size={22} />
            </div>
            <div>
              <div className="font-semibold text-gray-100 font-serif text-base">New Room</div>
              <div className="text-xs text-gray-400 mt-0.5">Start a collaborative code session</div>
            </div>
          </button>

          <form
            onSubmit={handleJoin}
            className="bg-surface border border-border rounded-2xl p-6 flex items-center gap-4 shadow-paper"
          >
            <div className="bg-accent2/15 text-accent2 p-3.5 rounded-xl border border-accent2/25 shrink-0 shadow-paper-sm">
              <LogIn size={22} />
            </div>
            <div className="flex-1">
              <label htmlFor="join-room-input" className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-gray-400 font-mono">
                Join Session
              </label>
              <input
                id="join-room-input"
                value={joinId}
                onChange={(e) => setJoinId(e.target.value)}
                placeholder="Room ID or paste invite link"
                className="w-full bg-surface2 border border-border rounded-lg px-3 py-1.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent shadow-paper-sm"
              />
            </div>
            <button
              type="submit"
              aria-label="Join room"
              className="text-xs bg-accent hover:opacity-90 px-4 py-2.5 rounded-lg font-semibold text-white transition-all shadow-paper-sm focus:outline-none focus:ring-2 focus:ring-accent self-end active:scale-95"
            >
              Join
            </button>
          </form>
        </div>

        {showCreate && (
          <div
            className="fixed inset-0 bg-stone-900/40 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4"
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
              className="bg-surface border border-border rounded-2xl p-6 sm:p-7 w-full max-w-md space-y-4 shadow-paper-lg animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/25 flex items-center justify-center text-accent">
                    <FileCode size={18} />
                  </div>
                  <h2 id="create-room-title" className="font-semibold text-lg font-serif text-gray-100">
                    New Collaborative Room
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  aria-label="Close dialog"
                  className="text-gray-400 hover:text-gray-100 hover:bg-surface2 p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div>
                <label htmlFor="room-name-input" className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">
                  Room Name
                </label>
                <input
                  ref={firstInputRef}
                  id="room-name-input"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Algorithms Pair Session"
                  className="w-full bg-surface2 border border-border rounded-lg px-3.5 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent shadow-paper-sm"
                />
              </div>

              <div>
                <label htmlFor="room-desc-input" className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">
                  Description <span className="text-gray-500 font-sans lowercase font-normal">(optional)</span>
                </label>
                <textarea
                  id="room-desc-input"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What are you building or discussing?"
                  className="w-full bg-surface2 border border-border rounded-lg px-3.5 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent shadow-paper-sm"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="room-lang-select" className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">
                    Language
                  </label>
                  <select
                    id="room-lang-select"
                    value={form.language}
                    onChange={(e) => setForm({ ...form, language: e.target.value })}
                    className="w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent shadow-paper-sm"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.key} value={l.key} className="bg-surface text-gray-100">
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="room-visibility-select" className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">
                    Visibility
                  </label>
                  <select
                    id="room-visibility-select"
                    value={form.visibility}
                    onChange={(e) => setForm({ ...form, visibility: e.target.value })}
                    className="w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent shadow-paper-sm"
                  >
                    <option value="PRIVATE" className="bg-surface text-gray-100">Private (Invite Link)</option>
                    <option value="PUBLIC" className="bg-surface text-gray-100">Public</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="room-template-select" className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">
                  Starter Template
                </label>
                <select
                  id="room-template-select"
                  value={form.template}
                  onChange={(e) => setForm({ ...form, template: e.target.value })}
                  className="w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent shadow-paper-sm"
                >
                  <option value="blank" className="bg-surface text-gray-100">Blank Single File</option>
                  <option value="algorithms" className="bg-surface text-gray-100">Algorithms Interview Starter</option>
                  <option value="web-preview" className="bg-surface text-gray-100">Web Preview (HTML / CSS / JS)</option>
                  <option value="multi-file-node" className="bg-surface text-gray-100">Multi-File Node.js Project</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-gray-100 hover:bg-surface2 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-xs bg-accent rounded-lg hover:opacity-90 text-white font-semibold shadow-paper-sm disabled:opacity-60 transition-all focus:outline-none focus:ring-2 focus:ring-accent active:scale-95"
                >
                  {loading ? "Creating..." : "Create Room"}
                </button>
              </div>
            </form>
          </div>
        )}

        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-1.5 bg-surface border border-border rounded-xl p-1 w-fit">
              {[
                { key: "all", label: `All (${allRoomsMap.size})` },
                { key: "owned", label: `Owned (${rooms.owned.length})` },
                { key: "shared", label: `Shared (${rooms.memberOf.length})` },
                { key: "starred", label: `Starred (${rooms.starred.length})` },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFilterTab(tab.key)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
                    filterTab === tab.key
                      ? "bg-accent text-white font-semibold shadow-paper-sm"
                      : "text-gray-400 hover:text-gray-100"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search rooms..."
                aria-label="Search rooms"
                className="w-full bg-surface border border-border rounded-xl pl-8 pr-3 py-1.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          {visibleRooms.length === 0 ? (
            <div className="text-center py-14 border border-dashed border-border rounded-2xl bg-surface/40">
              <p className="text-gray-400 text-sm font-sans">
                No matching rooms yet — create one or join with a link to get started.
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {visibleRooms.map((room) => (
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
                  className="bg-surface border border-border rounded-2xl p-4 sm:p-5 cursor-pointer hover:border-accent hover:shadow-paper-md transition-all focus:outline-none focus:ring-2 focus:ring-accent flex flex-col justify-between shadow-paper group active:scale-[0.99]"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-gray-100 font-serif text-base group-hover:text-accent transition-colors truncate flex items-center gap-1.5">
                        {room.visibility === "PRIVATE" && (
                          <Lock size={12} className="text-gray-400 shrink-0" />
                        )}
                        <span className="truncate">{room.name}</span>
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleToggleStar(e, room.roomId)}
                        aria-label={room.isStarred ? "Unstar room" : "Star room"}
                        className="p-1 -m-1 rounded-md hover:bg-surface2 transition-colors shrink-0"
                      >
                        <Star
                          size={15}
                          className={
                            room.isStarred ? "text-amber-500 fill-amber-500" : "text-gray-500"
                          }
                        />
                      </button>
                    </div>
                    {room.description && (
                      <p className="text-xs text-gray-400 mt-1.5 line-clamp-2 leading-relaxed">
                        {room.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400 mt-4 pt-3 border-t border-border">
                    <span className="bg-surface2 border border-border/80 px-2.5 py-0.5 rounded-full text-[11px] text-gray-300 font-mono capitalize">
                      {room.language}
                    </span>
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <Users size={13} aria-hidden="true" />
                      <span className="font-mono text-xs">{room.memberCount ?? room.members?.length ?? 0}</span>
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
