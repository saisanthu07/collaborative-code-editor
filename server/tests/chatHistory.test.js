import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { getMessagesQuerySchema } from "../src/validators/roomValidators.js";

describe("Task 2.1 — Chat history pagination", () => {
  test("getMessagesQuerySchema applies default limit = 50", () => {
    const res = getMessagesQuerySchema.safeParse({});
    assert.equal(res.success, true);
    assert.equal(res.data.limit, 50);
    assert.equal(res.data.before, undefined);
  });

  test("getMessagesQuerySchema accepts custom limit and 24-hex before id", () => {
    const res = getMessagesQuerySchema.safeParse({
      limit: "25",
      before: "507f1f77bcf86cd799439011",
    });
    assert.equal(res.success, true);
    assert.equal(res.data.limit, 25);
    assert.equal(res.data.before, "507f1f77bcf86cd799439011");
  });

  test("getMessagesQuerySchema rejects invalid before id with 400 validation error", () => {
    const res = getMessagesQuerySchema.safeParse({
      before: "invalid-id",
    });
    assert.equal(res.success, false);
  });

  test("getMessagesQuerySchema bounds limit between 1 and 100", () => {
    assert.equal(getMessagesQuerySchema.safeParse({ limit: 0 }).success, false);
    assert.equal(getMessagesQuerySchema.safeParse({ limit: 101 }).success, false);
    assert.equal(getMessagesQuerySchema.safeParse({ limit: 100 }).success, true);
  });

  test("chat pagination logic returns latest N in ascending order, before pages backwards, hasMore flags correctly", async () => {
    // Generate 120 mock messages with strictly increasing 24-hex ObjectIds
    const allMessages = Array.from({ length: 120 }, (_, i) => {
      const hex = (i + 1).toString(16).padStart(24, "0");
      return {
        _id: hex,
        roomId: "room123456",
        text: `Message ${i + 1}`,
        createdAt: new Date(1700000000000 + i * 1000).toISOString(),
      };
    });

    // Mock query simulator matching:
    // Message.find(query).sort({ _id: -1 }).limit(limit + 1).lean()
    function paginateMock({ roomId, before, limit = 50 }) {
      let filtered = allMessages.filter((m) => m.roomId === roomId);
      if (before) {
        filtered = filtered.filter((m) => m._id < before);
      }
      // sort descending by _id
      filtered.sort((a, b) => (a._id > b._id ? -1 : 1));
      const docs = filtered.slice(0, limit + 1);

      const hasMore = docs.length > limit;
      const paged = hasMore ? docs.slice(0, limit) : docs;
      const nextCursor = hasMore && paged.length > 0 ? paged[paged.length - 1]._id : null;
      paged.reverse(); // ascending order

      return { messages: paged, hasMore, nextCursor };
    }

    // First page (no before)
    const page1 = paginateMock({ roomId: "room123456", limit: 50 });
    assert.equal(page1.messages.length, 50);
    assert.equal(page1.hasMore, true);
    // Ascending order: Message 71 through 120
    assert.equal(page1.messages[0].text, "Message 71");
    assert.equal(page1.messages[49].text, "Message 120");
    assert.equal(page1.nextCursor, page1.messages[0]._id); // oldest returned in page1

    // Second page with before = page1.nextCursor
    const page2 = paginateMock({ roomId: "room123456", before: page1.nextCursor, limit: 50 });
    assert.equal(page2.messages.length, 50);
    assert.equal(page2.hasMore, true);
    // Ascending order: Message 21 through 70
    assert.equal(page2.messages[0].text, "Message 21");
    assert.equal(page2.messages[49].text, "Message 70");
    assert.equal(page2.nextCursor, page2.messages[0]._id);

    // Third page (last 20 messages)
    const page3 = paginateMock({ roomId: "room123456", before: page2.nextCursor, limit: 50 });
    assert.equal(page3.messages.length, 20);
    assert.equal(page3.hasMore, false);
    assert.equal(page3.nextCursor, null);
    assert.equal(page3.messages[0].text, "Message 1");
    assert.equal(page3.messages[19].text, "Message 20");
  });
});
