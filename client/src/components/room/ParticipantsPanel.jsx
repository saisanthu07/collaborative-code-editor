import { memo } from "react";
import { Users, ShieldBan } from "lucide-react";
import { colorForUser } from "../../utils/color.js";

function ParticipantsPanel({
  participants = [],
  members = [],
  isHost = false,
  currentUsername = "",
  onChangeRole,
  onKickMember,
}) {
  const memberRoleMap = new Map(members.map((m) => [m.username, m.role]));

  return (
    <div className="p-3.5 space-y-3 overflow-y-auto h-full bg-surface shadow-paper-sm">
      <div className="flex items-center gap-1.5 pb-2 border-b border-border text-gray-400">
        <Users size={14} className="text-accent" />
        <h3
          id="participants-heading"
          className="text-xs uppercase tracking-wider font-semibold font-mono"
        >
          Active Scribes ({participants.length})
        </h3>
      </div>

      <div role="list" aria-labelledby="participants-heading" className="space-y-1.5">
        {participants.length === 0 && (
          <div className="text-xs text-gray-400 py-4 text-center italic font-sans">
            No active scribes
          </div>
        )}
        {participants.map((p, i) => {
          const role = p.role || memberRoleMap.get(p.username) || (p.guestId ? "GUEST" : "EDITOR");
          const canManageThisUser = isHost && p.username !== currentUsername && role !== "HOST";

          return (
            <div
              key={p.userId || p.guestId || p.username || i}
              role="listitem"
              className="flex flex-col gap-1.5 px-2.5 py-2 rounded-lg hover:bg-surface2 transition-colors text-xs border border-transparent hover:border-border/60"
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                  style={{ backgroundColor: colorForUser(p.username) }}
                  aria-hidden="true"
                />
                <span className="text-gray-200 font-medium truncate font-sans">{p.username}</span>
                {p.connections > 1 && (
                  <span
                    className="text-[10px] text-gray-400 bg-surface2 border border-border/80 px-1.5 rounded font-mono"
                    title={`${p.connections} open tabs`}
                  >
                    ×{p.connections}
                  </span>
                )}
                <span
                  className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    p.status === "ONLINE"
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                      : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                  }`}
                >
                  {p.status || "ONLINE"}
                </span>
              </div>

              <div className="flex items-center justify-between pl-4">
                <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400">
                  {role}
                </span>

                {canManageThisUser && (
                  <div className="flex items-center gap-1.5">
                    <select
                      aria-label={`Change role for ${p.username}`}
                      value={role}
                      onChange={(e) => onChangeRole?.(p.username, e.target.value)}
                      className="bg-surface border border-border rounded px-1.5 py-0.5 text-[10px] font-mono text-gray-200 focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                      <option value="EDITOR">EDITOR</option>
                      <option value="VIEWER">VIEWER</option>
                      {p.guestId && <option value="GUEST">GUEST</option>}
                    </select>
                    <button
                      type="button"
                      onClick={() => onKickMember?.(p.username)}
                      title={`Kick & ban ${p.username}`}
                      aria-label={`Kick ${p.username}`}
                      className="p-1 text-gray-400 hover:text-rose-500 rounded hover:bg-rose-500/10 transition-colors"
                    >
                      <ShieldBan size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default memo(ParticipantsPanel);
