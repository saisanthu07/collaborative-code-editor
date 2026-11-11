import mongoose from "mongoose";

const executionSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    language: { type: String, required: true },
    sourceCode: { type: String, required: true },
    stdin: { type: String, default: "" },
    status: { type: String, default: "PENDING" },
    stdout: { type: String, default: "" },
    stderr: { type: String, default: "" },
    compileOutput: { type: String, default: "" },
    executionTime: { type: String, default: "" },
    memory: { type: String, default: "" },
  },
  { timestamps: true }
);

// Retention: keep the collection bounded rather than storing unlimited
// source-code history. A TTL index auto-expires old execution records.
executionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

export default mongoose.model("Execution", executionSchema);
