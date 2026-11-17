import { memo } from "react";
import { colorForUser } from "../../utils/color.js";

function ParticipantsPanel({ participants = [] }) {
  return (
    <div className="p-3 space-y-2 overflow-y-auto h-full bg-surface">
      <h3
        id="participants-heading"
        className="text-xs uppercase tracking-wider font-semibold text-gray-500 mb-3"
      >
        Active Participants ({participants.length})
      </h3>
      <div role="list" aria-labelledby="participants-heading" className="space-y-1.5">
        {participants.length === 0 && (
          <div className="text-xs text-gray-500 py-2">No active participants</div>
        )}
        {participants.map((p, i) => (
          <div
            key={p.userId || p.guestId || p.username || i}
            role="listitem"
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-surface2 transition-colors text-sm"
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
              style={{ backgroundColor: colorForUser(p.username) }}
              aria-hidden="true"
            />
            <span className="text-gray-200 font-medium truncate">{p.username}</span>
            {p.connections > 1 && (
              <span className="text-[10px] text-gray-500 bg-surface2 px-1 rounded" title={`${p.connections} open tabs`}>
                ×{p.connections}
              </span>
            )}
            <span
              className={`ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                p.status === "ONLINE"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
              }`}
            >
              {p.status || "ONLINE"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(ParticipantsPanel);
