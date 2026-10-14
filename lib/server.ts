import { NextRequest, NextResponse } from "next/server";

const hits = new Map<string, { count: number; reset: number }>();
export function guardRequest(req: NextRequest, bucket: string, limit = 15) {
  const origin = req.headers.get("origin");
  // Next normalises loopback URLs to localhost internally. Compare the browser
  // origin with the actual requested Host, keeping exact scheme/host matching.
  const publicUrl = new URL(req.nextUrl.href);
  const host = req.headers.get("host");
  if (host) publicUrl.host = host;
  if (origin && origin !== publicUrl.origin) return NextResponse.json({ error: "This request must come from the Reading Room." }, { status: 403 });
  const now = Date.now();
  if (hits.size > 1000) for (const [key, value] of hits) if (value.reset < now) hits.delete(key);
  const key = `${bucket}:${req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local"}`;
  const value = hits.get(key);
  if (value && value.reset > now && value.count >= limit) return NextResponse.json({ error: "Please wait a minute before trying again." }, { status: 429 });
  hits.set(key, value && value.reset > now ? { ...value, count: value.count + 1 } : { count: 1, reset: now + 60_000 });
  return null;
}
export async function readBody(req: NextRequest, max = 80_000) {
  if (Number(req.headers.get("content-length")) > max) throw new Error("The request is too large.");
  const reader = req.body?.getReader();
  if (!reader) throw new Error("The request is empty.");
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) { await reader.cancel(); throw new Error("The request is too large."); }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;
}
