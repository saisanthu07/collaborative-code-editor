import { memo } from "react";
import { Terminal, CheckCircle2, AlertCircle, Clock, Cpu } from "lucide-react";

function OutputConsole({ running, result }) {
  return (
    <div
      className="h-full overflow-y-auto p-3 font-mono text-xs bg-[#0b0e14] text-gray-200 select-text"
      role="region"
      aria-label="Code execution output"
    >
      <div className="flex items-center gap-2 text-gray-500 font-sans text-xs pb-2 border-b border-border/50 mb-2">
        <Terminal size={14} aria-hidden="true" />
        <span className="font-semibold uppercase tracking-wider">Console Output</span>
      </div>

      {running && (
        <div className="flex items-center gap-2 text-amber-400 animate-pulse py-2">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span>Executing code in sandbox...</span>
        </div>
      )}

      {!running && !result && (
        <div className="text-gray-600 py-4 text-center">
          Run your code to see the output, compiler logs, and execution stats here.
        </div>
      )}

      {!running && result && (
        <div className="space-y-3">
          {result.compileOutput && (
            <div>
              <div className="text-amber-400/80 text-[11px] font-sans font-semibold mb-1 flex items-center gap-1">
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
              <div className="text-emerald-400/80 text-[11px] font-sans font-semibold mb-1 flex items-center gap-1">
                <CheckCircle2 size={12} />
                <span>PROGRAM OUTPUT</span>
              </div>
              <pre className="text-gray-100 bg-surface2/50 border border-border/50 p-2.5 rounded-md whitespace-pre-wrap font-mono text-xs overflow-x-auto">
                {result.stdout}
              </pre>
            </div>
          )}

          {result.stderr && (
            <div>
              <div className="text-rose-400/80 text-[11px] font-sans font-semibold mb-1 flex items-center gap-1">
                <AlertCircle size={12} />
                <span>STANDARD ERROR</span>
              </div>
              <pre className="text-rose-300 bg-rose-950/20 border border-rose-900/30 p-2.5 rounded-md whitespace-pre-wrap font-mono text-xs overflow-x-auto">
                {result.stderr}
              </pre>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4 text-[11px] font-sans text-gray-400 pt-2 border-t border-border/50">
            <span className="flex items-center gap-1">
              <span className="font-medium text-gray-300">Status:</span>
              <span
                className={`font-semibold ${
                  result.status === "Accepted"
                    ? "text-emerald-400"
                    : result.status === "Compilation Error"
                    ? "text-amber-400"
                    : "text-rose-400"
                }`}
              >
                {result.status}
              </span>
            </span>

            {result.executionTime && (
              <span className="flex items-center gap-1">
                <Clock size={12} className="text-gray-500" />
                <span>{result.executionTime}</span>
              </span>
            )}

            {result.memory && (
              <span className="flex items-center gap-1">
                <Cpu size={12} className="text-gray-500" />
                <span>{result.memory}</span>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(OutputConsole);
