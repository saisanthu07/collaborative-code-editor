import { test, describe, mock } from "node:test";
import assert from "node:assert/strict";
import axios from "axios";
import {
  createRoomSchema,
  createCommentSchema,
  createRevisionSchema,
  scorecardSchema,
  inviteMemberSchema,
} from "../src/validators/roomValidators.js";
import {
  activeFileSyncSchema,
  whiteboardStrokeSchema,
  whiteboardUndoSchema,
  whiteboardClearSchema,
} from "../src/validators/socketValidators.js";
import { getQuestionById } from "../src/constants/questionBank.js";
import { runCodeViaPiston } from "../src/services/executionService.js";
import { getOne } from "../src/controllers/roomController.js";
import Room from "../src/models/Room.js";

describe("Enterprise Collaboration Features", () => {
  test("room, comment, revision, scorecard, and invite validators enforce schemas", () => {
    assert.equal(
      createRoomSchema.safeParse({ name: "Web App", template: "web-preview" }).success,
      true
    );
    assert.equal(
      createRoomSchema.safeParse({ name: "Bad", template: "unknown-template" }).success,
      false
    );
    assert.equal(
      createCommentSchema.safeParse({ fileName: "src/app.js", line: 12, text: "Check edge case" })
        .success,
      true
    );
    assert.equal(
      createCommentSchema.safeParse({ fileName: "../evil.js", line: 1, text: "x" }).success,
      false
    );
    assert.equal(
      createRevisionSchema.safeParse({ label: "Before refactor" }).success,
      true
    );
    assert.equal(
      scorecardSchema.safeParse({
        problemSolving: 5,
        codeQuality: 4,
        communication: 5,
        recommendation: "STRONG_HIRE",
        notes: "Great solution",
      }).success,
      true
    );
    assert.equal(
      scorecardSchema.safeParse({
        problemSolving: 6,
        codeQuality: 4,
        communication: 5,
        recommendation: "HIRE",
      }).success,
      false
    );
    assert.equal(
      inviteMemberSchema.safeParse({ identifier: "alice", role: "EDITOR" }).success,
      true
    );
  });

  test("whiteboard and follow-mode socket validators validate coordinates and file names", () => {
    assert.equal(
      activeFileSyncSchema.safeParse({ roomId: "abcdef1234", fileName: "utils/helpers.js" })
        .success,
      true
    );
    assert.equal(
      whiteboardStrokeSchema.safeParse({
        roomId: "abcdef1234",
        stroke: {
          id: "stroke-1",
          color: "#d97706",
          width: 3,
          points: [{ x: 0.25, y: 0.5 }],
        },
      }).success,
      true
    );
    assert.equal(
      whiteboardStrokeSchema.safeParse({
        roomId: "abcdef1234",
        stroke: {
          id: "stroke-2",
          color: "#fff",
          width: 3,
          points: [{ x: 1.5, y: 0.5 }],
        },
      }).success,
      false
    );
    assert.equal(whiteboardClearSchema.safeParse({ roomId: "abcdef1234" }).success, true);
    assert.equal(
      whiteboardUndoSchema.safeParse({ roomId: "abcdef1234", strokeId: "stroke-1" }).success,
      true
    );
    assert.equal(
      whiteboardStrokeSchema.safeParse({
        roomId: "abcdef1234",
        stroke: {
          id: "txt-1",
          type: "text",
          color: "#d97706",
          width: 3,
          text: "Redis Pub/Sub",
          points: [{ x: 0.4, y: 0.3 }],
        },
      }).success,
      true
    );
  });

  test("runCodeViaPiston includes active entrypoint first and extra project files", async () => {
    const mockPost = mock.method(axios, "post", async (_url, payload) => {
      assert.equal(payload.files.length, 2);
      assert.equal(payload.files[0].name, "index.js");
      assert.equal(payload.files[1].name, "utils/helpers.js");
      return {
        data: {
          run: { stdout: "ok\n", stderr: "", code: 0 },
        },
      };
    });

    try {
      const res = await runCodeViaPiston({
        language: "javascript",
        sourceCode: "console.log('ok')",
        activeFileName: "index.js",
        files: [
          { name: "index.js", content: "console.log('ok')" },
          { name: "utils/helpers.js", content: "module.exports = {};" },
        ],
      });
      assert.equal(res.status, "Accepted");
      assert.equal(res.stdout, "ok\n");
    } finally {
      mockPost.mock.restore();
    }
  });

  test("getOne strips private host scorecard and inviteCode from non-owners", async () => {
    const baseRoom = {
      roomId: "abcdef1234",
      name: "Interview",
      inviteCode: "secret123",
      scorecard: { recommendation: "HIRE", notes: "Strong candidate" },
      members: [],
      toObject() {
        return { ...this };
      },
    };

    let nonOwnerPayload = null;
    await getOne(
      { user: { _id: "u2" }, isRoomOwner: false, room: baseRoom },
      { json: (d) => (nonOwnerPayload = d) }
    );
    assert.equal(nonOwnerPayload.room.scorecard, undefined);
    assert.equal(nonOwnerPayload.room.inviteCode, undefined);

    let ownerPayload = null;
    await getOne(
      { user: { _id: "u1" }, isRoomOwner: true, room: baseRoom },
      { json: (d) => (ownerPayload = d) }
    );
    assert.equal(ownerPayload.room.scorecard.recommendation, "HIRE");
    assert.equal(ownerPayload.room.inviteCode, "secret123");
    assert.equal(Room.schema.path("scorecard").options.select, false);
  });

  test("getOne hides hidden test case inputs/expected from non-owners and Question Bank resolves prompts", async () => {
    const q = getQuestionById("two-sum");
    assert.ok(q);
    assert.equal(q.testCases.some((t) => t.isHidden), true);

    const roomWithHidden = {
      roomId: "abcdef1234",
      name: "Algo Interview",
      inviteCode: "secret123",
      testCases: [
        { id: 1, input: "1 2", expected: "3", isHidden: false },
        { id: 2, input: "secret", expected: "42", isHidden: true },
      ],
      members: [],
      toObject() {
        return { ...this };
      },
    };

    let candidatePayload = null;
    await getOne(
      { user: { _id: "u2" }, isRoomOwner: false, room: roomWithHidden },
      { json: (d) => (candidatePayload = d) }
    );
    assert.equal(candidatePayload.room.testCases[0].input, "1 2");
    assert.equal(candidatePayload.room.testCases[1].isHidden, true);
    assert.equal(candidatePayload.room.testCases[1].input, "");
    assert.equal(candidatePayload.room.testCases[1].expected, "");

    let hostPayload = null;
    await getOne(
      { user: { _id: "u1" }, isRoomOwner: true, room: roomWithHidden },
      { json: (d) => (hostPayload = d) }
    );
    assert.equal(hostPayload.room.testCases[1].input, "secret");
    assert.equal(hostPayload.room.testCases[1].expected, "42");
  });
});
