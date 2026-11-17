import { test, describe, mock } from "node:test";
import assert from "node:assert/strict";
import axios from "axios";
import { runCode, runCodeViaPiston } from "../src/services/executionService.js";

describe("Execution Service & Piston Fallback", () => {
  test("runCodeViaPiston formats accepted execution output properly", async () => {
    const mockPost = mock.method(axios, "post", async (url, payload) => {
      assert.ok(url.includes("/execute"));
      assert.equal(payload.language, "python");
      assert.equal(payload.stdin, "5\n");
      return {
        data: {
          language: "python",
          version: "3.10.0",
          run: {
            stdout: "Output: 10\n",
            stderr: "",
            code: 0,
            signal: null,
            output: "Output: 10\n",
          },
        },
      };
    });

    try {
      const result = await runCodeViaPiston({
        language: "python",
        sourceCode: "n = int(input())\nprint(f'Output: {n * 2}')",
        stdin: "5\n",
      });

      assert.equal(result.status, "Accepted");
      assert.equal(result.stdout, "Output: 10\n");
      assert.equal(result.stderr, "");
      assert.equal(result.engine, "Piston (Free)");
    } finally {
      mockPost.mock.restore();
    }
  });

  test("runCodeViaPiston flags compilation error when compile code is non-zero", async () => {
    const mockPost = mock.method(axios, "post", async () => {
      return {
        data: {
          language: "c++",
          version: "10.2.0",
          compile: {
            stdout: "",
            stderr: "error: expected ';' before '}' token",
            code: 1,
            output: "error: expected ';' before '}' token",
          },
          run: {
            stdout: "",
            stderr: "",
            code: null,
          },
        },
      };
    });

    try {
      const result = await runCodeViaPiston({
        language: "cpp",
        sourceCode: "int main() { return 0 }",
      });

      assert.equal(result.status, "Compilation Error");
      assert.ok(result.compileOutput.includes("error: expected ';'"));
    } finally {
      mockPost.mock.restore();
    }
  });

  test("runCode falls back to Piston when Judge0 returns error", async () => {
    let callCount = 0;
    const mockPost = mock.method(axios, "post", async (url) => {
      callCount++;
      if (url.includes("submissions")) {
        // Judge0 attempt fails (e.g. 401 Unauthorized from RapidAPI)
        const err = new Error("Request failed with status code 401");
        err.response = { status: 401, data: { message: "Invalid API Key" } };
        throw err;
      }
      // Piston fallback succeeds
      return {
        data: {
          language: "javascript",
          run: {
            stdout: "Hello from Piston\n",
            stderr: "",
            code: 0,
          },
        },
      };
    });

    try {
      // Temporarily set a dummy key to trigger Judge0 first
      process.env.JUDGE0_API_KEY = "test_rapidapi_key";
      const result = await runCode({
        language: "javascript",
        sourceCode: "console.log('Hello from Piston');",
      });

      assert.equal(result.status, "Accepted");
      assert.equal(result.stdout, "Hello from Piston\n");
      assert.equal(result.engine, "Piston (Free)");
      assert.equal(callCount, 2); // 1 Judge0 attempt + 1 Piston fallback
    } finally {
      process.env.JUDGE0_API_KEY = "";
      mockPost.mock.restore();
    }
  });
});
