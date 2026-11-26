import { useEffect, useRef, useState, useMemo } from "react";
import {
  Search,
  FileCode,
  Play,
  PenTool,
  Code2,
  MessageSquare,
  Users,
  Share2,
  History,
  Settings,
  Copy,
  X,
} from "lucide-react";

export default function CommandPalette({
  open,
  files = [],
  activeFileName,
  workspaceView,
  canManageFiles,
  isHost,
  onClose,
  onSelectFile,
  onSetWorkspaceView,
  onRunCode,
  onSetRightTab,
  onOpenShare,
  onOpenRevisions,
  onOpenSettings,
  onCopyRoomId,
}) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveIndex(0);
      return;
    }
    const timer = setTimeout(() => inputRef.current?.focus(), 10);
    return () => clearTimeout(timer);
  }, [open]);

  const items = useMemo(() => {
    const actions = [
      ...(canManageFiles
        ? [
            {
              id: "action:run",
              group: "Actions",
              label: "Run Active File",
              hint: "Execute code in sandbox",
              icon: Play,
              run: () => onRunCode(),
            },
          ]
        : []),
      {
        id: "action:view-toggle",
        group: "Actions",
        label: workspaceView === "code" ? "Switch to Whiteboard" : "Switch to Code Editor",
        hint: "Toggle workspace view",
        icon: workspaceView === "code" ? PenTool : Code2,
        run: () => onSetWorkspaceView(workspaceView === "code" ? "whiteboard" : "code"),
      },
      {
        id: "action:tab-participants",
        group: "Panels",
        label: "Show Participants Panel",
        hint: "Manage collaborators & follow mode",
        icon: Users,
        run: () => onSetRightTab("participants"),
      },
      {
        id: "action:tab-chat",
        group: "Panels",
        label: "Show Marginalia Chat",
        hint: "Open room messages",
        icon: MessageSquare,
        run: () => onSetRightTab("chat"),
      },
      {
        id: "action:tab-comments",
        group: "Panels",
        label: "Show Code Comments",
        hint: "Inspect line review threads",
        icon: Code2,
        run: () => onSetRightTab("comments"),
      },
      {
        id: "action:revisions",
        group: "Actions",
        label: "Version Checkpoints",
        hint: "View or save file snapshots",
        icon: History,
        run: () => onOpenRevisions(),
      },
      {
        id: "action:share",
        group: "Actions",
        label: "Share Invite Link",
        hint: "Open room QR & invite modal",
        icon: Share2,
        run: () => onOpenShare(),
      },
      {
        id: "action:copy-id",
        group: "Actions",
        label: "Copy Room ID",
        hint: "Copy room identifier to clipboard",
        icon: Copy,
        run: () => onCopyRoomId(),
      },
      ...(isHost
        ? [
            {
              id: "action:settings",
              group: "Host",
              label: "Room Host Controls",
              hint: "Visibility, roles, lock & invites",
              icon: Settings,
              run: () => onOpenSettings(),
            },
          ]
        : []),
      ...files.map((f) => ({
        id: `file:${f.name}`,
        group: "Files",
        label: f.name,
        hint: f.name === activeFileName ? "Active file" : f.language || "Open file",
        icon: FileCode,
        run: () => onSelectFile(f.name),
      })),
    ];

    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.hint.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q)
    );
  }, [
    files,
    activeFileName,
    workspaceView,
    canManageFiles,
    isHost,
    query,
    onRunCode,
    onSetWorkspaceView,
    onSetRightTab,
    onOpenRevisions,
    onOpenShare,
    onCopyRoomId,
    onOpenSettings,
    onSelectFile,
  ]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (items.length ? (i + 1) % items.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (items.length ? (i - 1 + items.length) % items.length : 0));
      } else if (e.key === "Enter" && items[activeIndex]) {
        e.preventDefault();
        items[activeIndex].run();
        onClose();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, items, activeIndex, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-stone-900/45 dark:bg-black/75 backdrop-blur-sm flex items-start justify-center pt-20 sm:pt-24 z-50 px-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Room Command Palette"
        onClick={(e) => e.stopPropagation()}
        className="bg-surface border border-border rounded-2xl w-full max-w-lg shadow-paper-lg overflow-hidden"
      >
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-surface2/40">
          <Search size={16} className="text-accent shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to file or run a room command..."
            aria-label="Filter files and commands"
            className="flex-1 bg-transparent text-sm text-gray-100 placeholder-gray-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close command palette"
            className="p-1 text-gray-400 hover:text-gray-100 rounded-lg"
          >
            <X size={15} />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-border/50">
          {items.length === 0 ? (
            <div className="p-6 text-center text-xs text-gray-400">
              No matching files or commands.
            </div>
          ) : (
            items.map((item, idx) => {
              const Icon = item.icon;
              const selected = idx === activeIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => {
                    item.run();
                    onClose();
                  }}
                  className={`w-full px-4 py-2.5 text-left flex items-center justify-between gap-3 transition-colors ${
                    selected ? "bg-accent/12 text-gray-100" : "hover:bg-surface2/60 text-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${
                        selected
                          ? "bg-accent text-white border-accent"
                          : "bg-surface2 text-gray-400 border-border"
                      }`}
                    >
                      <Icon size={13} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate">{item.label}</div>
                      <div className="text-[11px] text-gray-500 truncate">{item.hint}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500 shrink-0">
                    {item.group}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="px-4 py-2 bg-surface2/50 border-t border-border flex items-center justify-between text-[10px] font-mono text-gray-500">
          <span>↑↓ Navigate · Enter Select</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>
  );
}
