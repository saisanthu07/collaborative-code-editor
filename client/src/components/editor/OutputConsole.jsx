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
} from "lucide-react";

function OutputConsole({
  running,
  result,
  stdin = "",
  setStdin,
  onClearOutput,
}) {
  const [activeTab, setActiveTab] = useState("output"); // "output" | "stdin"

  return (
    <div
      className="h-full flex flex-col font-mono text-xs bg-[#0b0e14] text-gray-200 select-text overflow-hidden"
      role="region"
      aria-label="Code execution output and input panel"
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
            <span>Standard Input (stdin)</span>
            {stdin.trim().length > 0 && (
              <span className="text-[10px] bg-accent/20 text-accent font-semibold px-1.5 py-0.2 rounded-full">
                Active
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
    </div>
  );
}

export default memo(OutputConsole);
