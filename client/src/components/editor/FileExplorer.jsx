import { memo } from "react";
import { Plus, FileCode, Edit2, Trash2, FolderClosed } from "lucide-react";
import { getFileBadge } from "../../constants/languages.js";

function FileExplorer({
  files = [],
  activeFileName,
  onSelectFile,
  onNewFile,
  onRenameFile,
  onDeleteFile,
  canManageFiles = false,
}) {
  return (
    <div
      className="w-56 bg-surface border-r border-border flex flex-col shrink-0 select-none h-full overflow-hidden"
      role="region"
      aria-label="Files Explorer"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-surface2/40">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-300 uppercase tracking-wider font-sans">
          <FolderClosed size={14} className="text-accent" />
          <span>Explorer</span>
          <span className="text-[10px] bg-surface2 border border-border px-1.5 py-0.2 rounded-full font-normal text-gray-400">
            {files.length}
          </span>
        </div>

        {canManageFiles && (
          <button
            type="button"
            onClick={onNewFile}
            title="Create new file"
            className="p-1 text-gray-400 hover:text-white hover:bg-surface2 rounded transition-colors"
            aria-label="Create new file"
          >
            <Plus size={15} />
          </button>
        )}
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
        {files.map((file) => {
          const isActive = file.name === activeFileName;
          const badge = getFileBadge(file.name);

          return (
            <div
              key={file.name}
              role="button"
              tabIndex={0}
              onClick={() => onSelectFile(file.name)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectFile(file.name);
                }
              }}
              className={`group flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-mono cursor-pointer transition-colors ${
                isActive
                  ? "bg-accent/15 text-accent font-semibold border border-accent/30"
                  : "text-gray-300 hover:bg-surface2/70 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`text-[9px] font-bold px-1 rounded border shrink-0 ${badge.color}`}
                >
                  {badge.text}
                </span>
                <span className="truncate">{file.name}</span>
              </div>

              {canManageFiles && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    type="button"
                    title="Rename file"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRenameFile(file.name);
                    }}
                    className="p-1 hover:text-accent hover:bg-surface2 rounded transition-colors text-gray-400"
                    aria-label={`Rename ${file.name}`}
                  >
                    <Edit2 size={12} />
                  </button>

                  {files.length > 1 && (
                    <button
                      type="button"
                      title="Delete file"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteFile(file.name);
                      }}
                      className="p-1 hover:text-rose-400 hover:bg-rose-500/20 rounded transition-colors text-gray-400"
                      aria-label={`Delete ${file.name}`}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default memo(FileExplorer);
