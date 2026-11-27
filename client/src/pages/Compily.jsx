import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation } from "react-router-dom";
import Editor from "@monaco-editor/react";
import toast from "react-hot-toast";
import {
  Play,
  Save,
  Plus,
  Trash2,
  Download,
  RotateCcw,
  PanelLeft,
  Terminal,
  FileCode,
  Search,
  Sparkles,
  History,
  CheckCircle2,
  AlertCircle,
  Clock,
  Wand2,
  Columns2,
  Rows2,
  Share2,
  Copy,
  Globe,
  Lock,
} from "lucide-react";
import "../config/monaco.js";
import { api } from "../services/api.js";
import { copyToClipboard } from "../utils/clipboard.js";
import { useThemeStore } from "../store/themeStore.js";
import { LANGUAGES, monacoLangFor } from "../constants/languages.js";
import { getCompilyTemplate } from "../constants/compilyTemplates.js";
import Navbar from "../components/common/Navbar.jsx";
import OutputConsole from "../components/editor/OutputConsole.jsx";
import { formatRelativeTime } from "../components/dashboard/RoomCard.jsx";

const DEFAULT_TEST_CASES = [
  { id: 1, input: "5\n1 2 3 4 5", expected: "15", actual: "", status: "idle" },
];

export default function Compily() {
  const theme = useThemeStore((s) => s.theme);
  const monacoTheme = theme === "dark" ? "paper-midnight-kraft" : "paper-parchment";

  const [language, setLanguage] = useState("javascript");
  const [title, setTitle] = useState("Untitled Snippet");
  const [activeSnippetId, setActiveSnippetId] = useState(null);
  const [code, setCode] = useState(() => getCompilyTemplate("javascript").code);
  const [stdin, setStdin] = useState("");
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);

  const [testCases, setTestCases] = useState(DEFAULT_TEST_CASES);
  const [runningTestCases, setRunningTestCases] = useState(false);

  const [snippets, setSnippets] = useState([]);
  const [snippetsLoading, setSnippetsLoading] = useState(true);
  const [savingSnippet, setSavingSnippet] = useState(false);
  const [snippetSearch, setSnippetSearch] = useState("");

  // Keep drawer open by default only on wider screens so laptops/tablets keep generous editor width
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 1280 : true
  );
  const [sidebarTab, setSidebarTab] = useState("snippets"); // "snippets" | "history"
  const [layoutSplit, setLayoutSplit] = useState("right"); // "right" | "bottom"
  const [runHistory, setRunHistory] = useState([]);
  const [mobileTab, setMobileTab] = useState("editor"); // "editor" | "output" | "snippets"
  const [cursorPos, setCursorPos] = useState({ line: 1, column: 1 });

  const editorRef = useRef(null);
  const location = useLocation();
  const activeTemplate = useMemo(() => getCompilyTemplate(language), [language]);
  const [sharingSnippet, setSharingSnippet] = useState(false);

  const activeSnippet = useMemo(
    () => snippets.find((s) => s._id === activeSnippetId) || null,
    [snippets, activeSnippetId]
  );

  const loadSnippets = useCallback(async () => {
    setSnippetsLoading(true);
    try {
      const { data } = await api.get("/compily/snippets");
      const list = data.snippets || [];
      setSnippets(list);
      const targetId = location.state?.loadSnippetId;
      if (targetId) {
        const match = list.find((s) => s._id === targetId);
        if (match) {
          setActiveSnippetId(match._id);
          setTitle(match.title);
          setLanguage(match.language);
          setCode(match.code || "");
          setStdin(match.stdin || "");
        }
      }
    } catch {
      // non-fatal
    } finally {
      setSnippetsLoading(false);
    }
  }, [location.state?.loadSnippetId]);

  useEffect(() => {
    loadSnippets();
  }, [loadSnippets]);

  const handleRun = useCallback(async () => {
    const currentSource = editorRef.current?.getValue() ?? code;
    if (!currentSource.trim()) {
      toast.error("Write some code before running");
      return;
    }
    setRunning(true);
    try {
      const { data } = await api.post("/compily/execute", {
        language,
        sourceCode: currentSource,
        stdin,
        activeFileName: activeTemplate.fileName,
      });
      setResult(data.execution);
      setRunHistory((prev) => [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          language,
          title,
          execution: data.execution,
          ranAt: new Date().toISOString(),
        },
        ...prev.slice(0, 19),
      ]);
      if (window.innerWidth < 768) {
        setMobileTab("output");
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Execution failed");
    } finally {
      setRunning(false);
    }
  }, [code, language, stdin, activeTemplate.fileName, title]);

  const handleRunTestCases = useCallback(async () => {
    const currentSource = editorRef.current?.getValue() ?? code;
    if (!currentSource.trim()) return;
    setRunningTestCases(true);
    try {
      const payloadCases = testCases.map((tc) => ({
        id: tc.id,
        input: tc.input,
        expected: tc.expected,
      }));
      const { data } = await api.post("/compily/execute-batch", {
        language,
        sourceCode: currentSource,
        activeFileName: activeTemplate.fileName,
        cases: payloadCases,
      });
      setTestCases(data.results || []);
    } catch (err) {
      toast.error(err.response?.data?.error || "Batch test run failed");
    } finally {
      setRunningTestCases(false);
    }
  }, [code, language, activeTemplate.fileName, testCases]);

  const handleSaveSnippet = useCallback(async () => {
    const currentSource = editorRef.current?.getValue() ?? code;
    setSavingSnippet(true);
    try {
      const { data } = await api.post("/compily/snippets", {
        ...(activeSnippetId ? { id: activeSnippetId } : {}),
        title: title.trim() || "Untitled Snippet",
        language,
        code: currentSource,
        stdin,
      });
      setActiveSnippetId(data.snippet._id);
      toast.success(activeSnippetId ? "Snippet updated" : "Snippet saved to Compily");
      loadSnippets();
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not save snippet");
    } finally {
      setSavingSnippet(false);
    }
  }, [activeSnippetId, title, language, code, stdin, loadSnippets]);

  useEffect(() => {
    function handleShortcuts(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (!running) handleRun();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!savingSnippet) handleSaveSnippet();
      }
    }
    window.addEventListener("keydown", handleShortcuts);
    return () => window.removeEventListener("keydown", handleShortcuts);
  }, [handleRun, handleSaveSnippet, running, savingSnippet]);

  function handleLanguageChange(nextLang) {
    const prevDefault = getCompilyTemplate(language).code;
    const nextTemplate = getCompilyTemplate(nextLang);
    if (!activeSnippetId && (code.trim() === "" || code === prevDefault)) {
      setCode(nextTemplate.code);
    }
    setLanguage(nextLang);
  }

  function handleNewSnippet() {
    const tpl = getCompilyTemplate(language);
    setActiveSnippetId(null);
    setTitle("Untitled Snippet");
    setCode(tpl.code);
    setStdin("");
    setResult(null);
    setMobileTab("editor");
  }

  function handleLoadSnippet(s) {
    setActiveSnippetId(s._id);
    setTitle(s.title);
    setLanguage(s.language);
    setCode(s.code || "");
    setStdin(s.stdin || "");
    setResult(null);
    setMobileTab("editor");
  }

  async function handleDeleteSnippet(e, id) {
    e.stopPropagation();
    try {
      await api.delete(`/compily/snippets/${id}`);
      if (activeSnippetId === id) {
        setActiveSnippetId(null);
      }
      setSnippets((prev) => prev.filter((s) => s._id !== id));
      toast.success("Snippet deleted");
    } catch {
      toast.error("Could not delete snippet");
    }
  }

  function handleResetTemplate() {
    setCode(activeTemplate.code);
    toast.success(`Reset to ${activeTemplate.fileName} template`);
  }

  function handleDownload() {
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = activeTemplate.fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleFormat() {
    const action = editorRef.current?.getAction("editor.action.formatDocument");
    if (action) {
      action.run();
      toast.success("Formatted");
    } else {
      toast("Formatting unavailable for this language");
    }
  }

  async function handleToggleShare() {
    let targetId = activeSnippetId;
    if (!targetId) {
      toast.error("Save the snippet first before creating a share link");
      return;
    }
    setSharingSnippet(true);
    try {
      const nextPublic = !activeSnippet?.isPublic;
      const { data } = await api.patch(`/compily/snippets/${targetId}/share`, {
        isPublic: nextPublic,
      });
      setSnippets((prev) =>
        prev.map((s) => (s._id === targetId ? data.snippet : s))
      );
      if (data.snippet?.isPublic && data.snippet?.shareSlug) {
        const shareUrl = `${window.location.origin}/s/${data.snippet.shareSlug}`;
        await copyToClipboard(shareUrl);
        toast.success("Public link enabled & copied to clipboard!");
      } else {
        toast.success("Snippet is now private");
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not update share settings");
    } finally {
      setSharingSnippet(false);
    }
  }

  async function handleCopyShareUrl() {
    if (!activeSnippet?.shareSlug) return;
    const shareUrl = `${window.location.origin}/s/${activeSnippet.shareSlug}`;
    const ok = await copyToClipboard(shareUrl);
    if (ok) toast.success("Share link copied");
  }

  const filteredSnippets = useMemo(() => {
    const q = snippetSearch.trim().toLowerCase();
    if (!q) return snippets;
    return snippets.filter(
      (s) =>
        s.title?.toLowerCase().includes(q) ||
        s.language?.toLowerCase().includes(q)
    );
  }, [snippets, snippetSearch]);

  const isSideSplit = layoutSplit === "right";

  return (
    <div className="h-dvh flex flex-col bg-bg text-gray-100 overflow-hidden">
      <Navbar />

      {/* Compily Studio Toolbar */}
      <div className="border-b border-border bg-surface/90 backdrop-blur-md px-4 sm:px-6 lg:px-10 py-2 shrink-0 z-20">
        <div className="w-full max-w-[1600px] mx-auto flex items-center justify-between gap-3">
          {/* Left: Drawer Toggle, Badge, Title, Language */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label="Toggle Snippets Drawer"
              title="Toggle Snippets & Run History"
              className={`hidden md:inline-flex p-1.5 rounded-lg border transition-colors shrink-0 ${
                sidebarOpen
                  ? "bg-accent/10 text-accent border-accent/25"
                  : "bg-surface2 text-gray-400 border-border hover:text-gray-100"
              }`}
            >
              <PanelLeft size={16} />
            </button>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent/10 border border-accent/25 text-accent text-xs font-serif font-bold shrink-0">
              <Sparkles size={13} />
              <span>Compily</span>
            </div>

            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              aria-label="Snippet title"
              placeholder="Snippet title..."
              className="min-w-0 flex-1 max-w-[220px] bg-surface2/75 hover:bg-surface2 focus:bg-surface border border-border rounded-lg px-2.5 py-1 text-xs font-medium text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent/35 focus:border-accent"
            />

            <select
              aria-label="Compiler Language"
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="bg-surface2 border border-border rounded-lg px-2.5 py-1 text-xs font-mono text-gray-200 focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer shrink-0"
            >
              {LANGUAGES.map((l) => (
                <option key={l.key} value={l.key} className="bg-surface text-gray-100">
                  {l.label}
                </option>
              ))}
            </select>

            <span className="hidden xl:inline text-[11px] font-mono text-gray-500 px-1 truncate">
              {activeTemplate.fileName}
            </span>
          </div>

          {/* Right: Layout Toggle & Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="hidden lg:flex items-center bg-surface2 border border-border rounded-lg p-0.5 mr-0.5">
              <button
                type="button"
                onClick={() => setLayoutSplit("right")}
                title="Side-by-side console"
                aria-label="Side-by-side layout"
                aria-pressed={isSideSplit}
                className={`p-1 rounded-md transition-colors ${
                  isSideSplit
                    ? "bg-surface text-accent shadow-paper-sm"
                    : "text-gray-400 hover:text-gray-100"
                }`}
              >
                <Columns2 size={13} />
              </button>
              <button
                type="button"
                onClick={() => setLayoutSplit("bottom")}
                title="Bottom console"
                aria-label="Bottom console layout"
                aria-pressed={!isSideSplit}
                className={`p-1 rounded-md transition-colors ${
                  !isSideSplit
                    ? "bg-surface text-accent shadow-paper-sm"
                    : "text-gray-400 hover:text-gray-100"
                }`}
              >
                <Rows2 size={13} />
              </button>
            </div>

            <button
              type="button"
              onClick={handleFormat}
              title="Format Code"
              aria-label="Format Code"
              className="hidden sm:inline-flex items-center gap-1 text-xs text-gray-300 hover:text-gray-100 bg-surface2 border border-border rounded-lg px-2.5 py-1.5 transition-colors shadow-paper-sm"
            >
              <Wand2 size={13} />
              <span className="hidden xl:inline">Format</span>
            </button>

            <button
              type="button"
              onClick={handleResetTemplate}
              title="Reset to language starter template"
              aria-label="Reset Template"
              className="hidden sm:inline-flex items-center gap-1 text-xs text-gray-300 hover:text-gray-100 bg-surface2 border border-border rounded-lg px-2.5 py-1.5 transition-colors shadow-paper-sm"
            >
              <RotateCcw size={13} />
            </button>

            <button
              type="button"
              onClick={handleDownload}
              title={`Download ${activeTemplate.fileName}`}
              aria-label="Download file"
              className="hidden sm:inline-flex items-center gap-1 text-xs text-gray-300 hover:text-gray-100 bg-surface2 border border-border rounded-lg px-2.5 py-1.5 transition-colors shadow-paper-sm"
            >
              <Download size={13} />
            </button>

            <button
              type="button"
              onClick={handleSaveSnippet}
              disabled={savingSnippet}
              title="Save Snippet (Cmd/Ctrl+S)"
              className="inline-flex items-center gap-1.5 text-xs bg-accent2/15 hover:bg-accent2/25 text-accent2 border border-accent2/30 rounded-lg px-2.5 sm:px-3 py-1.5 font-semibold transition-colors shadow-paper-sm disabled:opacity-60"
            >
              <Save size={13} />
              <span className="hidden sm:inline">
                {savingSnippet ? "Saving..." : activeSnippetId ? "Update" : "Save"}
              </span>
            </button>

            {activeSnippetId && (
              <div className="hidden sm:inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleToggleShare}
                  disabled={sharingSnippet}
                  title={activeSnippet?.isPublic ? "Publicly shared (click to make private)" : "Create public share link"}
                  className={`inline-flex items-center gap-1.5 text-xs border rounded-lg px-2.5 py-1.5 font-medium transition-colors shadow-paper-sm disabled:opacity-60 ${
                    activeSnippet?.isPublic
                      ? "bg-accent/15 text-accent border-accent/35"
                      : "bg-surface2 text-gray-300 border-border hover:text-gray-100"
                  }`}
                >
                  {activeSnippet?.isPublic ? <Globe size={13} /> : <Share2 size={13} />}
                  <span className="hidden xl:inline">
                    {activeSnippet?.isPublic ? "Shared" : "Share"}
                  </span>
                </button>
                {activeSnippet?.isPublic && activeSnippet?.shareSlug && (
                  <button
                    type="button"
                    onClick={handleCopyShareUrl}
                    title="Copy public snippet link"
                    aria-label="Copy public snippet link"
                    className="p-1.5 rounded-lg bg-surface2 border border-border text-gray-300 hover:text-accent transition-colors shadow-paper-sm"
                  >
                    <Copy size={13} />
                  </button>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={handleRun}
              disabled={running}
              title="Run Code (Cmd/Ctrl+Enter)"
              className="inline-flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white rounded-lg px-3 sm:px-3.5 py-1.5 text-xs font-semibold shadow-paper-sm disabled:opacity-60 transition-all active:scale-95"
            >
              <Play size={13} fill="currentColor" />
              <span>{running ? "Running..." : "Run"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Studio Workspace */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Left Snippets & History Drawer */}
        {(sidebarOpen || mobileTab === "snippets") && (
          <aside
            className={`${
              mobileTab === "snippets"
                ? "flex w-full md:w-60 xl:w-64 2xl:w-72"
                : "hidden md:flex md:w-60 xl:w-64 2xl:w-72"
            } flex-col border-r border-border bg-surface shrink-0 h-full min-h-0 overflow-hidden`}
          >
            <div className="p-2.5 border-b border-border flex items-center justify-between gap-2 bg-surface2/40 shrink-0">
              <div className="flex items-center gap-1 bg-surface border border-border rounded-lg p-0.5 flex-1">
                <button
                  type="button"
                  onClick={() => setSidebarTab("snippets")}
                  className={`flex-1 py-1 text-[11px] font-mono rounded-md transition-colors ${
                    sidebarTab === "snippets"
                      ? "bg-accent text-white font-semibold"
                      : "text-gray-400 hover:text-gray-100"
                  }`}
                >
                  Snippets ({snippets.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSidebarTab("history")}
                  className={`flex-1 py-1 text-[11px] font-mono rounded-md transition-colors ${
                    sidebarTab === "history"
                      ? "bg-accent text-white font-semibold"
                      : "text-gray-400 hover:text-gray-100"
                  }`}
                >
                  Runs ({runHistory.length})
                </button>
              </div>
              <button
                type="button"
                onClick={handleNewSnippet}
                title="New Snippet"
                aria-label="New Snippet"
                className="p-1.5 rounded-lg bg-accent/15 text-accent border border-accent/25 hover:bg-accent hover:text-white transition-colors shrink-0"
              >
                <Plus size={14} />
              </button>
            </div>

            {sidebarTab === "snippets" ? (
              <>
                <div className="p-2.5 border-b border-border/70 shrink-0">
                  <div className="relative">
                    <Search
                      size={13}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      value={snippetSearch}
                      onChange={(e) => setSnippetSearch(e.target.value)}
                      placeholder="Filter snippets..."
                      aria-label="Filter saved snippets"
                      className="w-full bg-surface2/75 border border-border rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-border/60">
                  {snippetsLoading ? (
                    <div className="p-4 space-y-2 animate-pulse">
                      <div className="h-12 bg-surface2 rounded-xl" />
                      <div className="h-12 bg-surface2 rounded-xl" />
                    </div>
                  ) : filteredSnippets.length === 0 ? (
                    <div className="p-6 text-center text-xs text-gray-400 space-y-2">
                      <FileCode size={20} className="mx-auto text-gray-500" />
                      <p>
                        {snippets.length === 0
                          ? "Save code snippets to build your personal Compily library."
                          : "No matching snippets."}
                      </p>
                    </div>
                  ) : (
                    filteredSnippets.map((s) => {
                      const active = s._id === activeSnippetId;
                      return (
                        <div
                          key={s._id}
                          onClick={() => handleLoadSnippet(s)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleLoadSnippet(s);
                            }
                          }}
                          className={`px-3 py-2.5 cursor-pointer flex items-start justify-between gap-2 transition-colors ${
                            active
                              ? "bg-accent/10 border-l-2 border-l-accent"
                              : "hover:bg-surface2/60"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-gray-100 truncate">
                              {s.title}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-gray-400">
                              <span className="bg-surface2 border border-border px-1.5 py-0 rounded">
                                {LANGUAGES.find((l) => l.key === s.language)?.label || s.language}
                              </span>
                              <span>{formatRelativeTime(s.updatedAt)}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteSnippet(e, s._id)}
                            aria-label={`Delete snippet ${s.title}`}
                            className="p-1 text-gray-500 hover:text-rose-500 hover:bg-rose-500/10 rounded transition-colors shrink-0"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 overflow-y-auto divide-y divide-border/60">
                {runHistory.length === 0 ? (
                  <div className="p-6 text-center text-xs text-gray-400 space-y-2">
                    <History size={20} className="mx-auto text-gray-500" />
                    <p>Run your code to see execution history for this session.</p>
                  </div>
                ) : (
                  runHistory.map((item) => {
                    const ok = item.execution?.status === "Accepted";
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setResult(item.execution);
                          if (window.innerWidth < 768) setMobileTab("output");
                        }}
                        className="w-full text-left px-3 py-2.5 hover:bg-surface2/60 transition-colors space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold">
                            {ok ? (
                              <CheckCircle2 size={12} className="text-accent2" />
                            ) : (
                              <AlertCircle size={12} className="text-rose-500" />
                            )}
                            <span className={ok ? "text-accent2" : "text-rose-400"}>
                              {item.execution?.status}
                            </span>
                          </span>
                          <span className="text-[10px] font-mono text-gray-500">
                            {item.execution?.executionTime || "—"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono text-gray-400">
                          <span className="truncate">
                            {item.title} · {item.language}
                          </span>
                          <span className="inline-flex items-center gap-0.5 shrink-0">
                            <Clock size={9} />
                            {formatRelativeTime(item.ranAt)}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </aside>
        )}

        {/* Editor + Output Console Split */}
        <div
          className={`flex-1 min-w-0 min-h-0 flex-col overflow-hidden ${
            isSideSplit ? "lg:flex-row" : ""
          } ${mobileTab === "snippets" ? "hidden md:flex" : "flex"}`}
        >
          {/* Monaco Editor */}
          <div
            className={`flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden ${
              mobileTab === "output" ? "hidden md:flex" : "flex"
            }`}
          >
            <div className="flex-1 min-h-0 bg-paper-editor">
              <Editor
                height="100%"
                language={monacoLangFor(language)}
                theme={monacoTheme}
                value={code}
                onChange={(val) => setCode(val ?? "")}
                onMount={(editor) => {
                  editorRef.current = editor;
                  editor.onDidChangeCursorPosition((e) => {
                    setCursorPos({
                      line: e.position.lineNumber,
                      column: e.position.column,
                    });
                  });
                }}
                options={{
                  fontSize: 14,
                  fontFamily: "'JetBrains Mono', Menlo, Monaco, Consolas, monospace",
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                  padding: { top: 14, bottom: 14 },
                  smoothScrolling: true,
                  cursorBlinking: "smooth",
                }}
              />
            </div>

            {/* Editor Status Strip */}
            <div className="px-4 py-1.5 border-t border-border bg-surface text-[11px] font-mono text-gray-400 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span>{activeTemplate.fileName}</span>
                <span>
                  Ln {cursorPos.line}, Col {cursorPos.column}
                </span>
              </div>
              <span className="hidden sm:inline text-gray-500">
                ⌘/Ctrl+Enter Run · ⌘/Ctrl+S Save
              </span>
            </div>
          </div>

          {/* Output Console (Bottom on md or bottom-split, Side pane on lg+ right-split) */}
          <div
            className={`bg-paper-console overflow-hidden ${
              mobileTab === "output"
                ? "flex-1 min-h-0"
                : isSideSplit
                ? "hidden md:block md:h-56 md:border-t lg:border-t-0 lg:border-l lg:h-full lg:w-[38%] lg:min-w-[340px] lg:max-w-[520px] shrink-0 min-h-0"
                : "hidden md:block h-56 lg:h-64 border-t border-border shrink-0 min-h-0"
            }`}
          >
            <OutputConsole
              running={running}
              result={result}
              stdin={stdin}
              setStdin={setStdin}
              onClearOutput={() => setResult(null)}
              testCases={testCases}
              setTestCases={setTestCases}
              onRunTestCases={handleRunTestCases}
              runningTestCases={runningTestCases}
              files={[{ name: activeTemplate.fileName, content: code }]}
              activeFileName={activeTemplate.fileName}
              getActiveCode={() => editorRef.current?.getValue() ?? code}
            />
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="Compily Mobile Navigation"
        className="md:hidden flex items-center justify-around border-t border-border bg-surface py-2 px-1 shrink-0 z-20"
      >
        <button
          type="button"
          onClick={() => setMobileTab("editor")}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium ${
            mobileTab === "editor" ? "text-accent font-semibold" : "text-gray-400"
          }`}
        >
          <FileCode size={18} />
          <span>Code</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("output")}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium ${
            mobileTab === "output" ? "text-accent font-semibold" : "text-gray-400"
          }`}
        >
          <Terminal size={18} />
          <span>Output</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("snippets")}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium ${
            mobileTab === "snippets" ? "text-accent font-semibold" : "text-gray-400"
          }`}
        >
          <History size={18} />
          <span>Snippets ({snippets.length})</span>
        </button>
      </nav>
    </div>
  );
}
