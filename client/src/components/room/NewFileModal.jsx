import { useState, useEffect, useRef } from "react";
import { FilePlus, X } from "lucide-react";
import { LANGUAGES, detectLanguageFromFileName } from "../../constants/languages.js";

export default function NewFileModal({ existingFiles = [], onCreate, onClose, loading = false }) {
  const [fileName, setFileName] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [error, setError] = useState("");
  const inputRef = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();

    function handleKeyDown(e) {
      if (e.key === "Escape" && !loading) {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Tab") {
        const focusable = modalRef.current?.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])'
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
  }, [onClose, loading]);

  function handleNameChange(val) {
    setFileName(val);
    setError("");
    const detected = detectLanguageFromFileName(val);
    if (detected) {
      setLanguage(detected);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = fileName.trim();
    if (!trimmed) {
      setError("File name cannot be empty");
      return;
    }
    if (trimmed.startsWith(".") || trimmed.startsWith("/")) {
      setError("File name cannot start with '.' or '/'");
      return;
    }
    if (trimmed.includes("..")) {
      setError("File name cannot contain path traversal ('..')");
      return;
    }
    if (existingFiles.some((f) => f.name.toLowerCase() === trimmed.toLowerCase())) {
      setError("A file with this name already exists");
      return;
    }

    onCreate({ name: trimmed, language });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-file-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-md bg-surface border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/15 text-accent flex items-center justify-center shrink-0 border border-accent/25">
              <FilePlus size={20} />
            </div>
            <div>
              <h2 id="new-file-title" className="text-lg font-semibold text-gray-100">
                Create New File
              </h2>
              <p className="text-xs text-gray-400">Add a source code or config file to this room</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            aria-label="Close dialog"
            className="text-gray-400 hover:text-gray-200 p-1 rounded-md transition-colors disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div>
            <label htmlFor="file-name" className="block text-xs font-medium text-gray-300 mb-1.5">
              File Name (e.g. <code className="text-accent">helpers.py</code>, <code className="text-accent">app.ts</code>)
            </label>
            <input
              id="file-name"
              ref={inputRef}
              type="text"
              value={fileName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. utils.js"
              disabled={loading}
              className="w-full bg-surface2 border border-border rounded-md px-3 py-2 text-sm text-gray-100 font-mono placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-accent"
            />
            {error && <p className="text-xs text-rose-400 mt-1.5">{error}</p>}
          </div>

          <div>
            <label htmlFor="file-lang" className="block text-xs font-medium text-gray-300 mb-1.5">
              Language
            </label>
            <select
              id="file-lang"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={loading}
              className="w-full bg-surface2 border border-border rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {LANGUAGES.map((l) => (
                <option key={l.key} value={l.key}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-md border border-border hover:bg-surface2 text-sm text-gray-300 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !fileName.trim()}
              className="px-4 py-2 rounded-md bg-accent hover:bg-blue-600 text-white text-sm font-medium transition-colors inline-flex items-center gap-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                "Create File"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
