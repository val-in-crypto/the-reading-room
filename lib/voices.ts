import { selectNarrators, type ProviderVoice } from "./voice-selection";
import type { Voice } from "./types";

let cached: { expires: number; voices: Voice[] } | undefined;
export async function getVoices(): Promise<Voice[]> {
  if (!process.env.ELEVENLABS_API_KEY) return [];
  if (cached && cached.expires > Date.now()) return cached.voices;
  const response = await fetch("https://api.elevenlabs.io/v1/voices", { headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY }, signal: AbortSignal.timeout(10_000), cache: "no-store" });
  if (!response.ok) throw new Error("ElevenLabs could not load the voices. Check the API key and account permissions.");
  const data = await response.json();
  const configured = (process.env.ELEVENLABS_VOICE_IDS ?? "").split(",").map(id => id.trim()).filter(Boolean).slice(0, 14);
  const voices = selectNarrators((data.voices ?? []) as ProviderVoice[], configured);
  cached = { voices, expires: Date.now() + 5 * 60_000 };
  return voices;
}
