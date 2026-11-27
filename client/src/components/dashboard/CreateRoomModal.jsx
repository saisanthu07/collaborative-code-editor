import { useEffect, useRef } from "react";
import {
  FileCode,
  X,
  Lock,
  Globe,
  Code2,
  Terminal,
  Layout,
  FolderTree,
  Check,
} from "lucide-react";
import { LANGUAGES } from "../../constants/languages.js";
import { QUESTION_BANK } from "../../constants/questionBank.js";

export const ROOM_TEMPLATES = [
  {
    key: "blank",
    label: "Blank Single File",
    shortLabel: "Blank",
    desc: "Clean canvas with one starter file",
    icon: FileCode,
  },
  {
    key: "algorithms",
    label: "Algorithms Starter",
    shortLabel: "Algorithms",
    desc: "Interview prompt + test-ready setup",
    icon: Terminal,
  },
  {
    key: "web-preview",
    label: "Web Preview",
    shortLabel: "Web Preview",
    desc: "HTML, CSS & JS with live preview",
    icon: Layout,
  },
  {
    key: "multi-file-node",
    label: "Multi-File Node.js",
    shortLabel: "Node Project",
    desc: "Modular project tree with imports",
    icon: FolderTree,
  },
];

export default function CreateRoomModal({
  open,
  form,
  setForm,
  loading,
  onClose,
  onSubmit,
}) {
  const modalRef = useRef(null);
  const firstInputRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    firstInputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e) {
      if (e.key === "Escape") {
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
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-stone-900/45 dark:bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 px-4 py-6 overflow-y-auto"
      onClick={onClose}
      role="presentation"
    >
      <form
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-room-title"
        onSubmit={onSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-surface border border-border rounded-2xl w-full max-w-lg shadow-paper-lg overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="px-6 py-5 bg-surface2/60 border-b border-border flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/25 flex items-center justify-center text-accent shadow-paper-sm shrink-0">
              <Code2 size={20} />
            </div>
            <div>
              <h2 id="create-room-title" className="font-bold text-lg font-serif text-gray-100 leading-tight">
                New Collaborative Room
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Configure your workspace, runtime, and starter files
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="text-gray-400 hover:text-gray-100 hover:bg-surface2 p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          <div>
            <label
              htmlFor="room-name-input"
              className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 font-mono"
            >
              Room Name
            </label>
            <input
              ref={firstInputRef}
              id="room-name-input"
              required
              maxLength={100}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Algorithms Pair Session"
              className="w-full bg-surface2/75 hover:bg-surface2 focus:bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent/35 focus:border-accent transition-all shadow-paper-sm"
            />
          </div>

          <div>
            <label
              htmlFor="room-desc-input"
              className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 font-mono"
            >
              Description{" "}
              <span className="text-gray-500 font-sans lowercase font-normal">(optional)</span>
            </label>
            <textarea
              id="room-desc-input"
              maxLength={500}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What are you building or interviewing for?"
              className="w-full bg-surface2/75 hover:bg-surface2 focus:bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent/35 focus:border-accent transition-all shadow-paper-sm resize-none"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label
                htmlFor="room-lang-select"
                className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 font-mono"
              >
                Primary Language
              </label>
              <select
                id="room-lang-select"
                value={form.language}
                onChange={(e) => setForm({ ...form, language: e.target.value })}
                className="w-full bg-surface2/75 hover:bg-surface2 focus:bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent/35 focus:border-accent shadow-paper-sm"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.key} value={l.key} className="bg-surface text-gray-100">
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">
                Visibility
              </span>
              <div className="grid grid-cols-2 gap-1.5 bg-surface2/75 border border-border rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, visibility: "PRIVATE" })}
                  aria-pressed={form.visibility === "PRIVATE"}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                    form.visibility === "PRIVATE"
                      ? "bg-surface text-gray-100 border border-border shadow-paper-sm font-semibold"
                      : "text-gray-400 hover:text-gray-100"
                  }`}
                >
                  <Lock size={12} className={form.visibility === "PRIVATE" ? "text-accent" : ""} />
                  <span>Private</span>
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, visibility: "PUBLIC" })}
                  aria-pressed={form.visibility === "PUBLIC"}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                    form.visibility === "PUBLIC"
                      ? "bg-surface text-gray-100 border border-border shadow-paper-sm font-semibold"
                      : "text-gray-400 hover:text-gray-100"
                  }`}
                >
                  <Globe size={12} className={form.visibility === "PUBLIC" ? "text-accent2" : ""} />
                  <span>Public</span>
                </button>
              </div>
            </div>
          </div>

          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2 font-mono">
              Starter Template
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {ROOM_TEMPLATES.map(({ key, label, desc, icon: Icon }) => {
                const selected = form.template === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setForm({ ...form, template: key })}
                    aria-pressed={selected}
                    className={`relative text-left p-3 rounded-xl border transition-all flex items-start gap-2.5 focus:outline-none focus:ring-2 focus:ring-accent ${
                      selected
                        ? "bg-accent/10 border-accent shadow-paper-sm"
                        : "bg-surface2/50 border-border hover:border-gray-500 hover:bg-surface2"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border ${
                        selected
                          ? "bg-accent text-white border-accent"
                          : "bg-surface text-gray-400 border-border"
                      }`}
                    >
                      <Icon size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold text-gray-100 truncate">
                          {label}
                        </span>
                        {selected && <Check size={13} className="text-accent shrink-0" />}
                      </div>
                      <p className="text-[11px] text-gray-400 leading-snug mt-0.5 line-clamp-1">
                        {desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label
              htmlFor="room-question-select"
              className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 font-mono"
            >
              Interview Question Bank{" "}
              <span className="text-gray-500 font-sans lowercase font-normal">(optional · includes hidden tests)</span>
            </label>
            <select
              id="room-question-select"
              value={form.questionId || ""}
              onChange={(e) => {
                const qId = e.target.value;
                const q = QUESTION_BANK.find((item) => item.id === qId);
                setForm((prev) => ({
                  ...prev,
                  questionId: qId,
                  template: qId ? "algorithms" : prev.template,
                  name: !prev.name.trim() && q ? `${q.title} Interview` : prev.name,
                }));
              }}
              className="w-full bg-surface2/75 hover:bg-surface2 focus:bg-surface border border-border rounded-xl px-3 py-2.5 text-xs sm:text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent/35 focus:border-accent shadow-paper-sm"
            >
              <option value="" className="bg-surface text-gray-100">
                None — use starter template only
              </option>
              {QUESTION_BANK.map((q) => (
                <option key={q.id} value={q.id} className="bg-surface text-gray-100">
                  [{q.difficulty}] {q.title} — {q.category}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-surface2/40 border-t border-border flex items-center justify-between gap-3">
          <span className="text-[11px] text-gray-500 hidden sm:inline">
            {form.visibility === "PRIVATE"
              ? "Generates a secret invite link automatically."
              : "Anyone with the room ID can join."}
          </span>
          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-gray-100 hover:bg-surface2 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs bg-accent hover:bg-accent-hover rounded-xl text-white font-semibold shadow-paper-sm disabled:opacity-60 transition-all focus:outline-none focus:ring-2 focus:ring-accent active:scale-95"
            >
              {loading ? "Creating..." : "Create Room"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
