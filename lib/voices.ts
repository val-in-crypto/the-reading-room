import type { Voice } from "./types";

let cached: { expires: number; voices: Voice[] } | undefined;
export async function getVoices(): Promise<Voice[]> {
  if (!process.env.ELEVENLABS_API_KEY) return [];
  if (cached && cached.expires > Date.now()) return cached.voices;
  const response = await fetch("https://api.elevenlabs.io/v1/voices", { headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY }, signal: AbortSignal.timeout(10_000), cache: "no-store" });
  if (!response.ok) throw new Error("ElevenLabs could not load the voices. Check the API key and account permissions.");
  const data = await response.json();
  const configured = (process.env.ELEVENLABS_VOICE_IDS ?? "").split(",").map(id => id.trim()).filter(Boolean).slice(0, 4);
  const available = (data.voices ?? []) as { voice_id: string; name: string; preview_url?: string; labels?: Record<string, string> }[];
  const selected = configured.length ? configured.map(id => available.find(v => v.voice_id === id)).filter(v => v !== undefined) : available.slice(0, 4);
  const voices = selected.map((voice, index) => ({ id: voice.voice_id, name: voice.name.split(/\s+[-–—]\s+/)[0].trim() || voice.name, description: voice.labels?.description || voice.labels?.accent || `Narrator ${index + 1}`, previewUrl: voice.preview_url?.startsWith("https://") ? voice.preview_url : undefined }));
  cached = { voices, expires: Date.now() + 5 * 60_000 };
  return voices;
}
