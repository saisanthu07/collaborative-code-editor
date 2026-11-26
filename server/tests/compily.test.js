import { test, describe } from "node:test";
import assert from "node:assert/strict";
import CompilySnippet from "../src/models/CompilySnippet.js";
import { saveSnippetSchema, snippetIdParamSchema } from "../src/validators/compilyValidators.js";
import { listSnippets, saveSnippet, deleteSnippet } from "../src/controllers/compilyController.js";

describe("Compily validators", () => {
  test("saveSnippetSchema validates valid snippet payload", () => {
    const res = saveSnippetSchema.safeParse({
      title: "Two Sum",
      language: "python",
      code: "print(42)",
      stdin: "1 2",
    });
    assert.equal(res.success, true);
  });

  test("saveSnippetSchema rejects unsupported language", () => {
    const res = saveSnippetSchema.safeParse({
      title: "Bad",
      language: "brainfuck",
      code: "+++",
    });
    assert.equal(res.success, false);
  });

  test("snippetIdParamSchema enforces 24-hex ObjectId", () => {
    assert.equal(
      snippetIdParamSchema.safeParse({ id: "507f1f77bcf86cd799439011" }).success,
      true
    );
    assert.equal(snippetIdParamSchema.safeParse({ id: "not-an-id" }).success, false);
  });
});

describe("Compily snippet controller", () => {
  test("listSnippets queries only authenticated user's snippets", async () => {
    const origFind = CompilySnippet.find;
    let capturedQuery = null;

    CompilySnippet.find = (q) => {
      capturedQuery = q;
      return {
        sort: () => ({
          limit: () => ({
            lean: async () => [{ _id: "1", title: "My Script", language: "javascript" }],
          }),
        }),
      };
    };

    try {
      const req = { user: { _id: "507f1f77bcf86cd799439011" } };
      let body = null;
      await listSnippets(
        req,
        {
          json: (d) => {
            body = d;
          },
        },
        (e) => {
          if (e) throw e;
        }
      );

      assert.equal(capturedQuery.userId, "507f1f77bcf86cd799439011");
      assert.equal(body.snippets.length, 1);
    } finally {
      CompilySnippet.find = origFind;
    }
  });

  test("saveSnippet creates a snippet for the current user", async () => {
    const origCreate = CompilySnippet.create;
    let capturedData = null;

    CompilySnippet.create = async (doc) => {
      capturedData = doc;
      return { _id: "507f1f77bcf86cd799439099", ...doc };
    };

    try {
      const req = {
        user: { _id: "507f1f77bcf86cd799439011" },
        body: { title: "Binary Search", language: "cpp", code: "int main(){}", stdin: "" },
      };
      let statusCode = null;
      let body = null;
      await saveSnippet(
        req,
        {
          status(code) {
            statusCode = code;
            return this;
          },
          json(d) {
            body = d;
          },
        },
        (e) => {
          if (e) throw e;
        }
      );

      assert.equal(statusCode, 201);
      assert.equal(capturedData.userId, "507f1f77bcf86cd799439011");
      assert.equal(body.snippet.title, "Binary Search");
    } finally {
      CompilySnippet.create = origCreate;
    }
  });

  test("deleteSnippet returns 404 when snippet does not belong to user", async () => {
    const origDelete = CompilySnippet.findOneAndDelete;
    CompilySnippet.findOneAndDelete = async () => null;

    try {
      const req = {
        user: { _id: "507f1f77bcf86cd799439011" },
        params: { id: "507f1f77bcf86cd799439099" },
      };
      let statusCode = null;
      let body = null;
      await deleteSnippet(
        req,
        {
          status(code) {
            statusCode = code;
            return this;
          },
          json(d) {
            body = d;
          },
        },
        (e) => {
          if (e) throw e;
        }
      );

      assert.equal(statusCode, 404);
      assert.equal(body.error, "Snippet not found");
    } finally {
      CompilySnippet.findOneAndDelete = origDelete;
    }
  });
});
