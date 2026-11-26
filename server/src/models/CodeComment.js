import mongoose from "mongoose";

const codeCommentSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, index: true },
    fileName: { type: String, required: true },
    line: { type: Number, required: true, min: 1 },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
    username: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    resolved: { type: Boolean, default: false },
    resolvedBy: { type: String, default: null },
  },
  { timestamps: true }
);

codeCommentSchema.index({ roomId: 1, fileName: 1, line: 1, createdAt: 1 });

export default mongoose.model("CodeComment", codeCommentSchema);
