export default function OutputConsole({ running, result }) {
  return (
    <div className="h-full overflow-y-auto p-3 font-mono text-sm bg-black/30">
      {running && <div className="text-yellow-400">Running...</div>}
      {!running && !result && <div className="text-gray-600">Output will appear here after you run your code.</div>}
      {!running && result && (
        <div className="space-y-2">
          {result.compileOutput && (
            <div>
              <div className="text-gray-500 text-xs mb-1">COMPILE OUTPUT</div>
              <pre className="text-yellow-400 whitespace-pre-wrap">{result.compileOutput}</pre>
            </div>
          )}
          {result.stdout && (
            <div>
              <div className="text-gray-500 text-xs mb-1">OUTPUT</div>
              <pre className="text-gray-100 whitespace-pre-wrap">{result.stdout}</pre>
            </div>
          )}
          {result.stderr && (
            <div>
              <div className="text-gray-500 text-xs mb-1">ERROR</div>
              <pre className="text-red-400 whitespace-pre-wrap">{result.stderr}</pre>
            </div>
          )}
          <div className="flex gap-4 text-xs text-gray-500 pt-1 border-t border-border">
            <span>Status: {result.status}</span>
            {result.executionTime && <span>Time: {result.executionTime}</span>}
            {result.memory && <span>Memory: {result.memory}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
