import mongoose from "mongoose";

const docRevisionSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, index: true },
    fileName: { type: String, required: true },
    content: { type: String, default: "" },
    label: { type: String, trim: true, maxlength: 100, default: "Checkpoint" },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

docRevisionSchema.index({ roomId: 1, fileName: 1, createdAt: -1 });
docRevisionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 60 });

export default mongoose.model("DocRevision", docRevisionSchema);
