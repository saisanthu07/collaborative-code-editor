import axios from "axios";
import { Worker } from "node:worker_threads";
import { getJudge0Id, getPistonLang } from "../constants/languages.js";
import { logError } from "../utils/logger.js";

const JUDGE0_URL = () => process.env.JUDGE0_API_URL || "https://judge0-ce.p.rapidapi.com";
const JUDGE0_KEY = () => process.env.JUDGE0_API_KEY;
const JUDGE0_HOST = () => process.env.JUDGE0_API_HOST || "judge0-ce.p.rapidapi.com";
const PISTON_URL = () => process.env.PISTON_API_URL || "https://emkc.org/api/v2/piston";

function judge0Headers() {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (JUDGE0_KEY()) {
    headers["X-RapidAPI-Key"] = JUDGE0_KEY();
    headers["X-RapidAPI-Host"] = JUDGE0_HOST();
  }
  return headers;
}

/**
 * Executes code using the Piston engine (emkc.org or self-hosted) with optional multi-file bundle.
 */
export async function runCodeViaPiston({
  language,
  sourceCode,
  stdin = "",
  activeFileName = null,
  files = [],
}) {
  const pistonLang = getPistonLang(language);
  const baseUrl = PISTON_URL();

  const defaultEntry = `main.${pistonLang === "python" ? "py" : pistonLang === "c++" ? "cpp" : "js"}`;
  const entryName = activeFileName || defaultEntry;

  const extraFiles = Array.isArray(files)
    ? files
        .filter((f) => f?.name && f.name !== entryName)
        .map((f) => ({ name: f.name, content: f.content || "" }))
    : [];

  const payload = {
    language: pistonLang,
    version: "*",
    files: [{ name: entryName, content: sourceCode }, ...extraFiles],
    stdin: stdin || "",
    run_timeout: 10000,
    compile_timeout: 10000,
  };

  const { data } = await axios.post(`${baseUrl}/execute`, payload, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "CodeTogether/1.0",
    },
    timeout: 12000,
  });

  const run = data.run || {};
  const compile = data.compile;

  let status = "Accepted";
  if (compile && compile.code !== 0 && compile.code !== null && compile.code !== undefined) {
    status = "Compilation Error";
  } else if (run.signal === "SIGKILL" || run.signal === "SIGTERM") {
    status = "Time Limit Exceeded";
  } else if (run.code !== 0 && run.code !== null && run.code !== undefined) {
    status = "Runtime Error";
  }

  return {
    status,
    stdout: run.stdout || "",
    stderr: run.stderr || "",
    compileOutput: compile?.output || compile?.stderr || "",
    executionTime: "",
    memory: "",
    engine: "Piston (Free)",
  };
}

/**
 * Executes code using Judge0 (RapidAPI, Community Edition, or self-hosted)
 */
export async function runCodeViaJudge0({ language, sourceCode, stdin = "" }) {
  const languageId = getJudge0Id(language);
  const baseUrl = JUDGE0_URL();

  const { data } = await axios.post(
    `${baseUrl}/submissions?base64_encoded=false&wait=true`,
    {
      source_code: sourceCode,
      language_id: languageId,
      stdin: stdin || "",
      cpu_time_limit: 5,
      memory_limit: 128000,
    },
    { headers: judge0Headers(), timeout: 12000 }
  );

  return {
    status: data.status?.description || "Unknown",
    stdout: data.stdout || "",
    stderr: data.stderr || "",
    compileOutput: data.compile_output || "",
    executionTime: data.time ? `${data.time}s` : "",
    memory: data.memory ? `${data.memory} KB` : "",
    engine: "Judge0",
  };
}

/**
 * Isolated Worker-thread JavaScript execution strictly opt-in for offline local dev only.
 * Supports relative require("./...") across submitted room files.
 */
