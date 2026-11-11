import { colorForUser } from "../../utils/color.js";

export default function ParticipantsPanel({ participants }) {
  return (
    <div className="p-3 space-y-2 overflow-y-auto h-full">
      <h3 className="text-xs uppercase tracking-wide text-gray-500 mb-2">
        Participants ({participants.length})
      </h3>
      {participants.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: colorForUser(p.username) }}
          />
          <span className="text-gray-200">{p.username}</span>
          <span
            className={`ml-auto text-[10px] px-1.5 py-0.5 rounded ${
              p.status === "ONLINE" ? "text-accent2" : "text-gray-500"
            }`}
          >
            {p.status || "ONLINE"}
          </span>
        </div>
      ))}
    </div>
  );
}
