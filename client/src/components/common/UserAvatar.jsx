import { useMemo } from "react";
import {
  parseAvatarStamp,
  resolveStampColor,
  computeIdenticonCells,
} from "../../utils/avatar.js";

const SIZE_CLASSES = {
  xxs: "w-4 h-4 text-[8px]",
  xs: "w-5 h-5 text-[10px]",
  sm: "w-7 h-7 text-xs",
  md: "w-9 h-9 text-sm",
  lg: "w-14 h-14 text-xl",
  xl: "w-16 h-16 text-2xl",
};

const FRAME_RADIUS = {
  folio: { xxs: "rounded", xs: "rounded-md", sm: "rounded-lg", md: "rounded-xl", lg: "rounded-2xl", xl: "rounded-2xl" },
  wax: { xxs: "rounded-full", xs: "rounded-full", sm: "rounded-full", md: "rounded-full", lg: "rounded-full", xl: "rounded-full" },
  badge: { xxs: "rounded-md", xs: "rounded-lg", sm: "rounded-xl", md: "rounded-xl", lg: "rounded-2xl", xl: "rounded-2xl" },
  ruled: { xxs: "rounded", xs: "rounded-md", sm: "rounded-lg", md: "rounded-xl", lg: "rounded-2xl", xl: "rounded-2xl" },
};

function renderGlyph({ glyph, username, identiconGrid }) {
  const initials = (username || "U").trim().slice(0, 2).toUpperCase();

  switch (glyph) {
    case "initial":
      return (
        <span className="font-serif font-bold tracking-tight leading-none select-none">
          {initials.slice(0, 1)}
        </span>
      );

    case "brackets":
      return (
        <svg viewBox="0 0 24 24" className="w-[62%] h-[62%]" fill="none" aria-hidden="true">
          <path
            d="M8 7L3.5 12L8 17M16 7L20.5 12L16 17M13.5 5.5L10.5 18.5"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case "lambda":
      return (
        <svg viewBox="0 0 24 24" className="w-[58%] h-[58%]" fill="none" aria-hidden="true">
          <path
            d="M7 5.5H10.2L17 18.5M12.1 11.4L7.2 18.5"
            stroke="currentColor"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case "terminal":
      return (
        <svg viewBox="0 0 24 24" className="w-[60%] h-[60%]" fill="none" aria-hidden="true">
          <path
            d="M5 7.5L10.5 12L5 16.5M12.5 16.5H19"
            stroke="currentColor"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case "braces":
      return (
        <svg viewBox="0 0 24 24" className="w-[60%] h-[60%]" fill="none" aria-hidden="true">
          <path
            d="M9 5.5C7.4 5.5 7 6.5 7 8V10.2C7 11.2 6.2 11.8 5.2 12C6.2 12.2 7 12.8 7 13.8V16C7 17.5 7.4 18.5 9 18.5M15 5.5C16.6 5.5 17 6.5 17 8V10.2C17 11.2 17.8 11.8 18.8 12C17.8 12.2 17 12.8 17 13.8V16C17 17.5 16.6 18.5 15 18.5"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case "quill":
      return (
        <svg viewBox="0 0 24 24" className="w-[60%] h-[60%]" fill="none" aria-hidden="true">
          <path
            d="M19 4.5C13 5 8.2 9.2 6.8 15.2L5.5 18.8L9.2 17.5C15.2 16.1 19.3 11 19 4.5Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M5.5 18.8L12.5 11.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case "spark":
      return (
        <svg viewBox="0 0 24 24" className="w-[62%] h-[62%]" fill="currentColor" aria-hidden="true">
          <path d="M12 3.2L14.3 9.7L20.8 12L14.3 14.3L12 20.8L9.7 14.3L3.2 12L9.7 9.7L12 3.2Z" />
        </svg>
      );

    case "identicon":
    default:
      return (
        <svg viewBox="0 0 25 25" className="w-[64%] h-[64%]" aria-hidden="true">
          {identiconGrid.map((row, rIdx) =>
            row.map((on, cIdx) =>
              on ? (
                <rect
                  key={`${rIdx}-${cIdx}`}
                  x={cIdx * 5 + 0.5}
                  y={rIdx * 5 + 0.5}
                  width="4"
                  height="4"
                  rx="0.9"
                  fill="currentColor"
                />
              ) : null
            )
          )}
        </svg>
      );
  }
}

export default function UserAvatar({
  username = "User",
  avatar = "",
  stamp = null,
  size = "md",
  className = "",
}) {
  const parsed = useMemo(
    () => (stamp ? stamp : parseAvatarStamp(avatar, username)),
    [stamp, avatar, username]
  );

  const bgColor = useMemo(
    () => resolveStampColor(parsed.palette, username),
    [parsed.palette, username]
  );

  const identiconGrid = useMemo(
    () => computeIdenticonCells(username || "User"),
    [username]
  );

  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;
  const radiusClass =
    (FRAME_RADIUS[parsed.frame] && FRAME_RADIUS[parsed.frame][size]) || "rounded-xl";
  const isCompact = size === "xxs" || size === "xs";

  return (
    <div
      role="img"
      aria-label={`${username || "Developer"} stamp avatar`}
      style={{ backgroundColor: bgColor }}
      className={`relative inline-flex items-center justify-center shrink-0 text-[#FAF7F0] shadow-paper-sm overflow-hidden select-none ${sizeClass} ${radiusClass} ${className}`}
    >
      {/* Frame overlay texture */}
      {parsed.frame === "wax" && !isCompact && (
        <span
          aria-hidden="true"
          className="absolute inset-[3px] rounded-full border border-dashed border-white/35 pointer-events-none"
        />
      )}

      {parsed.frame === "folio" && !isCompact && (
        <>
          <span
            aria-hidden="true"
            className="absolute inset-[2px] rounded-[inherit] border border-white/25 pointer-events-none"
          />
          <span
            aria-hidden="true"
            className="absolute top-0 right-0 w-2.5 h-2.5 bg-black/15 pointer-events-none"
            style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%)" }}
          />
        </>
      )}

      {parsed.frame === "badge" && !isCompact && (
        <>
          <span
            aria-hidden="true"
            className="absolute inset-[3px] rounded-[inherit] border border-white/30 pointer-events-none"
          />
          <span
            aria-hidden="true"
            className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full bg-white/75 pointer-events-none"
          />
        </>
      )}

      {parsed.frame === "ruled" && !isCompact && (
        <span
          aria-hidden="true"
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.4) 1px, transparent 1px)",
            backgroundSize: "6px 6px",
          }}
        />
      )}

      <span className="relative z-10 flex items-center justify-center w-full h-full">
        {renderGlyph({ glyph: parsed.glyph, username, identiconGrid })}
      </span>
    </div>
  );
}
