import { test, describe, mock } from "node:test";
import assert from "node:assert/strict";
import axios from "axios";
import { runCode, runCodeBatch } from "../src/services/executionService.js";
import { executeBatchSchema, updateTestCasesSchema } from "../src/validators/roomValidators.js";

describe("Hardened Execution Service & Batch Runner", () => {
  test("runCode does not fall back to unsafe host VM when ALLOW_UNSAFE_LOCAL_EXEC is not enabled", async () => {
    const origFlag = process.env.ALLOW_UNSAFE_LOCAL_EXEC;
    delete process.env.ALLOW_UNSAFE_LOCAL_EXEC;

    const mockPost = mock.method(axios, "post", async () => {
      throw new Error("Network blocked");
    });

    try {
      const result = await runCode({
        language: "javascript",
        sourceCode: "console.log(process.env)",
      });
      assert.equal(result.status, "Service Unavailable");
      assert.equal(result.engine, "Offline Fallback");
    } finally {
      if (origFlag !== undefined) process.env.ALLOW_UNSAFE_LOCAL_EXEC = origFlag;
      mockPost.mock.restore();
    }
  });

  test("runCodeBatch evaluates multiple test cases and scores pass/fail", async () => {
    const mockPost = mock.method(axios, "post", async (_url, payload) => {
      const n = Number((payload.stdin || "").trim());
      return {
        data: {
          run: {
            stdout: `${n * 2}\n`,
            stderr: "",
            code: 0,
          },
        },
      };
    });

    try {
      const results = await runCodeBatch({
        language: "python",
        sourceCode: "print(int(input()) * 2)",
        cases: [
          { id: 1, input: "5", expected: "10" },
          { id: 2, input: "4", expected: "9" },
        ],
      });

      assert.equal(results.length, 2);
      assert.equal(results[0].status, "passed");
      assert.equal(results[0].actual, "10");
      assert.equal(results[1].status, "failed");
      assert.equal(results[1].actual, "8");
    } finally {
      mockPost.mock.restore();
    }
  });

  test("executeBatchSchema and updateTestCasesSchema validate case counts", () => {
    assert.equal(
      executeBatchSchema.safeParse({
        language: "javascript",
        sourceCode: "console.log(1)",
        cases: [{ id: 1, input: "", expected: "1" }],
      }).success,
      true
    );
    assert.equal(
      executeBatchSchema.safeParse({
        language: "javascript",
        sourceCode: "console.log(1)",
        cases: [],
      }).success,
      false
    );
    assert.equal(
      updateTestCasesSchema.safeParse({
        testCases: [{ id: 1, input: "1", expected: "1" }],
      }).success,
      true
    );
  });
});
