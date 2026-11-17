import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { resolveRole, canEdit, canChat } from "../src/services/roomService.js";

describe("Task 2.3 — Role Model Truth Table", () => {
  const roomHostId = "507f1f77bcf86cd799439011";
  const memberUserId = "507f1f77bcf86cd799439022";
  const nonMemberUserId = "507f1f77bcf86cd799439033";

  const baseRoom = {
    roomId: "abcdef1234",
    ownerId: roomHostId,
    settings: {
      defaultRole: "EDITOR",
      allowGuestEdit: false,
      chatMuted: false,
    },
    members: [
      { userId: roomHostId, username: "hostUser", role: "HOST" },
      { userId: memberUserId, username: "viewerUser", role: "VIEWER" },
      { guestId: "guest123", username: "Guest-1234", role: "GUEST" },
    ],
  };

  test("resolveRole resolves owner to HOST", () => {
    const role = resolveRole(baseRoom, { userId: roomHostId });
    assert.equal(role, "HOST");
  });

  test("resolveRole resolves existing member to stored role", () => {
    const role = resolveRole(baseRoom, { userId: memberUserId });
    assert.equal(role, "VIEWER");
  });

  test("resolveRole resolves authenticated non-member to settings.defaultRole", () => {
    const roleEditor = resolveRole(baseRoom, { userId: nonMemberUserId });
    assert.equal(roleEditor, "EDITOR");

    const roomWithViewerDefault = {
      ...baseRoom,
      settings: { ...baseRoom.settings, defaultRole: "VIEWER" },
    };
    const roleViewer = resolveRole(roomWithViewerDefault, { userId: nonMemberUserId });
    assert.equal(roleViewer, "VIEWER");
  });

  test("resolveRole resolves guest identity to GUEST", () => {
    const role = resolveRole(baseRoom, { guestId: "guest123" });
    assert.equal(role, "GUEST");

    const roleNewGuest = resolveRole(baseRoom, { guestId: "guest999" });
    assert.equal(roleNewGuest, "GUEST");
  });

  test("canEdit truth table across roles and allowGuestEdit", () => {
    const roomGuestNoEdit = { settings: { allowGuestEdit: false } };
    const roomGuestCanEdit = { settings: { allowGuestEdit: true } };

    // HOST can always edit
    assert.equal(canEdit("HOST", roomGuestNoEdit), true);
    assert.equal(canEdit("HOST", roomGuestCanEdit), true);

    // EDITOR can always edit
    assert.equal(canEdit("EDITOR", roomGuestNoEdit), true);
    assert.equal(canEdit("EDITOR", roomGuestCanEdit), true);

    // VIEWER can never edit
    assert.equal(canEdit("VIEWER", roomGuestNoEdit), false);
    assert.equal(canEdit("VIEWER", roomGuestCanEdit), false);

    // GUEST can only edit when allowGuestEdit is true
    assert.equal(canEdit("GUEST", roomGuestNoEdit), false);
    assert.equal(canEdit("GUEST", roomGuestCanEdit), true);
  });

  test("canChat truth table across roles and chatMuted", () => {
    const roomUnmuted = { settings: { chatMuted: false } };
    const roomMuted = { settings: { chatMuted: true } };

    // When unmuted, all roles can chat
    assert.equal(canChat("HOST", roomUnmuted), true);
    assert.equal(canChat("EDITOR", roomUnmuted), true);
    assert.equal(canChat("VIEWER", roomUnmuted), true);
    assert.equal(canChat("GUEST", roomUnmuted), true);

    // When muted, ONLY HOST can chat
    assert.equal(canChat("HOST", roomMuted), true);
    assert.equal(canChat("EDITOR", roomMuted), false);
    assert.equal(canChat("VIEWER", roomMuted), false);
    assert.equal(canChat("GUEST", roomMuted), false);
  });
});
