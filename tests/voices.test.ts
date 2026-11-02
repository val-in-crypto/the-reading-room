import test from "node:test";
import assert from "node:assert/strict";
import { narratorCatalog } from "../lib/narrators";
import { selectNarrators, type ProviderVoice } from "../lib/voice-selection";

const account: ProviderVoice[] = narratorCatalog.map(voice => ({ voice_id: voice.id, name: `${voice.name} - Provider description`, preview_url: voice.previewUrl }));

test("the expanded reading collection preserves four originals and adds all requested accents", () => {
  const result = selectNarrators(account);
  assert.equal(result.length, 14);
  assert.equal(new Set(result.map(voice => voice.id)).size, 14);
  assert.deepEqual(result.slice(0, 4).map(voice => voice.name), ["Roger", "Sarah", "Laura", "Charlie"]);
  assert.equal(result.slice(4).filter(voice => voice.description.startsWith("British")).length, 4);
  assert.equal(result.slice(4).filter(voice => voice.description.startsWith("American")).length, 4);
  assert.equal(result.slice(4).filter(voice => voice.description.startsWith("New Zealand")).length, 2);
  assert.ok(result.every(voice => voice.previewUrl?.startsWith("https://")));
});

test("an existing four-voice configuration still gets the additional ten narrators", () => {
  assert.equal(selectNarrators(account, account.slice(0, 4).map(voice => voice.voice_id)).length, 14);
  const ella = account.find(voice => voice.name.startsWith("Ella"))!;
  const result = selectNarrators(account, [ella.voice_id, ella.voice_id]);
  assert.equal(result[0].name, "Ella");
  assert.equal(result.length, 14);
});

test("unavailable voices are excluded from narration choices", () => {
  const result = selectNarrators(account.filter(voice => voice.voice_id !== narratorCatalog.at(-1)!.id));
  assert.equal(result.length, 13);
  assert.ok(!result.some(voice => voice.name === "Tāne"));
});

test("custom accounts retain a usable fourteen-voice fallback with provider accent labels", () => {
  const custom = Array.from({ length: 17 }, (_, index) => ({ voice_id: `custom-${index}`, name: `Name ${index} - Narrator`, labels: { accent: "new zealand" } }));
  const result = selectNarrators(custom);
  assert.equal(result.length, 14);
  assert.equal(result[0].name, "Name 0");
  assert.equal(result[0].description, "New Zealand");
});
