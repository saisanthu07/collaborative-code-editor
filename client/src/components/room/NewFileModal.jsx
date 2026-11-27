import { useState, useEffect, useRef } from "react";
import { FilePlus, X } from "lucide-react";
import { LANGUAGES, detectLanguageFromFileName } from "../../constants/languages.js";

export default function NewFileModal({
  onClose,
  onCreate,
  existingFiles = [],
  loading = false,
}) {
  const [fileName, setFileName] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [error, setError] = useState("");
  const [userManuallySelectedLang, setUserManuallySelectedLang] = useState(false);

  const modalRef = useRef(null);
  const inputRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && !loading) {
        e.preventDefault();
        onCloseRef.current?.();
        return;
      }
      if (e.key === "Tab") {
        const focusable = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
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
  }, [loading]);

  function handleNameChange(val) {
    setFileName(val);
    setError("");

    if (!userManuallySelectedLang) {
      const detected = detectLanguageFromFileName(val);
      if (detected) {
        setLanguage(detected);
      }
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 dark:bg-black/70 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-md bg-surface border border-border rounded-2xl p-6 sm:p-7 shadow-paper-lg space-y-4 animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/15 text-accent flex items-center justify-center shrink-0 border border-accent/25 shadow-paper-sm">
              <FilePlus size={20} />
            </div>
            <div>
              <h2 id="new-file-title" className="text-lg font-bold font-serif text-gray-100">
                Create New File
              </h2>
              <p className="text-xs text-gray-400">Add a source code or config sheet to this room</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close dialog"
            className="text-gray-400 hover:text-gray-100 hover:bg-surface2 p-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="new-file-name" className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">
              File Name
            </label>
            <input
              ref={inputRef}
              id="new-file-name"
              type="text"
              required
              disabled={loading}
              value={fileName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. index.js, helpers.py, solution.cpp"
              className="w-full bg-surface2 border border-border rounded-lg px-3.5 py-2 text-sm text-gray-100 font-mono placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-accent shadow-paper-sm"
            />
            {error && <p className="text-xs text-rose-700 dark:text-rose-400 mt-1 font-sans">{error}</p>}
          </div>

          <div>
            <label htmlFor="new-file-language" className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">
              Language / Syntax
            </label>
            <select
              id="new-file-language"
              disabled={loading}
              value={language}
              onChange={(e) => {
                setLanguage(e.target.value);
                setUserManuallySelectedLang(true);
              }}
              className="w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent shadow-paper-sm"
            >
              {LANGUAGES.map((l) => (
                <option key={l.key} value={l.key} className="bg-surface text-gray-100">
                  {l.label} ({l.ext})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-lg border border-border hover:bg-surface2 text-xs font-medium text-gray-300 hover:text-gray-100 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !fileName.trim()}
              className="px-4 py-2 rounded-lg bg-accent hover:opacity-90 text-white text-xs font-semibold transition-all inline-flex items-center gap-2 shadow-paper-sm focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-60 active:scale-95"
            >
              {loading ? "Creating..." : "Create File"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
