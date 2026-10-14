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

test("paid speech on Vercel requires an access code", async () => {
  const old = { key: process.env.ELEVENLABS_API_KEY, vercel: process.env.VERCEL, code: process.env.PROTOTYPE_ACCESS_CODE };
  process.env.ELEVENLABS_API_KEY = "test-only"; process.env.VERCEL = "1"; delete process.env.PROTOTYPE_ACCESS_CODE;
  try {
    const response = await speak(new NextRequest("http://localhost:3000/api/speech", { method: "POST", body: "{}" }));
    assert.equal(response.status, 503);
    process.env.PROTOTYPE_ACCESS_CODE = "test-code";
    const denied = await speak(new NextRequest("http://localhost:3000/api/speech", { method: "POST", body: "{}" }));
    assert.equal(denied.status, 401);
  } finally {
    for (const [name, value] of [["ELEVENLABS_API_KEY", old.key], ["VERCEL", old.vercel], ["PROTOTYPE_ACCESS_CODE", old.code]] as const) { if (value === undefined) delete process.env[name]; else process.env[name] = value; }
  }
});
