import { useState, useMemo, memo } from "react";
import {
  Terminal,
  CheckCircle2,
  AlertCircle,
  Clock,
  Cpu,
  CornerDownLeft,
  Trash2,
  FileText,
  CheckSquare,
  Plus,
  Play,
  XCircle,
  Globe,
  RefreshCw,
} from "lucide-react";

function buildPreviewDoc(files = [], activeFileName = "", activeCode = "") {
  const merged = files.map((f) =>
    f.name === activeFileName && activeCode !== undefined ? { ...f, content: activeCode } : f
  );
  const htmlFile = merged.find((f) => f.name.endsWith(".html"));
  const cssFiles = merged.filter((f) => f.name.endsWith(".css"));
  const jsFiles = merged.filter((f) => f.name.endsWith(".js") && !f.name.startsWith("utils/"));

  const cssBlock = cssFiles.map((f) => f.content || "").join("\n");
  const jsBlock = jsFiles.map((f) => f.content || "").join("\n");
  const bodyHtml =
    htmlFile?.content ||
    `<div style="font-family:system-ui;padding:16px;color:#9ca3af;">No <code>index.html</code> file found in this room. Create an <code>index.html</code> file to use Live Preview.</div>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>${cssBlock}</style>
</head>
<body>
  ${bodyHtml}
  <script>
    try { ${jsBlock} } catch (e) { document.body.insertAdjacentHTML('beforeend', '<pre style="color:#f43f5e;padding:8px;">' + String(e) + '</pre>'); }
  </script>
</body>
</html>`;
}

