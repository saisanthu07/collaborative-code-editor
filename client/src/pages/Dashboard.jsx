import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Plus, LogIn, Star, Users } from "lucide-react";
import { api } from "../services/api.js";
import Navbar from "../components/common/Navbar.jsx";
import { LANGUAGES } from "../constants/languages.js";

export default function Dashboard() {
  const [rooms, setRooms] = useState({ owned: [], memberOf: [], starred: [] });
  const [showCreate, setShowCreate] = useState(false);
  const [joinId, setJoinId] = useState("");
  const [form, setForm] = useState({ name: "", description: "", language: "javascript", visibility: "PRIVATE" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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

  async function handleCreate(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/rooms", form);
      toast.success("Room created");
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
    // Accept either a bare roomId or a full pasted URL.
    const id = joinId.trim().split("/room/").pop().trim();
    navigate(`/room/${id}`);
  }

  const allRooms = [...rooms.owned, ...rooms.memberOf];

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid sm:grid-cols-2 gap-4 mb-10">
          <button
            onClick={() => setShowCreate(true)}
            className="bg-surface border border-border hover:border-accent transition-colors rounded-xl p-6 text-left flex items-center gap-4"
          >
            <div className="bg-accent/20 text-accent p-3 rounded-lg">
              <Plus size={22} />
            </div>
            <div>
              <div className="font-medium">Create Room</div>
              <div className="text-sm text-gray-400">Start a new collaborative session</div>
            </div>
          </button>

          <form
            onSubmit={handleJoin}
            className="bg-surface border border-border rounded-xl p-6 flex items-center gap-4"
          >
            <div className="bg-accent2/20 text-accent2 p-3 rounded-lg">
              <LogIn size={22} />
            </div>
            <div className="flex-1">
              <div className="font-medium mb-1">Join Room</div>
              <input
                value={joinId}
                onChange={(e) => setJoinId(e.target.value)}
                placeholder="Room ID or link"
                className="w-full bg-surface2 border border-border rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <button type="submit" className="text-sm text-accent hover:underline">
              Go
            </button>
          </form>
        </div>

        {showCreate && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
            <form
              onSubmit={handleCreate}
              className="bg-surface border border-border rounded-xl p-6 w-full max-w-md space-y-4"
            >
              <h2 className="font-medium text-lg">New Room</h2>
              <div>
                <label className="text-sm text-gray-400">Room Name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 w-full bg-surface2 border border-border rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="mt-1 w-full bg-surface2 border border-border rounded-md px-3 py-2 text-sm"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-400">Language</label>
                  <select
                    value={form.language}
                    onChange={(e) => setForm({ ...form, language: e.target.value })}
                    className="mt-1 w-full bg-surface2 border border-border rounded-md px-3 py-2 text-sm"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.key} value={l.key}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Visibility</label>
                  <select
                    value={form.visibility}
                    onChange={(e) => setForm({ ...form, visibility: e.target.value })}
                    className="mt-1 w-full bg-surface2 border border-border rounded-md px-3 py-2 text-sm"
                  >
                    <option value="PRIVATE">Private</option>
                    <option value="PUBLIC">Public</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm bg-accent rounded-md hover:bg-blue-600 disabled:opacity-60"
                >
                  {loading ? "Creating..." : "Create Room"}
                </button>
              </div>
            </form>
          </div>
        )}

        <section>
          <h2 className="text-sm uppercase tracking-wide text-gray-500 mb-3">Recent Rooms</h2>
          {allRooms.length === 0 ? (
            <p className="text-gray-500 text-sm">No rooms yet — create one to get started.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {allRooms.map((room) => (
                <div
                  key={room.roomId}
                  onClick={() => navigate(`/room/${room.roomId}`)}
                  className="bg-surface border border-border rounded-lg p-4 cursor-pointer hover:border-accent transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{room.name}</span>
                    <Star
                      size={16}
                      className={rooms.starred.some((r) => r.roomId === room.roomId) ? "text-yellow-400 fill-yellow-400" : "text-gray-600"}
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{room.language}</div>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
                    <Users size={12} />
                    {room.members.length} participant{room.members.length !== 1 ? "s" : ""}
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
