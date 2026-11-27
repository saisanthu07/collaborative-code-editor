import mongoose from "mongoose";

const moderationAppealSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    username: { type: String, required: true },
    email: { type: String, required: true },
    accountStatus: {
      type: String,
      enum: ["SUSPENDED", "BANNED"],
      required: true,
    },
    moderationReason: { type: String, default: "" },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
      index: true,
    },
    adminNote: { type: String, default: "" },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedByUsername: { type: String, default: "" },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

moderationAppealSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model("ModerationAppeal", moderationAppealSchema);
