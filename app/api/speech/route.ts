import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { guardRequest, readBody } from "@/lib/server";
import { getVoices } from "@/lib/voices";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(req: NextRequest) {
  const rejected = guardRequest(req, "speech", 20);
  if (rejected) return rejected;
  if (!process.env.ELEVENLABS_API_KEY) return NextResponse.json({ error: "Connect ElevenLabs in the server environment to enable narration." }, { status: 503 });
  const code = process.env.PROTOTYPE_ACCESS_CODE;
  if (process.env.VERCEL && !code) return NextResponse.json({ error: "Set a prototype access code before enabling narration on Vercel." }, { status: 503 });
  if (code) {
    const received = Buffer.from(req.headers.get("x-prototype-code") ?? "");
    const expected = Buffer.from(code);
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) return NextResponse.json({ error: "Enter the prototype listening code to enable narration." }, { status: 401 });
  }
  try {
    const { text, voiceId } = await readBody(req, 15_000);
    if (typeof text !== "string" || !text.trim() || text.length > 3000 || typeof voiceId !== "string") return NextResponse.json({ error: "Choose a voice and a section of up to 3,000 characters." }, { status: 400 });
    if (!(await getVoices()).some(v => v.id === voiceId)) return NextResponse.json({ error: "This voice is not available. Choose another narrator." }, { status: 400 });
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
      method: "POST", headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ text, model_id: process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2" }), signal: AbortSignal.timeout(50_000),
    });
    if (!response.ok) return NextResponse.json({ error: response.status === 429 ? "ElevenLabs has reached a usage limit. Please try later." : "ElevenLabs could not generate this narration. Check the account quota and voice access." }, { status: 502 });
    return new Response(await response.arrayBuffer(), { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, no-store" } });
  } catch { return NextResponse.json({ error: "Narration could not be generated. Please try again." }, { status: 502 }); }
}
