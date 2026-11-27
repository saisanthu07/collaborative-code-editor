import mongoose from "mongoose";

const compilySnippetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      default: "Untitled Snippet",
      maxlength: 100,
    },
    language: {
      type: String,
      required: true,
      default: "javascript",
    },
    code: {
      type: String,
      default: "",
    },
    stdin: {
      type: String,
      default: "",
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    shareSlug: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
  },
  { timestamps: true }
);

compilySnippetSchema.index({ userId: 1, updatedAt: -1 });

export default mongoose.model("CompilySnippet", compilySnippetSchema);
