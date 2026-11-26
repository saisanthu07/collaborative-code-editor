import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { colorForUser } from "../src/utils/color.js";
import {
  detectLanguageFromFileName,
  monacoLangFor,
  getFileBadge,
} from "../src/constants/languages.js";

describe("Client utilities", () => {
  test("colorForUser returns deterministic hex colors", () => {
    const first = colorForUser("alice");
    const second = colorForUser("alice");
    assert.equal(first, second);
    assert.match(first, /^#[0-9A-Fa-f]{6}$/);
  });

  test("detectLanguageFromFileName maps common extensions", () => {
    assert.equal(detectLanguageFromFileName("main.py"), "python");
    assert.equal(detectLanguageFromFileName("app.tsx"), "typescript");
    assert.equal(detectLanguageFromFileName("solver.cpp"), "cpp");
    assert.equal(detectLanguageFromFileName("unknown.xyz"), "javascript");
  });

  test("monacoLangFor and getFileBadge return expected metadata", () => {
    assert.equal(monacoLangFor("python"), "python");
    assert.equal(monacoLangFor("unknown"), "plaintext");
    assert.equal(getFileBadge("index.ts").text, "TS");
    assert.equal(getFileBadge("data.json").text, "{}");
  });
});
