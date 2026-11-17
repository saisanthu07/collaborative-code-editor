import "dotenv/config";
import mongoose from "mongoose";
import Room from "../src/models/Room.js";

async function migrate() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("[migrate-phase2] MONGO_URI is not set.");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("[migrate-phase2] Connected to MongoDB");

  // 1. Backfill settings.defaultRole where missing or null
  const defaultRoleResult = await Room.updateMany(
    {
      $or: [
        { "settings.defaultRole": { $exists: false } },
        { "settings.defaultRole": null },
      ],
    },
    { $set: { "settings.defaultRole": "EDITOR" } }
  );
  console.log(`[migrate-phase2] Updated defaultRole on ${defaultRoleResult.modifiedCount} rooms.`);

  // 2. Strip isGuest from members who have a valid userId
  const isGuestResult = await Room.updateMany(
    { "members.userId": { $exists: true, $ne: null }, "members.isGuest": true },
    { $set: { "members.$[elem].isGuest": false } },
    { arrayFilters: [{ "elem.userId": { $exists: true, $ne: null } }] }
  );
  console.log(`[migrate-phase2] Fixed isGuest flag on ${isGuestResult.modifiedCount} members.`);

  await mongoose.disconnect();
  console.log("[migrate-phase2] Migration completed successfully.");
}

migrate().catch((err) => {
  console.error("[migrate-phase2] Migration failed:", err);
  process.exit(1);
});
