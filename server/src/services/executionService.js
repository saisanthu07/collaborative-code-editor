import axios from "axios";
import vm from "node:vm";
import { spawn } from "node:child_process";
import { getJudge0Id, getPistonLang } from "../constants/languages.js";
import { logError } from "../utils/logger.js";

const JUDGE0_URL = () => process.env.JUDGE0_API_URL || "https://judge0-ce.p.rapidapi.com";
const JUDGE0_KEY = () => process.env.JUDGE0_API_KEY;
const JUDGE0_HOST = () => process.env.JUDGE0_API_HOST || "judge0-ce.p.rapidapi.com";
const PISTON_URL = () => process.env.PISTON_API_URL || "https://emkc.org/api/v2/piston";

function judge0Headers() {
  const headers = {
    "Content-Type": "application/json",
    "Accept": "application/json",
  };
  if (JUDGE0_KEY()) {
    headers["X-RapidAPI-Key"] = JUDGE0_KEY();
    headers["X-RapidAPI-Host"] = JUDGE0_HOST();
  }
  return headers;
}

/**
 * Executes code using the free open-source Piston engine (emkc.org)
 */
export async function runCodeViaPiston({ language, sourceCode, stdin = "" }) {
  const pistonLang = getPistonLang(language);
  const baseUrl = PISTON_URL();

  const payload = {
    language: pistonLang,
    version: "*",
    files: [
      {
        name: `main.${pistonLang === "python" ? "py" : pistonLang === "c++" ? "cpp" : "js"}`,
        content: sourceCode,
      },
    ],
    stdin: stdin || "",
    run_timeout: 10000,
    compile_timeout: 10000,
  };

  const { data } = await axios.post(`${baseUrl}/execute`, payload, {
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) CodeTogether/1.0",
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
 * Executes code using Judge0 (RapidAPI or local Docker)
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
 * In-process JavaScript/TypeScript execution using Node.js vm
 */
function runJavaScriptLocally({ sourceCode, stdin = "" }) {
  let stdout = "";
  let stderr = "";

  const customConsole = {
    log: (...args) => {
      stdout += args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ") + "\n";
    },
    error: (...args) => {
      stderr += args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ") + "\n";
    },
    warn: (...args) => {
      stderr += args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ") + "\n";
    },
    info: (...args) => {
      stdout += args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ") + "\n";
    },
  };

  const sandbox = {
    console: customConsole,
    stdin,
    input: stdin,
    setTimeout,
    clearTimeout,
    Math,
    Date,
    JSON,
    Array,
    Object,
    Number,
    String,
    Boolean,
    RegExp,
    Map,
    Set,
    Promise,
  };

  const context = vm.createContext(sandbox);
  const startTime = Date.now();

  try {
    vm.runInContext(sourceCode, context, { timeout: 4000 });
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(3);
    return {
      status: "Accepted",
      stdout: stdout || "",
      stderr: stderr || "",
      compileOutput: "",
      executionTime: `${elapsed}s`,
      memory: "16 KB",
      engine: "Local Node.js VM (Fallback)",
    };
  } catch (err) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(3);
    return {
      status: "Runtime Error",
      stdout: stdout || "",
      stderr: err?.message || String(err),
      compileOutput: "",
      executionTime: `${elapsed}s`,
      memory: "16 KB",
      engine: "Local Node.js VM (Fallback)",
    };
  }
}

/**
 * Local Python execution fallback using system python
 */
function runPythonLocally({ sourceCode, stdin = "" }) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const proc = spawn("python", ["-c", sourceCode], { timeout: 5000 });
    let stdout = "";
    let stderr = "";

    if (stdin) {
      try {
        proc.stdin.write(stdin);
        proc.stdin.end();
      } catch {
        // ignore
      }
    }

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code, signal) => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(3);
      if (signal === "SIGTERM") {
        resolve({
          status: "Time Limit Exceeded",
          stdout,
          stderr: "Execution timed out (5s CPU limit)",
          compileOutput: "",
          executionTime: `${elapsed}s`,
          memory: "",
          engine: "Local Python 3 (Fallback)",
        });
      } else {
        resolve({
          status: code === 0 ? "Accepted" : "Runtime Error",
          stdout,
          stderr,
          compileOutput: "",
          executionTime: `${elapsed}s`,
          memory: "",
          engine: "Local Python 3 (Fallback)",
        });
      }
    });

    proc.on("error", (err) => {
      resolve({
        status: "Error",
        stdout: "",
        stderr: err.message,
        compileOutput: "",
        executionTime: "",
        memory: "",
        engine: "Local Python (Fallback)",
      });
    });
  });
}

/**
 * Unified robust runCode:
 * 1. Tries Judge0 if API key or local Docker is provided.
 * 2. Tries Piston (free external API).
 * 3. Falls back to local execution engine (Node VM or Python 3) if offline or network blocked.
 * 4. Never throws a raw 502 to client; returns structured status for the console UI.
 */
export async function runCode({ language, sourceCode, stdin = "" }) {
  const hasJudge0Key = Boolean(JUDGE0_KEY() && JUDGE0_KEY().trim().length > 0);
  const isLocalJudge0 = Boolean(JUDGE0_URL() && JUDGE0_URL().includes("localhost"));

  // 1. Try Judge0 if key configured or pointing to local Docker
  if (hasJudge0Key || isLocalJudge0) {
    try {
      return await runCodeViaJudge0({ language, sourceCode, stdin });
    } catch (err) {
      logError("Judge0 execution failed, attempting Piston fallback", err);
    }
  }

  // 2. Try Piston API
  try {
    return await runCodeViaPiston({ language, sourceCode, stdin });
  } catch (pistonErr) {
    logError("Piston execution failed, attempting local runner fallback", pistonErr);
  }

  // 3. Local engine fallback (Node VM / Python)
  if (language === "javascript" || language === "typescript") {
    try {
      return runJavaScriptLocally({ sourceCode, stdin });
    } catch (localErr) {
      logError("Local JS runner failed", localErr);
    }
  }

  if (language === "python") {
    try {
      return await runPythonLocally({ sourceCode, stdin });
    } catch (localErr) {
      logError("Local Python runner failed", localErr);
    }
  }

  // 4. Graceful error result if all options are unreachable
  return {
    status: "Service Unavailable",
    stdout: "",
    stderr: "Could not reach remote execution services (Judge0 / Piston). Please check your internet connection or install local compilers.",
    compileOutput: "",
    executionTime: "",
    memory: "",
    engine: "Offline Fallback",
  };
}
