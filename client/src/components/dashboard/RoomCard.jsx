import { useState } from "react";
import {
  Star,
  Lock,
  Globe,
  ShieldAlert,
  Users,
  Clock,
  Copy,
  Check,
  Trash2,
  ArrowUpRight,
  CheckCircle2,
} from "lucide-react";
import { LANGUAGES } from "../../constants/languages.js";
import { colorForUser } from "../../utils/color.js";
import { copyToClipboard } from "../../utils/clipboard.js";
import toast from "react-hot-toast";

const LANG_LABELS = Object.fromEntries(LANGUAGES.map((l) => [l.key, l.label]));

export function formatRelativeTime(dateInput) {
  if (!dateInput) return "Recently";
  const ts = new Date(dateInput).getTime();
  if (Number.isNaN(ts)) return "Recently";

  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function RoomCard({
  room,
  isOwner,
  currentUsername,
  viewMode = "grid",
  onOpen,
  onToggleStar,
  onRequestDelete,
}) {
  const [copied, setCopied] = useState(false);
  const langLabel = LANG_LABELS[room.language] || room.language || "Plain";
  const isPrivate = room.visibility === "PRIVATE";
  const isLocked = Boolean(room.settings?.locked);
  const isCompleted = room.status === "COMPLETED";
  const memberCount = room.memberCount ?? room.members?.length ?? 0;
  const previewMembers = Array.isArray(room.members) ? room.members.slice(0, 3) : [];

  const myMember = Array.isArray(room.members)
    ? room.members.find((m) => m.username === currentUsername)
    : null;
  const roleLabel = isOwner ? "Host" : myMember?.role === "VIEWER" ? "Viewer" : "Editor";

  async function handleCopyId(e) {
    e.stopPropagation();
    const ok = await copyToClipboard(room.roomId);
    if (ok) {
      setCopied(true);
      toast.success("Room ID copied");
      setTimeout(() => setCopied(false), 1800);
    } else {
      toast.error("Could not copy Room ID");
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen(room.roomId);
    }
  }

  if (viewMode === "list") {
    return (
      <div
        onClick={() => onOpen(room.roomId)}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label={`Open room ${room.name}`}
        className="bg-surface border border-border rounded-xl px-4 py-3.5 cursor-pointer hover:border-accent hover:shadow-paper-md transition-all focus:outline-none focus:ring-2 focus:ring-accent shadow-paper-sm group flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div className="min-w-0 flex-1 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-surface2 border border-border flex items-center justify-center shrink-0 font-mono text-[11px] font-bold text-accent">
            {(room.language || "JS").slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-100 font-serif text-base group-hover:text-accent transition-colors truncate">
                {room.name}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                  isOwner
                    ? "bg-accent/10 text-accent border-accent/25 font-semibold"
                    : "bg-accent2/10 text-accent2 border-accent2/25"
                }`}
              >
                {roleLabel}
              </span>
              {isPrivate ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-gray-400">
                  <Lock size={10} /> Private
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-accent2">
                  <Globe size={10} /> Public
                </span>
              )}
              {isLocked && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-600 dark:text-amber-400">
                  <ShieldAlert size={10} /> Locked
                </span>
              )}
              {isCompleted && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-accent2 bg-accent2/10 border border-accent2/25 px-1.5 py-0 rounded-full">
                  <CheckCircle2 size={10} /> Completed
                </span>
              )}
            </div>
            {room.description && (
              <p className="text-xs text-gray-400 truncate mt-0.5">{room.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
          <div className="flex items-center gap-3 text-xs text-gray-400 font-mono">
            <span className="bg-surface2 border border-border px-2.5 py-0.5 rounded-full text-[11px] text-gray-300">
              {langLabel}
            </span>
            <span className="inline-flex items-center gap-1" title="Collaborators">
              <Users size={12} />
              {memberCount}
            </span>
            <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-gray-500">
              <Clock size={11} />
              {formatRelativeTime(room.lastActiveAt)}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleCopyId}
              aria-label={`Copy room ID ${room.roomId}`}
              title="Copy Room ID"
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-surface2 transition-colors"
            >
              {copied ? <Check size={14} className="text-accent2" /> : <Copy size={14} />}
            </button>
            <button
              type="button"
              onClick={(e) => onToggleStar(e, room.roomId)}
              aria-label={room.isStarred ? "Unstar room" : "Star room"}
              title={room.isStarred ? "Remove star" : "Star room"}
              className="p-1.5 rounded-lg hover:bg-surface2 transition-colors"
            >
              <Star
                size={14}
                className={
                  room.isStarred ? "text-amber-500 fill-amber-500" : "text-gray-500"
                }
              />
            </button>
            {isOwner && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRequestDelete(room);
                }}
                aria-label={`Delete room ${room.name}`}
                title="Delete room"
                className="p-1.5 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => onOpen(room.roomId)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Open room ${room.name}`}
      className="relative bg-surface border border-border rounded-2xl p-5 cursor-pointer hover:border-accent hover:shadow-paper-md transition-all focus:outline-none focus:ring-2 focus:ring-accent flex flex-col justify-between shadow-paper group overflow-hidden"
    >
      {/* Subtle top edge highlight */}
      <div
        aria-hidden="true"
        className={`absolute top-0 inset-x-0 h-[2px] transition-opacity ${
          isOwner
            ? "bg-gradient-to-r from-accent/70 via-accent/30 to-transparent opacity-60 group-hover:opacity-100"
            : "bg-gradient-to-r from-accent2/70 via-accent2/30 to-transparent opacity-50 group-hover:opacity-100"
        }`}
      />

      <div>
        {/* Top Metadata & Actions */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                isOwner
                  ? "bg-accent/10 text-accent border-accent/25 font-semibold"
                  : "bg-accent2/10 text-accent2 border-accent2/25 font-medium"
              }`}
            >
              {roleLabel}
            </span>

            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-surface2 border border-border text-gray-400">
              {isPrivate ? <Lock size={10} /> : <Globe size={10} className="text-accent2" />}
              <span>{isPrivate ? "Private" : "Public"}</span>
            </span>

            {isLocked && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400">
                <ShieldAlert size={10} />
                <span>Locked</span>
              </span>
            )}
            {isCompleted && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-accent2/10 border border-accent2/25 text-accent2">
                <CheckCircle2 size={10} />
                <span>Completed</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={handleCopyId}
              aria-label={`Copy room ID ${room.roomId}`}
              title="Copy Room ID"
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-surface2 transition-colors"
            >
              {copied ? <Check size={14} className="text-accent2" /> : <Copy size={14} />}
            </button>
            <button
              type="button"
              onClick={(e) => onToggleStar(e, room.roomId)}
              aria-label={room.isStarred ? "Unstar room" : "Star room"}
              title={room.isStarred ? "Remove star" : "Star room"}
              className="p-1.5 rounded-lg hover:bg-surface2 transition-colors"
            >
              <Star
                size={14}
                className={
                  room.isStarred ? "text-amber-500 fill-amber-500" : "text-gray-500"
                }
              />
            </button>
            {isOwner && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRequestDelete(room);
                }}
                aria-label={`Delete room ${room.name}`}
                title="Delete room"
                className="p-1.5 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Title & Description */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-gray-100 font-serif text-lg leading-snug group-hover:text-accent transition-colors line-clamp-1">
            {room.name}
          </h3>
          <ArrowUpRight
            size={15}
            className="text-gray-500 group-hover:text-accent group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 mt-1"
            aria-hidden="true"
          />
        </div>

        {room.description ? (
          <p className="text-xs text-gray-400 mt-1.5 line-clamp-2 leading-relaxed min-h-[2.4rem]">
            {room.description}
          </p>
        ) : (
          <p className="text-xs text-gray-500 italic mt-1.5 min-h-[2.4rem]">
            No session notes added yet
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3.5 border-t border-border/80 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="bg-surface2 border border-border px-2.5 py-0.5 rounded-full text-[11px] text-gray-200 font-mono truncate">
            {langLabel}
          </span>
          <span
            className="hidden xl:inline-flex items-center gap-1 text-[11px] text-gray-500 font-mono"
            title={room.lastActiveAt ? new Date(room.lastActiveAt).toLocaleString() : ""}
          >
            <Clock size={11} />
            {formatRelativeTime(room.lastActiveAt)}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {previewMembers.length > 0 && (
            <div className="flex -space-x-1.5" aria-hidden="true">
              {previewMembers.map((m, idx) => (
                <span
                  key={`${m.username || idx}-${idx}`}
                  title={m.username}
                  style={{ backgroundColor: colorForUser(m.username || "User") }}
                  className="w-5 h-5 rounded-full ring-2 ring-surface text-[9px] font-bold text-white flex items-center justify-center uppercase shadow-paper-sm"
                >
                  {(m.username || "?").slice(0, 1)}
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-1 text-gray-400 font-mono text-[11px]">
            <Users size={12} aria-hidden="true" />
            <span>{memberCount}</span>
          </div>
          <span className="xl:hidden text-[11px] text-gray-500 font-mono">
            · {formatRelativeTime(room.lastActiveAt)}
          </span>
        </div>
      </div>
    </div>
  );
}
