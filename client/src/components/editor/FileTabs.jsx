import { memo } from "react";
import { Plus, X, Wand2, FolderTree, Folder } from "lucide-react";
import { getFileBadge } from "../../constants/languages.js";

function FileTabs({
  files = [],
  activeFileName,
  onSelectFile,
  onNewFile,
  onCloseFile,
  canManageFiles = false,
  onFormatDocument,
  fileExplorerOpen = false,
  onToggleFileExplorer,
}) {
  return (
    <div
      role="tablist"
      aria-label="Open editor files"
      className="flex items-center justify-between bg-surface border-b border-border px-2 select-none shrink-0 h-10 overflow-hidden"
    >
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
        {/* Toggle File Explorer button */}
        <button
          type="button"
          onClick={onToggleFileExplorer}
          title={fileExplorerOpen ? "Hide File Explorer" : "Show File Explorer"}
          className={`p-1.5 rounded transition-colors mr-1 shrink-0 ${
            fileExplorerOpen
              ? "bg-accent/20 text-accent border border-accent/30"
              : "text-gray-400 hover:text-gray-200 hover:bg-surface2"
          }`}
          aria-label="Toggle File Explorer"
        >
          {fileExplorerOpen ? <FolderTree size={15} /> : <Folder size={15} />}
        </button>

        {/* Tab Items */}
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
              className={`group flex items-center gap-2 px-3 py-1 rounded-t-md text-xs font-medium cursor-pointer transition-colors shrink-0 border-t-2 ${
                isActive
                  ? "bg-[#1e1e1e] text-white border-accent shadow-sm"
                  : "bg-surface text-gray-400 hover:text-gray-200 hover:bg-surface2/60 border-transparent"
              }`}
            >
              <span
                className={`text-[9px] font-bold px-1 rounded border font-mono ${badge.color}`}
              >
                {badge.text}
              </span>
              <span className="truncate max-w-[140px] font-mono text-[11px]">{file.name}</span>

              {/* Close/delete tab button if more than 1 file exists and user has permission */}
              {canManageFiles && files.length > 1 && (
                <button
                  type="button"
                  title={`Delete ${file.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseFile(file.name);
                  }}
                  className="opacity-0 group-hover:opacity-100 hover:bg-rose-500/20 hover:text-rose-400 text-gray-400 rounded p-0.5 transition-all"
                  aria-label={`Close ${file.name}`}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          );
        })}

        {/* New File Tab Button */}
        {canManageFiles && (
          <button
            type="button"
            onClick={onNewFile}
            title="Create new file"
            className="flex items-center gap-1 text-gray-400 hover:text-gray-100 hover:bg-surface2 px-2 py-1 rounded text-xs transition-colors shrink-0"
            aria-label="Add new file"
          >
            <Plus size={14} />
          </button>
        )}
      </div>

      {/* Right Controls: Format Code */}
      <div className="flex items-center gap-2 shrink-0 pl-2">
        {onFormatDocument && (
          <button
            type="button"
            onClick={onFormatDocument}
            title="Format Code (Shift + Alt + F)"
            className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-200 hover:bg-surface2 px-2 py-1 rounded border border-transparent hover:border-border transition-colors font-sans"
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