function runJavaScriptInWorker({ sourceCode, stdin = "", activeFileName = "index.js", files = [] }) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const workerScript = `
      const { parentPort, workerData } = require("node:worker_threads");
      const vm = require("node:vm");
      const path = require("node:path");
      let stdout = "";
      let stderr = "";
      const customConsole = {
        log: (...args) => { stdout += args.map((a) => typeof a === "object" ? JSON.stringify(a) : String(a)).join(" ") + "\\n"; },
        error: (...args) => { stderr += args.map((a) => typeof a === "object" ? JSON.stringify(a) : String(a)).join(" ") + "\\n"; },
        warn: (...args) => { stderr += args.map((a) => typeof a === "object" ? JSON.stringify(a) : String(a)).join(" ") + "\\n"; },
        info: (...args) => { stdout += args.map((a) => typeof a === "object" ? JSON.stringify(a) : String(a)).join(" ") + "\\n"; },
      };

      const fileMap = new Map();
      for (const f of workerData.files || []) {
        if (f && f.name) fileMap.set(path.posix.normalize(f.name), f.content || "");
      }
      fileMap.set(path.posix.normalize(workerData.activeFileName || "index.js"), workerData.sourceCode);
      const moduleCache = new Map();

      function runModule(fileName) {
        const normalized = path.posix.normalize(fileName);
        if (moduleCache.has(normalized)) return moduleCache.get(normalized).exports;
        const code = fileMap.get(normalized) ?? fileMap.get(normalized + ".js");
        if (code === undefined) {
          throw new Error("Cannot find module '" + fileName + "'");
        }
        const mod = { exports: {} };
        moduleCache.set(normalized, mod);
        const dir = path.posix.dirname(normalized);
        const localRequire = (specifier) => {
          if (!specifier.startsWith(".")) {
            throw new Error("External module '" + specifier + "' is not available in local dev sandbox");
          }
          const resolved = path.posix.normalize(path.posix.join(dir === "." ? "" : dir, specifier));
          return runModule(resolved);
        };
        const ctx = vm.createContext({
          console: customConsole,
          stdin: workerData.stdin,
          input: workerData.stdin,
          require: localRequire,
          module: mod,
          exports: mod.exports,
          Math, Date, JSON, Array, Object, Number, String, Boolean, RegExp, Map, Set, Promise,
        }, { codeGeneration: { strings: false, wasm: false } });
        vm.runInContext(code, ctx, { timeout: 3500 });
        return mod.exports;
      }

      try {
        runModule(workerData.activeFileName || "index.js");
        parentPort.postMessage({ status: "Accepted", stdout, stderr });
      } catch (err) {
        parentPort.postMessage({ status: "Runtime Error", stdout, stderr: err?.message || String(err) });
      }
    `;

    const worker = new Worker(workerScript, {
      eval: true,
      workerData: { sourceCode, stdin, activeFileName, files },
      resourceLimits: { maxOldGenerationSizeMb: 64, maxYoungGenerationSizeMb: 16 },
    });

    let settled = false;
    const timeoutId = setTimeout(() => {
      if (!settled) {
        settled = true;
        worker.terminate().catch(() => {});
        resolve({
          status: "Time Limit Exceeded",
          stdout: "",
          stderr: "Execution timed out (4s limit)",
          compileOutput: "",
          executionTime: "4.000s",
          memory: "",
          engine: "Local Dev Worker",
        });
      }
    }, 4000);

    worker.on("message", (msg) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(3);
      resolve({
        status: msg.status,
        stdout: msg.stdout || "",
        stderr: msg.stderr || "",
        compileOutput: "",
        executionTime: `${elapsed}s`,
        memory: "",
        engine: "Local Dev Worker",
      });
    });

    worker.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(3);
      resolve({
        status: "Runtime Error",
        stdout: "",
        stderr: err?.message || String(err),
        compileOutput: "",
        executionTime: `${elapsed}s`,
        memory: "",
        engine: "Local Dev Worker",
      });
    });
  });
}

/**
 * Unified robust runCode supporting multi-file bundles.
 */
export async function runCode({
  language,
  sourceCode,
  stdin = "",
  activeFileName = null,
  files = [],
}) {
  const judge0Url = JUDGE0_URL();
  const hasJudge0Key = Boolean(JUDGE0_KEY() && JUDGE0_KEY().trim().length > 0);
  const isLocalJudge0 = Boolean(judge0Url && judge0Url.includes("localhost"));
  const isPublicCeJudge0 = Boolean(judge0Url && judge0Url.includes("ce.judge0.com"));
  const hasMultiFile = Array.isArray(files) && files.length > 1;

  // Prefer Piston first when executing a multi-file project bundle (Judge0 /submissions only takes 1 source_code)
  if (!hasMultiFile && (hasJudge0Key || isLocalJudge0 || isPublicCeJudge0)) {
    try {
      return await runCodeViaJudge0({ language, sourceCode, stdin });
    } catch (err) {
      logError("Judge0 execution failed, attempting Piston fallback", err);
    }
  }

  try {
    return await runCodeViaPiston({ language, sourceCode, stdin, activeFileName, files });
  } catch (pistonErr) {
    logError("Piston execution failed", pistonErr);
  }

  if (hasMultiFile && (hasJudge0Key || isLocalJudge0 || isPublicCeJudge0)) {
    try {
      return await runCodeViaJudge0({ language, sourceCode, stdin });
    } catch (err) {
      logError("Judge0 fallback failed", err);
    }
  }

  const allowUnsafeLocal =
    process.env.NODE_ENV !== "production" && process.env.ALLOW_UNSAFE_LOCAL_EXEC === "true";

  if (allowUnsafeLocal && language === "javascript") {
    try {
      return await runJavaScriptInWorker({ sourceCode, stdin, activeFileName, files });
    } catch (localErr) {
      logError("Local dev JS worker failed", localErr);
    }
  }

  return {
    status: "Service Unavailable",
    stdout: "",
    stderr:
      "Remote code execution engines (Judge0 / Piston) are currently unreachable. Configure JUDGE0_API_URL / JUDGE0_API_KEY or PISTON_API_URL.",
    compileOutput: "",
    executionTime: "",
    memory: "",
    engine: "Offline Fallback",
  };
}

/**
 * Runs a batch of test cases for interview mode without hitting per-request HTTP rate limits.
 */
export async function runCodeBatch({
  language,
  sourceCode,
  activeFileName = null,
  files = [],
  cases = [],
}) {
  const results = [];
  for (const tc of cases) {
    const res = await runCode({
      language,
      sourceCode,
      stdin: tc.input || "",
      activeFileName,
      files,
    });
    const actual = (res.stdout || "").trim();
    const expected = (tc.expected || "").trim();
    const passed = res.status === "Accepted" && actual === expected;
    results.push({
      id: tc.id,
      input: tc.input || "",
      expected: tc.expected || "",
      actual: res.status === "Accepted" ? actual : res.stderr || res.compileOutput || res.status,
      status: passed ? "passed" : "failed",
      executionStatus: res.status,
      executionTime: res.executionTime,
      engine: res.engine,
    });
  }
  return results;
}
