// Archival fountain ink and sealing wax palette for collaborative cursors and tags
const PALETTE = [
  "#C2542D", // Terracotta Wax
  "#3C6E47", // Olive Forest Sage
  "#2C6496", // Blueprint Indigo
  "#B8741A", // Amber Ochre
  "#7E4887", // Mulberry Plum
  "#A84522", // Burnt Sienna
  "#2F7E75", // Patina Teal
  "#5B508C", // Royal Violet
];

export function colorForUser(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}
