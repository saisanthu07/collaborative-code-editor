import mongoose from "mongoose";
import { customAlphabet } from "../utils/nanoid.js";

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 10);

const memberSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    username: { type: String, required: true },
    role: {
      type: String,
      enum: ["HOST", "EDITOR", "VIEWER", "GUEST"],
      default: "EDITOR",
    },
    isGuest: { type: Boolean, default: false },
    joinedAt: { type: Date, default: Date.now },
    lastActiveAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const fileSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    content: { type: String, default: "" },
    language: { type: String, default: "javascript" },
  },
  { _id: false }
);

const roomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    roomId: { type: String, required: true, unique: true, index: true, default: () => nanoid() },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    visibility: { type: String, enum: ["PUBLIC", "PRIVATE"], default: "PRIVATE" },
    language: { type: String, default: "javascript" },
    files: { type: [fileSchema], default: () => [{ name: "index.js", content: "", language: "javascript" }] },
    members: { type: [memberSchema], default: [] },
    settings: {
      allowGuestEdit: { type: Boolean, default: false },
      locked: { type: Boolean, default: false },
      chatMuted: { type: Boolean, default: false },
    },
    starredBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    lastActiveAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

roomSchema.index({ ownerId: 1, createdAt: -1 });

export default mongoose.model("Room", roomSchema);
