import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { getJudge0Id, isSupportedLanguage, LANGUAGES } from "../src/constants/languages.js";

describe("languages config", () => {
  test("every language has a numeric Judge0 id", () => {
    for (const key of Object.keys(LANGUAGES)) {
      assert.equal(typeof LANGUAGES[key].judge0, "number");
    }
  });

  test("getJudge0Id returns the right id for javascript", () => {
    assert.equal(getJudge0Id("javascript"), 63);
  });

  test("getJudge0Id throws for an unsupported language", () => {
    assert.throws(() => getJudge0Id("cobol"));
  });

  test("isSupportedLanguage correctly reports support", () => {
    assert.equal(isSupportedLanguage("python"), true);
    assert.equal(isSupportedLanguage("cobol"), false);
  });
});
