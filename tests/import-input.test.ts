import test from "node:test";
import assert from "node:assert/strict";
import { parseImportInput } from "../lib/import-input";

test("one field detects a trimmed URL and rejects insecure or incomplete links", () => {
  assert.deepEqual(parseImportInput(" https://example.com/article "), { url: "https://example.com/article" });
  assert.throws(() => parseImportInput("http://example.com/article"), /https/);
  assert.throws(() => parseImportInput("www.example.com/article"), /https/);
});

test("pasted text gets a title while retaining every paragraph for reading and listening", () => {
  const text = "A curious title\n\n" + "A longer paragraph about technology. ".repeat(12) + "\n\nThe final sentence.";
  const result = parseImportInput(text);
  assert.ok("text" in result);
  assert.equal(result.title, "A curious title");
  assert.equal(result.paragraphs.join("\n\n"), text);
  assert.throws(() => parseImportInput("Short text"), /200 characters/);
  assert.throws(() => parseImportInput("x".repeat(60_001)), /60,000/);
});
