import { memo, useState, useMemo, useRef } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  FolderClosed,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Upload,
} from "lucide-react";
import { getFileBadge } from "../../constants/languages.js";

function buildFileTree(files) {
  const root = { name: "", path: "", folders: new Map(), files: [] };
  for (const file of files) {
    const parts = file.name.split("/").filter(Boolean);
    let node = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const seg = parts[i];
      const nextPath = node.path ? `${node.path}/${seg}` : seg;
      if (!node.folders.has(seg)) {
        node.folders.set(seg, { name: seg, path: nextPath, folders: new Map(), files: [] });
      }
      node = node.folders.get(seg);
    }
    node.files.push({ ...file, shortName: parts[parts.length - 1] || file.name });
  }
  return root;
}

function FileExplorer({
  files = [],
  activeFileName,
  onSelectFile,
  onNewFile,
  onRenameFile,
  onDeleteFile,
  onUploadFiles,
  canManageFiles = false,
}) {
  const [collapsedFolders, setCollapsedFolders] = useState(new Set());
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const tree = useMemo(() => buildFileTree(files), [files]);

  function toggleFolder(folderPath) {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) next.delete(folderPath);
      else next.add(folderPath);
      return next;
    });
  }

  async function processFileList(fileList) {
    if (!canManageFiles || !onUploadFiles || !fileList?.length) return;
    const uploaded = [];
    for (const f of Array.from(fileList).slice(0, 15)) {
      if (f.size > 400_000) continue;
      const content = await f.text();
      uploaded.push({ name: f.name, content });
    }
    if (uploaded.length > 0) {
      onUploadFiles(uploaded);
    }
  }

  function renderTreeNode(node, depth = 0) {
    const folders = Array.from(node.folders.values()).sort((a, b) => a.name.localeCompare(b.name));
    const sortedFiles = [...node.files].sort((a, b) => a.shortName.localeCompare(b.shortName));

    return (
      <>
        {folders.map((folder) => {
          const isCollapsed = collapsedFolders.has(folder.path);
          return (
            <div key={folder.path}>
              <button
                type="button"
                onClick={() => toggleFolder(folder.path)}
                style={{ paddingLeft: `${8 + depth * 12}px` }}
                className="w-full flex items-center gap-1.5 py-1 pr-2 rounded-lg text-xs font-mono text-gray-300 hover:bg-surface2 hover:text-gray-100 transition-colors"
              >
                {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                {isCollapsed ? (
                  <FolderClosed size={13} className="text-amber-500 shrink-0" />
                ) : (
                  <FolderOpen size={13} className="text-amber-500 shrink-0" />
                )}
                <span className="truncate">{folder.name}</span>
              </button>
              {!isCollapsed && renderTreeNode(folder, depth + 1)}
            </div>
          );
        })}

        {sortedFiles.map((file) => {
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
              style={{ paddingLeft: `${10 + depth * 12}px` }}
              className={`group flex items-center justify-between pr-2 py-1.5 rounded-lg text-xs font-mono cursor-pointer transition-colors ${
                isActive
                  ? "bg-accent/15 text-accent font-semibold border border-accent/25 shadow-paper-sm"
                  : "text-gray-300 hover:bg-surface2 hover:text-gray-100"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={`text-[9px] font-bold px-1 rounded border shrink-0 ${badge.color}`}>
                  {badge.text}
                </span>
                <span className="truncate">{file.shortName}</span>
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
                    className="p-1 hover:text-accent hover:bg-surface rounded transition-colors text-gray-400"
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
                      className="p-1 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/20 rounded transition-colors text-gray-400"
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
      </>
    );
  }

  return (
    <div
      className={`w-60 bg-surface border-r border-border flex flex-col shrink-0 select-none h-full overflow-hidden shadow-paper-sm ${
        dragOver ? "ring-2 ring-inset ring-accent bg-accent/5" : ""
      }`}
      role="region"
      aria-label="Files Explorer"
      onDragOver={(e) => {
        if (!canManageFiles) return;
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        processFileList(e.dataTransfer?.files);
      }}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-surface2/60">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider font-mono">
          <FolderClosed size={14} className="text-accent" />
          <span>Explorer</span>
          <span className="text-[10px] bg-surface border border-border px-1.5 py-0.2 rounded-full font-mono text-gray-400">
            {files.length}
          </span>
        </div>

        {canManageFiles && (
          <div className="flex items-center gap-1">
            {onUploadFiles && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    processFileList(e.target.files);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload files"
                  className="p-1 text-gray-400 hover:text-gray-100 hover:bg-surface rounded-md transition-colors"
                  aria-label="Upload files"
                >
                  <Upload size={14} />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onNewFile}
              title="Create new file"
              className="p-1 text-gray-400 hover:text-gray-100 hover:bg-surface rounded-md transition-colors"
              aria-label="Create new file"
            >
              <Plus size={15} />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">{renderTreeNode(tree)}</div>

      {canManageFiles && (
        <div className="px-3 py-1.5 border-t border-border text-[10px] font-mono text-gray-500 text-center">
          Tip: Drop files here or use folder/file.js paths
        </div>
      )}
    </div>
  );
}

export default memo(FileExplorer);
