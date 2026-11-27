import { colorForUser } from "./color.js";

export const AVATAR_GLYPHS = [
  { id: "identicon", label: "Cipher Grid" },
  { id: "initial", label: "Monogram" },
  { id: "brackets", label: "Code Tag" },
  { id: "lambda", label: "Lambda" },
  { id: "terminal", label: "Shell" },
  { id: "braces", label: "Braces" },
  { id: "quill", label: "Quill Nib" },
  { id: "spark", label: "Compass" },
];

export const AVATAR_PALETTES = [
  { id: "auto", label: "Handle Ink", color: null },
  { id: "terracotta", label: "Terracotta", color: "#C2542D" },
  { id: "sage", label: "Olive Sage", color: "#3C6E47" },
  { id: "indigo", label: "Blueprint", color: "#2C6496" },
  { id: "ochre", label: "Amber Ochre", color: "#B8741A" },
  { id: "mulberry", label: "Mulberry", color: "#7E4887" },
  { id: "teal", label: "Patina Teal", color: "#2F7E75" },
  { id: "violet", label: "Royal Violet", color: "#5B508C" },
];

export const AVATAR_FRAMES = [
  { id: "folio", label: "Folio" },
  { id: "wax", label: "Wax Seal" },
  { id: "badge", label: "Notched" },
  { id: "ruled", label: "Ledger" },
];

const GLYPH_IDS = new Set(AVATAR_GLYPHS.map((g) => g.id));
const PALETTE_IDS = new Set(AVATAR_PALETTES.map((p) => p.id));
const FRAME_IDS = new Set(AVATAR_FRAMES.map((f) => f.id));

export const DEFAULT_AVATAR_STAMP = {
  glyph: "identicon",
  palette: "auto",
  frame: "folio",
};

export function parseAvatarStamp(avatarValue = "", username = "") {
  if (typeof avatarValue === "string" && avatarValue.startsWith("stamp:")) {
    const [, glyph, palette, frame] = avatarValue.split(":");
    return {
      glyph: GLYPH_IDS.has(glyph) ? glyph : DEFAULT_AVATAR_STAMP.glyph,
      palette: PALETTE_IDS.has(palette) ? palette : DEFAULT_AVATAR_STAMP.palette,
      frame: FRAME_IDS.has(frame) ? frame : DEFAULT_AVATAR_STAMP.frame,
    };
  }
  // Deterministic fallback for empty values or legacy URLs
  return {
    ...DEFAULT_AVATAR_STAMP,
    glyph: username ? "identicon" : "initial",
  };
}

export function encodeAvatarStamp({ glyph, palette, frame } = {}) {
  const safeGlyph = GLYPH_IDS.has(glyph) ? glyph : DEFAULT_AVATAR_STAMP.glyph;
  const safePalette = PALETTE_IDS.has(palette) ? palette : DEFAULT_AVATAR_STAMP.palette;
  const safeFrame = FRAME_IDS.has(frame) ? frame : DEFAULT_AVATAR_STAMP.frame;
  return `stamp:${safeGlyph}:${safePalette}:${safeFrame}`;
}

export function resolveStampColor(paletteId, username = "User") {
  if (!paletteId || paletteId === "auto") {
    return colorForUser(username || "User");
  }
  return AVATAR_PALETTES.find((p) => p.id === paletteId)?.color || colorForUser(username || "User");
}

export function randomizeAvatarStamp(current = {}) {
  const pickDifferent = (list, currentId) => {
    const pool = list.filter((item) => item.id !== currentId);
    const source = pool.length > 0 ? pool : list;
    return source[Math.floor(Math.random() * source.length)].id;
  };
  return {
    glyph: pickDifferent(AVATAR_GLYPHS, current.glyph),
    palette: pickDifferent(
      AVATAR_PALETTES.filter((p) => p.id !== "auto"),
      current.palette
    ),
    frame: pickDifferent(AVATAR_FRAMES, current.frame),
  };
}

/**
 * Generates a deterministic 5x5 horizontally mirrored pixel grid from a username seed.
 * Guarantees at least 7 filled cells so every user gets a balanced, recognizable cipher.
 */
export function computeIdenticonCells(seed = "User") {
  const input = seed || "User";
  let h1 = 2166136261;
  let h2 = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 16777619);
    h2 = Math.imul(h2 ^ (c + i), 2246822507);
  }

  const grid = [];
  let filledCount = 0;
  let bit = 0;

  for (let row = 0; row < 5; row++) {
    const rowCells = [false, false, false, false, false];
    for (let col = 0; col < 3; col++) {
      const source = bit < 10 ? h1 >>> (bit * 3) : h2 >>> ((bit - 10) * 5);
      const on = (source & 1) === 1;
      rowCells[col] = on;
      rowCells[4 - col] = on;
      if (on) filledCount += col === 2 ? 1 : 2;
      bit++;
    }
    grid.push(rowCells);
  }

  if (filledCount < 7) {
    grid[1][1] = true;
    grid[1][3] = true;
    grid[2][2] = true;
    grid[3][1] = true;
    grid[3][3] = true;
  }

  return grid;
}
