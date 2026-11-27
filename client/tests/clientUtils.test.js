import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { colorForUser } from "../src/utils/color.js";
import {
  detectLanguageFromFileName,
  monacoLangFor,
  getFileBadge,
} from "../src/constants/languages.js";
import { getCompilyTemplate } from "../src/constants/compilyTemplates.js";
import {
  parseAvatarStamp,
  encodeAvatarStamp,
  computeIdenticonCells,
  resolveStampColor,
} from "../src/utils/avatar.js";

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

  test("getCompilyTemplate provides starter templates per language", () => {
    assert.equal(getCompilyTemplate("python").fileName, "main.py");
    assert.match(getCompilyTemplate("cpp").code, /iostream/);
    assert.equal(getCompilyTemplate("unknown").fileName, "index.js");
  });

  test("Developer Stamp avatar helpers encode, parse, and generate symmetric identicons", () => {
    const encoded = encodeAvatarStamp({ glyph: "lambda", palette: "terracotta", frame: "wax" });
    assert.equal(encoded, "stamp:lambda:terracotta:wax");

    assert.deepEqual(parseAvatarStamp(encoded, "alice"), {
      glyph: "lambda",
      palette: "terracotta",
      frame: "wax",
    });

    // Legacy URLs or empty values safely fall back to deterministic identicon
    assert.deepEqual(parseAvatarStamp("https://example.com/old.png", "alice"), {
      glyph: "identicon",
      palette: "auto",
      frame: "folio",
    });

    const cells = computeIdenticonCells("alice");
    assert.equal(cells.length, 5);
    for (const row of cells) {
      assert.equal(row.length, 5);
      assert.equal(row[0], row[4]);
      assert.equal(row[1], row[3]);
    }
    assert.equal(cells.flat().filter(Boolean).length >= 7, true);
    assert.equal(resolveStampColor("terracotta", "alice"), "#C2542D");
  });
});
