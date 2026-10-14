import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST as importArticle } from "../app/api/import/route";
import { POST as speak } from "../app/api/speech/route";
import { guardRequest } from "../lib/server";

test("same-origin browser requests accept the requested host after Next loopback normalisation", () => {
  const req = new NextRequest("http://localhost:3000/api/import", { method: "POST", headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" } });
  assert.equal(guardRequest(req, "host-regression"), null);
  const foreign = new NextRequest("http://localhost:3000/api/import", { method: "POST", headers: { host: "127.0.0.1:3000", origin: "https://another-site.example" } });
  assert.equal(guardRequest(foreign, "host-regression")?.status, 403);
  const wrongScheme = new NextRequest("http://localhost:3000/api/import", { method: "POST", headers: { host: "127.0.0.1:3000", origin: "https://127.0.0.1:3000" } });
  assert.equal(guardRequest(wrongScheme, "host-regression")?.status, 403);
});

test("import route refuses local URLs before making a network request", async () => {
  const req = new NextRequest("http://localhost:3000/api/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: "https://127.0.0.1/private" }) });
  const response = await importArticle(req);
  assert.equal(response.status, 422);
  assert.match((await response.json()).error, /not a public/);
});

test("import route refuses cross-origin and oversized requests", async () => {
  const foreign = new NextRequest("http://localhost:3000/api/import", { method: "POST", headers: { origin: "https://another-site.example" }, body: "{}" });
  assert.equal((await importArticle(foreign)).status, 403);
  const oversized = new NextRequest("http://localhost:3000/api/import", { method: "POST", body: "x".repeat(6000) });
  const response = await importArticle(oversized);
  assert.equal(response.status, 422);
  assert.match((await response.json()).error, /too large/);
});

test("speech route reports missing configuration without provider calls", async () => {
  const old = process.env.ELEVENLABS_API_KEY; delete process.env.ELEVENLABS_API_KEY;
  try {
    const response = await speak(new NextRequest("http://localhost:3000/api/speech", { method: "POST", body: "{}" }));
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /Connect ElevenLabs/);
  } finally { if (old !== undefined) process.env.ELEVENLABS_API_KEY = old; }
});

test("Vercel narration works without a listening code, including with a legacy code configured", async t => {
  const old = { key: process.env.ELEVENLABS_API_KEY, vercel: process.env.VERCEL, code: process.env.PROTOTYPE_ACCESS_CODE };
  process.env.ELEVENLABS_API_KEY = "test-only"; process.env.VERCEL = "1";
  const generated: string[] = [];
  t.mock.method(globalThis, "fetch", async (input: string, init?: RequestInit) => {
    if (input.endsWith("/voices")) return Response.json({ voices: [{ voice_id: "test-narrator", name: "Test narrator" }] });
    assert.equal(input, "https://api.elevenlabs.io/v1/text-to-speech/test-narrator");
    assert.equal((init?.headers as Record<string, string>)["xi-api-key"], "test-only");
    generated.push(JSON.parse(init?.body as string).text);
    return new Response(new Uint8Array([1, 2, 3]), { headers: { "Content-Type": "audio/mpeg" } });
  });
  try {
    for (const code of [undefined, "legacy-code"]) {
      if (code) process.env.PROTOTYPE_ACCESS_CODE = code; else delete process.env.PROTOTYPE_ACCESS_CODE;
      const response = await speak(new NextRequest("http://localhost:3000/api/speech", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: "A little reading.", voiceId: "test-narrator" }) }));
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("Content-Type"), "audio/mpeg");
      assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], [1, 2, 3]);
    }
    assert.deepEqual(generated, ["A little reading.", "A little reading."]);
  } finally {
    for (const [name, value] of [["ELEVENLABS_API_KEY", old.key], ["VERCEL", old.vercel], ["PROTOTYPE_ACCESS_CODE", old.code]] as const) { if (value === undefined) delete process.env[name]; else process.env[name] = value; }
  }
});
