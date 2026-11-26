import { useState, useEffect, useRef } from "react";
import { X, Settings, Lock, MessageSquareOff, Users, RefreshCw, Copy, Check, UserPlus } from "lucide-react";
import toast from "react-hot-toast";
import { copyToClipboard } from "../../utils/clipboard.js";

export default function HostSettingsModal({
  room,
  onSaveSettings,
  onRotateInvite,
  onInviteUser,
  onClose,
  saving = false,
}) {
  const [visibility, setVisibility] = useState(room?.visibility || "PRIVATE");
  const [locked, setLocked] = useState(Boolean(room?.settings?.locked));
  const [chatMuted, setChatMuted] = useState(Boolean(room?.settings?.chatMuted));
  const [allowGuestEdit, setAllowGuestEdit] = useState(Boolean(room?.settings?.allowGuestEdit));
  const [defaultRole, setDefaultRole] = useState(room?.settings?.defaultRole || "EDITOR");
  const [rotating, setRotating] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [inviteIdentifier, setInviteIdentifier] = useState("");
  const [inviteRole, setInviteRole] = useState("EDITOR");
  const [inviting, setInviting] = useState(false);

  const closeBtnRef = useRef(null);

  useEffect(() => {
    closeBtnRef.current?.focus();
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const inviteUrl =
    typeof window !== "undefined"
      ? room?.inviteCode && visibility === "PRIVATE"
        ? `${window.location.origin}/room/${room.roomId}?invite=${room.inviteCode}`
        : `${window.location.origin}/room/${room.roomId}`
      : "";

  async function handleSubmit(e) {
    e.preventDefault();
    await onSaveSettings({
      visibility,
      settings: {
        locked,
        chatMuted,
        allowGuestEdit,
        defaultRole,
      },
    });
  }

  async function handleCopyInvite() {
    const ok = await copyToClipboard(inviteUrl);
    if (ok) {
      setCopiedInvite(true);
      toast.success("Invite link copied");
      setTimeout(() => setCopiedInvite(false), 2000);
    }
  }

  async function handleRotate() {
    setRotating(true);
    try {
      await onRotateInvite();
    } finally {
      setRotating(false);
    }
  }

  async function handleDirectInvite() {
    if (!inviteIdentifier.trim() || !onInviteUser) return;
    setInviting(true);
    try {
      const ok = await onInviteUser(inviteIdentifier.trim(), inviteRole);
      if (ok) setInviteIdentifier("");
    } finally {
      setInviting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-stone-900/40 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="host-settings-title"
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-surface border border-border rounded-2xl p-6 w-full max-w-md space-y-4 shadow-paper-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/25 flex items-center justify-center text-accent">
              <Settings size={16} />
            </div>
            <h2 id="host-settings-title" className="font-semibold font-serif text-gray-100 text-base">
              Host Room Controls
            </h2>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close host settings"
            className="text-gray-400 hover:text-gray-100 hover:bg-surface2 p-1.5 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1 font-mono">
              Visibility
            </label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              className="w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-xs text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="PRIVATE">Private (Invite Only)</option>
              <option value="PUBLIC">Public (Link Open)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1 font-mono">
              Default Join Role
            </label>
            <select
              value={defaultRole}
              onChange={(e) => setDefaultRole(e.target.value)}
              className="w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-xs text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="EDITOR">Editor (Can Edit)</option>
              <option value="VIEWER">Viewer (Read-Only)</option>
            </select>
          </div>
        </div>

        <div className="space-y-2.5 pt-1">
          <label className="flex items-center justify-between bg-surface2 border border-border rounded-xl px-3.5 py-2.5 cursor-pointer">
            <span className="flex items-center gap-2 text-xs text-gray-200 font-medium">
              <Lock size={14} className="text-rose-500" />
              Lock Room (Block new entrants)
            </span>
            <input
              type="checkbox"
              checked={locked}
              onChange={(e) => setLocked(e.target.checked)}
              className="accent-accent w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between bg-surface2 border border-border rounded-xl px-3.5 py-2.5 cursor-pointer">
            <span className="flex items-center gap-2 text-xs text-gray-200 font-medium">
              <MessageSquareOff size={14} className="text-amber-500" />
              Mute Room Chat (Host only)
            </span>
            <input
              type="checkbox"
              checked={chatMuted}
              onChange={(e) => setChatMuted(e.target.checked)}
              className="accent-accent w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between bg-surface2 border border-border rounded-xl px-3.5 py-2.5 cursor-pointer">
            <span className="flex items-center gap-2 text-xs text-gray-200 font-medium">
              <Users size={14} className="text-emerald-500" />
              Allow Guests to Edit Code
            </span>
            <input
              type="checkbox"
              checked={allowGuestEdit}
              onChange={(e) => setAllowGuestEdit(e.target.checked)}
              className="accent-accent w-4 h-4"
            />
          </label>
        </div>

        {onInviteUser && (
          <div className="bg-surface2 border border-border rounded-xl p-3 space-y-2">
            <div className="text-[11px] font-mono text-gray-400 flex items-center gap-1.5">
              <UserPlus size={12} className="text-accent" />
              <span>INVITE REGISTERED USER</span>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                value={inviteIdentifier}
                onChange={(e) => setInviteIdentifier(e.target.value)}
                placeholder="Username or email"
                className="flex-1 bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="bg-surface border border-border rounded-lg px-2 py-1.5 text-xs font-mono text-gray-200"
              >
                <option value="EDITOR">EDITOR</option>
                <option value="VIEWER">VIEWER</option>
              </select>
              <button
                type="button"
                onClick={handleDirectInvite}
                disabled={inviting || !inviteIdentifier.trim()}
                className="px-2.5 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold disabled:opacity-50"
              >
                {inviting ? "..." : "Invite"}
              </button>
            </div>
          </div>
        )}

        {visibility === "PRIVATE" && (
          <div className="bg-surface2 border border-border rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-gray-400">
              <span>PRIVATE INVITE LINK</span>
              <button
                type="button"
                onClick={handleRotate}
                disabled={rotating}
                className="flex items-center gap-1 text-accent hover:opacity-80 font-sans font-semibold"
              >
                <RefreshCw size={11} className={rotating ? "animate-spin" : ""} />
                <span>{rotating ? "Rotating..." : "Rotate Secret"}</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={inviteUrl}
                className="flex-1 bg-surface border border-border rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-gray-300"
              />
              <button
                type="button"
                onClick={handleCopyInvite}
                className="px-2.5 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold flex items-center gap-1"
              >
                {copiedInvite ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedInvite ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-gray-100 hover:bg-surface2 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-xs bg-accent text-white font-semibold rounded-lg hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Apply Controls"}
          </button>
        </div>
      </form>
    </div>
  );
}
