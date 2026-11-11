import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    username: { type: String, required: true },
    avatar: { type: String, default: "" },
    text: { type: String, required: true },
    system: { type: Boolean, default: false },
  },
  { timestamps: true }
);

messageSchema.index({ roomId: 1, createdAt: 1 });

export default mongoose.model("Message", messageSchema);
