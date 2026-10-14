import { NextResponse } from "next/server";
import { getVoices } from "@/lib/voices";
export async function GET() {
  try {
    const voices = await getVoices();
    return NextResponse.json({ voices, configured: !!process.env.ELEVENLABS_API_KEY }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ voices: [], configured: false, error: "Narrator voices are temporarily unavailable. Check the ElevenLabs configuration." }, { status: 503 }); }
}
