import { Code2 } from "lucide-react";

export default function PageLoading({ message = "Loading..." }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="min-h-dvh bg-bg text-gray-100 flex flex-col items-center justify-center p-6"
    >
      <div className="flex flex-col items-center gap-4 bg-surface border border-border p-8 rounded-2xl shadow-paper-md max-w-xs w-full text-center">
        <div className="relative flex items-center justify-center">
          <div className="w-14 h-14 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
          <Code2 className="text-accent absolute" size={22} />
        </div>
        <p className="text-sm text-gray-400 font-medium animate-pulse">{message}</p>
      </div>
    </div>
  );
}