function OutputConsole({
  running,
  result,
  stdin = "",
  setStdin,
  onClearOutput,
  testCases = [],
  setTestCases,
  onRunTestCases,
  runningTestCases = false,
  files = [],
  activeFileName = "",
  getActiveCode,
}) {
  const [activeTab, setActiveTab] = useState("output"); // "output" | "stdin" | "testcases" | "preview"
  const [selectedCaseIdx, setSelectedCaseIdx] = useState(0);
  const [previewNonce, setPreviewNonce] = useState(0);

  const passedCount = testCases.filter((tc) => tc.status === "passed").length;
  const failedCount = testCases.filter((tc) => tc.status === "failed").length;

  const previewSrcDoc = useMemo(() => {
    if (activeTab !== "preview") return "";
    const activeCode = getActiveCode?.();
    return buildPreviewDoc(files, activeFileName, activeCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, previewNonce, files, activeFileName]);

  function handleAddCase() {
    const nextId = testCases.length + 1;
    const newCase = {
      id: nextId,
      input: "",
      expected: "",
      actual: "",
      status: "idle",
    };
    setTestCases?.((prev) => [...prev, newCase]);
    setSelectedCaseIdx(testCases.length);
  }

  function handleRemoveCase(idx) {
    if (testCases.length <= 1) return;
    setTestCases?.((prev) => prev.filter((_, i) => i !== idx));
    setSelectedCaseIdx((curr) => Math.max(0, curr - 1));
  }

  function handleUpdateCase(idx, field, value) {
    setTestCases?.((prev) =>
      prev.map((tc, i) => (i === idx ? { ...tc, [field]: value, status: "idle" } : tc))
    );
  }

  const currentCase = testCases[selectedCaseIdx] || testCases[0];

  return (
    <div
      className="h-full flex flex-col font-mono text-xs bg-paper-console text-gray-200 select-text overflow-hidden shadow-paper-sm"
      role="region"
      aria-label="Code execution output, input, test cases, and web preview panel"
    >
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-surface/70 shrink-0 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("output")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-sans font-medium transition-colors shrink-0 ${
              activeTab === "output"
                ? "bg-surface2 text-accent border border-border/80 shadow-paper-sm font-semibold"
                : "text-gray-400 hover:text-gray-100 hover:bg-surface2/50"
            }`}
          >
            <Terminal size={13} aria-hidden="true" />
            <span>Output</span>
            {result && (
              <span
                className={`w-2 h-2 rounded-full ${
                  result.status === "Accepted"
                    ? "bg-emerald-500"
                    : result.status === "Compilation Error"
                    ? "bg-amber-500"
                    : "bg-rose-500"
                }`}
              />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("stdin")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-sans font-medium transition-colors relative shrink-0 ${
              activeTab === "stdin"
                ? "bg-surface2 text-accent border border-border/80 shadow-paper-sm font-semibold"
                : "text-gray-400 hover:text-gray-100 hover:bg-surface2/50"
            }`}
          >
            <CornerDownLeft size={13} aria-hidden="true" />
            <span>Input (stdin)</span>
            {stdin.trim().length > 0 && (
              <span className="text-[10px] bg-accent/15 text-accent font-semibold px-1.5 rounded-full">
                Active
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("testcases")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-sans font-medium transition-colors shrink-0 ${
              activeTab === "testcases"
                ? "bg-surface2 text-accent border border-border/80 shadow-paper-sm font-semibold"
                : "text-gray-400 hover:text-gray-100 hover:bg-surface2/50"
            }`}
          >
            <CheckSquare size={13} aria-hidden="true" />
            <span>Test Cases</span>
            {testCases.length > 0 && (
              <span
                className={`text-[10px] font-semibold px-1.5 rounded-full ${
                  failedCount > 0
                    ? "bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/20"
                    : passedCount === testCases.length && testCases.length > 0
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                    : "bg-surface2 text-gray-400"
                }`}
              >
                {passedCount}/{testCases.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("preview");
              setPreviewNonce((n) => n + 1);
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-sans font-medium transition-colors shrink-0 ${
              activeTab === "preview"
                ? "bg-surface2 text-accent border border-border/80 shadow-paper-sm font-semibold"
                : "text-gray-400 hover:text-gray-100 hover:bg-surface2/50"
            }`}
          >
            <Globe size={13} aria-hidden="true" />
            <span>Web Preview</span>
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {activeTab === "output" && result && (
            <button
              type="button"
              onClick={onClearOutput}
              title="Clear console output"
              className="flex items-center gap-1 text-[11px] font-sans text-gray-400 hover:text-gray-100 hover:bg-surface2 px-2 py-1 rounded-lg transition-colors"
            >
              <Trash2 size={12} />
              <span>Clear</span>
            </button>
          )}

          {activeTab === "stdin" && stdin.length > 0 && (
            <button
              type="button"
              onClick={() => setStdin?.("")}
              title="Clear stdin input"
              className="flex items-center gap-1 text-[11px] font-sans text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-surface2 px-2 py-1 rounded-lg transition-colors"
            >
              <Trash2 size={12} />
              <span>Clear Input</span>
            </button>
          )}

          {activeTab === "testcases" && (
            <button
              type="button"
              onClick={onRunTestCases}
              disabled={runningTestCases}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-lg text-[11px] font-sans font-semibold transition-colors disabled:opacity-50 shadow-paper-sm active:scale-95"
            >
              {runningTestCases ? (
                <>
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Running...</span>
                </>
              ) : (
                <>
                  <Play size={11} fill="currentColor" />
                  <span>Run All Cases</span>
                </>
              )}
            </button>
          )}

          {activeTab === "preview" && (
            <button
              type="button"
              onClick={() => setPreviewNonce((n) => n + 1)}
              className="flex items-center gap-1 text-[11px] font-sans text-gray-300 hover:text-gray-100 bg-surface2 px-2.5 py-1 rounded-lg border border-border"
            >
              <RefreshCw size={11} />
              <span>Reload Preview</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === "output" && (
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
          {running && (
            <div className="flex items-center gap-2.5 text-amber-700 dark:text-amber-400 py-3 font-medium">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
              <span className="font-sans text-xs">Executing code in sandbox...</span>
            </div>
          )}

          {!running && !result && (
            <div className="text-gray-400 py-8 text-center font-sans space-y-1">
              <p className="text-sm font-semibold font-serif text-gray-300">Typewriter Ledger Ready</p>
              <p className="text-xs text-gray-400">
                Click <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Run</span> to execute your code. Standard output and errors will appear here.
              </p>
            </div>
          )}

          {!running && result && (
            <div className="space-y-3">
              {result.compileOutput && (
                <div>
                  <div className="text-amber-800 dark:text-amber-400 text-[11px] font-sans font-semibold mb-1 flex items-center gap-1">
                    <AlertCircle size={12} />
                    <span>COMPILER OUTPUT</span>
                  </div>
                  <pre className="text-amber-800 dark:text-amber-300 bg-amber-500/10 dark:bg-amber-950/20 border border-amber-500/25 p-2.5 rounded-lg whitespace-pre-wrap font-mono text-xs overflow-x-auto">
                    {result.compileOutput}
                  </pre>
                </div>
              )}

              {result.stdout && (
                <div>
                  <div className="text-emerald-800 dark:text-emerald-400 text-[11px] font-sans font-semibold mb-1 flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    <span>PROGRAM OUTPUT</span>
                  </div>
                  <pre className="text-gray-100 bg-surface2/70 border border-border/80 p-2.5 rounded-lg whitespace-pre-wrap font-mono text-xs overflow-x-auto selection:bg-accent/30 shadow-paper-sm">
                    {result.stdout}
                  </pre>
                </div>
              )}

              {result.stderr && (
                <div>
                  <div className="text-rose-800 dark:text-rose-400 text-[11px] font-sans font-semibold mb-1 flex items-center gap-1">
                    <AlertCircle size={12} />
                    <span>STANDARD ERROR</span>
                  </div>
                  <pre className="text-rose-800 dark:text-rose-300 bg-rose-500/10 dark:bg-rose-950/20 border border-rose-500/25 p-2.5 rounded-lg whitespace-pre-wrap font-mono text-xs overflow-x-auto">
                    {result.stderr}
                  </pre>
                </div>
              )}

              {!result.stdout && !result.stderr && !result.compileOutput && (
                <div className="text-gray-400 text-xs italic font-sans py-1">
                  Program executed successfully with no output.
                </div>
              )}

              <div className="flex flex-wrap items-center gap-4 text-[11px] font-sans text-gray-400 pt-2.5 border-t border-border">
                <span className="flex items-center gap-1.5">
                  <span className="text-gray-400">Status:</span>
                  <span
                    className={`font-semibold px-2 py-0.5 rounded-full text-[11px] ${
                      result.status === "Accepted"
                        ? "text-emerald-800 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30"
                        : result.status === "Compilation Error"
                        ? "text-amber-800 dark:text-amber-400 bg-amber-500/15 border border-amber-500/30"
                        : "text-rose-800 dark:text-rose-400 bg-rose-500/15 border border-rose-500/30"
                    }`}
                  >
                    {result.status}
                  </span>
                </span>

                {result.executionTime && (
                  <span className="flex items-center gap-1 text-gray-300 font-mono">
                    <Clock size={12} className="text-gray-400" />
                    <span>{result.executionTime}</span>
                  </span>
                )}

                {result.memory && (
                  <span className="flex items-center gap-1 text-gray-300 font-mono">
                    <Cpu size={12} className="text-gray-400" />
                    <span>{result.memory}</span>
                  </span>
                )}

                {result.engine && (
                  <span className="flex items-center gap-1 text-gray-400">
                    <span className="text-gray-400">Engine:</span>
                    <span className="text-gray-300 font-medium font-mono">{result.engine}</span>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "stdin" && (
        <div className="flex-1 flex flex-col p-3.5 overflow-hidden">
          <div className="flex items-center justify-between pb-2 text-gray-400 font-sans text-[11px]">
            <span className="flex items-center gap-1 text-gray-300">
              <FileText size={12} />
              <span>Standard Input lines passed to your program</span>
            </span>
            <span className="font-mono text-gray-400">{stdin.length} chars</span>
          </div>

          <textarea
            value={stdin}
            onChange={(e) => setStdin?.(e.target.value)}
            placeholder={"Enter input values here...\nFor example:\n5\n10 20 30 40 50"}
            rows={5}
            className="flex-1 w-full bg-surface2 border border-border rounded-lg p-3 text-xs text-gray-100 font-mono resize-none focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent placeholder:text-gray-500 shadow-paper-sm"
            aria-label="Standard input text"
          />
        </div>
      )}

      {activeTab === "testcases" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border bg-surface/40 overflow-x-auto no-scrollbar shrink-0">
            {testCases.map((tc, idx) => {
              const isSelected = idx === selectedCaseIdx;
              return (
                <button
                  key={tc.id || idx}
                  type="button"
                  onClick={() => setSelectedCaseIdx(idx)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-sans transition-colors shrink-0 ${
                    isSelected
                      ? "bg-surface2 text-accent font-semibold border border-border shadow-paper-sm"
                      : "text-gray-400 hover:text-gray-100 hover:bg-surface2/60"
                  }`}
                >
                  <span>Case {idx + 1}</span>
                  {tc.status === "passed" && (
                    <CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400" />
                  )}
                  {tc.status === "failed" && (
                    <XCircle size={12} className="text-rose-600 dark:text-rose-400" />
                  )}
                </button>
              );
            })}

            <button
              type="button"
              onClick={handleAddCase}
              title="Add another test case"
              className="flex items-center gap-1 text-gray-400 hover:text-gray-100 px-2 py-1 rounded-lg text-xs transition-colors shrink-0 hover:bg-surface2"
            >
              <Plus size={13} />
              <span className="font-sans text-[11px]">Add Case</span>
            </button>
          </div>

          {currentCase && (
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3 font-sans">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-200 text-xs font-mono">
                    Case {selectedCaseIdx + 1}
                  </span>
                  {currentCase.status === "passed" && (
                    <span className="text-emerald-800 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 text-[11px] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1">
                      <CheckCircle2 size={11} />
                      Passed
                    </span>
                  )}
                  {currentCase.status === "failed" && (
                    <span className="text-rose-800 dark:text-rose-400 bg-rose-500/15 border border-rose-500/30 text-[11px] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1">
                      <XCircle size={11} />
                      Failed
                    </span>
                  )}
                </div>

                {testCases.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveCase(selectedCaseIdx)}
                    className="text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 text-xs p-1 rounded hover:bg-surface2 transition-colors"
                    title="Delete this test case"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 mb-1 font-mono uppercase tracking-wider">
                    Input (stdin)
                  </label>
                  <textarea
                    value={currentCase.input}
                    onChange={(e) =>
                      handleUpdateCase(selectedCaseIdx, "input", e.target.value)
                    }
                    placeholder="Input values for this case"
                    rows={3}
                    className="w-full bg-surface2 border border-border rounded-lg p-2.5 text-xs text-gray-100 font-mono resize-none focus:outline-none focus:ring-1 focus:ring-accent shadow-paper-sm"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 mb-1 font-mono uppercase tracking-wider">
                    Expected Output
                  </label>
                  <textarea
                    value={currentCase.expected}
                    onChange={(e) =>
                      handleUpdateCase(selectedCaseIdx, "expected", e.target.value)
                    }
                    placeholder="Expected output to verify"
                    rows={3}
                    className="w-full bg-surface2 border border-border rounded-lg p-2.5 text-xs text-gray-100 font-mono resize-none focus:outline-none focus:ring-1 focus:ring-accent shadow-paper-sm"
                  />
                </div>
              </div>

              {currentCase.status !== "idle" && (
                <div className="pt-2.5 border-t border-border space-y-1.5 font-mono">
                  <div className="text-[11px] font-sans font-semibold text-gray-400 uppercase tracking-wider">
                    ACTUAL OUTPUT
                  </div>
                  <pre
                    className={`p-2.5 rounded-lg text-xs whitespace-pre-wrap border ${
                      currentCase.status === "passed"
                        ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-800 dark:text-emerald-300"
                        : "bg-rose-500/10 border-rose-500/25 text-rose-800 dark:text-rose-300"
                    }`}
                  >
                    {currentCase.actual || "(No output)"}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === "preview" && (
        <div className="flex-1 min-h-0 bg-white">
          <iframe
            key={previewNonce}
            title="Sandboxed Web Preview"
            sandbox="allow-scripts"
            srcDoc={previewSrcDoc}
            className="w-full h-full border-0"
          />
        </div>
      )}
    </div>
  );
}

export default memo(OutputConsole);
