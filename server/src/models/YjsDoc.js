import mongoose from "mongoose";

const yjsDocSchema = new mongoose.Schema(
  {
    docName: { type: String, required: true, unique: true, index: true },
    roomId: { type: String, required: true, index: true },
    fileName: { type: String, required: true },
    state: { type: Buffer, required: true },
  },
  { timestamps: true }
);

yjsDocSchema.index({ roomId: 1, fileName: 1 });

export default mongoose.model("YjsDoc", yjsDocSchema);
