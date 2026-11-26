import { memo } from "react";
import { Plus, X, Wand2, FolderTree, Folder, History } from "lucide-react";
import { getFileBadge } from "../../constants/languages.js";

function FileTabs({
  files = [],
  activeFileName,
  onSelectFile,
  onNewFile,
  onCloseFile,
  canManageFiles = false,
  onFormatDocument,
  onOpenHistory,
  fileExplorerOpen = false,
  onToggleFileExplorer,
}) {
  return (
    <div
      role="tablist"
      aria-label="Open editor files"
      className="flex items-center justify-between bg-surface border-b border-border px-2 select-none shrink-0 h-10 overflow-hidden shadow-paper-sm"
    >
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        <button
          type="button"
          onClick={onToggleFileExplorer}
          title={fileExplorerOpen ? "Hide File Explorer" : "Show File Explorer"}
          className={`p-1.5 rounded-lg transition-colors mr-1 shrink-0 ${
            fileExplorerOpen
              ? "bg-accent/15 text-accent border border-accent/25 shadow-paper-sm"
              : "text-gray-400 hover:text-gray-100 hover:bg-surface2"
          }`}
          aria-label="Toggle File Explorer"
        >
          {fileExplorerOpen ? <FolderTree size={14} /> : <Folder size={14} />}
        </button>

        {files.map((file) => {
          const isActive = file.name === activeFileName;
          const badge = getFileBadge(file.name);

          return (
            <div
              key={file.name}
              role="tab"
              aria-selected={isActive}
              tabIndex={0}
              onClick={() => onSelectFile(file.name)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectFile(file.name);
                }
              }}
              className={`group flex items-center gap-2 px-3 py-1.5 rounded-t-lg text-xs font-medium cursor-pointer transition-all shrink-0 border-t-2 ${
                isActive
                  ? "bg-paper-editor text-gray-100 border-accent border-x border-border/80 shadow-paper-sm font-semibold -mb-[1px] z-10"
                  : "bg-surface text-gray-400 hover:text-gray-200 hover:bg-surface2/60 border-transparent"
              }`}
            >
              <span className={`text-[9px] font-bold px-1 rounded border font-mono ${badge.color}`}>
                {badge.text}
              </span>
              <span className="truncate max-w-[140px] font-mono text-[11px]">{file.name}</span>

              {canManageFiles && files.length > 1 && (
                <button
                  type="button"
                  title={`Delete ${file.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseFile(file.name);
                  }}
                  className="opacity-0 group-hover:opacity-100 hover:bg-rose-500/20 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 rounded p-0.5 transition-all"
                  aria-label={`Close ${file.name}`}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          );
        })}

        {canManageFiles && (
          <button
            type="button"
            onClick={onNewFile}
            title="Create new file"
            className="flex items-center gap-1 text-gray-400 hover:text-gray-100 hover:bg-surface2 p-1.5 rounded-lg text-xs transition-colors shrink-0"
            aria-label="Add new file"
          >
            <Plus size={14} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {onOpenHistory && (
          <button
            type="button"
            onClick={onOpenHistory}
            title="Version History & Checkpoints"
            className="flex items-center gap-1 text-[11px] font-mono text-gray-400 hover:text-gray-100 hover:bg-surface2 px-2 py-1 rounded-lg transition-colors"
            aria-label="Version History"
          >
            <History size={13} className="text-accent" />
            <span className="hidden sm:inline">History</span>
          </button>
        )}

        {onFormatDocument && (
          <button
            type="button"
            onClick={onFormatDocument}
            title="Format Document (Prettify)"
            className="flex items-center gap-1 text-[11px] font-mono text-gray-400 hover:text-gray-100 hover:bg-surface2 px-2 py-1 rounded-lg transition-colors"
            aria-label="Format Document"
          >
            <Wand2 size={13} className="text-accent" />
            <span className="hidden sm:inline">Format</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default memo(FileTabs);
