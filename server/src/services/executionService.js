import axios from "axios";
import { getJudge0Id } from "../constants/languages.js";

const JUDGE0_URL = () => process.env.JUDGE0_API_URL;
const JUDGE0_KEY = () => process.env.JUDGE0_API_KEY;
const JUDGE0_HOST = () => process.env.JUDGE0_API_HOST;

function judge0Headers() {
  const headers = { "Content-Type": "application/json" };
  // Only attach RapidAPI auth headers if a key is actually configured —
  // some self-hosted Judge0 instances need no auth at all.
  if (JUDGE0_KEY()) {
    headers["X-RapidAPI-Key"] = JUDGE0_KEY();
    headers["X-RapidAPI-Host"] = JUDGE0_HOST();
  }
  return headers;
}

// Submits code to Judge0 and waits (via Judge0's own wait=true flag) for
// the sandboxed result. Isolated entirely from this process — we never
// execute submitted code locally.
export async function runCode({ language, sourceCode, stdin = "" }) {
  const languageId = getJudge0Id(language);
  const baseUrl = JUDGE0_URL();
  if (!baseUrl) {
    const err = new Error("Code execution is not configured (missing JUDGE0_API_URL)");
    err.status = 503;
    throw err;
  }

  try {
    const { data } = await axios.post(
      `${baseUrl}/submissions?base64_encoded=false&wait=true`,
      {
        source_code: sourceCode,
        language_id: languageId,
        stdin,
        cpu_time_limit: 5,
        memory_limit: 128000,
      },
      { headers: judge0Headers(), timeout: 15000 }
    );

    return {
      status: data.status?.description || "Unknown",
      stdout: data.stdout || "",
      stderr: data.stderr || "",
      compileOutput: data.compile_output || "",
      executionTime: data.time ? `${data.time}s` : "",
      memory: data.memory ? `${data.memory} KB` : "",
    };
  } catch (err) {
    if (err.response) {
      const apiErr = new Error(
        `Judge0 error (${err.response.status}): ${JSON.stringify(err.response.data)}`
      );
      apiErr.status = 502;
      throw apiErr;
    }
    if (err.code === "ECONNABORTED") {
      const timeoutErr = new Error("Execution timed out");
      timeoutErr.status = 504;
      throw timeoutErr;
    }
    const networkErr = new Error("Could not reach the code execution service");
    networkErr.status = 502;
    throw networkErr;
  }
}
