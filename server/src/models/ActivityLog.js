import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    type: { type: String, required: true }, // e.g. AUTH_LOGIN, ROOM_CREATE, EXEC_REQUEST
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    roomId: { type: String },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

activityLogSchema.index({ createdAt: -1 });
// 90 days TTL index
activityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export default mongoose.model("ActivityLog", activityLogSchema);
