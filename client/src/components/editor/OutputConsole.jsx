import { useState, memo } from "react";
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
} from "lucide-react";

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
}) {
  const [activeTab, setActiveTab] = useState("output"); // "output" | "stdin" | "testcases"
  const [selectedCaseIdx, setSelectedCaseIdx] = useState(0);

  const passedCount = testCases.filter((tc) => tc.status === "passed").length;
  const failedCount = testCases.filter((tc) => tc.status === "failed").length;

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
      className="h-full flex flex-col font-mono text-xs bg-[#0b0e14] text-gray-200 select-text overflow-hidden"
      role="region"
      aria-label="Code execution output, input, and test cases panel"
    >
      {/* Tab Navigation Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/60 bg-surface/50 shrink-0">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("output")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-sans font-medium transition-colors ${
              activeTab === "output"
                ? "bg-surface2 text-accent border border-border/80 shadow-sm"
                : "text-gray-400 hover:text-gray-200 hover:bg-surface2/50"
            }`}
          >
            <Terminal size={13} aria-hidden="true" />
            <span>Output</span>
            {result && (
              <span
                className={`w-2 h-2 rounded-full ${
                  result.status === "Accepted"
                    ? "bg-emerald-400"
                    : result.status === "Compilation Error"
                    ? "bg-amber-400"
                    : "bg-rose-400"
                }`}
              />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("stdin")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-sans font-medium transition-colors relative ${
              activeTab === "stdin"
                ? "bg-surface2 text-accent border border-border/80 shadow-sm"
                : "text-gray-400 hover:text-gray-200 hover:bg-surface2/50"
            }`}
          >
            <CornerDownLeft size={13} aria-hidden="true" />
            <span>Input (stdin)</span>
            {stdin.trim().length > 0 && (
              <span className="text-[10px] bg-accent/20 text-accent font-semibold px-1.5 rounded-full">
                Active
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("testcases")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-sans font-medium transition-colors ${
              activeTab === "testcases"
                ? "bg-surface2 text-accent border border-border/80 shadow-sm"
                : "text-gray-400 hover:text-gray-200 hover:bg-surface2/50"
            }`}
          >
            <CheckSquare size={13} aria-hidden="true" />
            <span>Test Cases</span>
            {testCases.length > 0 && (
              <span
                className={`text-[10px] font-semibold px-1.5 rounded-full ${
                  failedCount > 0
                    ? "bg-rose-500/20 text-rose-400"
                    : passedCount === testCases.length && testCases.length > 0
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-surface2 text-gray-400"
                }`}
              >
                {passedCount}/{testCases.length}
              </span>
            )}
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {activeTab === "output" && result && (
            <button
              type="button"
              onClick={onClearOutput}
              title="Clear console output"
              className="flex items-center gap-1 text-[11px] font-sans text-gray-400 hover:text-gray-200 hover:bg-surface2 px-2 py-0.5 rounded transition-colors"
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
              className="flex items-center gap-1 text-[11px] font-sans text-gray-400 hover:text-rose-400 hover:bg-surface2 px-2 py-0.5 rounded transition-colors"
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
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded text-[11px] font-sans font-medium transition-colors disabled:opacity-50"
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
        </div>
      </div>

      {/* Tab 1: Execution Output */}
      {activeTab === "output" && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {running && (
            <div className="flex items-center gap-2 text-amber-400 animate-pulse py-3">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              <span className="font-sans text-xs font-medium">Executing code in sandbox...</span>
            </div>
          )}

          {!running && !result && (
            <div className="text-gray-500 py-6 text-center font-sans space-y-1">
              <p className="text-sm font-medium text-gray-400">Ready to execute</p>
              <p className="text-xs text-gray-500">
                Click <span className="text-emerald-400 font-semibold">Run</span> to compile and execute your code. Standard output and errors will appear here.
              </p>
            </div>
          )}

          {!running && result && (
            <div className="space-y-3">
              {result.compileOutput && (
                <div>
                  <div className="text-amber-400/90 text-[11px] font-sans font-semibold mb-1 flex items-center gap-1">
                    <AlertCircle size={12} />
                    <span>COMPILER OUTPUT</span>
                  </div>
                  <pre className="text-amber-300 bg-amber-950/20 border border-amber-900/30 p-2.5 rounded-md whitespace-pre-wrap font-mono text-xs overflow-x-auto">
                    {result.compileOutput}
                  </pre>
                </div>
              )}

              {result.stdout && (
                <div>
                  <div className="text-emerald-400/90 text-[11px] font-sans font-semibold mb-1 flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    <span>PROGRAM OUTPUT</span>
                  </div>
                  <pre className="text-gray-100 bg-surface2/60 border border-border/60 p-2.5 rounded-md whitespace-pre-wrap font-mono text-xs overflow-x-auto selection:bg-accent/40">
                    {result.stdout}
                  </pre>
                </div>
              )}

              {result.stderr && (
                <div>
                  <div className="text-rose-400/90 text-[11px] font-sans font-semibold mb-1 flex items-center gap-1">
                    <AlertCircle size={12} />
                    <span>STANDARD ERROR</span>
                  </div>
                  <pre className="text-rose-300 bg-rose-950/20 border border-rose-900/30 p-2.5 rounded-md whitespace-pre-wrap font-mono text-xs overflow-x-auto">
                    {result.stderr}
                  </pre>
                </div>
              )}

              {!result.stdout && !result.stderr && !result.compileOutput && (
                <div className="text-gray-400 text-xs italic font-sans py-1">
                  Program executed successfully with no output.
                </div>
              )}

              {/* Execution Metadata Pill Bar */}
              <div className="flex flex-wrap items-center gap-4 text-[11px] font-sans text-gray-400 pt-2 border-t border-border/40">
                <span className="flex items-center gap-1.5">
                  <span className="text-gray-400">Status:</span>
                  <span
                    className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                      result.status === "Accepted"
                        ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                        : result.status === "Compilation Error"
                        ? "text-amber-400 bg-amber-500/10 border border-amber-500/20"
                        : "text-rose-400 bg-rose-500/10 border border-rose-500/20"
                    }`}
                  >
                    {result.status}
                  </span>
                </span>

                {result.executionTime && (
                  <span className="flex items-center gap-1 text-gray-300">
                    <Clock size={12} className="text-gray-400" />
                    <span>{result.executionTime}</span>
                  </span>
                )}

                {result.memory && (
                  <span className="flex items-center gap-1 text-gray-300">
                    <Cpu size={12} className="text-gray-400" />
                    <span>{result.memory}</span>
                  </span>
                )}

                {result.engine && (
                  <span className="flex items-center gap-1 text-gray-400">
                    <span className="text-gray-500">Engine:</span>
                    <span className="text-gray-300 font-medium">{result.engine}</span>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Standard Input (stdin) */}
      {activeTab === "stdin" && (
        <div className="flex-1 flex flex-col p-3 overflow-hidden">
          <div className="flex items-center justify-between pb-2 text-gray-400 font-sans text-[11px]">
            <span className="flex items-center gap-1 text-gray-300">
              <FileText size={12} />
              <span>Standard Input lines passed to your program (e.g. input(), cin, Scanner)</span>
            </span>
            <span>{stdin.length} chars</span>
          </div>

          <textarea
            value={stdin}
            onChange={(e) => setStdin?.(e.target.value)}
            placeholder={"Enter input values here...\nFor example:\n5\n10 20 30 40 50"}
            rows={5}
            className="flex-1 w-full bg-[#070a0e] border border-border/70 rounded-md p-2.5 text-xs text-gray-100 font-mono resize-none focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent placeholder:text-gray-600"
            aria-label="Standard input text"
          />
        </div>
      )}

      {/* Tab 3: Test Cases (Interview Mode) */}
      {activeTab === "testcases" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Test Case Selector Tabs */}
          <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border/40 bg-surface/30 overflow-x-auto no-scrollbar shrink-0">
            {testCases.map((tc, idx) => {
              const isSelected = idx === selectedCaseIdx;
              return (
                <button
                  key={tc.id || idx}
                  type="button"
                  onClick={() => setSelectedCaseIdx(idx)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-sans transition-colors shrink-0 ${
                    isSelected
                      ? "bg-surface2 text-accent font-semibold border border-border"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  <span>Case {idx + 1}</span>
                  {tc.status === "passed" && (
                    <CheckCircle2 size={12} className="text-emerald-400" />
                  )}
                  {tc.status === "failed" && (
                    <XCircle size={12} className="text-rose-400" />
                  )}
                </button>
              );
            })}

            <button
              type="button"
              onClick={handleAddCase}
              title="Add another test case"
              className="flex items-center gap-1 text-gray-400 hover:text-white px-2 py-1 rounded text-xs transition-colors shrink-0"
            >
              <Plus size={13} />
              <span className="font-sans text-[11px]">Add Case</span>
            </button>
          </div>

          {/* Active Case Editor & Results */}
          {currentCase && (
            <div className="flex-1 overflow-y-auto p-3 space-y-3 font-sans">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-200 text-xs">
                    Case {selectedCaseIdx + 1}
                  </span>
                  {currentCase.status === "passed" && (
                    <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 text-[11px] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1">
                      <CheckCircle2 size={11} />
                      Passed
                    </span>
                  )}
                  {currentCase.status === "failed" && (
                    <span className="text-rose-400 bg-rose-500/10 border border-rose-500/30 text-[11px] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1">
                      <XCircle size={11} />
                      Failed
                    </span>
                  )}
                </div>

                {testCases.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveCase(selectedCaseIdx)}
                    className="text-gray-400 hover:text-rose-400 text-xs p-1"
                    title="Delete this test case"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-gray-400 mb-1">
                    Input (stdin)
                  </label>
                  <textarea
                    value={currentCase.input}
                    onChange={(e) =>
                      handleUpdateCase(selectedCaseIdx, "input", e.target.value)
                    }
                    placeholder="Input values for this case"
                    rows={3}
                    className="w-full bg-[#070a0e] border border-border/70 rounded-md p-2 text-xs text-gray-100 font-mono resize-none focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-400 mb-1">
                    Expected Output
                  </label>
                  <textarea
                    value={currentCase.expected}
                    onChange={(e) =>
                      handleUpdateCase(selectedCaseIdx, "expected", e.target.value)
                    }
                    placeholder="Expected output to verify"
                    rows={3}
                    className="w-full bg-[#070a0e] border border-border/70 rounded-md p-2 text-xs text-gray-100 font-mono resize-none focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>

              {/* Actual Output vs Expected diff when run */}
              {currentCase.status !== "idle" && (
                <div className="pt-2 border-t border-border/40 space-y-1.5 font-mono">
                  <div className="text-[11px] font-sans font-semibold text-gray-400">
                    ACTUAL OUTPUT
                  </div>
                  <pre
                    className={`p-2 rounded-md text-xs whitespace-pre-wrap border ${
                      currentCase.status === "passed"
                        ? "bg-emerald-950/20 border-emerald-900/30 text-emerald-300"
                        : "bg-rose-950/20 border-rose-900/30 text-rose-300"
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
    </div>
  );
}

export default memo(OutputConsole);
