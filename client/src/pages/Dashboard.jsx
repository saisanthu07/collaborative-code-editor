import { useEffect, useState, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Plus,
  LogIn,
  Search,
  X,
  Feather,
  Sparkles,
  LayoutGrid,
  List,
  FolderOpen,
  Star,
  Users,
  ArrowRight,
  SlidersHorizontal,
  MailWarning,
  Terminal,
} from "lucide-react";
import { api } from "../services/api.js";
import { useAuthStore } from "../store/authStore.js";
import AppShell from "../components/common/AppShell.jsx";
import { LANGUAGES } from "../constants/languages.js";
import CreateRoomModal, { ROOM_TEMPLATES } from "../components/dashboard/CreateRoomModal.jsx";
import DeleteRoomModal from "../components/dashboard/DeleteRoomModal.jsx";
import RoomCard from "../components/dashboard/RoomCard.jsx";

const INITIAL_FORM = {
  name: "",
  description: "",
  language: "javascript",
  visibility: "PRIVATE",
  template: "blank",
};

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [rooms, setRooms] = useState({ owned: [], memberOf: [], starred: [] });
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [filterTab, setFilterTab] = useState("all"); // "all" | "owned" | "shared" | "starred"
  const [languageFilter, setLanguageFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent"); // "recent" | "name" | "members"
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"
  const [searchQuery, setSearchQuery] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [creating, setCreating] = useState(false);
  const [creatingInstant, setCreatingInstant] = useState(false);

  const [joinId, setJoinId] = useState("");
  const [roomToDelete, setRoomToDelete] = useState(null);
  const [deletingRoom, setDeletingRoom] = useState(false);
  const [verifyBannerDismissed, setVerifyBannerDismissed] = useState(false);
  const [resendingVerify, setResendingVerify] = useState(false);
  const [devVerifyToken, setDevVerifyToken] = useState("");

  const loadRooms = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setRoomsLoading(true);
    try {
      const { data } = await api.get("/rooms");
      setRooms({
        owned: data.owned || [],
        memberOf: data.memberOf || [],
        starred: data.starred || [],
      });
    } catch {
      toast.error("Could not load your rooms");
    } finally {
      if (!silent) setRoomsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  function openCreateWithTemplate(templateKey = "blank") {
    setForm((prev) => ({
      ...INITIAL_FORM,
      language: templateKey === "web-preview" ? "javascript" : prev.language || "javascript",
      template: templateKey,
    }));
    setShowCreate(true);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    try {
      const { data } = await api.post("/rooms", form);
      toast.success("Room created");
      setShowCreate(false);
      setForm(INITIAL_FORM);
      navigate(`/room/${data.room.roomId}`);
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not create room");
    } finally {
      setCreating(false);
    }
  }

  async function handleInstantPlayground() {
    setCreatingInstant(true);
    try {
      const { data } = await api.post("/rooms/instant", { language: "javascript" });
      toast.success("Instant Playground Ready!");
      navigate(`/room/${data.room.roomId}`);
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not launch playground");
    } finally {
      setCreatingInstant(false);
    }
  }

  function handleJoin(e) {
    e.preventDefault();
    if (!joinId.trim()) return;
    const id = joinId.trim().split("/room/").pop().replace(/^\/+/, "").trim();
    if (!id) return;
    navigate(`/room/${id}`);
  }

  async function handleToggleStar(e, roomId) {
    e.stopPropagation();
    try {
      const { data } = await api.post(`/rooms/${roomId}/star`);
      toast.success(data.starred ? "Starred room" : "Removed star");
      loadRooms({ silent: true });
    } catch {
      toast.error("Could not update star");
    }
  }

  async function handleDeleteRoom(room) {
    setDeletingRoom(true);
    try {
      await api.delete(`/rooms/${room.roomId}`);
      toast.success(`Deleted "${room.name}"`);
      setRoomToDelete(null);
      loadRooms({ silent: true });
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not delete room");
    } finally {
      setDeletingRoom(false);
    }
  }

  async function handleResendVerify() {
    setResendingVerify(true);
    try {
      const { data } = await api.post("/auth/resend-verification");
      setDevVerifyToken(data.devVerifyToken || "");
      toast.success("Verification instructions sent");
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not send verification email");
    } finally {
      setResendingVerify(false);
    }
  }

  const ownedRoomIds = useMemo(
    () => new Set(rooms.owned.map((r) => r.roomId)),
    [rooms.owned]
  );

  const allRooms = useMemo(() => {
    const map = new Map();
    [...rooms.owned, ...rooms.memberOf, ...rooms.starred].forEach((r) => {
      if (!map.has(r.roomId)) {
        map.set(r.roomId, r);
      }
    });
    return Array.from(map.values());
  }, [rooms]);

  const availableLanguages = useMemo(() => {
    const keys = new Set(allRooms.map((r) => r.language).filter(Boolean));
    return LANGUAGES.filter((l) => keys.has(l.key));
  }, [allRooms]);

  const completedRooms = useMemo(
    () => allRooms.filter((r) => r.status === "COMPLETED"),
    [allRooms]
  );

  const visibleRooms = useMemo(() => {
    const baseList =
      filterTab === "owned"
        ? rooms.owned
        : filterTab === "shared"
        ? rooms.memberOf
        : filterTab === "starred"
        ? rooms.starred
        : filterTab === "completed"
        ? completedRooms
        : allRooms;

    const q = searchQuery.trim().toLowerCase();
    const filtered = baseList.filter((r) => {
      if (languageFilter !== "all" && r.language !== languageFilter) {
        return false;
      }
      if (!q) return true;
      return (
        r.name?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        r.roomId?.toLowerCase().includes(q) ||
        r.language?.toLowerCase().includes(q)
      );
    });

    const sorted = [...filtered];
    if (sortBy === "name") {
      sorted.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } else if (sortBy === "members") {
      sorted.sort(
        (a, b) =>
          (b.memberCount ?? b.members?.length ?? 0) -
          (a.memberCount ?? a.members?.length ?? 0)
      );
    } else {
      sorted.sort(
        (a, b) =>
          new Date(b.lastActiveAt || 0).getTime() -
          new Date(a.lastActiveAt || 0).getTime()
      );
    }
    return sorted;
  }, [filterTab, rooms, allRooms, completedRooms, searchQuery, languageFilter, sortBy]);

  const hasActiveFilters = Boolean(searchQuery.trim()) || languageFilter !== "all";
  const displayName = user?.name?.trim() || user?.username || "Developer";

  const tabs = [
    { key: "all", label: "All", count: allRooms.length },
    { key: "owned", label: "Owned", count: rooms.owned.length },
    { key: "shared", label: "Shared", count: rooms.memberOf.length },
    { key: "starred", label: "Starred", count: rooms.starred.length },
    { key: "completed", label: "Completed", count: completedRooms.length },
  ];

  const verificationBanner =
    user && user.emailVerified === false && !verifyBannerDismissed ? (
      <div className="bg-surface border border-amber-500/35 rounded-2xl px-4 py-3 shadow-paper-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-2.5 text-xs text-gray-300">
          <MailWarning size={16} className="text-amber-500 shrink-0 mt-0.5 sm:mt-0" />
          <div>
            <span>
              Verify your email (<span className="font-mono text-gray-200">{user.email}</span>) to protect account recovery.
            </span>
            {devVerifyToken && (
              <Link
                to={`/verify-email?token=${encodeURIComponent(devVerifyToken)}`}
                className="ml-2 text-accent underline font-semibold font-mono"
              >
                Verify now →
              </Link>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            type="button"
            onClick={handleResendVerify}
            disabled={resendingVerify}
            className="text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 px-3 py-1 rounded-lg transition-colors disabled:opacity-60"
          >
            {resendingVerify ? "Sending..." : "Send Verification"}
          </button>
          <button
            type="button"
            onClick={() => setVerifyBannerDismissed(true)}
            aria-label="Dismiss verification reminder"
            className="p-1 text-gray-400 hover:text-gray-100 rounded-lg"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    ) : null;

  return (
    <>
      <AppShell
        eyebrowIcon={Feather}
        eyebrow="Developer Studio"
        title={
          <>
            Welcome back,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent via-[#B8741A] to-accent2">
              {displayName}
            </span>
            .
          </>
        }
        subtitle="Launch a permanent coding room from a starter template, spin up an instant playground, or pick up right where your team left off."
        topBanner={verificationBanner}
        headerRight={
          <div className="grid grid-cols-3 divide-x divide-border bg-surface border border-border rounded-2xl shadow-paper w-full lg:w-auto lg:min-w-[320px]">
            <button
              type="button"
              onClick={() => setFilterTab("owned")}
              className="px-4 py-3 text-center hover:bg-surface2/60 transition-colors rounded-l-2xl focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent"
            >
              <div className="text-xl font-bold font-serif text-gray-100">{rooms.owned.length}</div>
              <div className="text-[11px] text-gray-400 font-mono mt-0.5">Owned</div>
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("shared")}
              className="px-4 py-3 text-center hover:bg-surface2/60 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent"
            >
              <div className="text-xl font-bold font-serif text-accent2">{rooms.memberOf.length}</div>
              <div className="text-[11px] text-gray-400 font-mono mt-0.5">Shared</div>
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("starred")}
              className="px-4 py-3 text-center hover:bg-surface2/60 transition-colors rounded-r-2xl focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent"
            >
              <div className="text-xl font-bold font-serif text-accent">{rooms.starred.length}</div>
              <div className="text-[11px] text-gray-400 font-mono mt-0.5">Starred</div>
            </button>
          </div>
        }
      >

        {/* Action Studio Row */}
        <section className="grid lg:grid-cols-12 gap-4">
          {/* Create & Quick Templates Card */}
          <div className="lg:col-span-7 bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-paper flex flex-col justify-between gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="bg-accent/15 text-accent p-3 rounded-xl border border-accent/25 shrink-0 shadow-paper-sm">
                  <Plus size={22} />
                </div>
                <div>
                  <h2 className="font-bold text-gray-100 font-serif text-lg leading-tight">
                    Start a Collaborative Session
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">
                    Real-time Yjs CRDTs, sandboxed execution, whiteboard &amp; interview tools.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <Link
                  to="/compily"
                  className="inline-flex items-center gap-1.5 text-xs bg-surface2 hover:bg-border text-gray-200 border border-border px-3 py-2 rounded-xl font-semibold transition-colors shadow-paper-sm"
                >
                  <Terminal size={13} className="text-accent" />
                  <span>Compily</span>
                </Link>
                <button
                  type="button"
                  onClick={handleInstantPlayground}
                  disabled={creatingInstant}
                  className="inline-flex items-center gap-1.5 text-xs bg-accent2/15 text-accent2 border border-accent2/30 hover:bg-accent2/25 px-3 py-2 rounded-xl font-semibold transition-colors shadow-paper-sm disabled:opacity-60"
                >
                  <Sparkles size={13} />
                  <span>{creatingInstant ? "Launching..." : "Instant"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => openCreateWithTemplate("blank")}
                  aria-label="Create a new collaborative room"
                  className="inline-flex items-center gap-1.5 text-xs bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-xl font-semibold transition-all shadow-paper-sm focus:outline-none focus:ring-2 focus:ring-accent active:scale-95"
                >
                  <Plus size={14} />
                  <span>New Room</span>
                </button>
              </div>
            </div>

            {/* Quick Template Launch Strip */}
            <div className="pt-4 border-t border-border/80 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-gray-500 mr-1">
                Templates:
              </span>
              {ROOM_TEMPLATES.map(({ key, shortLabel, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => openCreateWithTemplate(key)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface2/80 hover:bg-surface2 border border-border hover:border-accent/50 text-xs text-gray-300 hover:text-gray-100 transition-all"
                >
                  <Icon size={12} className="text-accent" />
                  <span>{shortLabel}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Join Room Card */}
          <form
            onSubmit={handleJoin}
            className="lg:col-span-5 bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-paper flex flex-col justify-between gap-4"
          >
            <div className="flex items-start gap-3.5">
              <div className="bg-accent2/15 text-accent2 p-3 rounded-xl border border-accent2/25 shrink-0 shadow-paper-sm">
                <LogIn size={22} />
              </div>
              <div>
                <h2 className="font-bold text-gray-100 font-serif text-lg leading-tight">
                  Join Existing Session
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Paste a room ID or secret invite URL to jump straight in.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="join-room-input" className="sr-only">
                Room ID or invite link
              </label>
              <input
                id="join-room-input"
                value={joinId}
                onChange={(e) => setJoinId(e.target.value)}
                placeholder="Room ID or paste invite link..."
                className="flex-1 min-w-0 bg-surface2/75 hover:bg-surface2 focus:bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent/35 focus:border-accent transition-all shadow-paper-sm"
              />
              <button
                type="submit"
                aria-label="Join room"
                disabled={!joinId.trim()}
                className="inline-flex items-center gap-1.5 text-xs bg-accent2 hover:bg-accent2-hover px-4 py-2.5 rounded-xl font-semibold text-white transition-all shadow-paper-sm focus:outline-none focus:ring-2 focus:ring-accent2 disabled:opacity-50 active:scale-95 shrink-0"
              >
                <span>Join</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </form>
        </section>

        {/* Rooms Library */}
        <section className="space-y-4">
          {/* Filter & Search Toolbar */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div className="flex items-center gap-1 bg-surface border border-border rounded-xl p-1 w-full xl:w-fit overflow-x-auto no-scrollbar shadow-paper-sm">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFilterTab(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    filterTab === tab.key
                      ? "bg-accent text-white font-semibold shadow-paper-sm"
                      : "text-gray-400 hover:text-gray-100 hover:bg-surface2/70"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0 rounded-full ${
                      filterTab === tab.key
                        ? "bg-white/20 text-white"
                        : "bg-surface2 text-gray-400"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
              {/* Search */}
              <div className="relative flex-1 sm:w-56 md:w-64">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search rooms, ID, language..."
                  aria-label="Search rooms"
                  className="w-full bg-surface border border-border rounded-xl pl-8 pr-8 py-2 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent shadow-paper-sm"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-100 p-0.5 rounded"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Language Filter */}
              {availableLanguages.length > 1 && (
                <div className="relative">
                  <SlidersHorizontal
                    size={12}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                  <select
                    aria-label="Filter by language"
                    value={languageFilter}
                    onChange={(e) => setLanguageFilter(e.target.value)}
                    className="bg-surface border border-border rounded-xl pl-7 pr-3 py-2 text-xs text-gray-200 font-mono focus:outline-none focus:ring-2 focus:ring-accent shadow-paper-sm"
                  >
                    <option value="all" className="bg-surface">
                      All Languages
                    </option>
                    {availableLanguages.map((l) => (
                      <option key={l.key} value={l.key} className="bg-surface">
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Sort */}
              <select
                aria-label="Sort rooms"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-surface border border-border rounded-xl px-3 py-2 text-xs text-gray-200 font-mono focus:outline-none focus:ring-2 focus:ring-accent shadow-paper-sm"
              >
                <option value="recent" className="bg-surface">
                  Recent
                </option>
                <option value="name" className="bg-surface">
                  Name A–Z
                </option>
                <option value="members" className="bg-surface">
                  Members
                </option>
              </select>

              {/* View Mode Toggle */}
              <div className="flex items-center bg-surface border border-border rounded-xl p-1 shadow-paper-sm">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  aria-label="Grid view"
                  aria-pressed={viewMode === "grid"}
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === "grid"
                      ? "bg-surface2 text-accent"
                      : "text-gray-400 hover:text-gray-100"
                  }`}
                >
                  <LayoutGrid size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  aria-label="List view"
                  aria-pressed={viewMode === "list"}
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === "list"
                      ? "bg-surface2 text-accent"
                      : "text-gray-400 hover:text-gray-100"
                  }`}
                >
                  <List size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Room Cards / Skeleton / Empty States */}
          {roomsLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-surface border border-border rounded-2xl p-5 shadow-paper animate-pulse space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <div className="h-5 w-12 bg-surface2 rounded-full" />
                      <div className="h-5 w-16 bg-surface2 rounded-full" />
                    </div>
                    <div className="h-5 w-10 bg-surface2 rounded-lg" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-5 w-3/4 bg-surface2 rounded" />
                    <div className="h-3.5 w-full bg-surface2 rounded" />
                    <div className="h-3.5 w-2/3 bg-surface2 rounded" />
                  </div>
                  <div className="pt-3 border-t border-border flex justify-between">
                    <div className="h-5 w-20 bg-surface2 rounded-full" />
                    <div className="h-5 w-14 bg-surface2 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : visibleRooms.length === 0 ? (
            <div className="text-center py-14 px-6 border border-dashed border-border rounded-2xl bg-surface/60 shadow-paper-sm space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-surface2 border border-border flex items-center justify-center mx-auto text-accent">
                {filterTab === "starred" ? (
                  <Star size={20} />
                ) : filterTab === "shared" ? (
                  <Users size={20} />
                ) : (
                  <FolderOpen size={20} />
                )}
              </div>
              <div className="space-y-1">
                <h3 className="font-serif font-bold text-base text-gray-100">
                  {hasActiveFilters
                    ? "No rooms match your filters"
                    : filterTab === "starred"
                    ? "No starred rooms yet"
                    : filterTab === "shared"
                    ? "No shared rooms yet"
                    : filterTab === "completed"
                    ? "No completed sessions yet"
                    : "Your workspace is ready"}
                </h3>
                <p className="text-gray-400 text-xs max-w-md mx-auto leading-relaxed">
                  {hasActiveFilters
                    ? "Try adjusting your search query or switching the language filter."
                    : filterTab === "starred"
                    ? "Click the star icon on any room card to pin your favorite sessions here."
                    : filterTab === "shared"
                    ? "Rooms you join via an invite link or team collaboration will appear here."
                    : filterTab === "completed"
                    ? "When you end a hosted session, it stays saved here so you can review code, checkpoints, and scorecards."
                    : "Create your first collaborative coding room or paste an invite link above to begin."}
                </p>
              </div>
              <div className="pt-1 flex items-center justify-center gap-2.5">
                {hasActiveFilters ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setLanguageFilter("all");
                    }}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-surface2 hover:bg-border border border-border text-gray-100 transition-colors"
                  >
                    Clear Filters
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => openCreateWithTemplate("blank")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-accent hover:bg-accent-hover text-white shadow-paper-sm transition-all active:scale-95"
                  >
                    <Plus size={14} />
                    <span>Create Room</span>
                  </button>
                )}
              </div>
            </div>
          ) : viewMode === "list" ? (
            <div className="space-y-2.5">
              {visibleRooms.map((room) => (
                <RoomCard
                  key={room.roomId}
                  room={room}
                  isOwner={
                    ownedRoomIds.has(room.roomId) ||
                    (user?._id && room.ownerId?.toString() === user._id.toString())
                  }
                  currentUsername={user?.username}
                  viewMode="list"
                  onOpen={(id) => navigate(`/room/${id}`)}
                  onToggleStar={handleToggleStar}
                  onRequestDelete={setRoomToDelete}
                />
              ))}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {visibleRooms.map((room) => (
                <RoomCard
                  key={room.roomId}
                  room={room}
                  isOwner={
                    ownedRoomIds.has(room.roomId) ||
                    (user?._id && room.ownerId?.toString() === user._id.toString())
                  }
                  currentUsername={user?.username}
                  viewMode="grid"
                  onOpen={(id) => navigate(`/room/${id}`)}
                  onToggleStar={handleToggleStar}
                  onRequestDelete={setRoomToDelete}
                />
              ))}
            </div>
          )}
        </section>
      </AppShell>

      <CreateRoomModal
        open={showCreate}
        form={form}
        setForm={setForm}
        loading={creating}
        onClose={() => setShowCreate(false)}
        onSubmit={handleCreate}
      />

      <DeleteRoomModal
        room={roomToDelete}
        deleting={deletingRoom}
        onClose={() => !deletingRoom && setRoomToDelete(null)}
        onConfirm={handleDeleteRoom}
      />
    </>
  );
}
